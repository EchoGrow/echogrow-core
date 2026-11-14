# EchoGrow Web

React + Vite frontend for EchoGrow. Renders the upload flow, evidence-backed dashboard, claim verification, growth plan, analytics, and candidate comparison.

See the [root README](../../README.md) for the full project overview, architecture, screenshots, and demo materials.

## Setup

```bash
# from the repository root
npm install
npm run build:shared
npm run dev:api     # terminal 1 — API on :3000
npm run dev:web     # terminal 2 — web on :5173
```

The dev server proxies `/api` to `http://localhost:3000`. To point at a different API, create `apps/web/.env.local`:

```env
VITE_API_URL=https://your-api.example.com
```

## Routes

| Route | Screen |
| --- | --- |
| `/upload` | Landing page + single interview upload |
| `/bulk-upload` | Multi-file bulk upload with per-row status |
| `/compare` | Candidate selection for role-aware comparison |
| `/compare/results/:id` | Comparison result |
| `/analytics` | KPI dashboard, charts, recent interviews |
| `/dashboard/:id/overview` | Scorecard overview |
| `/dashboard/:id/evaluation` | Four dimensions + transcript evidence |
| `/dashboard/:id/discrepancies` | Claim verification + reviewer actions |
| `/dashboard/:id/roadmap` | Skill gaps + week-by-week growth plan |
| `/dashboard/:id/review` | Manual review state |

## Structure

```text
src/
├── pages/            # route-level screens
├── components/       # UI, dashboard, evidence, discrepancies, analytics, compare
├── lib/
│   ├── api.ts        # typed API client
│   ├── scorecard/    # scorecard context + polling
│   ├── transcript/   # evidence context window matching
│   ├── export/       # PDF / Markdown / JSON exports
│   └── theme/        # light/dark theme provider
└── index.css         # Tailwind theme tokens
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev -w web` | Vite dev server |
| `npm run build -w web` | Type-check + production build |
| `npm run preview -w web` | Preview the build |
| `npm run test -w web` | Vitest |
| `npm run lint -w web` | ESLint |

## Notes

- **Evidence panel** — highlights the verbatim quote in the transcript. The extended context window (two speaker turns, tolerant quote matching) ships in #82.
- **Theme** — light/dark preference is stored in `localStorage` under `echogrow-theme`.
- **Exports** — PDF rendering and PDF parsing are lazy-loaded to keep the initial bundle small.
