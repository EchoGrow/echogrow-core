import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import {
  buildSpkMetadataPrompt,
  buildSpkVerifiedSkillsPrompt,
  SpkMetadataSchema,
  SpkVerifiedSkillsSchema,
} from './spk.prompts';
import { SpkPayloadSchema, SpkPayload } from '@echogrow/shared';

const DIMENSION_NAME_MAP = {
  TECHNICAL_DEPTH: 'Technical Depth',
  COMMUNICATION: 'Communication Clarity',
  DOMAIN_EXPERIENCE: 'Domain Experience',
  PROBLEM_SOLVING: 'Problem Solving',
} as const;

const DISCREPANCY_STATUS_MAP = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DISMISSED: 'dismissed',
} as const;

const SCHEMA_VERSION = '1.0.0';

@Injectable()
export class SpkService {
  private readonly logger = new Logger(SpkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  /**
   * Build and persist the SPK profile for a COMPLETED interview.
   * Called once from the pipeline, after roadmap generation.
   */
  async buildSpkProfile(interviewId: string): Promise<void> {
    this.logger.log(`[SPK] Building profile for interview ${interviewId}...`);

    // 1. Load all needed data
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
      include: {
        candidate: true,
        scorecard: {
          include: {
            dimensions: { include: { skillGaps: true } },
            discrepancies: true,
            roadmap: { include: { items: { include: { skillGap: true } } } },
          },
        },
      },
    });

    if (!session) {
      this.logger.warn(`[SPK] Session ${interviewId} not found.`);
      throw new NotFoundException('Interview session not found.'); 
    }

    if (session.status !== 'COMPLETED' || !session.scorecard) {
      this.logger.warn(
        `[SPK] Session ${interviewId} is not COMPLETED (status: ${session.status}). Skipping.`,
      );
      return;
    }

    const scorecard = session.scorecard;

    // 2. LLM Call #1: metadata
    let metadata: {
      seniority: string | null;
      primary_role: string | null;
      timezone: string | null;
      languages: string[] | null;
      years_of_experience: number | null;
    };
    try {
      const metadataPrompt = buildSpkMetadataPrompt(session.resume, session.transcript);
      metadata = await this.llm.generate(metadataPrompt, SpkMetadataSchema);
      this.logger.log(`[SPK] Metadata extracted for ${interviewId}`);
    } catch (err: any) {
      this.logger.warn(
        `[SPK] Metadata extraction failed for ${interviewId}: ${err.message}. Using nulls.`,
      );
      metadata = {
        seniority: null,
        primary_role: null,
        timezone: null,
        languages: null,
        years_of_experience: null,
      };
    }

    // 3. LLM Call #2: verified skills
    let verifiedSkills: string[] = [];
    try {
      const skillsPrompt = buildSpkVerifiedSkillsPrompt(session.transcript);
      const result = await this.llm.generate(skillsPrompt, SpkVerifiedSkillsSchema);
      verifiedSkills = result.verified_skills;
      this.logger.log(`[SPK] ${verifiedSkills.length} verified skills for ${interviewId}`);
    } catch (err: any) {
      this.logger.warn(
        `[SPK] Verified skills extraction failed for ${interviewId}: ${err.message}. Using empty list.`,
      );
      verifiedSkills = [];
    }

    // 4. Build payload
    const payload = this.buildPayload(session, metadata, verifiedSkills);

    // 5. Persist
    await this.prisma.spkProfile.upsert({
      where: { interviewId },
      create: {
        interviewId,
        seniority: metadata.seniority,
        primaryRole: metadata.primary_role,
        timezone: metadata.timezone,
        languages: metadata.languages as any,
        yearsOfExperience: metadata.years_of_experience,
        spkPayload: payload as any,
        schemaVersion: SCHEMA_VERSION,
      },
      update: {
        seniority: metadata.seniority,
        primaryRole: metadata.primary_role,
        timezone: metadata.timezone,
        languages: metadata.languages as any,
        yearsOfExperience: metadata.years_of_experience,
        spkPayload: payload as any,
        schemaVersion: SCHEMA_VERSION,
      },
    });

