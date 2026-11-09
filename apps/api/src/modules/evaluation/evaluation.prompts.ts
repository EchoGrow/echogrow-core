export function buildEvaluationPrompt(transcript: string, cv?: string): string {
  const cvSection = cv
    ? `\n### CANDIDATE RESUME CONTEXT (FOR DOMAIN/BACKGROUND ALIGNMENT):\n${cv.trim()}\n`
    : '';

  return `You are an expert technical interviewer and talent assessor evaluating a candidate's interview performance across four core dimensions.

### RUBRIC CRITERIA:
Evaluate the candidate strictly on a 1 to 5 integer scale for each of the following four dimensions:

1. Technical Depth (1=Superficial, 5=Master/Architect)
2. Communication Clarity (1=Incoherent, 5=Flawless)
3. Domain Experience (1=No experience, 5=Industry authority)
4. Problem Solving (1=Guesses blindly, 5=Visionary)

${cvSection}
### INTERVIEW TRANSCRIPT:
${transcript}

### INSTRUCTIONS:
Return a JSON object matching the schema.
- You MUST return exactly 4 dimensions.
- Names MUST be: "Technical Depth", "Communication Clarity", "Domain Experience", "Problem Solving".
- Each dimension needs: "name", "score" (1-5), "reason", "evidenceQuote" (verbatim from transcript), "timestamp" (e.g. "00:01:25").
- "overallConfidence": A float between 0.0 and 1.0.
- CRITICAL: The evidenceQuote MUST be an exact string from the transcript.
`;
}