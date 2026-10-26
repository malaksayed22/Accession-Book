# Accession Book: frontend hand-off

Next.js 16 (App Router), React 19, Tailwind 4, TypeScript strict, next-intl (English + Canadian French).
This archive holds the user-interface half of the project. Server code (database access, services, API
routes) lives in the main repository; pages here call it through `src/features/*/queries.ts`, so to RUN the
app you need the full repository. To WORK on the interface you can read and edit everything below and ask
for a full checkout when you need to run it.

## Where things are
- `src/app/[locale]/...`   pages and layouts (`/en/...` and `/fr/...`). `(app)` = signed-in area.
- `src/components/ui`      design-system primitives (Button, Field, Dialog, DataTable, ...).
                           Gallery at `/en/dev/ui` in development.
- `src/components/charts`  DonutChart, BarChart, ColumnChart (dashboard charts, SVG, no library).
- `src/components/page`    page kit (StatCard, SearchForm, SelectFilter, domain badges).
- `src/components/shell`   app shell: sidebar listing every page, mobile drawer, command palette, language and theme switches.
- `src/components/<area>`  feature components (unit/, experiment/, actions/, marketing/, ...).
- `src/styles/tokens.css`  the ONLY colour source (light/dark). `src/styles/tokens.test.ts` checks WCAG AA.
- `messages/{en,fr}/*.json` all visible text, one file per area. English and French must match key for key.
- `src/i18n`               routing, navigation helpers, typed messages.
- `src/lib`                pure helpers and catalogs.
- `e2e/`                   Playwright specs, including accessibility (axe) checks per page.
- `docs/`                  design-system.md, i18n.md, p5-playbook.md (how a page is built), architecture.md.

## Rules that are enforced (lint/tests)
1. No hard-coded text in JSX: use `useTranslations` / `getTranslations` and add the key to BOTH languages.
2. No raw colours: use the token utilities (`bg-surface`, `text-fg`, `text-accent-text`, ...).
3. Pages and components never import the database: data comes from `features/*/queries.ts`.
4. Every page: `await resolveRequestLocale(params); await requirePageUser();` first.
5. Each page passes axe (WCAG 2.2 AA) in en/fr, light and dark.

## Run (needs the full repository)
```
npm install
cp .env.example .env      # set DATABASE_URL (PostgreSQL 16)
npx prisma migrate deploy
npm run dev               # http://localhost:3000/en/login
npm run check             # lint, types, unit tests
```
Secrets are not included in this archive (no .env, no passwords, no database).
