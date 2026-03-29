# LocaleFlow

A collaborative translation management system for teams. Manage multi-language projects with structured workflows, AI-powered suggestions, and flexible database support.

## Features

- **Project-based organization** — group translation keys by project with dot-notation namespacing (e.g., `home.welcome.title`)
- **Translation workflow** — status machine (Draft → In Review → Approved) with role-based access (developer, translator, reviewer)
- **Multi-database support** — PostgreSQL, SQLite, or SQL Server via a pluggable provider architecture
- **AI translation suggestions** — pluggable providers for OpenAI, Microsoft Translator, and Google Translate
- **Batch pre-translate** — bulk AI translation for all untranslated keys in a target language
- **Translation memory** — automatically reuses previously approved translations
- **Pseudo-localization** — generate accented placeholder text for layout testing
- **Import/Export** — JSON and CSV formats with nested namespace support
- **Find & Replace** — search and replace across all translations with preview
- **Character limits** — per-key max length enforcement for UI-constrained strings
- **Priority levels** — mark keys as critical, high, normal, or low priority
- **Document uploads** — attach PDF/Word files to projects for translator reference
- **Hyperlinks** — attach reference URLs to projects and individual keys
- **Change history** — audit log for translation key modifications
- **API key management** — generate keys for programmatic access (CI/CD, CLI tools)
- **Bilingual UI** — interface available in English (en-CA) and French (fr-CA)

## Quick Start

### SQLite (zero config)

```bash
npm install
DB_PROVIDER=sqlite npm run dev
```

The app starts at http://localhost:5000 with a local SQLite database. Tables are created automatically.

### PostgreSQL

```bash
npm install
DATABASE_URL=postgresql://user:pass@localhost/localeflow npm run db:push
DATABASE_URL=postgresql://user:pass@localhost/localeflow npm run dev
```

### SQL Server

```bash
npm install
DB_PROVIDER=mssql DATABASE_URL=mssql://user:pass@localhost/localeflow npm run dev
```

Tables are created automatically on startup.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:5000
npm run build        # Build frontend (Vite) + backend (esbuild)
npm run start        # Run production build
npm run check        # TypeScript type check
npm run db:push      # Push schema changes via Drizzle Kit
npm test             # Run Playwright E2E tests
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PROVIDER` | No | `postgres` | Database provider: `postgres`, `sqlite`, or `mssql` |
| `DATABASE_URL` | For postgres/mssql | — | Database connection string |
| `SQLITE_PATH` | No | `./data/localemanager.db` | SQLite database file path |
| `OPENAI_API_KEY` | No | — | Enables OpenAI translation provider |
| `MICROSOFT_TRANSLATOR_API_KEY` | No | — | Enables Microsoft Translator (preferred) |
| `GOOGLE_TRANSLATE_API_KEY` | No | — | Enables Google Translate provider |
| `PORT` | No | `5000` | Server port |

## Architecture

```
client/               React SPA (Vite + TypeScript)
  src/pages/          Page components (dashboard, editor, settings, etc.)
  src/components/     Shared UI components (Radix UI + Tailwind CSS)
  src/locales/        i18n translation files (en-CA, fr-CA)
server/               Express API
  providers/          Database implementations (postgres, sqlite, mssql)
  translation/        AI translation providers (openai, microsoft, google)
  routes.ts           All API endpoints
  storage.ts          IStorage interface + provider factory
shared/               Shared between client and server
  schema.ts           Drizzle ORM schema (PostgreSQL) + Zod validation
  schema-sqlite.ts    Drizzle ORM schema (SQLite)
tests/                Playwright E2E tests
```

The app runs as a single process. In development, Express and Vite share port 5000 — Vite handles the frontend while Express handles `/api/*` routes. In production, Vite builds to `dist/public` and Express serves it statically.

## Tech Stack

- **Frontend**: React 18, TypeScript, Wouter, TanStack React Query, Radix UI, Tailwind CSS
- **Backend**: Express, Drizzle ORM, Zod
- **Databases**: PostgreSQL (pg/Neon), SQLite (better-sqlite3), SQL Server (mssql)
- **Testing**: Playwright (E2E)
- **Build**: Vite (frontend), esbuild (backend)

## License

MIT
