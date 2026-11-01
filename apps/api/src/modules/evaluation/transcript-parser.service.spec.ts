import { describe, it, expect } from 'vitest';
import { TranscriptParserService } from './transcript-parser.service';

describe('TranscriptParserService', () => {
  const service = new TranscriptParserService();

  it('parses bracketed timestamps and speaker turns', () => {
    const raw = `[00:01:10] Interviewer: What is your experience with Redis?
[00:01:25] Candidate: I have used Redis for distributed caching and pub/sub messaging.`;

    const turns = service.parse(raw);
    expect(turns).toHaveLength(2);

    expect(turns[0]).toEqual({
      speaker: 'Interviewer',
      text: 'What is your experience with Redis?',
      timestamp: '00:01:10',
    });

    expect(turns[1]).toEqual({
      speaker: 'Candidate',
      text: 'I have used Redis for distributed caching and pub/sub messaging.',
      timestamp: '00:01:25',
    });
  });

  it('parses timestamps in MM:SS format', () => {
    const raw = `[01:15] Interviewer: Can you describe database indexing?
[01:30] Candidate: We use B-trees for range scans.`;

    const turns = service.parse(raw);
    expect(turns).toHaveLength(2);
    expect(turns[0].timestamp).toBe('01:15');
    expect(turns[1].timestamp).toBe('01:30');
  });

  it('normalizes alternative speaker names to Interviewer and Candidate', () => {
    const raw = `[00:00:10] Technical Recruiter: Welcome to the call.
[00:00:20] Applicant: Thanks for having me.`;

    const turns = service.parse(raw);
    expect(turns[0].speaker).toBe('Interviewer');
    expect(turns[1].speaker).toBe('Candidate');
  });

  it('accumulates multiline speech within the same speaker turn', () => {
    const raw = `[00:01:00] Candidate: At my previous company, we had high load.
We added horizontal replicas to our PostgreSQL cluster.
Furthermore, we used PgBouncer to manage connection spikes.

[00:01:45] Interviewer: Did that resolve the bottleneck?`;

    const turns = service.parse(raw);
    expect(turns).toHaveLength(2);
    expect(turns[0].text).toContain('At my previous company');
    expect(turns[0].text).toContain('horizontal replicas');
    expect(turns[0].text).toContain('PgBouncer');
    expect(turns[1].text).toBe('Did that resolve the bottleneck?');
  });

  it('generates synthetic timestamps when transcript lacks them', () => {
    const raw = `Interviewer: Tell me about your background.
Candidate: I am a backend software engineer with 5 years experience.`;

    const turns = service.parse(raw);
    expect(turns).toHaveLength(2);
    expect(turns[0].timestamp).toBeDefined();
    expect(turns[1].timestamp).toBeDefined();
    expect(turns[0].timestamp).toBe('00:00');
    expect(turns[1].timestamp).toBe('00:30');
  });

  it('returns empty array for empty or whitespace transcript', () => {
    expect(service.parse('')).toEqual([]);
    expect(service.parse('   \n  \n  ')).toEqual([]);
  });

  it('formats parsed turns into a clean string for prompt injection', () => {
    const turns = [
      { speaker: 'Interviewer', text: 'Question 1', timestamp: '00:05' },
      { speaker: 'Candidate', text: 'Answer 1', timestamp: '00:15' },
    ];

    const formatted = service.formatForPrompt(turns);
    expect(formatted).toContain('[00:05] Interviewer: Question 1');
    expect(formatted).toContain('[00:15] Candidate: Answer 1');
  });
});

