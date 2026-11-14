import type {
  Candidate,
  Dimension,
  Discrepancy,
  InterviewSession,
  RoadmapItem,
  Scorecard,
  SkillGap,
} from '../../generated/prisma/client';

type SessionWithScorecard = InterviewSession & {
  candidate: Candidate;
  scorecard:
    | (Scorecard & {
        dimensions: Dimension[];
        discrepancies: Discrepancy[];
        roadmap:
          | {
              items: (RoadmapItem & { skillGap: SkillGap })[];
            }
          | null;
      })
    | null;
};

const DIMENSION_NAMES: Record<string, string> = {
  TECHNICAL_DEPTH: 'Technical Depth',
  COMMUNICATION: 'Communication Clarity',
  DOMAIN_EXPERIENCE: 'Domain Experience',
  PROBLEM_SOLVING: 'Problem Solving',
};

function formatCandidateData(session: SessionWithScorecard, index: number): string {
  const sc = session.scorecard!;
  const dims = sc.dimensions
    .map((d) => {
      const name = DIMENSION_NAMES[d.dimensionType] || d.dimensionType;
      const evidence = d.evidenceQuote as { quote?: string; timestamp?: string } | null;
      const evidenceText = evidence?.quote ? ` — evidence: "${evidence.quote}"` : '';
      const reasonText = d.reason ? ` (reason: ${d.reason})` : '';
      return `    - ${name}: ${d.score}/5${reasonText}${evidenceText}`;
    })
    .join('\n');

  const discrepancies = sc.discrepancies
    .map(
      (d) =>
        `    - [${d.severity}, ${d.status}] ${d.claim}: CV says "${d.cvQuote ?? 'N/A'}", interview says "${d.interviewQuote ?? 'N/A'}"`,
    )
    .join('\n');

  const gaps = sc.roadmap?.items.map((i) => i.skillGap.skillName).join(', ') || 'None';

  const spkStatus = (session as { spkStatus?: string | null }).spkStatus ?? 'N/A';

  return `### Candidate ${index + 1}: ${session.candidate.name} (ID: ${session.id})
- Overall score: ${sc.overallScore?.toFixed(1) ?? 'N/A'}/5
- Confidence: ${((sc.confidence ?? 0) * 100).toFixed(0)}%
- Dimensions:
${dims}
- Discrepancies (${sc.discrepancies.length}):
${discrepancies || '    (none)'}
- Skill gaps: ${gaps}
- SPK status: ${spkStatus}
`;
}

