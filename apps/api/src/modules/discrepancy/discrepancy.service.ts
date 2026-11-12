import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { SpkService } from '../spk/spk.service';
import { buildDiscrepancyPrompt } from './discrepancy.prompts';
import {
  DiscrepancyItem,
  DiscrepancyResponseSchema,
  DiscrepancyStatusResponseSchema,
  DiscrepancyStatusUpdate,
  DiscrepancyStatusUpdateSchema,
} from '@echogrow/shared';

const SEVERITY_MAP = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
} as const;

@Injectable()
export class DiscrepancyService {
  private readonly logger = new Logger(DiscrepancyService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly prisma: PrismaService,
    private readonly spkService: SpkService,
  ) {}

  async detect(cv: string, transcript: string): Promise<DiscrepancyItem[]> {
    const prompt = buildDiscrepancyPrompt(cv, transcript);
    const result = await this.llm.generate(prompt, DiscrepancyResponseSchema);
    this.logger.log(`Detected ${result.discrepancies.length} discrepancies`);
    return result.discrepancies;
  }

  /**
   * Idempotent: deletes any existing PENDING discrepancies for this scorecard
   * before creating new ones. Keeps CONFIRMED/DISMISSED ones untouched.
   */
  async saveDiscrepancies(
    scorecardId: string,
    discrepancies: DiscrepancyItem[],
  ): Promise<void> {
    const deleted = await this.prisma.discrepancy.deleteMany({
      where: { scorecardId, status: 'PENDING' },
    });

    if (deleted.count > 0) {
      this.logger.log(
        `[Discrepancy] Removed ${deleted.count} stale PENDING discrepancies for scorecard ${scorecardId}`,
      );
    }

    if (discrepancies.length === 0) {
      this.logger.log(`[Discrepancy] No new discrepancies to save.`);
      return;
    }

    await this.prisma.discrepancy.createMany({
      data: discrepancies.map((d) => ({
        scorecardId,
        claim: d.field,
        cvQuote: d.cvQuote,
        interviewQuote: d.interviewQuote,
        confidence: d.confidence,
        status: 'PENDING',
        severity: SEVERITY_MAP[d.severity],
      })),
    });

    this.logger.log(
      `[Discrepancy] Saved ${discrepancies.length} new discrepancies.`,
    );
  }

  /**
   * Updates a discrepancy's status (confirmed / dismissed).
   *
   * After the update, we count the remaining PENDING discrepancies for this
   * scorecard. If the count reaches 0, we rebuild the SPK profile so Agent
   * David sees human_review_status: "approved".
   *
   * If the count is still > 0, we do NOT rebuild — the SPK keeps its current
   * state (human_review_status: "pending"), and the reviewer can use the
   * manual "Rebuild SPK now" button to rebuild early if needed.
   *
   * This design ensures exactly ONE rebuild after all discrepancies have been
   * reviewed, regardless of how many discrepancies there are or how long the
   * reviewer takes per decision.
   */
  async updateStatus(id: string, body: DiscrepancyStatusUpdate) {
    const parsed = DiscrepancyStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((e) => e.message).join(', '),
      );
    }

    const discrepancy = await this.prisma.discrepancy.findUnique({
      where: { id },
      select: {
        id: true,
        scorecardId: true,
        scorecard: {
          select: {
            interviewId: true,
            interview: {
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    if (!discrepancy) {
      this.logger.log(`Discrepancy with ID ${id} not found`);
      throw new NotFoundException('Discrepancy not found');
    }

    const updated = await this.prisma.discrepancy.update({
      where: { id },
      data: {
        status: parsed.data.status.toUpperCase() as 'CONFIRMED' | 'DISMISSED',
        reviewedAt: new Date(),
        reviewerNotes: parsed.data.reviewerNotes ?? null,
      },
    });

    const interview = discrepancy.scorecard?.interview;

    // Only consider rebuild if the interview is COMPLETED.
    if (interview?.status === 'COMPLETED') {
      // Count remaining PENDING discrepancies for this scorecard.
      const pendingCount = await this.prisma.discrepancy.count({
        where: {
          scorecardId: discrepancy.scorecardId,
          status: 'PENDING',
        },
      });

      this.logger.log(
        `[Discrepancy] ${pendingCount} pending discrepancies left for scorecard ${discrepancy.scorecardId}`,
      );

      if (pendingCount === 0) {
        // All reviewed → rebuild SPK so human_review_status becomes "approved".
        this.logger.log(
          `[Discrepancy] All discrepancies reviewed — triggering SPK rebuild for interview ${interview.id}`,
        );
        this.spkService.rebuildSpkProfile(interview.id).catch((cause: unknown) => {
          const message = cause instanceof Error ? cause.message : String(cause);
          this.logger.error(
            `[Discrepancy] SPK rebuild failed for interview ${interview.id}: ${message}`,
          );
        });
      } else {
        // Still pending — do NOT rebuild. The reviewer can use the manual
        // "Rebuild SPK now" button if they want an early rebuild.
        this.logger.log(
          `[Discrepancy] ${pendingCount} still pending — skipping automatic SPK rebuild.`,
        );
      }
    } else {
      this.logger.log(
        `[Discrepancy] Interview ${interview?.id ?? 'unknown'} is not COMPLETED (status: ${interview?.status ?? 'n/a'}). Skipping SPK rebuild.`,
      );
    }

    return DiscrepancyStatusResponseSchema.parse(updated);
  }
}