import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvaluationProcessor } from './evaluation.processor';
import { TranscriptParserService } from './transcript-parser.service';
import { EvaluationDbService } from './evaluation-db.service';
import { LlmService } from '../../llm/llm.service';
import { Evaluation } from '@echogrow/shared';
import { Job } from 'bullmq';

describe('EvaluationProcessor', () => {
  let processor: EvaluationProcessor;
  let mockLlmService: Partial<LlmService>;
  let mockDbService: Partial<EvaluationDbService>;
  let transcriptParser: TranscriptParserService;

  const mockEvaluation: Evaluation = {
    dimensions: [
      {
        name: 'Technical Depth',
        score: 5,
        reason: 'Demonstrated deep knowledge of distributed systems and PostgreSQL internals.',
        evidenceQuote: 'I added PgBouncer and declarative partitioning by date range.',
        timestamp: '00:00:22',
      },
      {
        name: 'Communication Clarity',
        score: 4,
        reason: 'Explained architectural concepts and trade-offs clearly.',
        evidenceQuote: 'I find that visual architecture diagrams and quantifiable business metrics resonate best.',
        timestamp: '00:03:15',
      },
      {
        name: 'Domain Experience',
        score: 5,
        reason: 'Extensive production experience with high-throughput order pipelines.',
        evidenceQuote: 'Processing 15,000 requests per second with p99 latency under 45ms.',
        timestamp: '00:00:22',
      },
      {
        name: 'Problem Solving',
        score: 4,
        reason: 'Methodical root cause analysis and deadlock prevention.',
        evidenceQuote: 'I implemented a distributed lock using Redis with Lua scripts.',
        timestamp: '00:01:25',
      },
    ],
    overallConfidence: 0.95,
  };

  beforeEach(() => {
    transcriptParser = new TranscriptParserService();

    mockLlmService = {
      generate: vi.fn().mockResolvedValue(mockEvaluation),
    };

    mockDbService = {
      updateSessionStatus: vi.fn().mockResolvedValue(undefined),
      getInterviewSession: vi.fn().mockResolvedValue(null),
      saveScorecardAndDimensions: vi.fn().mockResolvedValue({ scorecardId: 'sc_12345' }),
    };

    processor = new EvaluationProcessor(
      mockLlmService as LlmService,
      transcriptParser,
      mockDbService as EvaluationDbService,
    );
  });

  it('processes an evaluation job successfully', async () => {
    const job = {
      id: 'job_1',
      data: {
        interviewSessionId: 'sess_abc123',
        transcript: `[00:00:10] Interviewer: Can you explain your recent project?
[00:00:22] Candidate: I added PgBouncer and declarative partitioning by date range.
[00:01:25] Candidate: I implemented a distributed lock using Redis with Lua scripts.
[00:03:15] Candidate: I find that visual architecture diagrams and quantifiable business metrics resonate best.`,
        cv: 'Senior Backend Engineer with 6 years experience in distributed systems.',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job;

    const result = await processor.process(job);

    expect(result.success).toBe(true);
    expect(result.interviewSessionId).toBe('sess_abc123');
    expect(result.scorecardId).toBe('sc_12345');
    expect(result.dimensionsCount).toBe(4);
    expect(result.overallConfidence).toBe(0.95);

    // Verify session updated to processing first, then scored
    expect(mockDbService.updateSessionStatus).toHaveBeenNthCalledWith(
      1,
      'sess_abc123',
      'processing',
    );
    expect(mockDbService.updateSessionStatus).toHaveBeenNthCalledWith(
      2,
      'sess_abc123',
      'scored',
    );

    // Verify LLM was called with the prompt
    expect(mockLlmService.generate).toHaveBeenCalledTimes(1);

    // Verify Scorecard and Dimensions were saved
    expect(mockDbService.saveScorecardAndDimensions).toHaveBeenCalledWith(
      'sess_abc123',
      mockEvaluation,
    );
  });

  it('fetches transcript from database if not present in job data', async () => {
    (mockDbService.getInterviewSession as any).mockResolvedValue({
      id: 'sess_from_db',
      transcript: '[00:01:00] Interviewer: Q\n[00:01:10] Candidate: A with deep technical knowledge.',
      cv: 'CV text here',
    });

    const job = {
      id: 'job_db_fetch',
      data: {
        interviewSessionId: 'sess_from_db',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job;

    const result = await processor.process(job);

    expect(result.success).toBe(true);
    expect(mockDbService.getInterviewSession).toHaveBeenCalledWith('sess_from_db');
    expect(mockDbService.saveScorecardAndDimensions).toHaveBeenCalled();
    expect(mockDbService.updateSessionStatus).toHaveBeenCalledWith('sess_from_db', 'scored');
  });

  it('throws and logs when transcript is empty or missing', async () => {
    (mockDbService.getInterviewSession as any).mockResolvedValue(null);

    const job = {
      id: 'job_empty_transcript',
      data: {
        interviewSessionId: 'sess_empty',
        transcript: '',
      },
      attemptsMade: 2, // Last attempt out of 3
      opts: { attempts: 3 },
    } as unknown as Job;

    await expect(processor.process(job)).rejects.toThrow(/Transcript is missing or empty/);

    // Because attempt 3 >= maxAttempts (3), status should be updated to 'failed'
    expect(mockDbService.updateSessionStatus).toHaveBeenCalledWith(
      'sess_empty',
      'failed',
      expect.stringContaining('Transcript is missing or empty'),
    );
  });

  it('handles LLM generation failures and propagates error for BullMQ retries', async () => {
    (mockLlmService.generate as any).mockRejectedValue(new Error('Gemini API quota exceeded'));

    const job = {
      id: 'job_llm_error',
      data: {
        interviewSessionId: 'sess_retry',
        transcript: '[00:00:10] Interviewer: Q\n[00:00:20] Candidate: A',
      },
      attemptsMade: 0, // First attempt
      opts: { attempts: 3 },
    } as unknown as Job;

    await expect(processor.process(job)).rejects.toThrow('Gemini API quota exceeded');

    // Should NOT mark as failed yet because attempt (1) < maxAttempts (3)
    expect(mockDbService.updateSessionStatus).not.toHaveBeenCalledWith(
      'sess_retry',
      'failed',
      expect.any(String),
    );
  });

  it('marks session as failed when max attempts are reached on LLM error', async () => {
    (mockLlmService.generate as any).mockRejectedValue(new Error('Persistent LLM failure'));

    const job = {
      id: 'job_final_retry',
      data: {
        interviewSessionId: 'sess_failed',
        transcript: '[00:00:10] Interviewer: Q\n[00:00:20] Candidate: A',
      },
      attemptsMade: 2, // 3rd and final attempt
      opts: { attempts: 3 },
    } as unknown as Job;

    await expect(processor.process(job)).rejects.toThrow('Persistent LLM failure');

    // Should mark session as 'failed' in DB
    expect(mockDbService.updateSessionStatus).toHaveBeenCalledWith(
      'sess_failed',
      'failed',
      'Persistent LLM failure',
    );
  });
});

