/**
 * Evaluation Rubric and Prompt Generator for Issue #14 and Issue #15.
 */

export interface EvaluationPromptInput {
  formattedTranscript: string;
  cvText?: string;
}

export function buildEvaluationPrompt(input: EvaluationPromptInput): string {
  const cvSection = input.cvText
    ? `\n### CANDIDATE RESUME CONTEXT (FOR DOMAIN/BACKGROUND ALIGNMENT):\n${input.cvText.trim()}\n`
    : '';

  return `You are an expert technical interviewer and talent assessor evaluating a candidate's interview performance across four core dimensions.

### RUBRIC CRITERIA:
Evaluate the candidate strictly on a 1 to 5 integer scale for each of the following four dimensions:

1. Technical Depth:
   - Level 1: Superficial or incorrect answers; relies on buzzwords without understanding core concepts.
   - Level 2: Basic textbook definitions; unable to explain underlying mechanisms, trade-offs, or internals.
   - Level 3: Solid working knowledge; explains common patterns, tools, and execution flows accurately.
   - Level 4: Deep understanding; articulates systems internals, query planners, concurrency, edge cases, and performance optimizations.
   - Level 5: Master/Architect level; demonstrates profound knowledge of distributed systems, kernel/runtime trade-offs, and failure mode design.

2. Communication Clarity:
   - Level 1: Incoherent, heavily disjointed, or unable to communicate core thoughts.
   - Level 2: Rambling, vague, or frequently requires interviewer clarification.
   - Level 3: Clear, structured, and easy to follow; answers direct questions with standard coherence.
   - Level 4: Highly articulate, structured (e.g. STAR method), concise, and effectively calibrates technical depth.
   - Level 5: Flawless executive communication; simplifies complex abstractions with precision and insightful analogies.

3. Domain Experience:
   - Level 1: No relevant production experience; purely theoretical or beginner exposure.
   - Level 2: Limited exposure; worked on trivial or academic projects with heavy guidance.
   - Level 3: Solid professional experience; maintains and develops production services in the relevant domain.
   - Level 4: Extensive practical experience; demonstrates proven track record of shipping complex systems end-to-end.
   - Level 5: Industry domain authority; deep understanding of enterprise-grade reliability, compliance, scale, and operational realities.

4. Problem Solving:
   - Level 1: Flounders without direction; guesses blindly or gives up when faced with obstacles.
   - Level 2: Brute force only; struggles to identify root causes or evaluate alternative approaches.
   - Level 3: Methodical approach; decomposes problems step-by-step and produces workable solutions.
   - Level 4: Analytical and proactive; anticipates failure modes, tests hypotheses, and balances immediate fixes against maintainability.
   - Level 5: Visionary problem-solver; identifies elegant solutions to ambiguous, high-impact problems under constraints.

${cvSection}
### INTERVIEW TRANSCRIPT (SPEAKER TURNS WITH TIMESTAMPS):
${input.formattedTranscript}

### INSTRUCTIONS:
1. Return a JSON object matching the requested schema with exactly 4 dimension entries in the 'dimensions' array.
2. The four dimension names MUST BE EXACTLY:
   - "Technical Depth"
   - "Communication Clarity"
   - "Domain Experience"
   - "Problem Solving"
3. Each dimension must have:
   - "name": One of the 4 exact names above.
   - "score": Integer from 1 to 5 based on the rubric.
   - "reason": Thorough justification explaining why this score was assigned.
   - "evidenceQuote": A VERBATIM, word-for-word quote extracted directly from the candidate's speech in the transcript supporting your rating.
   - "timestamp": The timestamp string (e.g., "00:01:25") where the quote appeared in the transcript.
4. "overallConfidence": A float between 0.0 and 1.0 indicating your confidence in this evaluation (e.g., lower confidence if transcript is brief, garbled, or low audio quality; higher if rich dialogue).
5. CRITICAL: The evidenceQuote MUST be an exact string from the transcript. Do not fabricate or summarize the quote.
`;
}

