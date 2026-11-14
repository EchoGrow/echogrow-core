import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { buildComparisonPrompt } from './compare.prompts';
import {
  ComparisonResultSchema,
  CompareRequestSchema,
  type ComparisonResult,
  type CompareRequest,
} from '@echogrow/shared';

@Injectable()
export class CompareService {
  private readonly logger = new Logger(CompareService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  async compare(data: any): Promise<{ id: string; result: ComparisonResult }> {
    const parsed = CompareRequestSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues
          .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
          .join(', '),
      );
    }

    const { interviewIds, targetRole }: CompareRequest = parsed.data;

    const uniqueIds = Array.from(new Set(interviewIds));
    if (uniqueIds.length !== interviewIds.length) {
      throw new BadRequestException('Duplicate interview IDs are not allowed.');
    }

    this.logger.log(
      `Comparing ${interviewIds.length} candidates${
        targetRole ? ` for role "${targetRole}"` : ''
      }...`,
    );

    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        id: { in: interviewIds },
        status: 'COMPLETED',
      },
      include: {
        candidate: true,
        scorecard: {
          include: {
            dimensions: true,
            discrepancies: true,
            roadmap: {
              include: {
                items: { include: { skillGap: true } },
              },
            },
          },
        },
      },
    });

    if (sessions.length !== interviewIds.length) {
      const found = new Set(sessions.map((s) => s.id));
      const missing = interviewIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Some interviews are not COMPLETED or not found: ${missing.join(', ')}`,
      );
    }

    if (sessions.some((s) => !s.scorecard)) {
      throw new BadRequestException(
        'All interviews must have a completed scorecard.',
      );
    }

    const comparison = await this.prisma.comparison.create({
      data: {
        targetRole: targetRole ?? null,
        status: 'PROCESSING',
        candidateCount: sessions.length,
        interviews: {
          create: interviewIds.map((id) => ({ interviewId: id })),
        },
      },
    });

    try {
      const prompt = buildComparisonPrompt(sessions as any, targetRole);
      const result = await this.llm.generate(prompt, ComparisonResultSchema);

      await this.prisma.$transaction([
        this.prisma.comparison.update({
          where: { id: comparison.id },
          data: {
            status: 'COMPLETED',
            confidence: result.confidence,
            summary: result.summary,
            recommendation: result.recommendation,
            result: result as any,
            completedAt: new Date(),
          },
        }),
        this.prisma.comparisonRanking.createMany({
          data: result.ranking.map((r) => ({
            comparisonId: comparison.id,
            interviewId: r.interviewId,
            rank: r.rank,
            reason: r.reason,
            fitScore: r.fitScore ?? null,
          })),
        }),
        ...result.ranking.map((r) =>
          this.prisma.comparisonInterview.updateMany({
            where: {
              comparisonId: comparison.id,
              interviewId: r.interviewId,
            },
            data: { rank: r.rank, fitScore: r.fitScore ?? null },
          }),
        ),
      ]);

      this.logger.log(
        `Comparison ${comparison.id} completed (confidence: ${result.confidence})`,
      );

      return { id: comparison.id, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Comparison ${comparison.id} failed: ${message}`);

      await this.prisma.comparison.update({
        where: { id: comparison.id },
        data: {
          status: 'FAILED',
          error: message,
        },
      });

      throw error;
    }
  }

  async findById(id: string) {
    const comparison = await this.prisma.comparison.findUnique({
      where: { id },
      include: {
        interviews: {
          include: {
            interview: {
              include: { candidate: true },
            },
          },
          orderBy: { rank: 'asc' },
        },
        rankings: {
          orderBy: { rank: 'asc' },
        },
      },
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found.');
    }

    return {
      id: comparison.id,
      targetRole: comparison.targetRole,
      status: comparison.status,
      error: comparison.error,
      candidateCount: comparison.candidateCount,
      confidence: comparison.confidence,
      summary: comparison.summary,
      recommendation: comparison.recommendation,
      result: comparison.result as ComparisonResult | null,
      interviews: comparison.interviews.map((ci) => ({
        interviewId: ci.interviewId,
        candidateName: ci.interview.candidate.name,
        candidateEmail: ci.interview.candidate.email,
        rank: ci.rank,
        fitScore: ci.fitScore,
      })),
      rankings: comparison.rankings.map((r) => ({
        interviewId: r.interviewId,
        rank: r.rank,
        reason: r.reason,
        fitScore: r.fitScore,
      })),
      createdAt: comparison.createdAt.toISOString(),
      completedAt: comparison.completedAt?.toISOString() ?? null,
    };
  }
}