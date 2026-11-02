import 'dotenv/config';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const SYNTHETIC_TEST_CASES = [
  { name: 'Maya Lin', email: 'maya.lin@example.com', category: 'clean', resumeFileName: 'clean_resume.txt', transcriptFileName: 'clean_interview.txt' },
  { name: 'Ahmed Al-Mansoor', email: 'ahmed.mansoor@example.com', category: 'contradiction', resumeFileName: 'contradiction_resume.txt', transcriptFileName: 'contradiction_interview.txt' },
  { name: 'Jordan Reed', email: 'jordan.reed@example.com', category: 'low-quality', resumeFileName: 'low_quality_resume.txt', transcriptFileName: 'low_quality_interview.txt' },
];

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    for (const tc of SYNTHETIC_TEST_CASES) {
      const read = (dir: string, file: string) =>
        fs.readFileSync(path.join(__dirname, 'seed', dir, file), 'utf-8');
      const resume = read('resumes', tc.resumeFileName);
      const transcript = read('transcripts', tc.transcriptFileName);

      const candidate = await prisma.candidate.upsert({
        where: { email: tc.email },
        update: { name: tc.name },
        create: { name: tc.name, email: tc.email },
      });

      const transcriptHash = sha256(transcript);
      const existing = await prisma.interviewSession.findFirst({
        where: { candidateId: candidate.id, transcriptHash },
      });
      if (existing) {
        console.log(`skip [${tc.category}] ${tc.name} (already seeded)`);
        continue;
      }

      const session = await prisma.interviewSession.create({
        data: {
          candidateId: candidate.id,
          transcript,
          transcriptHash,
          resume,
          resumeHash: sha256(resume),
        },
      });
      console.log(`created [${tc.category}] ${tc.name} -> session ${session.id}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});