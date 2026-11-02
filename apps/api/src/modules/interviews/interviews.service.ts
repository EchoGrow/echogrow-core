import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateInterviewSchema } from '@echogrow/shared';
import { createHash } from 'crypto';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('evaluation') private readonly evaluationQueue: Queue,
  ) {}

  async upload(data: any) {
    const parsed = CreateInterviewSchema.safeParse(data);
    if (!parsed.success) {
      // تم إصلاح خطأ 'e'
      throw new BadRequestException(parsed.error.issues.map((e: any) => e.message).join(', '));
    }

    const { candidateName, candidateEmail, transcript, cv } = parsed.data;
    const transcriptHash = createHash('sha256').update(transcript).digest('hex');
    const resumeHash = createHash('sha256').update(cv).digest('hex');

    let candidate = await this.prisma.candidate.findUnique({ where: { email: candidateEmail } });
    if (!candidate) {
      candidate = await this.prisma.candidate.create({
        data: { name: candidateName, email: candidateEmail },
      });
    }

    const session = await this.prisma.interviewSession.create({
      data: {
        candidateId: candidate.id,
        transcript,
        transcriptHash,
        resume: cv,
        resumeHash,
        status: 'QUEUED',
      },
    });

    await this.evaluationQueue.add(
      'evaluate',
      { interviewId: session.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true },
    );

    return { interviewId: session.id, status: 'queued' };
  }
}