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
      const scorecard = session.scorecard;

      // ============================================================
      // LLM Call #1: extract metadata (seniority, role, timezone, languages)
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
        // Non-fatal: fall back to nulls so the SPK profile can still be built.
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
      // LLM Call #2: extract verified skills (skills the candidate PROVED)
      // ============================================================
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

    // Recompute dynamic fields from the CURRENT DB state.
    // Reason: a reviewer can confirm/dismiss discrepancies AFTER the SPK was built.
    // The stored payload would otherwise return a stale human_review_status and count.
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

  /**
   * Builds the SPK payload.
   *
   * Key rules applied here:
   * 1. A skill that appears in `recommended_upskilling` (a gap) is REMOVED from
   *    `verified_skills`. Gaps stay as gaps. This prevents Docker from showing
   *    up in both lists.
   * 2. The roadmap is sorted by `week` ascending, so consumers always receive
   *    Week 1 → Week N in order.
   */
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

    // ---- Dimensions (0-100 score) -------------------------------------------
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

    // ---- Step 1: collect gaps from the scorecard ----------------------------
    const rawUpskilling = scorecard.dimensions.flatMap((d: any) =>
      d.skillGaps.map((g: any) => ({
        skill: g.skillName,
        priority: g.priority as 'LOW' | 'MEDIUM' | 'HIGH',
      })),
    );

    // ---- Step 2: dedupe gaps by lowercase name ------------------------------
    const upskillMap = new Map<string, { skill: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' }>();
    for (const item of rawUpskilling) {
      const key = item.skill.toLowerCase().trim();
      if (!upskillMap.has(key)) {
        upskillMap.set(key, item);
      }
    }
    const uniqueUpskilling = Array.from(upskillMap.values());

    // ---- Step 3: build a lowercase set of gap skills ------------------------
    const gapsLower = new Set(uniqueUpskilling.map((item) => item.skill.toLowerCase().trim()));

    // ---- Step 4: remove from `verified_skills` any skill that is a gap ------
    // Use partial match (substring) so "Docker" (gap) also catches
    // "Dockerfile", "Docker Compose", "Docker Swarm", etc. in verified skills.
    // Rule from the product brief: "gaps keep gaps, and remove them from verified".
    const filteredVerifiedSkills = verifiedSkills.filter((skill) => {
      const skillLower = skill.toLowerCase().trim();
      for (const gap of gapsLower) {
        if (skillLower.includes(gap) || gap.includes(skillLower)) {
          return false; // This verified skill is actually a gap → drop it.
        }
      }
      return true;
    });

    // ---- Step 5: build roadmap, sorted by week ascending --------------------
    // Sorting ensures consumers see Week 1 → Week N in order, regardless of
    // the order the LLM returned them in.
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

    // ---- Step 6: discrepancies (embedded for audit) ------------------------
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
    const humanReviewStatus: 'approved' | 'pending' | 'rejected' =
      pendingCount === 0 ? 'approved' : 'pending';

    // ---- Final payload -----------------------------------------------------
    return {
      candidate_id: session.candidateId,
      candidate_name: session.candidate.name,
      overall_score: overallScore,
      confidence: scorecard.confidence ?? 0,
      dimensions,
      // Verified skills, minus any that are also gaps.
      verified_skills: filteredVerifiedSkills,
      // Gaps stay as gaps (not filtered).
      recommended_upskilling: uniqueUpskilling,
      // Roadmap sorted by week ascending.
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