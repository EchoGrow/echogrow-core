<p align="center">
  <img src="apps/web/public/logo.png" width="120" alt="EchoGrow logo" />
</p>

<h1 align="center">EchoGrow</h1>

<p align="center">
  <strong>Interview verification &amp; evidence-based upskilling pipeline.</strong><br />
  Turn a raw interview transcript and a resume into an evidence-backed hiring decision, verified claims, and a personalized growth plan — in seconds.
</p>

<p align="center">
  <a href="https://echogrow-ai.vercel.app"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-echogrow--ai.vercel.app-000?logo=vercel&logoColor=white" /></a>
  <a href="https://github.com/EchoGrow/echogrow-core/actions"><img alt="CI" src="https://img.shields.io/badge/CI-passing-6e9f18?logo=githubactions&logoColor=white" /></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6%20%2F%206.0-3178c6?logo=typescript&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-12-e0234e?logo=nestjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white" />
  <img alt="Gemini" src="https://img.shields.io/badge/AI-Google%20Gemini-4285f4?logo=google&logoColor=white" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-144%20passing-6e9f18?logo=vitest&logoColor=white" />
</p>

---

## Live demo

**🌐 Web app:** [https://echogrow-ai.vercel.app](https://echogrow-ai.vercel.app)
**⚙️ API:** [https://echogrow-api.onrender.com](https://echogrow-api.onrender.com)
**🔧 Worker:** Railway (background queue processor)
**🗄️ Database:** Neon (PostgreSQL 17)
**⚡ Queue:** Render Key Value (Valkey)

> **Note:** The API on Render's free tier may take **30–50 seconds** to wake up after a period of inactivity. For the best first impression, open the web app 1–2 minutes before a live demo.

---

## Why EchoGrow

Hiring teams collect hours of interview signal, then reduce it to a gut feeling and a few notes. EchoGrow closes that gap with an **evidence-first workflow**:

- **Consistent evaluation** — the same four-dimension rubric for every candidate.
- **Verifiable scores** — every rating cites a verbatim quote from the transcript.
- **Claim verification** — contradictions between the resume and the interview are surfaced, ranked, and explained.
- **Human-in-the-loop** — reviewers confirm or dismiss each flag and leave an audit note.
- **Actionable output** — a week-by-week upskilling roadmap for the candidate, exportable as PDF, Markdown, or JSON.
- **Portable profile** — a versioned SPK JSON contract for downstream tools.
- **Team analytics** — completion rates, time saved, top missing skills, and role-aware candidate comparison.

> **The headline:** a ~10-minute manual review becomes a sub-minute, quote-backed report.

---

## Screenshots

### Light Mode

<table>
  <tr>
    <td width="50%"><b>Upload Page</b><br/><img src="docs/assets/screenshots/upload.png" alt="Upload" width="100%"/></td>
    <td width="50%"><b>Bulk Upload</b><br/><img src="docs/assets/screenshots/bulk.png" alt="Bulk Upload" width="100%"/></td>
  </tr>
  <tr>
    <td><b>Overview (Scorecard)</b><br/><img src="docs/assets/screenshots/overview.png" alt="Overview" width="100%"/></td>
    <td><b>Evaluation (Evidence)</b><br/><img src="docs/assets/screenshots/evaluation.png" alt="Evaluation" width="100%"/></td>
  </tr>
  <tr>
    <td><b>Claim Verification</b><br/><img src="docs/assets/screenshots/discrepancies.png" alt="Discrepancies" width="100%"/></td>
    <td><b>Growth Plan (Roadmap)</b><br/><img src="docs/assets/screenshots/roadmap.png" alt="Roadmap" width="100%"/></td>
  </tr>
  <tr>
    <td><b>Analytics Dashboard</b><br/><img src="docs/assets/screenshots/analytics.png" alt="Analytics" width="100%"/></td>
    <td><b>Compare Candidates</b><br/><img src="docs/assets/screenshots/compare.png" alt="Compare" width="100%"/></td>
  </tr>
</table>

<br />

<details>
  <summary><strong>🌙 Dark Mode (Click to expand)</strong></summary>
  <br />
  <p align="center"><em>EchoGrow supports a fully polished dark mode across every page.</em></p>
  
  <table>
    <tr>
      <td width="50%"><b>Upload Page</b><br/><img src="docs/assets/screenshots/upload-dark.png" alt="Upload (Dark)" width="100%"/></td>
      <td width="50%"><b>Bulk Upload</b><br/><img src="docs/assets/screenshots/bulk-dark.png" alt="Bulk Upload (Dark)" width="100%"/></td>
    </tr>
    <tr>
      <td><b>Overview (Scorecard)</b><br/><img src="docs/assets/screenshots/overview-dark.png" alt="Overview (Dark)" width="100%"/></td>
      <td><b>Evaluation (Evidence)</b><br/><img src="docs/assets/screenshots/evaluation-dark.png" alt="Evaluation (Dark)" width="100%"/></td>
    </tr>
    <tr>
      <td><b>Claim Verification</b><br/><img src="docs/assets/screenshots/discrepancies-dark.png" alt="Discrepancies (Dark)" width="100%"/></td>
      <td><b>Growth Plan (Roadmap)</b><br/><img src="docs/assets/screenshots/roadmap-dark.png" alt="Roadmap (Dark)" width="100%"/></td>
    </tr>
    <tr>
      <td><b>Analytics Dashboard</b><br/><img src="docs/assets/screenshots/analytics-dark.png" alt="Analytics (Dark)" width="100%"/></td>
      <td><b>Compare Candidates</b><br/><img src="docs/assets/screenshots/compare-dark.png" alt="Compare (Dark)" width="100%"/></td>
    </tr>
  </table>
</details>

---

## How it works

```mermaid
flowchart LR
  A[Transcript + resume] --> B[Upload and validate]
  B --> C[("PostgreSQL<br/>session: QUEUED")]
  B --> D[BullMQ<br/>evaluation queue]
  D --> E[Pipeline worker]
  E --> F[Score 4 dimensions<br/>+ verbatim evidence]
  E --> G[Detect contradictions<br/>vs resume]
  E --> H[Build roadmap<br/>from verified gaps]
  F --> C
  G --> C
  H --> C
  C --> I[Web report<br/>Overview · Evaluation<br/>Claims · Growth plan]
  E --> J[SPK profile<br/>portable JSON]
  J --> C
```

1. **Upload** — paste or drop a transcript and a resume (text or PDF); bulk upload is also supported.
2. **Queue** — the API persists the session and enqueues an evaluation job, returning immediately.
3. **Evaluate** — the worker parses the transcript into speaker turns, scores four dimensions with quotes, detects contradictions, and drafts a roadmap.
4. **Review** — the dashboard polls the scorecard, then renders evidence, discrepancies, and the growth plan.
5. **Export** — download a PDF/Markdown/JSON roadmap or a versioned SPK profile.

The full architecture, data-flow diagram, metrics, and Q&A are in [`docs/pitch-outline.md`](docs/pitch-outline.md).

---

## Tech stack

| Layer | Technology |
| --- | --- |
| **Web** | React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7, Framer Motion, Recharts, Sonner |
| **API** | NestJS 12, Prisma 7, PostgreSQL 17, BullMQ + Redis (Valkey), `@nestjs/throttler` |
| **AI** | Google Gemini (`gemini-3.5-flash-lite`), structured prompts + Zod validation |
| **Shared** | TypeScript types + Zod schemas, job-title data, whitelist (`packages/shared`) |
| **Testing** | Vitest — unit, integration, and e2e suites (144 tests) |
| **Tooling** | npm workspaces, ESLint / oxlint, Prettier, Prisma migrations |
| **Deployment** | Vercel (web), Render (API + Redis), Railway (worker), Neon (DB) |

---

## Repository structure

```text
echogrow-core/
├── apps/
│   ├── api/                  # NestJS API + BullMQ workers + Prisma schema
│   │   ├── prisma/           # schema, migrations, seed
│   │   └── src/modules/      # interviews, evaluation, discrepancy, roadmap, spk,
│   │                         # compare, analytics, pipeline, llm
│   └── web/                  # React + Vite frontend
│       └── src/
│           ├── pages/        # upload, bulk upload, compare, analytics, dashboard tabs
│           ├── components/   # UI, dashboard, evidence, discrepancies, analytics
│           └── lib/          # API client, scorecard context, exports, theme
├── packages/
│   └── shared/               # Zod schemas + shared TypeScript types
├── docs/
│   ├── demo-script.md        # 3-minute live demo run sheet
│   ├── demo-video.md         # backup video kit + narration transcript
│   ├── pitch-outline.md      # pitch deck outline, architecture, metrics, Q&A
│   └── assets/               # screenshots + backup demo video
└── package.json              # npm workspaces + root scripts
```

---

## Quick start

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **PostgreSQL 14+**
- **Redis 6+** (BullMQ)
- A **Google Gemini API key** — [get one here](https://aistudio.google.com/)

### 1. Install

```bash
git clone https://github.com/EchoGrow/echogrow-core.git
cd echogrow-core
npm install
```

### 2. Configure the API

```bash
# macOS / Linux
cp apps/api/.env.example apps/api/.env

# Windows PowerShell
Copy-Item apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/echogrow?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY="your_gemini_api_key_here"
FRONTEND_URL="http://localhost:5173"
```

> The web app uses `/api` by default and the Vite dev proxy forwards it to `http://localhost:3000`. Override with `VITE_API_URL` in `apps/web/.env.local` only if the API lives elsewhere.

### 3. Build shared + prepare the database

```bash
npm run build:shared
npm run prisma:generate
npm exec -w api -- prisma migrate deploy
```

Optional — seed synthetic demo interviews:

```bash
npm run seed -w api
```

### 4. Run

```bash
# terminal 1 — API (http://localhost:3000)
npm run dev:api

# terminal 2 — web app (http://localhost:5173)
npm run dev:web
```

Open **http://localhost:5173/upload**, click **Load sample**, then **Analyze interview**.

---

## Environment variables

| Variable | App | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | API | ✅ | — | PostgreSQL connection string |
| `REDIS_HOST` | API | — | `localhost` | BullMQ Redis host |
| `REDIS_PORT` | API | — | `6379` | BullMQ Redis port |
| `GEMINI_API_KEY` | API | ✅ | — | Google AI Studio key |
| `FRONTEND_URL` | API | — | `http://localhost:5173` | CORS origin |
| `PORT` | API | — | `3000` | API port |
| `VITE_API_URL` | Web | — | `/api` | API base URL (keep `/api` in dev) |

---

## Architecture deep dive

### Database schema (ERD)

```mermaid
erDiagram
    Candidate ||--o{ InterviewSession : has
    InterviewSession ||--|| Scorecard : produces
    Scorecard ||--o{ Dimension : contains
    Scorecard ||--o{ Discrepancy : contains
    Scorecard ||--o{ Roadmap : has
    Roadmap ||--o{ RoadmapItem : contains
    Dimension ||--o{ SkillGap : identifies
    InterviewSession ||--o| SpkProfile : exports

    Candidate {
        string id PK
        string name
        string email
        datetime createdAt
    }
    InterviewSession {
        string id PK
        string candidateId FK
        string transcript
        string resume
        string structuredTranscript
        string status
        int processingAttempts
        datetime processingStartedAt
    }
    Scorecard {
        string id PK
        string interviewId FK
        float overallScore
        float confidence
        string status
    }
    Dimension {
        string id PK
        string scorecardId FK
        string dimensionType
        int score
        string reason
        json evidenceQuote
    }
    Discrepancy {
        string id PK
        string scorecardId FK
        string claim
        string cvQuote
        string interviewQuote
        float confidence
        string status
        string severity
    }
    SkillGap {
        string id PK
        string dimensionId FK
        string skillName
        string priority
    }
    Roadmap {
        string id PK
        string scorecardId FK
    }
    RoadmapItem {
        string id PK
        string roadmapId FK
        string skillGapId FK
        int week
        string description
        string resourceUrl
    }
    SpkProfile {
        string id PK
        string interviewId FK
        json spkPayload
        string schemaVersion
    }
```

### Interview status state machine

```mermaid
stateDiagram
    [*] --> QUEUED
    QUEUED --> PROCESSING : worker picks up
    PROCESSING --> SCORED : scoring done
    PROCESSING --> NEEDS_REVIEW : low confidence
    PROCESSING --> FAILED : LLM or validation error
    SCORED --> COMPLETED : roadmap and SPK done
    NEEDS_REVIEW --> COMPLETED : reviewer forces evaluation
    NEEDS_REVIEW --> REJECTED : reviewer rejects
    FAILED --> QUEUED : retry force-evaluate
    COMPLETED --> [*]
    REJECTED --> [*]
```

### Async pipeline sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Web)
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Q as BullMQ (Redis)
    participant W as Worker
    participant LLM as Gemini

    U->>API: POST /interviews/upload
    API->>API: Zod validate
    API->>DB: INSERT session (QUEUED)
    API->>Q: enqueue evaluation job
    API-->>U: 201 interviewId

    U->>API: GET /scorecard (poll every 2s)
    API-->>U: status processing progress

    Q->>W: process job
    W->>DB: UPDATE status PROCESSING
    W->>LLM: evaluate 4 dims and evidence
    LLM-->>W: JSON validated by Zod
    W->>DB: INSERT scorecard and dimensions

    W->>LLM: detect discrepancies
    LLM-->>W: JSON
    W->>DB: INSERT discrepancies PENDING

    W->>LLM: build roadmap from gaps
    LLM-->>W: JSON
    W->>DB: INSERT skill gaps and roadmap

    W->>DB: UPDATE status COMPLETED
    W->>Q: enqueue SPK build

    U->>API: GET /scorecard
    API-->>U: status scored dimensions evidence
```

### Worker retry & dead-letter flow

```mermaid
flowchart TD
    A[Job enqueued] --> B{Attempt 1}
    B -->|success| C[Save result]
    B -->|fail| D[Wait backoff]
    D --> E{Attempt 2}
    E -->|success| C
    E -->|fail| F[Wait backoff x2]
    F --> G{Attempt 3}
    G -->|success| C
    G -->|fail| H[Move to Dead Letter Queue]
    H --> I[Mark session as FAILED]
    I --> J[UI shows Retry button]
    J -->|user clicks| A
```

---

## API overview

The NestJS API listens on `http://localhost:3000` (or `PORT`). In development, the web app calls `/api/*` and Vite strips the prefix.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/interviews` | List completed interviews |
| `POST` | `/interviews/upload` | Create an interview from transcript + resume |
| `POST` | `/interviews/bulk-upload` | Upload multiple transcript/resume pairs |
| `GET` | `/interviews/:id/scorecard` | Scorecard + pipeline progress |
| `GET` | `/interviews/:id/discrepancies` | Resume/interview contradictions |
| `PATCH` | `/discrepancies/:id` | Confirm/dismiss a discrepancy + note |
| `GET` | `/interviews/:id/roadmap` | Skill gaps + week-by-week roadmap |
| `GET` | `/interviews/:id/spk-export` | Portable SPK JSON profile |
| `POST` | `/interviews/:id/spk-rebuild` | Rebuild the SPK profile |
| `POST` | `/interviews/:id/force-evaluate` | Re-run the evaluation pipeline |
| `POST` | `/interviews/:id/reject` | Reject an interview session |
| `POST` | `/interviews/compare` | Role-aware candidate comparison |
| `GET` | `/interviews/compare/:id` | Comparison result |
| `GET` | `/analytics/summary?range=30d` | KPI + chart summary |
| `GET` | `/analytics/details?type=…&range=…` | Drill-down data for analytics modals |

Uploads are rate-limited (10 requests / minute per client by default).

---

## Testing

```bash
# everything
npm test -w api
npm test -w web

# focused API suites
npm run test:unit -w api
npm run test:integration -w api
npm run test:e2e:endpoints -w api
npm run test:e2e:pipeline -w api
npm run test:e2e:compare -w api
npm run test:e2e:analytics -w api
```

**Test coverage (last run):**

| Suite | Tests | Status |
| --- | --- | --- |
| API unit | 20 | ✅ |
| API integration | 5 | ✅ |
| API E2E (endpoints) | 68 | ✅ |
| API E2E (pipeline) | 22 | ✅ |
| Web (Vitest) | 24 | ✅ |
| Shared schemas | 5 | ✅ |
| **Total** | **144** | ✅ |

> The endpoint/pipeline E2E suites expect PostgreSQL and Redis to be available. The unit and web suites run without infrastructure.

---

## Deployment

EchoGrow runs on a **multi-platform free-tier stack**:

| Service | Platform | URL | Notes |
| --- | --- | --- | --- |
| **Web** | Vercel | [echogrow-ai.vercel.app](https://echogrow-ai.vercel.app) | Auto-deploy from `main` |
| **API** | Render | [echogrow-api.onrender.com](https://echogrow-api.onrender.com) | Docker (`node:22-slim`) |
| **Worker** | Railway | (internal) | `WORKER=true`, glibc |
| **Database** | Neon | (internal) | PostgreSQL 17, pooling |
| **Queue** | Render Key Value | (internal) | Valkey 8.1 |

### Deployment flow

```mermaid
flowchart LR
    subgraph GitHub
        MAIN[main branch]
    end

    subgraph Vercel
        V_BUILD[Build: npm ci + build:shared + build -w web]
        V_DEPLOY[Static deploy]
        V_BUILD --> V_DEPLOY
    end

    subgraph Render
        R_BUILD[Docker build: node:22-slim]
        R_API[API container]
        R_REDIS[Key Value]
        R_BUILD --> R_API
    end

    subgraph Railway
        RW_BUILD[Railpack build: npm ci + prisma generate]
        RW_WORKER[Worker container]
        RW_BUILD --> RW_WORKER
    end

    subgraph Neon
        NEON_DB[PostgreSQL 17]
    end

    MAIN -->|push| V_BUILD
    MAIN -->|push| R_BUILD
    MAIN -->|push| RW_BUILD

    V_DEPLOY -->|/api/*| R_API
    R_API --> NEON_DB
    R_API --> R_REDIS
    RW_WORKER --> R_REDIS
    RW_WORKER --> NEON_DB
```

**Free-tier caveats:**

- **Render API** sleeps after 15 minutes of inactivity → first request takes 30–50s.
- **Render Key Value** uses `allkeys-lru` eviction (BullMQ warns but works).
- **Neon DB** auto-suspends after 5 minutes idle → first connection is slower.
- **Railway Worker** runs on a $5 trial credit (30 days).

---

## Security & privacy

EchoGrow handles **candidate PII** (resumes, interview transcripts). We treat it as sensitive by default.

- **Synthetic demo data only.** The seed data uses invented candidates (`Ahmed Al-Mansour`, `Maya Lin`, etc.). **Never paste real candidate data** into the demo.
- **No real auth in the demo.** The current build has no login — it is a single-tenant showcase. Adding authentication (JWT + workspaces) is on the roadmap.
- **Raw inputs are immutable.** Transcripts and resumes are stored exactly as received, so any job can be re-run deterministically.
- **Human-in-the-loop by design.** The LLM never auto-rejects a candidate. Every discrepancy waits for a reviewer.
- **Secrets are not in the repo.** `GEMINI_API_KEY`, `DATABASE_URL`, and Redis credentials live in platform environment variables — never in code or Git.
- **Retention.** Raw files and derived reports are stored in Neon; retention policy (auto-delete after N days) is planned for Sprint 6.

---

## Known limitations

- **No authentication.** The demo is open to anyone with the URL.
- **English-only transcripts.** Arabic and RTL support is on the roadmap.
- **Render cold starts.** The free-tier API sleeps; the first request after idle is slow.
- **No real audio ingestion.** The pipeline expects text; ASR (Whisper) is a future feature.
- **Single-tenant.** No workspaces, no per-user data isolation yet.
- **No mobile app.** The web UI is responsive but not a native app.
- **Limited analytics ranges.** 7d / 30d / 90d only.

---

## Demo & presentation

| Resource | Link |
| --- | --- |
| **3-minute live demo script** | [`docs/demo-script.md`](docs/demo-script.md) |
| **Backup demo video (3:05, narrated)** | [`docs/assets/echogrow-demo-720p.mp4`](docs/assets/echogrow-demo-720p.mp4) |
| **Video kit + narration transcript** | [`docs/demo-video.md`](docs/demo-video.md) |
| **Pitch outline + architecture + Q&A** | [`docs/pitch-outline.md`](docs/pitch-outline.md) |

The backup video is deterministic: it was recorded against a mock API, so it plays even if Gemini, Redis, or PostgreSQL are unavailable on demo day.

---

## Team

| Name | Primary area |
| --- | --- |
| **Hasan Sammour** | Team lead · product & full-stack architecture |
| **Raed Alhallaq** | Full-stack developer · backend, frontend, documentation |
| **Noor Sakhel** | Backend developer · database, API, discrepancies |
| **Yazan Yousef** | Backend developer · BullMQ worker, seed data |
| **Tala Salim** | Backend developer · discrepancy status API |
| **Thekra Jaradat** | Frontend developer · claim verification tab |

---

## Contributing

1. Branch from `dev` — never push directly to `dev`.
2. Keep changes scoped and add tests for new behaviour.
3. Run `npm run build`, `npm test -w web`, and the relevant API suites before opening a PR.
4. Open a pull request into `dev`, request review, and wait for approval.
5. Rebase/merge `dev` into your branch if it drifts; do not force-push shared branches.

**Branch naming:** `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.

---

## Acknowledgements

Built with NestJS, React, Prisma, PostgreSQL, Redis, BullMQ, and Google Gemini. Screenshots and the backup demo video were captured from the real UI against deterministic demo fixtures.