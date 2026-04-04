@~/.claude/AGENTS-COMPACT.md
@AGENTS.md

# AAAnalytics

Local developer tool for evaluating AI coding agents against customizable rubrics. Measures quality (rubric score) vs cost (tokens) to prove rubric-informed agents write better code more efficiently.

## Principles

- TDD: write tests first, then implement
- KISS: simplest solution that works
- SOLID: single responsibility, open/closed, etc.
- DRY: single source of truth
- No mixed concerns: Tailwind only (no CSS files)

## Tech Stack

- Next.js (App Router) + TypeScript
- PostgreSQL (local) + Drizzle ORM
- Tailwind CSS
- Vitest + React Testing Library
- Claude API (`@anthropic-ai/sdk`)
- Shell execution: `execa`

## Project Structure

```
src/
  app/           # Next.js App Router pages
  db/            # Drizzle schema, migrations, connection
  lib/           # Shared utilities, API clients
  components/    # React components
```

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Vitest
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:migrate` — run migrations
- `npm run db:seed` — seed database

## Database

- Local PostgreSQL on port 5432
- Database name: `aaanalytics`
- Drizzle ORM for schema + migrations
- Connection string in `.env.local`
