<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/hero-dark.svg" />
    <img src="docs/assets/brand/hero-light.svg" width="760" alt="EchoGrow: verify claims, detect contradictions, grow candidates" />
  </picture>
</p>

<p align="center">
  <strong>Interview verification &amp; evidence-based upskilling pipeline.</strong><br />
  Turn a raw interview transcript and a resume into an evidence-backed hiring decision,<br />
  verified claims, and a personalized growth plan, in seconds.
</p>

<p align="center">
  <a href="https://echogrow-ai.vercel.app"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-echogrow--ai.vercel.app-000?logo=vercel&logoColor=white" /></a>
  <a href="https://github.com/EchoGrow/echogrow-core/actions"><img alt="CI" src="https://img.shields.io/badge/CI-passing-6e9f18?logo=githubactions&logoColor=white" /></a>
  <img alt="Tests" src="https://img.shields.io/badge/tests-144%20passing-6e9f18?logo=vitest&logoColor=white" />
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6%20%2F%206.0-3178c6?logo=typescript&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-12-e0234e?logo=nestjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white" />
  <img alt="Gemini" src="https://img.shields.io/badge/AI-Google%20Gemini-4285f4?logo=google&logoColor=white" />
</p>

<p align="center">
  <a href="#live-demo"><b>Live demo</b></a> &nbsp;·&nbsp;
  <a href="#why-echogrow"><b>Features</b></a> &nbsp;·&nbsp;
  <a href="#how-it-works"><b>How it works</b></a> &nbsp;·&nbsp;
  <a href="#quick-start"><b>Quick start</b></a> &nbsp;·&nbsp;
  <a href="#api-overview"><b>API</b></a> &nbsp;·&nbsp;
  <a href="#demo--presentation"><b>Docs</b></a>
</p>

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Live demo

