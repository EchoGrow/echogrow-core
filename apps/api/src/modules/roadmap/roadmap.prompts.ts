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
 * Prompt 1: استخراج الفجوات المهارية من مجموعة صغيرة من الأدلة.
 * يُستخدم في Multi-Pass Extraction.
 */
export function buildSkillExtractionPrompt(
  evidenceBatch: { dimension: string; quote: string }[],
): string {
  const evidenceText = evidenceBatch
    .map(
      (e, i) =>
        `Evidence ${i + 1} (Dimension: ${e.dimension}):\n"${e.quote}"`,
    )
    .join('\n\n');

  return `You are a Senior Technical Interviewer. Your task is to extract EVERY specific technical skill that the candidate explicitly admitted they lack or are weak in, based on the evidence below.

### EVIDENCE BATCH:
${evidenceText}

### INSTRUCTIONS:
1. Read each evidence quote carefully.
2. Extract EVERY specific technical skill that the candidate admitted they lack, are weak in, or have never used.
   - Look for phrases like: "I don't know", "I have never used", "I am not familiar with", "I only know the basics", "I didn't dig deep into", "I haven't worked with".
   - Each skill must be a **concrete, learnable skill** (e.g., "Kubernetes", "Terraform", "GraphQL", "SQL Indexing", "OAuth 2.0", "TLS", "DNS", "Apache Kafka", "Redis", "Observability", "CI/CD", "MongoDB Aggregation").
   - **DO NOT use dimension names** (Technical Depth, Communication Clarity, Domain Experience, Problem Solving) as skills.
   - **Extract as many skills as the evidence supports.** If the evidence mentions 5 weaknesses, extract 5 skills.
3. Return a JSON object with a single key "skills" containing an array of strings (the specific skill names).

### EXAMPLE:
Evidence: "I don't know Kubernetes or Terraform. I have never used GraphQL."
Output: { "skills": ["Kubernetes", "Terraform", "GraphQL"] }

### EXAMPLE (empty):
Evidence: "I have strong experience with React and TypeScript."
Output: { "skills": [] }

### CRITICAL RULES:
- **NEVER use dimension names as skills.**
- **Extract EVERY skill mentioned.** Do not skip any.
- Return ONLY valid JSON.
`;
}

/**
 * Prompt 2: توليد Roadmap من قائمة الفجوات المدمجة.
 * يُستخدم بعد جمع كل الفجوات من كل المجموعات.
 */
export function buildRoadmapFromGapsPrompt(
  uniqueSkills: string[],
  evidenceContext: string,
): string {
  // تجهيز قائمة الموارد المعتمدة
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