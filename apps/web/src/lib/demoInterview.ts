/**
 * Sample interviews used by the "Load sample" menu.
 * Four scenarios with different sizes and contradiction patterns:
 * - full:   large, rich detail, one clear contradiction
 * - medium: balanced, one missing-skill signal, no contradiction
 * - short:  quick smoke test, low detail
 * - clean:  positive profile, no flags (good for the happy-path demo)
 */

export interface DemoScenario {
  id: string
  label: string
  hint: string
  transcript: string
  cv: string
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'full',
    label: 'Full interview · Backend',
    hint: 'Large · one contradiction · detailed evidence',
    transcript: `Interviewer: Tell me about a time you improved performance in a production system.
Candidate: At my previous company, we had an endpoint that took about 2 seconds under load. I profiled it with EXPLAIN ANALYZE, found a sequential scan on a 5-million-row table, and added a composite index on (tenant_id, created_at). Latency dropped to roughly 180 ms.
Interviewer: Can you explain how a B-tree index works internally?
Candidate: Honestly, I know indexes speed up lookups, but I haven't gone deep into B-trees or how the planner picks them. I usually rely on EXPLAIN and iterate.
Interviewer: Have you ever led a team?
Candidate: Yes. I was a Team Lead at TechX for about two years and led a team of six backend engineers.
Interviewer: How do you handle disagreements on technical decisions?
Candidate: I try to write a short design doc, list the trade-offs, and let the team vote. If we're still stuck, I escalate to the tech lead.
Interviewer: What is your experience with payments or logistics domains?
Candidate: Limited. Most of my work was on internal tools and a marketplace MVP. I did integrate a payment provider once, but only at the checkout level.
Interviewer: Describe a time you shipped something under pressure.
Candidate: We had a two-week window to launch a client portal. I broke the work into vertical slices, wrote a checklist, and reviewed every PR myself. We shipped on time with no rollbacks.
Interviewer: How do you debug a production incident at 2 AM?
Candidate: First I check dashboards and recent deploys. Then I look at logs and error rates. If it's urgent, I roll back; otherwise I open a hotfix branch and page the on-call.`,
    cv: `Name: Ahmed Al-Mansour
Role: Backend Developer
Location: Amman, Jordan

Experience:
- Backend Developer, TechX (Jan 2022 - Dec 2024)
  - Built and maintained REST APIs (Node.js, PostgreSQL)
  - Improved query latency on a reporting endpoint
  - Collaborated with a frontend team of three

- Junior Developer, Startup Y (Jun 2020 - Dec 2021)
  - Internal dashboards, authentication flows

Skills: Node.js, PostgreSQL, REST APIs, TypeScript

Notes:
- No formal team-lead title on record.`,
  },
  {
    id: 'medium',
    label: 'Medium interview · Full-stack',
    hint: 'Balanced · missing-skill signal · no contradiction',
    transcript: `Interviewer: What is your strongest area?
Candidate: Frontend architecture. I have spent the last three years building design systems and component libraries with React and TypeScript.
Interviewer: How do you handle state management in a large app?
Candidate: I usually start with local state and context. If the app grows, I move to a store like Zustand. I avoid global state unless it is truly global.
Interviewer: Tell me about a bug you fixed recently.
Candidate: A memory leak in a dashboard. A subscription was never cleaned up in useEffect, so each navigation added a listener. I added a cleanup function and wrote a regression test.
Interviewer: Have you worked with Docker?
Candidate: Only at a basic level. I can write a Dockerfile and run docker compose, but I haven't designed a production image pipeline.`,
    cv: `Name: Layla Haddad
Role: Frontend Engineer
Location: Dubai, UAE

Experience:
- Frontend Engineer, Company Z (2021 - 2025)
  - Built a design system with React and TypeScript
  - Reduced bundle size by 35% via code-splitting

Skills: React, TypeScript, CSS, Vite, Vitest`,
  },
  {
    id: 'short',
    label: 'Short interview · Frontend',
    hint: 'Small · quick smoke test',
    transcript: `Interviewer: Tell me about yourself.
Candidate: I am a frontend developer with two years of experience. I mainly work with React and Tailwind.
Interviewer: What is your favourite React hook?
Candidate: useEffect, because it lets me sync with external systems.`,
    cv: `Name: Omar Nasser
Role: Frontend Developer

Skills: React, Tailwind CSS, JavaScript`,
  },
  {
    id: 'clean',
    label: 'Clean interview · Data',
    hint: 'Positive profile · no flags · happy path',
    transcript: `Interviewer: Describe your current role.
Candidate: I am a Data Engineer at Company W. I build and maintain batch and streaming pipelines on Airflow and Kafka.
Interviewer: Tell me about a pipeline you are proud of.
Candidate: I rebuilt an ingestion pipeline that processed 40 million events per day. I replaced a fragile Python script with a Kafka consumer and added idempotency keys, which eliminated duplicate rows. The team now runs it with zero manual intervention.
Interviewer: How do you test pipelines?
Candidate: I write unit tests for transformations with pytest, and integration tests against a containerized Postgres. I also add a smoke test that runs on every deploy.
Interviewer: What is your experience with data quality?
Candidate: I built a small data-quality layer with Great Expectations. It checks row counts, nulls, and schema drift. When something fails, we get an alert in Slack.`,
    cv: `Name: Sara Khoury
Role: Data Engineer

Experience:
- Data Engineer, Company W (2022 - 2025)
  - Rebuilt ingestion pipeline, 40M events/day
  - Introduced data-quality checks with Great Expectations
  - Wrote unit and integration tests for transformations

Skills: Python, Airflow, Kafka, PostgreSQL, pytest`,
  },
]

export const DEMO_TRANSCRIPT = DEMO_SCENARIOS[0].transcript
export const DEMO_CV = DEMO_SCENARIOS[0].cv