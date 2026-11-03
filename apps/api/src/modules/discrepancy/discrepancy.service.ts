import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildDiscrepancyPrompt } from './discrepancy.prompts';
import { DiscrepancyResponseSchema } from '@echogrow/shared';

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

  async saveDiscrepancies(scorecardId: string, discrepancies: any[]): Promise<void> {
    for (const d of discrepancies) {
      await this.prisma.discrepancy.create({
        data: {
          scorecardId,
          claim: d.field,
          cvQuote: d.cvQuote,
          interviewQuote: d.interviewQuote,
          confidence: d.confidence,
          status: 'PENDING',
        },
      });
    }
  }
}