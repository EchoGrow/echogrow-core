<p align="center">
  <img src="apps/web/public/logo.png" width="120" alt="EchoGrow logo" />
</p>

<h1 align="center">EchoGrow</h1>

<p align="center">
  <strong>Interview verification &amp; evidence-based upskilling pipeline.</strong><br />
  Turn a raw interview transcript and a resume into an evidence-backed hiring decision, verified claims, and a personalized growth plan — in seconds.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6%20%2F%206.0-3178c6?logo=typescript&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-12-e0234e?logo=nestjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-14%2B-4169e1?logo=postgresql&logoColor=white" />
  <img alt="Gemini" src="https://img.shields.io/badge/AI-Google%20Gemini-4285f4?logo=google&logoColor=white" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-Vitest-6e9f18?logo=vitest&logoColor=white" />
</p>

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

> **The headline:** a ~45-minute manual review becomes a sub-minute, quote-backed report.

---

## Screenshots

<p align="center">
  <img src="docs/assets/screenshots/overview.png" alt="EchoGrow interview overview" width="100%" />
  <br />
  <em>Overview — four evidence-backed dimensions, confidence, time saved, and a portable candidate profile.</em>
</p>

| Upload | Evaluation |
| --- | --- |
| <img src="docs/assets/screenshots/upload.png" alt="Upload page" width="100%" /> | <img src="docs/assets/screenshots/evaluation.png" alt="Evaluation with transcript evidence" width="100%" /> |
| **Claim verification** | **Growth plan** |
| <img src="docs/assets/screenshots/discrepancies.png" alt="Claim verification" width="100%" /> | <img src="docs/assets/screenshots/roadmap.png" alt="Growth plan" width="100%" /> |
| **Analytics** | **Compare candidates** |
| <img src="docs/assets/screenshots/analytics.png" alt="Analytics dashboard" width="100%" /> | <img src="docs/assets/screenshots/compare.png" alt="Compare candidates" width="100%" /> |

<details>
  <summary><strong>Dark mode</strong></summary>
  <br />
  <img src="docs/assets/screenshots/overview-dark.png" alt="EchoGrow dark mode" width="100%" />
</details>

---

## How it works

```mermaid
flowchart LR
  A[Transcript + resume] --> B[Upload and validate]
  B --> C[(PostgreSQL<br/>session: QUEUED)]
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
| **API** | NestJS 12, Prisma 7, PostgreSQL, BullMQ + Redis, `@nestjs/throttler` |
| **AI** | Google Gemini (`gemini-3.5-flash-lite`), structured prompts + Zod validation |
| **Shared** | TypeScript types + Zod schemas, job-title data, whitelist (`packages/shared`) |
| **Testing** | Vitest — unit, integration, and e2e suites |
| **Tooling** | npm workspaces, ESLint / oxlint, Prettier, Prisma migrations |

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

## Available scripts

### Root

| Script | What it does |
| --- | --- |
| `npm run setup` | Install, build shared, generate Prisma client |
| `npm run build:shared` | Build `@echogrow/shared` (CJS + ESM) |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run dev:api` | Start NestJS in watch mode |
| `npm run dev:web` | Start Vite |
| `npm run build` | Build shared → API → web |

### API (`apps/api`)

| Script | What it does |
| --- | --- |
| `npm run start:dev -w api` | NestJS watch mode |
| `npm run build -w api` | Compile the API |
| `npm run test -w api` | Run all API tests |
| `npm run test:unit -w api` | Unit tests |
| `npm run test:integration -w api` | Integration tests |
| `npm run test:e2e -w api` | E2E suite |
| `npm run test:e2e:endpoints -w api` | HTTP endpoint E2E |
| `npm run test:e2e:pipeline -w api` | Pipeline E2E |
| `npm run test:e2e:compare -w api` | Comparison E2E |
| `npm run test:e2e:analytics -w api` | Analytics E2E |
| `npm run seed -w api` | Seed synthetic demo data |
| `npm run lint -w api` | oxlint |

### Web (`apps/web`)

| Script | What it does |
| --- | --- |
| `npm run dev -w web` | Vite dev server |
| `npm run build -w web` | Type-check + production build |
| `npm run preview -w web` | Preview the production build |
| `npm run test -w web` | Vitest |
| `npm run lint -w web` | ESLint |

---

## API overview

The NestJS API listens on `http://localhost:3000`. In development, the web app calls `/api/*` and Vite strips the prefix.

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

> The endpoint/pipeline E2E suites expect PostgreSQL and Redis to be available. The unit and web suites run without infrastructure.

The shared package also validates its Zod schemas in `packages/shared/src/schemas/schemas.test.ts`.

---

## Demo & presentation

| Resource | Link |
| --- | --- |
| **3-minute live demo script** | [`docs/demo-script.md`](docs/demo-script.md) |
| **Backup demo video (2:24, narrated)** | [`docs/assets/echogrow-demo-720p.mp4`](docs/assets/echogrow-demo-720p.mp4) |
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

> Roles reflect primary contribution areas. Update this table if responsibilities change.

---

## Deployment status

> 🚧 **Live URL: coming in Sprint 5** — tracked in issues **#40** and **#41**.
>
> This repository does not have a production deployment yet. When it is live, replace this block with the URL and add it to [`docs/demo-script.md`](docs/demo-script.md).
>
> Local URLs: web **http://localhost:5173** · API **http://localhost:3000**

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