export function buildComparisonPrompt(
  sessions: SessionWithScorecard[],
  targetRole?: string,
): string {
  const candidatesData = sessions.map((s, i) => formatCandidateData(s, i)).join('\n---\n');

  const roleSection = targetRole
    ? `### TARGET ROLE: ${targetRole}

You are evaluating candidates specifically for a **${targetRole}** position.
Weight the dimensions accordingly:
- For technical roles (Backend, Frontend, Data, DevOps, Mobile): prioritize Technical Depth and Problem Solving.
- For product/design roles: prioritize Communication Clarity and Domain Experience.
- For senior/lead roles: prioritize Problem Solving, leadership signals from discrepancies, and Domain Experience.
- For junior roles: weight Communication and learning potential more heavily.

Include a "fitScore" (0–100) for each candidate that reflects their fit for this specific role.

### CRITICAL: ROLE-AWARE DIMENSION RE-EVALUATION

When a targetRole is provided, you MUST re-evaluate each dimension **in the context of the role**, not just copy the original scores.

The original scores were calculated for a **general evaluation** (the candidate's own domain).
When comparing against a specific role, you must ask: **"Does this candidate's evidence match this role?"**

Examples of re-evaluation:

1. **Domain Experience re-evaluation:**
   - A Frontend candidate scored 4/5 in Domain Experience (React, TypeScript).
   - For a **Backend** role, that Domain Experience becomes **1–2/5** (the domain does not match).
   - For a **Frontend** role, it stays 4–5/5.

2. **Technical Depth re-evaluation:**
   - A candidate with 3/5 Technical Depth but deep backend knowledge (SQL, indexing, EXPLAIN ANALYZE).
   - For a **Backend** role, that Technical Depth becomes **4–5/5** (the depth is directly relevant).
   - For a **Frontend** role, it stays 3/5 (depth is not in the role's stack).

3. **Problem Solving re-evaluation:**
   - A candidate with 4/5 Problem Solving who debugged memory leaks in React.
   - For a **Backend** role, their problem-solving evidence (frontend memory leaks) is **less relevant** → 2–3/5.
   - For a **Frontend** role, it stays 4/5.

**RULE:** For "perDimensionWinners", choose the candidate whose **evidence matches the role**, not the candidate with the highest original score.

**RULE:** If a candidate's original score is high but their evidence is irrelevant to the role, you MUST note this in their "concerns" (e.g., "Strong React skills, but no backend evidence for a Backend role").
`
    : '';

  return `You are a **senior AI matching engine** that simulates Simera's Agent David. Your job is to compare candidates fairly using ONLY the verified interview evidence provided below. Simera connects global talent (MENA, LATAM, SEA) with US/Canadian clients.

${roleSection}
### VERIFIED INTERVIEW DATA

${candidatesData}

### YOUR TASK

Produce a structured JSON comparison with the following fields:

1. **summary** (string, 2–4 sentences): A concise comparison highlighting the main differences between candidates. If a targetRole was provided, mention which candidate best fits the role and why. Mention the strongest and weakest points.

2. **targetRole** (string | null): Echo the targetRole you received, or null if none.

3. **ranking** (array, best first): For each candidate, output:
   - interviewId (string)
   - candidateName (string)
   - rank (integer, 1 = best)
   - reason (string, 1–2 sentences citing specific evidence)
   - fitScore (0–100, ONLY if targetRole is provided)

4. **perDimensionWinners** (array, exactly 4 entries): For each of the 4 dimensions (Technical Depth, Communication Clarity, Domain Experience, Problem Solving), identify the strongest candidate **for the target role** (if provided) or overall (if no target role):
   - dimension (enum: the 4 names above)
   - winnerInterviewId (string)
   - winnerName (string)
   - reason (string, cite the specific score and evidence — and explain why it matters for the role if a targetRole was provided)

5. **strengths** (array): For each candidate, list 2–4 concrete strengths grounded in the interview (e.g., "Deep SQL optimization demonstrated with EXPLAIN ANALYZE", "Led a team of 6 engineers"). Do NOT invent strengths — cite evidence.

6. **concerns** (array): For each candidate, list 1–3 concrete concerns (e.g., "Claimed team leadership but CV lists Individual Contributor", "Limited Docker experience", "Strong React skills but no backend evidence for a Backend role"). Cite the evidence.

7. **recommendation** (string, 2–3 sentences): A final hiring-manager-level recommendation. If a targetRole was given, name the best fit for that role and why. Also suggest alternative roles where other candidates might excel.

8. **confidence** (number, 0.0–1.0): How confident you are in this comparison. Lower it if data is incomplete or discrepancies are unresolved.

### CRITICAL RULES

- **Evidence only.** Never invent skills, quotes, or claims. Every strength or concern MUST be traceable to a dimension score, evidence quote, discrepancy, or skill gap.
- **Discrepancies matter.** Unresolved PENDING discrepancies should be flagged as concerns. CONFIRMED discrepancies are strong negative signals. DISMISSED discrepancies are non-issues.
- **Fair comparison.** If candidates have different seniority levels, note that explicitly in the summary. Never compare a Junior directly to a Senior without context.
- **Tie-breaking.** If two candidates are tied, explain why (e.g., "Tied on Technical Depth, but Layla has stronger Communication").
- **No hallucinations.** If a dimension has no evidence, say so ("no evidence for Domain Experience").
- **Role-aware re-evaluation.** If a targetRole was provided, re-evaluate each dimension against the role (as described in the CRITICAL: ROLE-AWARE DIMENSION RE-EVALUATION section above). Do NOT use the original score if it is irrelevant to the role.
- **Valid JSON only.** Output MUST be parseable JSON matching the schema. No markdown fences, no commentary.

### EXAMPLE 1 (no role — general comparison)

{
  "summary": "Ahmed is the strongest overall candidate with demonstrated frontend expertise and clear communication. Mohammed has solid backend SQL skills but limited domain experience.",
  "targetRole": null,
  "ranking": [
    { "interviewId": "abc", "candidateName": "Ahmed", "rank": 1, "reason": "Scored 4.3/5 overall with 5/5 Communication and 4/5 Technical Depth in React/TypeScript." },
    { "interviewId": "def", "candidateName": "Mohammed", "rank": 2, "reason": "Scored 3.3/5 overall with strong SQL skills (3/5 Technical Depth) but 2/5 Domain Experience." }
  ],
  "perDimensionWinners": [
    { "dimension": "Technical Depth", "winnerInterviewId": "abc", "winnerName": "Ahmed", "reason": "Scored 4/5 with evidence of React state management." },
    { "dimension": "Communication Clarity", "winnerInterviewId": "abc", "winnerName": "Ahmed", "reason": "Scored 5/5 with clear, structured explanations." },
    { "dimension": "Domain Experience", "winnerInterviewId": "abc", "winnerName": "Ahmed", "reason": "Scored 4/5 with extensive frontend design system experience." },
    { "dimension": "Problem Solving", "winnerInterviewId": "abc", "winnerName": "Ahmed", "reason": "Scored 4/5 with systematic memory leak debugging." }
  ],
  "strengths": [
    { "interviewId": "abc", "candidateName": "Ahmed", "points": ["Strong React state management", "Clear communication"] },
    { "interviewId": "def", "candidateName": "Mohammed", "points": ["Practical SQL optimization", "Pragmatic problem solving"] }
  ],
  "concerns": [
    { "interviewId": "abc", "candidateName": "Ahmed", "points": ["Identified skill gap in Docker"] },
    { "interviewId": "def", "candidateName": "Mohammed", "points": ["High-severity pending discrepancy about team leadership", "Limited domain experience"] }
  ],
  "recommendation": "Ahmed is best suited for frontend roles. Mohammed is stronger for backend SQL-focused roles, but his leadership discrepancy must be verified.",
  "confidence": 0.9
}

### EXAMPLE 2 (with role — role-aware re-evaluation in action)

Target role: "Senior Backend Developer"

{
  "summary": "For a Senior Backend Developer role, Mohammed is the stronger fit despite his lower overall score. His SQL optimization and database profiling experience directly match the backend requirements, while Ahmed's frontend expertise is not relevant to this role.",
  "targetRole": "Senior Backend Developer",
  "ranking": [
    { "interviewId": "def", "candidateName": "Mohammed", "rank": 1, "reason": "Demonstrated EXPLAIN ANALYZE and composite index optimization, directly relevant to backend development. Overall 3.3/5 but role fit is high.", "fitScore": 75 },
    { "interviewId": "abc", "candidateName": "Ahmed", "rank": 2, "reason": "Strong frontend specialist (React, TypeScript) but no backend evidence. Domain Experience 4/5 is in frontend, which does not match this role.", "fitScore": 30 }
  ],
  "perDimensionWinners": [
    { "dimension": "Technical Depth", "winnerInterviewId": "def", "winnerName": "Mohammed", "reason": "Original score 3/5, but the SQL optimization evidence is directly relevant to backend. Effective role-relevant depth: 4/5." },
    { "dimension": "Communication Clarity", "winnerInterviewId": "abc", "winnerName": "Ahmed", "reason": "Scored 5/5 with clear structured answers. This dimension is role-agnostic." },
    { "dimension": "Domain Experience", "winnerInterviewId": "def", "winnerName": "Mohammed", "reason": "Ahmed's 4/5 Domain Experience is in frontend (React design systems), which is NOT relevant to a backend role. Mohammed's 2/5 overall becomes the role-relevant winner because his domain (SQL, payments, logistics) matches the backend role." },
    { "dimension": "Problem Solving", "winnerInterviewId": "def", "winnerName": "Mohammed", "reason": "Original 4/5 tied with Ahmed, but Mohammed's problem-solving evidence (database query tuning, incident response) is backend-specific." }
  ],
  "strengths": [
    { "interviewId": "def", "candidateName": "Mohammed", "points": ["EXPLAIN ANALYZE query optimization", "Composite index design", "Backend incident response"] },
    { "interviewId": "abc", "candidateName": "Ahmed", "points": ["Excellent communication (5/5)", "Strong React and TypeScript design systems"] }
  ],
  "concerns": [
    { "interviewId": "abc", "candidateName": "Ahmed", "points": ["Entirely frontend-focused — no backend evidence for this role", "Identified skill gap in Docker"] },
    { "interviewId": "def", "candidateName": "Mohammed", "points": ["High-severity pending discrepancy about team leadership — must verify", "Limited B-tree index depth"] }
  ],
  "recommendation": "Recommend Mohammed for Senior Backend Developer, contingent on verifying the leadership discrepancy. Consider Ahmed for a Senior Frontend Developer role where his React expertise is directly applicable.",
  "confidence": 0.85
}

Now produce the JSON for the ${sessions.length} candidates above.`;
}