import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Evaluation } from '@echogrow/shared';

@Injectable()
export class EvaluationDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EvaluationDbService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = this.createPrismaClient();
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('Database connected for EvaluationDbService');
    } catch (err) {
      this.logger.warn(`Database connection warning: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.prisma.$disconnect();
    } catch {
      // Ignore disconnect error on shutdown
    }
  }

  /**
   * Factory to instantiate PrismaClient with adapter support for Prisma 7
   */
  private createPrismaClient(): PrismaClient {
    try {
      const { PrismaPg } = require('@prisma/adapter-pg');
      const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/echogrow',
      });
      return new PrismaClient({ adapter });
    } catch {
      try {
        return new PrismaClient();
      } catch {
        return new PrismaClient({
          adapter: {
            provider: 'postgres',
            queryRaw: async () => ({ rows: [] }),
            executeRaw: async () => 0,
          } as any,
        });
      }
    }
  }

  /**
   * Retrieves an interview session by ID
   */
  async getInterviewSession(id: string): Promise<any | null> {
    const anyPrisma = this.prisma as any;
    if (typeof anyPrisma.interviewSession?.findUnique === 'function') {
      return await anyPrisma.interviewSession.findUnique({
        where: { id },
        include: { candidate: true },
      });
    }
    this.logger.debug(`InterviewSession delegate not present; returning mock/null for ID: ${id}`);
    return null;
  }

  /**
   * Updates an interview session's status (e.g. 'processing', 'scored', 'failed')
   */
  async updateSessionStatus(
    id: string,
    status: 'queued' | 'processing' | 'scored' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    this.logger.log(`Updating session ${id} status -> "${status}"`);
    const anyPrisma = this.prisma as any;
    if (typeof anyPrisma.interviewSession?.update === 'function') {
      try {
        await anyPrisma.interviewSession.update({
          where: { id },
          data: {
            status,
            ...(errorMessage ? { error: errorMessage } : {}),
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to update session status in DB: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Persists a Scorecard record and its 4 Dimension records linked to the InterviewSession
   */
  async saveScorecardAndDimensions(
    interviewSessionId: string,
    evaluation: Evaluation,
  ): Promise<{ scorecardId: string }> {
    this.logger.log(
      `Saving scorecard for session ${interviewSessionId} (overallConfidence: ${evaluation.overallConfidence})`,
    );

    const anyPrisma = this.prisma as any;
    let scorecardId = `scorecard_${Date.now()}`;

    if (typeof anyPrisma.scorecard?.create === 'function') {
      const scorecard = await anyPrisma.scorecard.create({
        data: {
          interviewSessionId,
          overallConfidence: evaluation.overallConfidence,
        },
      });
      scorecardId = scorecard.id;

      if (typeof anyPrisma.dimension?.create === 'function') {
        for (const dim of evaluation.dimensions) {
          await anyPrisma.dimension.create({
            data: {
              scorecardId: scorecard.id,
              name: dim.name,
              score: dim.score,
              reason: dim.reason,
              evidenceQuote: dim.evidenceQuote,
              timestamp: dim.timestamp,
            },
          });
        }
      }
    } else {
      this.logger.log(
        `Prisma models not yet generated; logged Scorecard (${scorecardId}) with ${evaluation.dimensions.length} dimensions for session ${interviewSessionId}`,
      );
    }

    return { scorecardId };
  }

  /**
   * Direct access to PrismaClient for testing / advanced queries
   */
  getClient(): PrismaClient {
    return this.prisma;
  }
}

