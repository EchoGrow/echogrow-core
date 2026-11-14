import { whitelist } from '@echogrow/shared';
import { z } from 'zod';

export const SkillExtractionSchema = z.object({
  skills: z.array(z.string().min(1)),
});

export type SkillExtraction = z.infer<typeof SkillExtractionSchema>;

/**
 * Schema for LLM semantic deduplication.
 */
export const SkillDedupeSchema = z.object({
  canonical_skills: z.array(z.string().min(1)),
});

export type SkillDedupe = z.infer<typeof SkillDedupeSchema>;

/**
 * Prompt used by `dedupeSkillsSemantically` to merge semantically overlapping
 * skills (e.g. "EXPLAIN ANALYZE" and "PostgreSQL query optimization").
 */
export function buildSkillDedupePrompt(skills: string[]): string {
  return `You are a skill taxonomy expert. The following skills were extracted
from a technical interview. Some of them are SEMANTIC DUPLICATES — they refer
to the same concept under different names.

Examples of duplicates:
- "EXPLAIN ANALYZE" and "Database Query Optimization" and "SQL Indexing and Query Optimization" → same concept
- "Dockerfile" and "Docker Compose" and "Containerization" → same concept
- "K8s" and "Kubernetes" → same concept
- "OAuth" and "OIDC" and "JWT" → same concept

Your task: merge semantically duplicate skills into ONE canonical name per concept.

### RULES:
1. Prefer the most general, industry-standard name.
2. Preserve the original casing of the chosen canonical name.
3. NEVER invent new skills — only merge or select from the input.
4. If two skills are clearly NOT the same concept, keep both.
5. Return AT MOST 5 canonical skills (pick the most important).
6. Return strict JSON: { "canonical_skills": string[] }

### INPUT SKILLS:
${skills.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return ONLY valid JSON.
`;
}

export function buildSkillExtractionPrompt(
  evidenceBatch: { dimension: string; quote: string; score?: number; reason?: string }[],
  transcript?: string,
): string {
  const evidenceText = evidenceBatch
    .map(
      (e, i) =>
        `Evidence ${i + 1} (Dimension: ${e.dimension}, Score: ${e.score ?? 'n/a'}/5):\n` +
        `Quote: "${e.quote}"` +
        (e.reason ? `\nAssessor reasoning: ${e.reason}` : ''),
    )
    .join('\n\n');

  const transcriptSection = transcript
    ? `\n### FULL INTERVIEW TRANSCRIPT (primary source for finding admitted weaknesses):\n${transcript}\n`
    : '';

  return `You are a Senior Technical Interviewer. Your task is to extract EVERY specific technical skill that the candidate admitted they lack, are weak in, or showed clear gaps in.

### EVIDENCE BATCH (low scores indicate weaknesses):
${evidenceText}
${transcriptSection}
### INSTRUCTIONS:
1. Focus on the dimensions in the evidence batch, especially those with a score of 2 or lower.
2. Search the evidence, the assessor reasoning${transcript ? ' AND the full transcript' : ''} for specific technical skills the candidate:
   - explicitly admitted they lack ("I don't know", "I have never used", "I am not familiar with", "I only know the basics", "I haven't worked with"), OR
   - could not explain or answered incorrectly or vaguely about.
3. Each skill must be a **concrete, learnable skill** (e.g., "Kubernetes", "Terraform", "GraphQL", "SQL Indexing", "OAuth 2.0", "Apache Kafka", "Observability", "CI/CD").
4. Prefer the standard names used in industry. Do NOT use dimension names as skills.
5. If every dimension in the batch scores 4 or higher and nothing is admitted, return an empty list.
6. Return a JSON object with a single key "skills" (array of strings).

### CRITICAL RULES:
- NEVER use dimension names as skills.
- Extract EVERY supported skill. Do not skip any.
- Return ONLY valid JSON.
`;
}

export function buildRoadmapFromGapsPrompt(
  uniqueSkills: string[],
  evidenceContext: string,
): string {
  const resourcesText = whitelist
    .map(
      (skill) =>
        `### ${skill.skillName} (${skill.category})\n${skill.resources
          .map((r) => `- ${r.resourceType}: ${r.resourceTitle} → ${r.resourceUrl}`)
          .join('\n')}`,
    )
    .join('\n\n');

  const skillsText = uniqueSkills.map((s) => `- ${s}`).join('\n');

  return `You are a Senior Career Coach. Your task is to build a personalized upskilling roadmap based on the identified skill gaps.

### IDENTIFIED SKILL GAPS:
${skillsText}

### EVIDENCE CONTEXT (for task descriptions):
${evidenceContext}

### APPROVED LEARNING RESOURCES (USE ONLY THESE):
${resourcesText}

### YOUR TASK:
1. For each skill gap, create **ONE week** of learning.
2. Each week must have:
   - "week": an integer (1, 2, 3, ...) representing the sequential week number.
   - "task": a clear, actionable learning task.
   - "resourceUrl": a URL **selected EXACTLY** from the approved list above.
   - "skillName": the specific skill being addressed.
3. Return a JSON object with:
   - "gaps": an array of strings (the same skill names, in order).
   - "roadmap": an array of week objects.

### CRITICAL RULES:
- **DO NOT invent URLs.** You MUST use only the URLs from the approved list.
- **Match each skill to the closest skill name in the approved list** and use that skill's URL.
- **FALLBACK RULE:** If a skill is NOT in the approved list, set "resourceUrl" to:
  "https://www.google.com/search?q=<skill_name>+tutorial"
  and add "(Search for a vetted resource)" to the task description.
- The roadmap must have exactly ONE week per skill gap.
- Return ONLY valid JSON.
`;
}