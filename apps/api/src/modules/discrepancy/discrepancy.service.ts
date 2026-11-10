import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
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
  ) {}

  async detect(cv: string, transcript: string): Promise<any[]> {
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
        severity: SEVERITY_MAP[d.severity as keyof typeof SEVERITY_MAP],
      })),
    });

    this.logger.log(
      `[Discrepancy] Saved ${discrepancies.length} new discrepancies.`,
    );
  }

  async updateStatus(id: string, body: DiscrepancyStatusUpdate) {
    const parsed = DiscrepancyStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((e) => e.message).join(', '),
      );
    }

    const discrepancy = await this.prisma.discrepancy.findUnique({
      where: { id },
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
        reviewerNotes: parsed.data.reviewerNotes,
      },
    });

    return DiscrepancyStatusResponseSchema.parse(updated);
  }
}