import { z } from 'zod';

// ============================================================
// Schema for LLM metadata extraction
// ============================================================
export const SpkMetadataSchema = z.object({
  seniority: z.enum(['Junior', 'Mid-level', 'Senior', 'Lead', 'Principal']).nullable(),
  primary_role: z.string().nullable(),
  timezone: z.string().nullable(),
  languages: z.array(z.string()).nullable(),
  years_of_experience: z.number().nullable(),
});

export type SpkMetadata = z.infer<typeof SpkMetadataSchema>;

// ============================================================
// Schema for LLM verified skills extraction
// ============================================================
export const SpkVerifiedSkillsSchema = z.object({
  verified_skills: z.array(z.string().min(1)),
});

export type SpkVerifiedSkills = z.infer<typeof SpkVerifiedSkillsSchema>;

// ============================================================
// Prompt 1: Extract metadata (seniority, role, timezone, languages)
// ============================================================
export function buildSpkMetadataPrompt(cv: string, transcript: string): string {
  return `You are an expert recruiter extracting structured metadata from a candidate's CV and interview transcript.

### CV:
${cv}

### Interview Transcript:
${transcript}

### TASK:
Extract the following fields. If a field cannot be determined from the text, return null. Do NOT guess.

Return a JSON object with:
- "seniority": one of "Junior" | "Mid-level" | "Senior" | "Lead" | "Principal" | null
- "primary_role": string (e.g., "Full-Stack Developer", "Backend Engineer") | null
- "timezone": string (e.g., "UTC+3", "Asia/Amman") | null
- "languages": array of strings (e.g., ["English", "Arabic"]) — only languages explicitly mentioned as spoken/written
- "years_of_experience": number | null

### CRITICAL:
- Base your answer on evidence from the text.
- If a field is unclear, set it to null.
- Return ONLY valid JSON.

### EXAMPLE OUTPUT:
{
  "seniority": "Mid-level",
  "primary_role": "Backend Developer",
  "timezone": "UTC+3",
  "languages": ["English", "Arabic"],
  "years_of_experience": 3
}
`;
}

// ============================================================
// Prompt 2: Extract verified skills (skills the candidate PROVED)
// ============================================================
export function buildSpkVerifiedSkillsPrompt(transcript: string): string {
  return `You are a Senior Technical Interviewer. Your task is to extract EVERY specific technical skill that the candidate DEMONSTRATED competence in during the interview.

### FULL INTERVIEW TRANSCRIPT:
${transcript}

### INSTRUCTIONS:
1. Read the transcript carefully.
2. Identify skills where the candidate:
   - Explained a concept clearly and correctly (e.g., "I used EXPLAIN ANALYZE to optimize the query").
   - Described a real project where they applied the skill (e.g., "At TechX, I built REST APIs with Node.js").
   - Answered technical questions about the skill with confidence and detail.
3. **DO NOT include** skills the candidate explicitly admitted they lack or are weak in.
4. **DO NOT include** vague mentions without evidence (e.g., "I know React" without context).
5. Each skill must be a **concrete, learnable skill** (e.g., "React", "Node.js", "PostgreSQL", "Kubernetes").
6. Prefer standard industry names. Do NOT use dimension names (Technical Depth, Communication, etc.) as skills.
7. Return a JSON object with a single key "verified_skills" (array of strings).

### EXAMPLE:
Transcript: "I built REST APIs with Node.js and Express. I optimized PostgreSQL queries using EXPLAIN ANALYZE."
Output: { "verified_skills": ["Node.js", "Express", "PostgreSQL", "Query Optimization"] }

### EXAMPLE (empty):
Transcript: "I mostly used Postman and added indexes without understanding B-trees."
Output: { "verified_skills": [] }

### CRITICAL RULES:
- ONLY include skills with clear evidence of competence.
- NEVER include dimension names as skills.
- Return ONLY valid JSON.
`;
}