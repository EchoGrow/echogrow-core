# EchoGrow API

NestJS backend for EchoGrow: interview ingestion, AI evaluation, discrepancy detection, roadmap generation, SPK export, candidate comparison, and analytics.

See the [root README](../../README.md) for the full project overview, architecture, and demo materials.

## Modules

| Module | Responsibility |
| --- | --- |
| `interviews` | Upload, bulk upload, list, scorecard, reject, force-evaluate |
| `evaluation` | Four-dimension scoring with verbatim evidence + transcript parsing |
| `discrepancy` | Resume/interview contradiction detection and reviewer decisions |
| `roadmap` | Skill gaps + week-by-week upskilling plan |
| `spk` | Portable candidate profile export + rebuild queue |
| `compare` | Role-aware multi-candidate comparison |
| `analytics` | KPI summary and drill-down detail endpoints |
| `pipeline` | BullMQ worker that orchestrates evaluation → discrepancies → roadmap |
| `llm` | Google Gemini client (`gemini-3.5-flash-lite`) |

## Setup

```bash
# from the repository root
npm install
cp apps/api/.env.example apps/api/.env   # then edit it
npm run build:shared
npm run prisma:generate
npm exec -w api -- prisma migrate deploy
npm run seed -w api                      # optional demo data
npm run dev:api
```

Required environment variables: `DATABASE_URL`, `GEMINI_API_KEY`.
Optional: `REDIS_HOST`, `REDIS_PORT`, `FRONTEND_URL`, `PORT`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run start:dev -w api` | Watch mode |
| `npm run build -w api` | Compile |
| `npm run test -w api` | All tests |
| `npm run test:unit -w api` | Unit tests |
| `npm run test:integration -w api` | Integration tests |
| `npm run test:e2e -w api` | E2E suite |
| `npm run seed -w api` | Seed synthetic interviews |
| `npm run lint -w api` | oxlint |

## API surface

The API listens on `http://localhost:3000` (no global prefix). In development the web app calls `/api/*` and the Vite proxy strips `/api`.

| Method | Endpoint |
| --- | --- |
| `GET` | `/interviews` |
| `POST` | `/interviews/upload` |
| `POST` | `/interviews/bulk-upload` |
| `GET` | `/interviews/:id/scorecard` |
| `GET` | `/interviews/:id/discrepancies` |
| `PATCH` | `/discrepancies/:id` |
| `GET` | `/interviews/:id/roadmap` |
| `GET` | `/interviews/:id/spk-export` |
| `POST` | `/interviews/:id/spk-rebuild` |
| `POST` | `/interviews/:id/force-evaluate` |
| `POST` | `/interviews/:id/reject` |
| `POST` | `/interviews/compare` |
| `GET` | `/interviews/compare/:id` |
| `GET` | `/analytics/summary?range=30d` |
| `GET` | `/analytics/details?type=…&range=…` |

Uploads are rate-limited to 10 requests per minute per client by default.
