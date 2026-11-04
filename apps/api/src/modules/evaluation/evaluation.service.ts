import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { EvaluationSchema } from '@echogrow/shared';
import { buildEvaluationPrompt } from './evaluation.prompts';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  async updateStatus(
    interviewId: string,
    status: 'PROCESSING' | 'SCORED' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW' | 'REJECTED',
  ) {
    await this.prisma.interviewSession.update({
      where: { id: interviewId },
      data: { status },
    });
  }

  async evaluate(transcript: string, resume: string): Promise<any> {
    const prompt = buildEvaluationPrompt(transcript, resume);
    return await this.llm.generate(prompt, EvaluationSchema);
  }

  async saveScorecard(interviewId: string, evaluation: any): Promise<{ scorecardId: string }> {
    const overallScore =
      evaluation.dimensions.reduce((sum: number, d: any) => sum + d.score, 0) / 4;
    const scorecard = await this.prisma.scorecard.create({
      data: {
        interviewId,
        overallScore,
        confidence: evaluation.overallConfidence,
        dimensions: {
          create: evaluation.dimensions.map((d: any) => ({
            dimensionType: this.mapDimensionType(d.name),
            score: d.score,
            reason: d.reason,
            evidenceQuote: {
              quote: d.evidenceQuote,
              timestamp: d.timestamp,
              speaker: 'Candidate',
            },
          })),
        },
      },
    });
    return { scorecardId: scorecard.id };
  }

  private mapDimensionType(name: string): any {
    switch (name) {
      case 'Technical Depth':
        return 'TECHNICAL_DEPTH';
      case 'Communication Clarity':
        return 'COMMUNICATION';
      case 'Domain Experience':
        return 'DOMAIN_EXPERIENCE';
      case 'Problem Solving':
        return 'PROBLEM_SOLVING';
      default:
        return 'TECHNICAL_DEPTH';
    }
  }
}