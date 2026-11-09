import { whitelist } from '@echogrow/shared';
import { z } from 'zod';

interface DimensionWithEvidence {
  name: string;
  score: number;
  evidenceQuote: string;
  reason?: string;
}

/**
 * Schema لاستخراج الفجوات المهارية (Prompt 1).
 */
export const SkillExtractionSchema = z.object({
  skills: z.array(z.string().min(1)),
});

export type SkillExtraction = z.infer<typeof SkillExtractionSchema>;

/**
 * Prompt 1: استخراج الفجوات المهارية من دفعة أدلة + النص الكامل للمقابلة.
 * يُستخدم في Multi-Pass Extraction.
 */
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

### EXAMPLE:
Evidence: "I don't know Kubernetes or Terraform. I have never used GraphQL."
Output: { "skills": ["Kubernetes", "Terraform", "GraphQL"] }

### EXAMPLE (empty):
Evidence: Score 5/5, "I have strong experience with React and TypeScript."
Output: { "skills": [] }

### CRITICAL RULES:
- NEVER use dimension names as skills.
- Extract EVERY supported skill. Do not skip any.
- Return ONLY valid JSON.
`;
}

/**
 * Prompt 2: توليد Roadmap من قائمة الفجوات المدمجة.
 */
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
   - "task": a clear, actionable learning task (e.g., "Master Kubernetes fundamentals and deployments").
   - "resourceUrl": a URL **selected EXACTLY** from the approved list above.
   - "skillName": the specific skill being addressed.
3. Return a JSON object with:
   - "gaps": an array of strings (the same skill names, in order).
   - "roadmap": an array of week objects.

### CRITICAL RULES:
- **DO NOT invent URLs.** You MUST use only the URLs from the approved list.
- **Match each skill to the closest skill name in the approved list** (e.g. "K8s" → "Kubernetes", "Postgres" → "PostgreSQL") and use that skill's URL.
- **FALLBACK RULE:** If a skill is NOT in the approved list, set "resourceUrl" to:
  "https://www.google.com/search?q=<skill_name>+tutorial"
  and add "(Search for a vetted resource)" to the task description.
- The roadmap must have exactly ONE week per skill gap.
- Return ONLY valid JSON.

### EXAMPLE:
Skills: ["Kubernetes", "Terraform", "GraphQL"]
Output:
{
  "gaps": ["Kubernetes", "Terraform", "GraphQL"],
  "roadmap": [
    { "week": 1, "task": "Learn Kubernetes fundamentals and deployments", "resourceUrl": "https://kubernetes.io/docs/home/", "skillName": "Kubernetes" },
    { "week": 2, "task": "Learn Terraform and infrastructure as code", "resourceUrl": "https://developer.hashicorp.com/terraform/docs", "skillName": "Terraform" },
    { "week": 3, "task": "Learn GraphQL schema design and resolvers", "resourceUrl": "https://graphql.org/learn/", "skillName": "GraphQL" }
  ]
}
`;
}