| | Service | Where |
| --- | --- | --- |
| 🌐 | **Web app** | [echogrow-ai.vercel.app](https://echogrow-ai.vercel.app) |
| ⚙️ | **API** | [echogrow-api.onrender.com](https://echogrow-api.onrender.com) |
| 🔧 | **Worker** | Railway (background queue processor) |
| 🗄️ | **Database** | Neon (PostgreSQL 17) |
| ⚡ | **Queue** | Render Key Value (Valkey) |

> [!NOTE]
> The API on Render's free tier may take **30–50 seconds** to wake up after a period of inactivity. For the best first impression, open the web app 1–2 minutes before a live demo.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Why EchoGrow

Hiring teams collect hours of interview signal, then reduce it to a gut feeling and a few notes. EchoGrow closes that gap with an **evidence-first workflow**.

| Capability | What you get |
| --- | --- |
| **Consistent evaluation** | The same four-dimension rubric for every candidate. |
| **Verifiable scores** | Every rating cites a verbatim quote from the transcript. |
| **Claim verification** | Contradictions between the resume and the interview are surfaced, ranked, and explained. |
| **Human-in-the-loop** | Reviewers confirm or dismiss each flag and leave an audit note. |
| **Actionable output** | A week-by-week upskilling roadmap, exportable as PDF, Markdown, or JSON. |
| **Portable profile** | A versioned SPK JSON contract for downstream tools. |
| **Team analytics** | Completion rates, time saved, top missing skills, and role-aware candidate comparison. |

> [!TIP]
> **The headline:** a ~10-minute manual review becomes a sub-minute, quote-backed report.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Screenshots

### Light mode

<table>
  <tr>
    <td width="50%"><b>Upload page</b><br/><img src="docs/assets/screenshots/upload.png" alt="Upload" width="100%"/></td>
    <td width="50%"><b>Bulk upload</b><br/><img src="docs/assets/screenshots/bulk.png" alt="Bulk Upload" width="100%"/></td>
  </tr>
  <tr>
    <td><b>Overview (scorecard)</b><br/><img src="docs/assets/screenshots/overview.png" alt="Overview" width="100%"/></td>
    <td><b>Evaluation (evidence)</b><br/><img src="docs/assets/screenshots/evaluation.png" alt="Evaluation" width="100%"/></td>
  </tr>
  <tr>
    <td><b>Claim verification</b><br/><img src="docs/assets/screenshots/discrepancies.png" alt="Discrepancies" width="100%"/></td>
    <td><b>Growth plan (roadmap)</b><br/><img src="docs/assets/screenshots/roadmap.png" alt="Roadmap" width="100%"/></td>
  </tr>
  <tr>
    <td><b>Analytics dashboard</b><br/><img src="docs/assets/screenshots/analytics.png" alt="Analytics" width="100%"/></td>
    <td><b>Compare candidates</b><br/><img src="docs/assets/screenshots/compare.png" alt="Compare" width="100%"/></td>
  </tr>
</table>

<details>
  <summary><strong>🌙 Dark mode (click to expand)</strong></summary>
  <br />
  <p align="center"><em>EchoGrow ships a fully polished dark mode across every page.</em></p>

  <table>
    <tr>
      <td width="50%"><b>Upload page</b><br/><img src="docs/assets/screenshots/upload-dark.png" alt="Upload (Dark)" width="100%"/></td>
      <td width="50%"><b>Bulk upload</b><br/><img src="docs/assets/screenshots/bulk-dark.png" alt="Bulk Upload (Dark)" width="100%"/></td>
    </tr>
    <tr>
      <td><b>Overview (scorecard)</b><br/><img src="docs/assets/screenshots/overview-dark.png" alt="Overview (Dark)" width="100%"/></td>
      <td><b>Evaluation (evidence)</b><br/><img src="docs/assets/screenshots/evaluation-dark.png" alt="Evaluation (Dark)" width="100%"/></td>
    </tr>
    <tr>
      <td><b>Claim verification</b><br/><img src="docs/assets/screenshots/discrepancies-dark.png" alt="Discrepancies (Dark)" width="100%"/></td>
      <td><b>Growth plan (roadmap)</b><br/><img src="docs/assets/screenshots/roadmap-dark.png" alt="Roadmap (Dark)" width="100%"/></td>
    </tr>
    <tr>
      <td><b>Analytics dashboard</b><br/><img src="docs/assets/screenshots/analytics-dark.png" alt="Analytics (Dark)" width="100%"/></td>
      <td><b>Compare candidates</b><br/><img src="docs/assets/screenshots/compare-dark.png" alt="Compare (Dark)" width="100%"/></td>
    </tr>
  </table>
</details>

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

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

| Step | Stage | What happens |
| :---: | --- | --- |
| **1** | **Upload** | Paste or drop a transcript and a resume (text or PDF). Bulk upload is also supported. |
| **2** | **Queue** | The API persists the session and enqueues an evaluation job, returning immediately. |
| **3** | **Evaluate** | The worker parses the transcript into speaker turns, scores four dimensions with quotes, detects contradictions, and drafts a roadmap. |
| **4** | **Review** | The dashboard polls the scorecard, then renders evidence, discrepancies, and the growth plan. |
| **5** | **Export** | Download a PDF / Markdown / JSON roadmap or a versioned SPK profile. |

The full architecture, data-flow diagram, metrics, and Q&A are in [`docs/pitch-outline.md`](docs/pitch-outline.md).

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Design principles

The LLM is a single function call. Most of the engineering is everything around it.

- **Evidence first.** A score without a verbatim quote is not a score.
- **Validate every boundary.** LLM output is parsed and checked with Zod before anything is persisted. Malformed output fails loudly and is retried.
- **Never invent links.** Roadmap resources come from a curated whitelist. A skill without a vetted match falls back to a search link, never a hallucinated URL.
- **Async by default.** Upload returns immediately. All AI work runs in a BullMQ worker with retries, exponential backoff, and jitter.
- **Humans decide.** The model flags, reviewers confirm or dismiss. Nothing is auto-rejected.
- **Dynamic, not templated.** The roadmap has exactly one week per detected skill gap: zero, three, or twelve.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Tech stack

| Layer | Technology |
| --- | --- |
| **Web** | React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7, Framer Motion, Recharts, Sonner |
| **API** | NestJS 12, Prisma 7, PostgreSQL 17, BullMQ + Redis (Valkey), `@nestjs/throttler` |
| **AI** | Google Gemini (`gemini-3.5-flash-lite`), structured prompts + Zod validation |
| **Shared** | TypeScript types + Zod schemas, job-title data, whitelist (`packages/shared`) |
| **Testing** | Vitest: unit, integration, and e2e suites (144 tests) |
| **Tooling** | npm workspaces, ESLint / oxlint, Prettier, Prisma migrations |
| **Deployment** | Vercel (web), Render (API + Redis), Railway (worker), Neon (DB) |

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

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
│   └── assets/
│       ├── brand/            # animated hero, divider, logo (SVG)
│       └── screenshots/      # UI screenshots + backup demo video
└── package.json              # npm workspaces + root scripts
```

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Quick start

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **PostgreSQL 14+**
- **Redis 6+** (BullMQ)
- A **Google Gemini API key**: [get one here](https://aistudio.google.com/)

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

> [!TIP]
> The web app uses `/api` by default and the Vite dev proxy forwards it to `http://localhost:3000`. Override with `VITE_API_URL` in `apps/web/.env.local` only if the API lives elsewhere.

### 3. Build shared + prepare the database

```bash
npm run build:shared
npm run prisma:generate
npm exec -w api -- prisma migrate deploy
```

Optional: seed synthetic demo interviews.

```bash
npm run seed -w api
```

### 4. Run

```bash
# terminal 1: API (http://localhost:3000)
npm run dev:api

# terminal 2: web app (http://localhost:5173)
npm run dev:web
```

Open **http://localhost:5173/upload**, click **Load sample**, then **Analyze interview**.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Environment variables

| Variable | App | Required | Default | Purpose |
| --- | --- | :---: | --- | --- |
| `DATABASE_URL` | API | ✅ | none | PostgreSQL connection string |
| `GEMINI_API_KEY` | API | ✅ | none | Google AI Studio key |
| `DIRECT_URL` | API | | falls back to `DATABASE_URL` | Unpooled DB URL used by the Prisma CLI (migrations, generate) |
| `REDIS_HOST` | API | | `localhost` | BullMQ Redis host |
| `REDIS_PORT` | API | | `6379` | BullMQ Redis port |
| `REDIS_URL` | API | | none | Full Redis URL. When set, it takes precedence over host/port (used in production) |
| `FRONTEND_URL` | API | | `http://localhost:5173` | CORS origin |
| `PORT` | API | | `3000` | API port |
| `RATE_LIMIT_REQUESTS` | API | | `120` | Global per-client request limit per 60s window (ignored when `NODE_ENV=test`) |
| `WORKER` | API | | none | Set to `true` on the Railway service that runs the queue worker |
| `VITE_API_URL` | Web | | `/api` | API base URL (keep `/api` in dev) |

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Architecture deep dive

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

<details>
  <summary><strong>Database schema (ERD)</strong></summary>

```mermaid
erDiagram
    Candidate          ||--o{ InterviewSession    : has
    InterviewSession   ||--o| Scorecard           : produces
    InterviewSession   ||--o| SpkProfile          : exports
    InterviewSession   ||--o{ ComparisonInterview : "appears in"
    InterviewSession   ||--o{ ComparisonRanking   : "ranked in"
    Scorecard          ||--o{ Dimension           : contains
    Scorecard          ||--o{ Discrepancy         : flags
    Scorecard          ||--o| Roadmap             : feeds
    Dimension          ||--o{ SkillGap            : identifies
    Roadmap            ||--o{ RoadmapItem         : contains
    SkillGap           ||--o| RoadmapItem         : "mapped to"
    Comparison         ||--o{ ComparisonInterview : includes
    Comparison         ||--o{ ComparisonRanking   : ranks

    Candidate {
        string id PK
        string name
        string email UK
        datetime created_at
        datetime updated_at
    }
    InterviewSession {
        string id PK
        string candidate_id FK
        string transcript
        string transcript_hash
        string resume
        string resume_hash
        json structured_transcript
        string status "InterviewStatus enum"
        boolean is_scored
        boolean is_verified
        boolean is_planned
        float manual_review_minutes
        int echogrow_seconds
        float saved_minutes
        datetime completed_at
        datetime processing_started_at
        int processing_attempts
        string spk_status
        string spk_error
        datetime created_at
        datetime updated_at
    }
    Scorecard {
        string id PK
        string interview_id FK
        float overall_score
        float confidence
        string status "ScorecardStatus enum"
        datetime created_at
        datetime updated_at
    }
    Dimension {
        string id PK
        string scorecard_id FK
        string dimension_type "DimensionType enum"
        int score
        string reason
        json evidence_quote
        datetime created_at
    }
    Discrepancy {
        string id PK
        string scorecard_id FK
        string claim
        string cv_quote
        string interview_quote
        float confidence
        string status "DiscrepancyStatus enum"
        string severity "DiscrepancySeverity enum"
        string reviewerNotes
        datetime reviewed_at
        datetime created_at
    }
    SkillGap {
        string id PK
        string dimension_id FK
        string skill_name
        string priority "SkillGapPriority enum"
        datetime created_at
    }
    Roadmap {
        string id PK
        string scorecard_id FK
        datetime created_at
        datetime updated_at
    }
    RoadmapItem {
        string id PK
        string roadmap_id FK
        string skill_gap_id FK
        int week
        string description
        string resource_url
        datetime created_at
    }
    SpkProfile {
        string id PK
        string interview_id FK
        string seniority
        string primary_role
        string timezone
        json languages
        int years_of_experience
        json spk_payload
        string schema_version
        datetime created_at
        datetime updated_at
    }
    Comparison {
        string id PK
        string target_role
        string status "ComparisonStatus enum"
        string error
        int candidate_count
        float confidence
        string summary
        string recommendation
        json result
        datetime created_at
        datetime updated_at
        datetime completed_at
    }
    ComparisonInterview {
        string id PK
        string comparison_id FK
        string interview_id FK
        int rank
        float fit_score
    }
    ComparisonRanking {
        string id PK
        string comparison_id FK
        string interview_id FK
        int rank
        string reason
        float fit_score
    }
```

**Source of truth:** [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma). Attribute names are the actual DB column names (`@@map`). Enums are mapped to `interview_status`, `scorecard_status`, `dimension_type`, `discrepancy_status`, `discrepancy_severity`, `skill_gap_priority`, and `comparison_status`. Unique constraints: `Candidate.email`, `Scorecard.interview_id`, `Roadmap.scorecard_id`, `SpkProfile.interview_id`, `(Dimension.scorecard_id, Dimension.dimension_type)`, `(SkillGap.dimension_id, SkillGap.skill_name)`, `RoadmapItem.skill_gap_id`, `(ComparisonInterview.comparison_id, ComparisonInterview.interview_id)`, and `(ComparisonRanking.comparison_id, ComparisonRanking.interview_id)`.

</details>

<details>
  <summary><strong>Worker retry &amp; dead-letter flow</strong></summary>

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

</details>

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## API overview

The NestJS API listens on `http://localhost:3000` (or `PORT`). In development, the web app calls `/api/*` and Vite strips the prefix.

| Method | Endpoint | Purpose |
| :---: | --- | --- |
| `GET` | `/interviews` | List completed interviews |
| `POST` | `/interviews/upload` | Create an interview from transcript + resume |
| `POST` | `/interviews/bulk-upload` | Upload multiple transcript/resume pairs |
| `GET` | `/interviews/scorecards?ids=…` | Batched scorecards for bulk polling (max 50 ids) |
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

#### Rate limiting

Every endpoint is protected by a **global limit of 120 requests / minute per client IP** (60s window), configurable with `RATE_LIMIT_REQUESTS`. The limit is deliberately generous so the UI can poll while a pipeline runs. Reads (scorecard, analytics, comparison result, SPK export) use this global limit.

Expensive write routes override it with stricter per-route limits:

| Endpoint | Limit |
| --- | :---: |
| `POST /interviews/upload` | 10 / min |
| `POST /interviews/bulk-upload` | 5 / min |
| `POST /interviews/:id/force-evaluate` | 10 / min |
| `POST /interviews/compare` | 10 / min |

All other endpoints — `GET /interviews`, `GET /interviews/scorecards?ids=…`, `GET /interviews/:id/scorecard`, `GET /interviews/:id/discrepancies`, `GET /interviews/:id/roadmap`, `GET /interviews/compare/:id`, `GET /analytics/summary`, `GET /analytics/details`, `POST /interviews/:id/reject`, `POST /interviews/:id/spk-rebuild`, `PATCH /discrepancies/:id`, and the diagnostic routes (`/`, `/test-llm`, `/queue-status`) — use the global 120/min limit.

Over-limit requests return **429 Too Many Requests** with a `Retry-After` header and `X-RateLimit-*` response headers. The web client reads `Retry-After` and backs off without losing pipeline progress. In production the API enables `trust proxy`, so clients behind Vercel/Render are keyed by `X-Forwarded-For` instead of sharing one proxy IP. Test runs relax all limits to 1000/min.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

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

| Suite | Tests | Status |
| --- | ---: | :---: |
| API unit | 22 | ✅ |
| API integration | 5 | ✅ |
| API E2E (endpoints) | 68 | ✅ |
| API E2E (pipeline) | 22 | ✅ |
| Web (Vitest) | 24 | ✅ |
| Shared schemas | 5 | ✅ |
| **Total** | **146** | ✅ |

> [!IMPORTANT]
> The endpoint and pipeline E2E suites need PostgreSQL and Redis, and they **delete all rows** from the target database. Point `DATABASE_URL` at a dedicated test database. The pipeline suite also calls Gemini, so it needs a valid `GEMINI_API_KEY`. The unit and web suites run without any infrastructure.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Deployment

EchoGrow runs on a **multi-platform free-tier stack**.

| Service | Platform | URL | Notes |
| --- | --- | --- | --- |
| **Web** | Vercel | [echogrow-ai.vercel.app](https://echogrow-ai.vercel.app) | Auto-deploy from `main` |
| **API** | Render | [echogrow-api.onrender.com](https://echogrow-api.onrender.com) | Docker (`node:22-slim`) |
| **Worker** | Railway | (internal) | `WORKER=true`, glibc |
| **Database** | Neon | (internal) | PostgreSQL 17, pooling |
| **Queue** | Render Key Value | (internal) | Valkey 8.1 |

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

> [!WARNING]
> **Free-tier caveats**
> - **Render API** sleeps after 15 minutes of inactivity, so the first request takes 30–50s.
> - **Render Key Value** uses `allkeys-lru` eviction (BullMQ warns but works).
> - **Neon DB** auto-suspends after 5 minutes idle, so the first connection is slower.
> - **Railway worker** runs on a $5 trial credit (30 days).

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Security & privacy

EchoGrow handles **candidate PII** (resumes, interview transcripts) and treats it as sensitive by default.

- **Synthetic demo data only.** The seed data uses invented candidates (`Ahmed Al-Mansour`, `Maya Lin`, etc.). **Never paste real candidate data** into the demo.
- **No real auth in the demo.** The current build has no login. It is a single-tenant showcase, and authentication (JWT + workspaces) is on the [roadmap](#roadmap).
- **Raw inputs are immutable.** Transcripts and resumes are stored exactly as received, so any job can be re-run deterministically.
- **Human-in-the-loop by design.** The LLM never auto-rejects a candidate. Every discrepancy waits for a reviewer.
- **Secrets stay out of Git.** `GEMINI_API_KEY`, `DATABASE_URL`, and Redis credentials live in platform environment variables.
- **Retention.** Raw files and derived reports are stored in Neon. A retention policy (auto-delete after N days) is planned for Sprint 6.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Known limitations

- **No authentication.** The demo is open to anyone with the URL.
- **English-only transcripts.** Arabic and RTL support is planned.
- **Render cold starts.** The free-tier API sleeps, so the first request after idle is slow.
- **No audio ingestion.** The pipeline expects text. ASR (Whisper) is a future feature.
- **Single-tenant.** No workspaces and no per-user data isolation yet.
- **No native mobile app.** The web UI is responsive.
- **Limited analytics ranges.** 7d / 30d / 90d only.

## Roadmap

- [x] Async evaluation pipeline with retries and dead-letter handling
- [x] Four-dimension scorecard with verbatim evidence
- [x] Resume vs. interview claim verification with reviewer workflow
- [x] Whitelisted, week-by-week growth plan (PDF / Markdown / JSON export)
- [x] Portable SPK profile, bulk upload, analytics, and candidate comparison
- [x] Light and dark themes
- [ ] Authentication and workspaces (JWT, per-user data isolation)
- [ ] Arabic and RTL transcript support
- [ ] Audio ingestion with ASR (Whisper)
- [ ] Data retention policy (auto-delete after N days)

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Demo & presentation

| Resource | Link |
| --- | --- |
| **3-minute live demo script** | [`docs/demo-script.md`](docs/demo-script.md) |
| **Backup demo video (3:05, narrated)** | [`docs/assets/echogrow-demo-720p.mp4`](docs/assets/echogrow-demo-720p.mp4) |
| **Video kit + narration transcript** | [`docs/demo-video.md`](docs/demo-video.md) |
| **Pitch outline + architecture + Q&A** | [`docs/pitch-outline.md`](docs/pitch-outline.md) |

The backup video is deterministic: it was recorded against a mock API, so it plays even if Gemini, Redis, or PostgreSQL are unavailable on demo day.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

## Team

| Name | Primary area |
| --- | --- |
| **Hasan Sammour** | Team lead · product & full-stack architecture |
| **Raed Alhallaq** | Full-stack developer · backend, frontend, documentation |
| **Noor Sakhel** | Backend developer · database, API, discrepancies |
| **Yazan Yousef** | Backend developer · BullMQ worker, seed data |
| **Tala Salim** | Backend developer · discrepancy status API |
| **Thekra Jaradat** | Frontend developer · claim verification tab |

## Contributing

1. Branch from `dev`. Never push directly to `dev`.
2. Keep changes scoped and add tests for new behaviour.
3. Run `npm run build`, `npm test -w web`, and the relevant API suites before opening a PR.
4. Open a pull request into `dev`, request review, and wait for approval.
5. Rebase or merge `dev` into your branch if it drifts. Do not force-push shared branches.

**Branch naming:** `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.

<p align="center"><img src="docs/assets/brand/divider.svg" width="760" alt="" /></p>

<p align="center">
  <sub>Built with NestJS, React, Prisma, PostgreSQL, Redis, BullMQ, and Google Gemini.<br />
  Screenshots and the backup demo video were captured from the real UI against deterministic demo fixtures.</sub>
</p>
