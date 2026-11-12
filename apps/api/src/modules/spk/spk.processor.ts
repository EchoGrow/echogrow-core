import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SPK_QUEUE_NAME } from './spk.constants';
import { SpkService } from './spk.service';

interface SpkJobData {
  interviewId: string;
}

@Processor(SPK_QUEUE_NAME, {
  concurrency: 1, 
  lockDuration: 300_000,
})
export class SpkProcessor extends WorkerHost {
  private readonly logger = new Logger(SpkProcessor.name);

  constructor(private readonly spkService: SpkService) {
    super();
  }

  async process(job: Job<SpkJobData>): Promise<any> {
    const { interviewId } = job.data;
    if (!interviewId) throw new Error('Missing interviewId in SPK job');

    this.logger.log(`[SPK Processor] Started for interview ${interviewId}`);

    try {
      await this.spkService.buildSpkProfile(interviewId);
      this.logger.log(`[SPK Processor] Completed for interview ${interviewId}`);
      return { success: true, interviewId };
    } catch (error: any) {
      this.logger.error(
        `[SPK Processor] Failed for interview ${interviewId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}