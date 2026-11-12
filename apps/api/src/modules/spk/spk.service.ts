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

  async buildSpkProfile(interviewId: string): Promise<void> {
    this.logger.log(`[SPK] Building profile for interview ${interviewId}...`);

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

    // Mark as building so the frontend can poll for progress.
    await this.prisma.interviewSession.update({
      where: { id: interviewId },
      data: { spkStatus: 'building', spkError: null },
    });

    try {
      // ============================================================
      // LLM Call #1: extract metadata
      // ============================================================
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
        // ✅ Non-fatal: fall back to nulls so the SPK profile can still be built.
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

      // ============================================================
      // LLM Call #2: extract verified skills
      // ============================================================
      let verifiedSkills: string[] = [];
      try {
        const skillsPrompt = buildSpkVerifiedSkillsPrompt(session.transcript);
        const result = await this.llm.generate(skillsPrompt, SpkVerifiedSkillsSchema);
        verifiedSkills = result.verified_skills;
        this.logger.log(`[SPK] ${verifiedSkills.length} verified skills for ${interviewId}`);
      } catch (err: any) {
        // ✅ Non-fatal: fall back to empty list so the SPK profile can still be built.
        this.logger.warn(
          `[SPK] Verified skills extraction failed for ${interviewId}: ${err.message}. Using empty list.`,
        );
        verifiedSkills = [];
      }

      // Build payload with conflict resolution + sorted roadmap.
      const payload = this.buildPayload(session, metadata, verifiedSkills);

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

      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { spkStatus: 'ready', spkError: null },
      });

      this.logger.log(`[SPK] Profile saved for ${interviewId}`);
    } catch (err: any) {
      this.logger.error(`[SPK] Profile build failed for ${interviewId}: ${err.message}`);
      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { spkStatus: 'failed', spkError: err.message },
      });
      throw err;
    }
  }

  async getSpkExport(interviewId: string): Promise<SpkPayload> {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
      include: {
        scorecard: {
          include: { discrepancies: { select: { status: true } } },
        },
        spkProfile: true,
      },
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

    const payload = session.spkProfile.spkPayload as any;

    const discrepancies = session.scorecard?.discrepancies ?? [];
    const pendingCount = discrepancies.filter((d) => d.status === 'PENDING').length;
    const humanReviewStatus: 'approved' | 'pending' | 'rejected' =
      pendingCount === 0 ? 'approved' : 'pending';

    return SpkPayloadSchema.parse({
      ...payload,
      discrepancies_count: discrepancies.length,
      human_review_status: humanReviewStatus,
    });
  }

  async rebuildSpkProfile(interviewId: string): Promise<void> {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
      select: { id: true, status: true },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    if (session.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot rebuild SPK for an interview that is not COMPLETED (status: ${session.status}).`,
      );
    }

    await this.buildSpkProfile(interviewId);
  }

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

    const dimensionCount = scorecard.dimensions.length || 1;
    const avgRaw =
      scorecard.dimensions.reduce((sum: number, d: any) => sum + d.score, 0) / dimensionCount;
    const overallScore = Math.round(avgRaw * 20);

    const dimensions = scorecard.dimensions.map((d: any) => {
      const evidence = d.evidenceQuote as any;
      return {
        name: DIMENSION_NAME_MAP[d.dimensionType as keyof typeof DIMENSION_NAME_MAP],
        score: Math.round((d.score / 5) * 100),
        raw_score: d.score,
        reason: d.reason ?? undefined,
        evidence_quote: evidence?.quote ?? undefined,
        evidence_timestamp: evidence?.timestamp ?? undefined,
      };
    });

    const rawUpskilling = scorecard.dimensions.flatMap((d: any) =>
      d.skillGaps.map((g: any) => ({
        skill: g.skillName,
        priority: g.priority as 'LOW' | 'MEDIUM' | 'HIGH',
      })),
    );

    const upskillMap = new Map<string, { skill: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' }>();
    for (const item of rawUpskilling) {
      const key = item.skill.toLowerCase().trim();
      if (!upskillMap.has(key)) {
        upskillMap.set(key, item);
      }
    }
    const uniqueUpskilling = Array.from(upskillMap.values());

    const gapsLower = new Set(uniqueUpskilling.map((item) => item.skill.toLowerCase().trim()));

    const filteredVerifiedSkills = verifiedSkills.filter((skill) => {
      const skillLower = skill.toLowerCase().trim();
      for (const gap of gapsLower) {
        if (skillLower.includes(gap) || gap.includes(skillLower)) {
          return false;
        }
      }
      return true;
    });

    const roadmap = scorecard.roadmap
      ? scorecard.roadmap.items
          .map((item: any) => ({
            week: item.week,
            skill: item.skillGap.skillName,
            task: item.description,
            resource_url: item.resourceUrl ?? undefined,
          }))
          .sort((a: any, b: any) => a.week - b.week)
      : [];

    const discrepancies = scorecard.discrepancies.map((d: any) => ({
      field: d.claim,
      cv_says: d.cvQuote ?? '',
      interview_says: d.interviewQuote ?? '',
      status: DISCREPANCY_STATUS_MAP[d.status as keyof typeof DISCREPANCY_STATUS_MAP],
      confidence: d.confidence ?? 0,
      reviewer_notes: d.reviewerNotes ?? null,
    }));

    const pendingCount = scorecard.discrepancies.filter(
      (d: any) => d.status === 'PENDING',
    ).length;
    const humanReviewStatus: 'approved' | 'pending' | 'rejected' =
      pendingCount === 0 ? 'approved' : 'pending';

    return {
      candidate_id: session.candidateId,
      candidate_name: session.candidate.name,
      overall_score: overallScore,
      confidence: scorecard.confidence ?? 0,
      dimensions,
      verified_skills: filteredVerifiedSkills,
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