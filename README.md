# Accession Book

Traceability and compliance platform for regulated material: what a unit is, where it came
from, who touched it, what it tested at, and where it went, with a full audit trail on
every action.

This repository is the user-interface half of the project: Next.js 16 (App Router), React 19,
Tailwind CSS 4, strict TypeScript, and English + Canadian French via `next-intl`. The server
layer (`src/server`, `src/features/*/queries.ts`, `src/app/api`) is a **mock** that returns
sample data, so the app runs with no database and no secrets. See [`HANDOFF.md`](HANDOFF.md)
for the architecture and the rules the codebase enforces, and [`docs/`](docs) for the design
system, i18n, and page-building guides.

## Requirements

- Node.js 22.12 or newer (developed on 24)
- npm 10 or newer

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

Environment variables are optional. To override the defaults, copy `.env.example` to `.env`.

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the dev server on port 3000             |
| `npm run build`        | Production build                              |
| `npm start`            | Serve the production build                    |
| `npm run check`        | Lint + type-check + unit tests                |
| `npm run lint:ci`      | ESLint with zero warnings allowed             |
| `npm run typecheck`    | TypeScript, no emit                           |
| `npm test`             | Vitest unit tests                             |
| `npm run test:e2e`     | Playwright end-to-end and accessibility tests |
| `npm run format:check` | Prettier check                                |

## Deploying to Vercel

The project needs no custom build settings.

1. Import the repository at [vercel.com/new](https://vercel.com/new). The Next.js framework
   preset, `npm install`, and `npm run build` are detected automatically.
2. Deploy. No environment variables are required for the mock build. Optional overrides
   (`APP_URL`, `LAB_TIMEZONE`) are listed in `.env.example`.

Vercel uses the Node.js version from `engines` in `package.json`.

## Brand

`src/lib/brand.ts` is the only place the product name is written.
