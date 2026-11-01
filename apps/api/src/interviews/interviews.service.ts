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
    @InjectQueue('evaluation-queue') private readonly evaluationQueue: Queue,
  ) {}

  async upload(data: any) {
    // 1. check is schema good ZOD
    const parsed = CreateInterviewSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((e) => e.message).join(', '));
    }

    const { candidateName, candidateEmail, transcript, cv } = parsed.data;

    // 2. Calculate Hash
    const transcriptHash = createHash('sha256').update(transcript).digest('hex');
    const resumeHash = createHash('sha256').update(cv).digest('hex');

    // 3. Search for candidate OR create him
    let candidate = await this.prisma.candidate.findUnique({
      where: { email: candidateEmail },
    });

    if (!candidate) {
      candidate = await this.prisma.candidate.create({
        data: {
          name: candidateName,
          email: candidateEmail,
        },
      });
    }

    // 4. Create Intreview Session
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

    // 5. Add Task to Queue
    await this.evaluationQueue.add(
      'evaluate',
      { interviewId: session.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true },
    );

    // 6. Return Response Directly - No wait
    return { interviewId: session.id, status: 'queued' };
  }
}