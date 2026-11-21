import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { InterviewsService } from './interviews.service';
import { Throttle } from '@nestjs/throttler';

const MAX_CANDIDATES = 50;
const MAX_FILES = MAX_CANDIDATES * 2;

// Strict per-route limits are relaxed in tests so the existing e2e suites can
// issue many requests from a single IP. The global limit is already 1000 there.
const WRITE_LIMIT = process.env.NODE_ENV === 'test' ? 1000 : 10;
const BULK_UPLOAD_LIMIT = process.env.NODE_ENV === 'test' ? 1000 : 5;

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  async list() {
    return this.interviewsService.findAllCompleted();
  }

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async upload(@Body() body: any) {
    return this.interviewsService.upload(body);
  }

  @Post('bulk-upload')
  @Throttle({ default: { limit: BULK_UPLOAD_LIMIT, ttl: 60000 } })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async bulkUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('metadata') metadataRaw: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'No files were uploaded. Provide a "files" array with at least one transcript and one resume.',
      );
    }

    if (!metadataRaw) {
      throw new BadRequestException('Missing "metadata" field (JSON string).');
    }

    let metadata: unknown;
    try {
      metadata = JSON.parse(metadataRaw);
    } catch {
      throw new BadRequestException(
        'Invalid "metadata" JSON. Could not parse. Make sure it is a valid JSON array of candidates.',
      );
    }

    if (!Array.isArray(metadata)) {
      throw new BadRequestException('Metadata must be a JSON array of candidates.');
    }

    if (metadata.length === 0) {
      throw new BadRequestException('Metadata array is empty. Provide at least one candidate.');
    }

    if (metadata.length > MAX_CANDIDATES) {
      throw new BadRequestException(
        `Too many candidates (${metadata.length}). Maximum is ${MAX_CANDIDATES} per request. Split the upload into smaller batches.`,
      );
    }

    return this.interviewsService.bulkUpload(files, metadata);
  }

  // One request for the whole shortlist instead of one per pending row.
  // Keeps bulk polling at a constant request rate regardless of candidate count.
  @Get('scorecards')
  async getScorecards(@Query('ids') ids: string) {
    const parsed = (ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (parsed.length === 0) {
      throw new BadRequestException('Provide at least one interview id.');
    }
    if (parsed.length > MAX_CANDIDATES) {
      throw new BadRequestException(
        `Too many ids (${parsed.length}). Maximum is ${MAX_CANDIDATES}.`,
      );
    }

    return this.interviewsService.getScorecards(parsed);
  }

  @Get(':id/scorecard')
  async getScorecard(@Param('id') id: string) {
    return this.interviewsService.getScorecard(id);
  }

  @Post(':id/force-evaluate')
  @Throttle({ default: { limit: WRITE_LIMIT, ttl: 60000 } })
  async forceEvaluation(@Param('id') id: string) {
    return this.interviewsService.forceEvaluation(id);
  }

  @Post(':id/reject')
  async rejectInterview(@Param('id') id: string) {
    return this.interviewsService.rejectInterview(id);
  }

  @Get(':id/discrepancies')
  async getDiscrepancies(@Param('id') id: string) {
    return this.interviewsService.getDiscrepancies(id);
  }

  @Get(':id/roadmap')
  async getRoadmap(@Param('id') id: string) {
    return this.interviewsService.getRoadmap(id);
  }
}