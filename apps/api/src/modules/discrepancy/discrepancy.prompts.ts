export function buildDiscrepancyPrompt(cv: string, transcript: string): string {
  return `You are an expert fact-checker comparing a candidate's resume with their interview transcript.
Your task is to identify clear, verifiable contradictions. Do NOT flag minor wording differences.

### RESUME (CV):
${cv}

### INTERVIEW TRANSCRIPT:
${transcript}

### INSTRUCTIONS:
Extract verifiable claims from the resume (job title, team size, years of experience, specific skills).
Compare each claim to what the candidate actually said in the interview.
Return a JSON object with a "discrepancies" array.
Each discrepancy must include:
- "field": the claim being compared (e.g., "team_size")
- "cvSays": what the resume states
- "interviewSays": what the candidate said
- "cvQuote": a verbatim excerpt from the resume
- "interviewQuote": a verbatim quote from the transcript
- "severity": the severity level of the discrepancy, classified strictly as one of:
  - "high": Critical contradictions affecting core role, major experience gaps, or title discrepancies (e.g., claiming to be a Team Lead vs. Individual Contributor).
  - "medium": Moderate contradictions like team size differences, sub-skills, or minor timeline variations.
  - "low": Minor details or slight numerical variations that don't alter the overall candidate profile (e.g., team size of 4 vs 5).
- "confidence": a float between 0.0 and 1.0
- "action": always "flag_for_human_review"

### QUALITY RULES (apply to every discrepancy):
- Every discrepancy MUST have BOTH a cvQuote AND an interviewQuote.
- The two quotes must be in DIRECT CONFLICT (not just different wording).
- Do NOT flag the same concept twice (e.g., "team size" and "team leadership" are the same concept if they refer to the same claim).
- Do NOT flag a claim if the resume and interview are consistent.
- If the interview is ambiguous, prefer NOT to flag (false negatives are safer than false positives).

### SELF-CHECK BEFORE RETURNING:
- Have you merged duplicate concepts?
- Have you removed discrepancies where the quotes are not in direct conflict?
- Have you removed discrepancies where one of the quotes is missing?
- Are all quotes verbatim from the sources?

If there are NO clear contradictions, return { "discrepancies": [] }.
Only flag contradictions where the candidate directly contradicts their resume.
`;
}