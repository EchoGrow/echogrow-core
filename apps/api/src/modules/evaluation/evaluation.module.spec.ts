import { describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationProcessor } from './evaluation.processor';
import { EvaluationService } from './evaluation.service';
import { TranscriptParserService } from './transcript-parser.service';
import { EvaluationDbService } from './evaluation-db.service';
import { LlmService } from '../../llm/llm.service';
import { getQueueToken } from '@nestjs/bullmq';
import { EVALUATION_QUEUE_NAME } from './evaluation.constants';

describe('EvaluationModule DI', () => {
  it('resolves all evaluation providers cleanly via NestJS DI container', async () => {
    const mockQueue = {
      add: vi.fn(),
      process: vi.fn(),
    };

    const mockLlmService = {
      generate: vi.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptParserService,
        EvaluationDbService,
        EvaluationProcessor,
        EvaluationService,
        {
          provide: LlmService,
          useValue: mockLlmService,
        },
        {
          provide: getQueueToken(EVALUATION_QUEUE_NAME),
          useValue: mockQueue,
        },
      ],
    }).compile();

    expect(moduleRef).toBeDefined();

    const processor = moduleRef.get<EvaluationProcessor>(EvaluationProcessor);
    expect(processor).toBeDefined();

    const service = moduleRef.get<EvaluationService>(EvaluationService);
    expect(service).toBeDefined();

    const parser = moduleRef.get<TranscriptParserService>(TranscriptParserService);
    expect(parser).toBeDefined();

    const dbService = moduleRef.get<EvaluationDbService>(EvaluationDbService);
    expect(dbService).toBeDefined();
  });
});
