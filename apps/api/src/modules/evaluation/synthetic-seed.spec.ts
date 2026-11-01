import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SYNTHETIC_TEST_CASES, seed } from '../../../prisma/seed';

describe('Synthetic Test Data (Issue #17)', () => {
  const seedDir = path.resolve(__dirname, '../../../prisma/seed');
  const resumesDir = path.join(seedDir, 'resumes');
  const transcriptsDir = path.join(seedDir, 'transcripts');

  it('defines exactly 3 synthetic test cases across required categories', () => {
    expect(SYNTHETIC_TEST_CASES).toHaveLength(3);
    const categories = SYNTHETIC_TEST_CASES.map((c) => c.category);
    expect(categories).toContain('clean');
    expect(categories).toContain('contradiction');
    expect(categories).toContain('low-quality');
  });

  it('contains all 3 resume files with non-empty content', () => {
    for (const testCase of SYNTHETIC_TEST_CASES) {
      const filePath = path.join(resumesDir, testCase.resumeFileName);
      expect(fs.existsSync(filePath), `Resume file must exist: ${filePath}`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.trim().length).toBeGreaterThan(100);
    }
  });

  it('contains all 3 transcript files with non-empty content', () => {
    for (const testCase of SYNTHETIC_TEST_CASES) {
      const filePath = path.join(transcriptsDir, testCase.transcriptFileName);
      expect(fs.existsSync(filePath), `Transcript file must exist: ${filePath}`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.trim().length).toBeGreaterThan(100);
    }
  });

  it('verifies the clean case exhibits consistent claims', () => {
    const resume = fs.readFileSync(path.join(resumesDir, 'clean_resume.txt'), 'utf-8');
    const transcript = fs.readFileSync(
      path.join(transcriptsDir, 'clean_interview.txt'),
      'utf-8',
    );

    expect(resume).toContain('Maya Lin');
    expect(resume).toContain('Senior Backend Engineer');
    expect(resume).toContain('DataFlow Systems');
    expect(transcript).toContain('DataFlow Systems');
    expect(transcript).toContain('PgBouncer');
    expect(transcript).toContain('Kafka');
  });

  it('verifies the contradiction case contains the planted discrepancy', () => {
    const resume = fs.readFileSync(path.join(resumesDir, 'contradiction_resume.txt'), 'utf-8');
    const transcript = fs.readFileSync(
      path.join(transcriptsDir, 'contradiction_interview.txt'),
      'utf-8',
    );

    // CV states purely individual contributor with zero managerial or team lead responsibilities
    expect(resume).toMatch(/individual contributor/i);
    expect(resume).toMatch(/zero managerial or team lead responsibilities/i);

    // Transcript claims leading team of six senior developers as Lead Architect
    expect(transcript).toMatch(/led a team of six/i);
    expect(transcript).toMatch(/Lead Architect/i);
  });

  it('verifies the low-quality case contains speech flaws, stutters, and incomplete thoughts', () => {
    const transcript = fs.readFileSync(
      path.join(transcriptsDir, 'low_quality_interview.txt'),
      'utf-8',
    );

    expect(transcript).toMatch(/\[inaudible.*\]|\[audio cuts out.*\]|\[static noise\]/i);
    expect(transcript).toMatch(/um|uh|like/i);
  });

  it('executes seed() function successfully', async () => {
    await expect(seed()).resolves.toBeUndefined();
  });
});