    this.logger.log(`[SPK] Profile saved for ${interviewId}`);
  }

  /**
   * Read the SPK payload from DB (no LLM, no aggregation).
   */
  async getSpkExport(interviewId: string): Promise<SpkPayload> {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
      select: { id: true, status: true, spkProfile: true },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    if (session.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Interview is not completed yet (status: ${session.status}). SPK export requires a completed scorecard.`,
      );
    }

    if (!session.spkProfile) {
      throw new NotFoundException(
        'SPK profile not built yet for this interview. Please wait for the pipeline to finish.',
      );
    }

    return SpkPayloadSchema.parse(session.spkProfile.spkPayload);
  }

  /**
   * Force-rebuild the SPK profile (useful after discrepancy updates).
   */
  async rebuildSpkProfile(interviewId: string): Promise<void> {
    // Verify the session exists first (so 404 is returned for bad IDs)
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    await this.buildSpkProfile(interviewId);
  }

  // ============================================================
  // Internal: build payload from DB snapshot
  // ============================================================
  private buildPayload(
    session: any,
    metadata: {
      seniority: string | null;
      primary_role: string | null;
      timezone: string | null;
      languages: string[] | null;
      years_of_experience: number | null;
    },
    verifiedSkills: string[],
  ): SpkPayload {
    const scorecard = session.scorecard;

    // Overall score (0-100)
    const dimensionCount = scorecard.dimensions.length || 1;
    const avgRaw =
      scorecard.dimensions.reduce((sum: number, d: any) => sum + d.score, 0) / dimensionCount;
    const overallScore = Math.round(avgRaw * 20); // 1-5 → 0-100

    // Dimensions
    const dimensions = scorecard.dimensions.map((d: any) => {
      const evidence = d.evidenceQuote as any;
      return {
        name: DIMENSION_NAME_MAP[d.dimensionType as keyof typeof DIMENSION_NAME_MAP],
        score: Math.round((d.score / 5) * 100), // 0-100
        raw_score: d.score,                      // 1-5
        reason: d.reason ?? undefined,
        evidence_quote: evidence?.quote ?? undefined,
        evidence_timestamp: evidence?.timestamp ?? undefined,
      };
    });

    // Recommended upskilling (from skillGaps)
    const recommendedUpskilling = scorecard.dimensions.flatMap((d: any) =>
      d.skillGaps.map((g: any) => ({
        skill: g.skillName,
        priority: g.priority as 'LOW' | 'MEDIUM' | 'HIGH',
      })),
    );

    // Dedupe upskilling by skill name
    const upskillMap = new Map<string, { skill: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' }>();
    for (const item of recommendedUpskilling) {
      if (!upskillMap.has(item.skill)) {
        upskillMap.set(item.skill, item);
      }
    }
    const uniqueUpskilling = Array.from(upskillMap.values());

    // Roadmap
    const roadmap = scorecard.roadmap
      ? scorecard.roadmap.items.map((item: any) => ({
          week: item.week,
          skill: item.skillGap.skillName,
          task: item.description,
          resource_url: item.resourceUrl ?? undefined,
        }))
      : [];

    // Discrepancies
    const discrepancies = scorecard.discrepancies.map((d: any) => ({
      field: d.claim,
      cv_says: d.cvQuote ?? '',
      interview_says: d.interviewQuote ?? '',
      status: DISCREPANCY_STATUS_MAP[d.status as keyof typeof DISCREPANCY_STATUS_MAP],
      confidence: d.confidence ?? 0,
    }));

    const pendingCount = scorecard.discrepancies.filter(
      (d: any) => d.status === 'PENDING',
    ).length;
    const humanReviewStatus = pendingCount === 0 ? 'approved' : 'pending';

    return {
      candidate_id: session.candidateId,
      candidate_name: session.candidate.name,
      overall_score: overallScore,
      confidence: scorecard.confidence ?? 0,
      dimensions,
      verified_skills: verifiedSkills,
      recommended_upskilling: uniqueUpskilling,
      roadmap,
      discrepancies,
      discrepancies_count: discrepancies.length,
      human_review_status: humanReviewStatus,
      seniority: metadata.seniority,
      primary_role: metadata.primary_role,
      timezone: metadata.timezone,
      languages: metadata.languages,
      years_of_experience: metadata.years_of_experience,
      generated_at: new Date().toISOString(),
      schema_version: SCHEMA_VERSION,
    };
  }
}