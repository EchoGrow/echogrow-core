import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsQuerySchema,
  AnalyticsDetailQuerySchema,
  type AnalyticsSummary,
  type AnalyticsRange,
  type InterviewsPerDay,
  type SkillCount,
  type DimensionAverages,
  type DiscrepancyClaimCount,
  type RecentInterview,
  type AnalyticsDetailType,
  type InterviewDetailItem,
  type CompletionBreakdownItem,
  type ProcessingTimeItem,
  type DiscrepancyDetailItem,
  type ScoreDetailItem,
  type SkillDetailItem,
  type NeedsReviewItem,
  type ScoreDistribution,
} from '@echogrow/shared';

/**
 * Manual review estimation constants.
 * These mirror the pipeline's saveTimeSaved() so analytics matches the
 * per-interview snapshot exactly.
 */
const MANUAL_CONSTANTS = {
  BASE_MINUTES: 5,
  TRANSCRIPT_WPM: 150,
  CV_WPM: 200,
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function computeManualReviewSeconds(transcript: string, resume: string): number {
  const manualMinutes =
    MANUAL_CONSTANTS.BASE_MINUTES +
    countWords(transcript) / MANUAL_CONSTANTS.TRANSCRIPT_WPM +
    countWords(resume) / MANUAL_CONSTANTS.CV_WPM;
  return Math.round(manualMinutes * 60);
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // Summary (main dashboard)
  // ============================================================
  async getSummary(rawQuery: unknown): Promise<AnalyticsSummary> {
    const parsed = AnalyticsQuerySchema.safeParse(rawQuery ?? {});
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues
          .map((e) => `${e.path.join('.') || 'query'}: ${e.message}`)
          .join(', '),
      );
    }

    const range: AnalyticsRange = parsed.data.range ?? '30d';
    const since = this.getSinceDate(range);

    this.logger.log(`Computing analytics summary for range "${range}"`);

    const [
      totalInterviews,
      completedInterviews,
      failedInterviews,
      needsReviewInterviews,
      rejectedInterviews,
      sessions,
      skillGaps,
      discrepancies,
      completedScorecards,
    ] = await Promise.all([
      this.prisma.interviewSession.count({
        where: since ? { createdAt: { gte: since } } : undefined,
      }),
      this.prisma.interviewSession.count({
        where: {
          status: 'COMPLETED',
          ...(since ? { createdAt: { gte: since } } : {}),
        },
      }),
      this.prisma.interviewSession.count({
        where: {
          status: 'FAILED',
          ...(since ? { createdAt: { gte: since } } : {}),
        },
      }),
      this.prisma.interviewSession.count({
        where: {
          status: 'NEEDS_REVIEW',
          ...(since ? { createdAt: { gte: since } } : {}),
        },
      }),
      this.prisma.interviewSession.count({
        where: {
          status: 'REJECTED',
          ...(since ? { createdAt: { gte: since } } : {}),
        },
      }),
      // ✅ Includes processingStartedAt, processingAttempts, transcript, resume
      this.prisma.interviewSession.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: { not: null },
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        select: {
          createdAt: true,
          completedAt: true,
          processingStartedAt: true,
          processingAttempts: true,
          transcript: true,
          resume: true,
        },
      }),
      this.prisma.skillGap.findMany({
        where: since ? { createdAt: { gte: since } } : undefined,
        select: { skillName: true, priority: true },
      }),
      this.prisma.discrepancy.findMany({
        where: since ? { createdAt: { gte: since } } : undefined,
        select: { claim: true, severity: true, status: true },
      }),
      this.prisma.scorecard.findMany({
        where: {
          interview: { status: 'COMPLETED' },
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        select: {
          overallScore: true,
          dimensions: { select: { dimensionType: true, score: true } },
        },
      }),
    ]);

    const completionRate =
      totalInterviews > 0
        ? Math.round((completedInterviews / totalInterviews) * 1000) / 10
        : 0;

    // ✅ Compute processing metrics (accurate, no outliers)
    const processingMetrics = sessions
      .filter((s) => s.completedAt)
      .map((s) => {
        const processingSeconds = Math.max(
          0,
          (s.completedAt!.getTime() - s.processingStartedAt.getTime()) / 1000,
        );
        const manualSeconds = computeManualReviewSeconds(s.transcript, s.resume);
        const savedSeconds = Math.max(0, manualSeconds - processingSeconds);
        return { processingSeconds, manualSeconds, savedSeconds };
      });

    const avgProcessingTimeSeconds =
      processingMetrics.length > 0
        ? Math.round(
            processingMetrics.reduce((a, b) => a + b.processingSeconds, 0) /
              processingMetrics.length,
          )
        : 0;

    // ✅ NEW: manual/saved averages (mirrors getProcessingTimes logic)
    const avgManualReviewSeconds =
      processingMetrics.length > 0
        ? Math.round(
            processingMetrics.reduce((a, b) => a + b.manualSeconds, 0) /
              processingMetrics.length,
          )
        : 0;

    const avgSavedSeconds =
      processingMetrics.length > 0
        ? Math.round(
            processingMetrics.reduce((a, b) => a + b.savedSeconds, 0) /
              processingMetrics.length,
          )
        : 0;

    // ✅ Retry tracking
    const retriedInterviews = sessions.filter(
      (s) => s.processingAttempts > 1,
    ).length;
    const avgProcessingAttempts =
      sessions.length > 0
        ? Math.round(
            (sessions.reduce((a, b) => a + b.processingAttempts, 0) /
              sessions.length) *
              100,
          ) / 100
        : 0;

    const avgDiscrepanciesPerInterview =
      completedInterviews > 0
        ? Math.round((discrepancies.length / completedInterviews) * 100) / 100
        : 0;

    const avgSkillGapsPerInterview =
      completedInterviews > 0
        ? Math.round((skillGaps.length / completedInterviews) * 100) / 100
        : 0;

    const overallScores = completedScorecards
      .map((s) => s.overallScore)
      .filter((s): s is number => typeof s === 'number');

    const avgOverallScore =
      overallScores.length > 0
        ? Math.round(
            (overallScores.reduce((a, b) => a + b, 0) / overallScores.length) *
              100,
          ) / 100
        : 0;

    // ============================================================
    // Chart 1: Top missing skills
    // ============================================================
    const skillMap = new Map<
      string,
      { count: number; priority: 'LOW' | 'MEDIUM' | 'HIGH' }
    >();
    const priorityRank = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;

    for (const gap of skillGaps) {
      const key = gap.skillName.trim();
      if (!key) continue;
      const existing = skillMap.get(key);
      const p = gap.priority as 'LOW' | 'MEDIUM' | 'HIGH';
      if (existing) {
        existing.count += 1;
        if (priorityRank[p] > priorityRank[existing.priority]) {
          existing.priority = p;
        }
      } else {
        skillMap.set(key, { count: 1, priority: p });
      }
    }

    const topMissingSkills: SkillCount[] = Array.from(skillMap.entries())
      .map(([skill, data]) => ({
        skill,
        count: data.count,
        priority: data.priority,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ============================================================
    // Chart 2: Interviews per day
    // ============================================================
    const dayWindow = this.getDayWindow(range);
    const dayMap = new Map<string, { count: number; completed: number }>();

    for (let i = dayWindow - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { count: 0, completed: 0 });
    }

    const allSessions = await this.prisma.interviewSession.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      select: { createdAt: true, status: true },
    });

    for (const s of allSessions) {
      const key = s.createdAt.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        entry.count += 1;
        if (s.status === 'COMPLETED') entry.completed += 1;
      }
    }

    const interviewsPerDay: InterviewsPerDay[] = Array.from(
      dayMap.entries(),
    ).map(([date, data]) => ({
      date,
      count: data.count,
      completed: data.completed,
    }));

    // ============================================================
    // Chart 3: Dimension averages
    // ============================================================
    const dimTotals = {
      TECHNICAL_DEPTH: { sum: 0, count: 0 },
      COMMUNICATION: { sum: 0, count: 0 },
      DOMAIN_EXPERIENCE: { sum: 0, count: 0 },
      PROBLEM_SOLVING: { sum: 0, count: 0 },
    };

    for (const sc of completedScorecards) {
      for (const dim of sc.dimensions) {
        const t = dim.dimensionType;
        if (t in dimTotals) {
          dimTotals[t as keyof typeof dimTotals].sum += dim.score;
          dimTotals[t as keyof typeof dimTotals].count += 1;
        }
      }
    }

    const avg = (s: number, c: number) =>
      c > 0 ? Math.round((s / c) * 100) / 100 : 0;

    const dimensionAverages: DimensionAverages = {
      technicalDepth: avg(
        dimTotals.TECHNICAL_DEPTH.sum,
        dimTotals.TECHNICAL_DEPTH.count,
      ),
      communication: avg(
        dimTotals.COMMUNICATION.sum,
        dimTotals.COMMUNICATION.count,
      ),
      domainExperience: avg(
        dimTotals.DOMAIN_EXPERIENCE.sum,
        dimTotals.DOMAIN_EXPERIENCE.count,
      ),
      problemSolving: avg(
        dimTotals.PROBLEM_SOLVING.sum,
        dimTotals.PROBLEM_SOLVING.count,
      ),
    };

    // ============================================================
    // Chart 4: Top discrepancy claims
    // ============================================================
    const claimMap = new Map<
      string,
      {
        count: number;
        highSeverityCount: number;
        mediumSeverityCount: number;
        lowSeverityCount: number;
      }
    >();

    for (const d of discrepancies) {
      const key = (d.claim ?? '').trim();
      if (!key) continue;
      const entry =
        claimMap.get(key) ?? {
          count: 0,
          highSeverityCount: 0,
          mediumSeverityCount: 0,
          lowSeverityCount: 0,
        };
      entry.count += 1;
      if (d.severity === 'HIGH') entry.highSeverityCount += 1;
      else if (d.severity === 'MEDIUM') entry.mediumSeverityCount += 1;
      else entry.lowSeverityCount += 1;
      claimMap.set(key, entry);
    }

    const topDiscrepancyClaims: DiscrepancyClaimCount[] = Array.from(
      claimMap.entries(),
    )
      .map(([claim, data]) => ({ claim, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ============================================================
    // Recent interviews
    // ============================================================
    const recentSessions = await this.prisma.interviewSession.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      include: {
        candidate: { select: { name: true, email: true } },
        scorecard: {
          select: {
            overallScore: true,
            discrepancies: { select: { status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentInterviews: RecentInterview[] = recentSessions.map((s) => ({
      id: s.id,
      candidateName: s.candidate.name,
      candidateEmail: s.candidate.email,
      status: s.status,
      overallScore:
        s.status === 'COMPLETED' ? (s.scorecard?.overallScore ?? null) : null,
      pendingDiscrepancies:
        s.scorecard?.discrepancies.filter((d) => d.status === 'PENDING')
          .length ?? 0,
      completedAt: s.completedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      processingAttempts: s.processingAttempts,
    }));

    return {
      generatedAt: new Date().toISOString(),
      range,
      kpis: {
        totalInterviews,
        completedInterviews,
        failedInterviews,
        needsReviewInterviews,
        rejectedInterviews,
        completionRate,
        avgProcessingTimeSeconds,
        avgManualReviewSeconds, // ✅ NEW
        avgSavedSeconds, // ✅ NEW
        retriedInterviews,
        avgProcessingAttempts,
        avgDiscrepanciesPerInterview,
        avgSkillGapsPerInterview,
        avgOverallScore,
      },
      charts: {
        topMissingSkills,
        interviewsPerDay,
        dimensionAverages,
        topDiscrepancyClaims,
      },
      tables: {
        recentInterviews,
      },
    };
  }

  // ============================================================
  // Detail endpoint (for Modals)
  // ============================================================
  async getDetails(rawQuery: unknown): Promise<any> {
    const parsed = AnalyticsDetailQuerySchema.safeParse(rawQuery ?? {});
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues
          .map((e) => `${e.path.join('.') || 'query'}: ${e.message}`)
          .join(', '),
      );
    }

    const { type, range, status } = parsed.data;
    const since = this.getSinceDate(range as AnalyticsRange);

    this.logger.log(`Fetching analytics details for type "${type}"`);

    switch (type) {
      case 'interviews':
        return this.getInterviewsDetail(since, status);
      case 'completion-breakdown':
        return this.getCompletionBreakdown(since);
      case 'processing-times':
        return this.getProcessingTimes(since);
      case 'discrepancies':
        return this.getDiscrepanciesDetail(since);
      case 'scores':
        return this.getScoresDetail(since);
      case 'skills':
        return this.getSkillsDetail(since);
      case 'needs-review':
        return this.getNeedsReviewDetail(since);
      default:
        throw new BadRequestException(`Unknown type: ${type}`);
    }
  }

  private async getInterviewsDetail(since: Date | null, status?: string) {
    const where: any = {};
    if (since) where.createdAt = { gte: since };
    if (status) where.status = status;

    const sessions = await this.prisma.interviewSession.findMany({
      where,
      include: {
        candidate: { select: { name: true, email: true } },
        scorecard: {
          select: {
            overallScore: true,
            discrepancies: { select: { status: true } },
            roadmap: { select: { items: { select: { id: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const items: InterviewDetailItem[] = sessions.map((s) => ({
      id: s.id,
      candidateName: s.candidate.name,
      candidateEmail: s.candidate.email,
      status: s.status,
      overallScore:
        s.status === 'COMPLETED' ? (s.scorecard?.overallScore ?? null) : null,
      pendingDiscrepancies:
        s.scorecard?.discrepancies.filter((d) => d.status === 'PENDING')
          .length ?? 0,
      totalDiscrepancies: s.scorecard?.discrepancies.length ?? 0,
      skillGaps: s.scorecard?.roadmap?.items.length ?? 0,
      createdAt: s.createdAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
      processingAttempts: s.processingAttempts,
    }));

    return { items, total: items.length };
  }

  private async getCompletionBreakdown(since: Date | null) {
    const statuses = ['COMPLETED', 'FAILED', 'NEEDS_REVIEW', 'REJECTED'];
    const counts = await Promise.all(
      statuses.map((st) =>
        this.prisma.interviewSession.count({
          where: {
            status: st as any,
            ...(since ? { createdAt: { gte: since } } : {}),
          },
        }),
      ),
    );

    const total = counts.reduce((a, b) => a + b, 0);
    const items: CompletionBreakdownItem[] = statuses.map((st, i) => ({
      status: st,
      count: counts[i],
      percentage: total > 0 ? Math.round((counts[i] / total) * 1000) / 10 : 0,
    }));

    return {
      total,
      items,
      formula: 'Completion rate = (COMPLETED / Total) × 100',
    };
  }

  private async getProcessingTimes(since: Date | null) {
    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { not: null },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      include: {
        candidate: { select: { name: true, email: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    const items: ProcessingTimeItem[] = sessions.map((s) => {
      const processingSeconds = Math.max(
        0,
        (s.completedAt!.getTime() - s.processingStartedAt.getTime()) / 1000,
      );
      const manualReviewSeconds = computeManualReviewSeconds(
        s.transcript,
        s.resume,
      );
      const savedSeconds = Math.max(0, manualReviewSeconds - processingSeconds);
      const savingsPercent =
        manualReviewSeconds > 0
          ? Math.round((savedSeconds / manualReviewSeconds) * 1000) / 10
          : 0;

      return {
        interviewId: s.id,
        candidateName: s.candidate.name,
        candidateEmail: s.candidate.email,
        processingSeconds: Math.round(processingSeconds),
        manualReviewSeconds,
        savedSeconds: Math.round(savedSeconds),
        savingsPercent,
        completedAt: s.completedAt?.toISOString() ?? null,
        processingAttempts: s.processingAttempts,
      };
    });

    const avgProcessingSeconds =
      items.length > 0
        ? Math.round(
            items.reduce((a, b) => a + b.processingSeconds, 0) / items.length,
          )
        : 0;

    const avgManualSeconds =
      items.length > 0
        ? Math.round(
            items.reduce((a, b) => a + b.manualReviewSeconds, 0) / items.length,
          )
        : 0;

    const totalSavedSeconds = items.reduce((a, b) => a + b.savedSeconds, 0);

    return {
      items,
      avgProcessingSeconds,
      avgManualSeconds,
      totalSavedSeconds,
    };
  }

  private async getDiscrepanciesDetail(since: Date | null) {
    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        status: 'COMPLETED',
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      include: {
        candidate: { select: { name: true, email: true } },
        scorecard: {
          include: {
            discrepancies: {
              select: { status: true, severity: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: DiscrepancyDetailItem[] = sessions
      .filter((s) => s.scorecard)
      .map((s) => {
        const disc = s.scorecard!.discrepancies;
        return {
          interviewId: s.id,
          candidateName: s.candidate.name,
          candidateEmail: s.candidate.email,
          total: disc.length,
          pending: disc.filter((d) => d.status === 'PENDING').length,
          confirmed: disc.filter((d) => d.status === 'CONFIRMED').length,
          dismissed: disc.filter((d) => d.status === 'DISMISSED').length,
          high: disc.filter((d) => d.severity === 'HIGH').length,
          medium: disc.filter((d) => d.severity === 'MEDIUM').length,
          low: disc.filter((d) => d.severity === 'LOW').length,
        };
      });

    return {
      items,
      totalDiscrepancies: items.reduce((a, b) => a + b.total, 0),
      totalPending: items.reduce((a, b) => a + b.pending, 0),
      totalConfirmed: items.reduce((a, b) => a + b.confirmed, 0),
      totalDismissed: items.reduce((a, b) => a + b.dismissed, 0),
    };
  }

  private async getScoresDetail(since: Date | null) {
    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        status: 'COMPLETED',
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      include: {
        candidate: { select: { name: true } },
        scorecard: {
          include: {
            dimensions: { select: { dimensionType: true, score: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: ScoreDetailItem[] = sessions
      .filter((s) => s.scorecard)
      .map((s) => {
        const dims = s.scorecard!.dimensions;
        const get = (t: string) =>
          dims.find((d) => d.dimensionType === t)?.score ?? null;

        return {
          interviewId: s.id,
          candidateName: s.candidate.name,
          overallScore: s.scorecard!.overallScore ?? null,
          technicalDepth: get('TECHNICAL_DEPTH'),
          communication: get('COMMUNICATION'),
          domainExperience: get('DOMAIN_EXPERIENCE'),
          problemSolving: get('PROBLEM_SOLVING'),
          confidence: s.scorecard!.confidence ?? null,
        };
      });

    const distMap = new Map<number, number>();
    for (let i = 1; i <= 5; i++) distMap.set(i, 0);
    for (const item of items) {
      if (item.overallScore !== null) {
        const rounded = Math.round(item.overallScore);
        distMap.set(rounded, (distMap.get(rounded) ?? 0) + 1);
      }
    }
    const distribution: ScoreDistribution[] = Array.from(
      distMap.entries(),
    ).map(([score, count]) => ({ score, count }));

    const scores = items
      .map((i) => i.overallScore)
      .filter((s): s is number => s !== null);
    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
          100
        : 0;

    return { items, distribution, avgScore };
  }

  private async getSkillsDetail(since: Date | null) {
    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        status: 'COMPLETED',
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      include: {
        candidate: { select: { name: true } },
        scorecard: {
          include: {
            dimensions: { include: { skillGaps: true } },
          },
        },
      },
    });

    const items: SkillDetailItem[] = sessions
      .filter((s) => s.scorecard)
      .map((s) => {
        const skillNames = s.scorecard!.dimensions.flatMap((d) =>
          d.skillGaps.map((g) => g.skillName),
        );
        return {
          interviewId: s.id,
          candidateName: s.candidate.name,
          skillNames,
          count: skillNames.length,
        };
      });

    const skillCount = new Map<string, number>();
    for (const item of items) {
      for (const skill of item.skillNames) {
        skillCount.set(skill, (skillCount.get(skill) ?? 0) + 1);
      }
    }
    const topSkills: SkillCount[] = Array.from(skillCount.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return { items, topSkills };
  }

  private async getNeedsReviewDetail(since: Date | null) {
    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        status: 'NEEDS_REVIEW',
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      include: {
        candidate: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: NeedsReviewItem[] = sessions.map((s) => ({
      id: s.id,
      candidateName: s.candidate.name,
      candidateEmail: s.candidate.email,
      confidence: null,
      transcriptWords: s.transcript.trim().split(/\s+/).filter(Boolean).length,
      createdAt: s.createdAt.toISOString(),
    }));

    return { items };
  }

  private getSinceDate(range: AnalyticsRange): Date | null {
    if (range === 'all') return null;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }

  private getDayWindow(range: AnalyticsRange): number {
    if (range === '7d') return 7;
    if (range === '30d') return 30;
    if (range === '90d') return 90;
    return 30;
  }
}