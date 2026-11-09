import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { InterviewsService } from './interviews.service';

const MAX_CANDIDATES = 50;
const MAX_FILES = MAX_CANDIDATES * 2; // transcript + resume per candidate

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('upload')
  async upload(@Body() body: any) {
    return this.interviewsService.upload(body);
  }

  @Post('bulk-upload')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: {
        // Per-file size limit enforced at the interceptor level (Multer).
        // The service also re-checks this to reject oversized files individually.
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
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
      throw new BadRequestException(
        'Metadata must be a JSON array of candidates.',
      );
    }

    if (metadata.length === 0) {
      throw new BadRequestException(
        'Metadata array is empty. Provide at least one candidate.',
      );
    }

    if (metadata.length > MAX_CANDIDATES) {
      throw new BadRequestException(
        `Too many candidates (${metadata.length}). Maximum is ${MAX_CANDIDATES} per request. Split the upload into smaller batches.`,
      );
    }

    return this.interviewsService.bulkUpload(files, metadata);
  }

  @Get(':id/scorecard')
  async getScorecard(@Param('id') id: string) {
    return this.interviewsService.getScorecard(id);
  }

  @Get(':id/spk-export')
  async getSpkExport(@Param('id') id: string) {
    return this.interviewsService.getSpkExport(id);
  }

  @Post(':id/force-evaluate')
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