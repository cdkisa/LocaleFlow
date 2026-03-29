# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

LocaleManager is a collaborative translation management system. It manages multi-language translation projects with a status workflow (draft -> in_review -> approved), team roles (developer/translator/reviewer), document upload/extraction, translation memory for reuse, and AI-powered translation suggestions via pluggable providers (OpenAI, Microsoft Translator, Google Translate).

## Commands

```bash
npm run dev          # Start dev server at http://localhost:5000 (auto-opens browser)
npm run build        # Build frontend (Vite) + backend (esbuild)
npm run start        # Run production build
npm run check        # TypeScript type check
npm run db:push      # Push schema changes via Drizzle Kit (respects DB_PROVIDER)
npm test             # Run Playwright E2E tests (serial, single worker)
```

## Architecture

**Monorepo with three layers**: `client/` (React SPA), `server/` (Express API), `shared/` (Drizzle schema + Zod types).

In development, Express and Vite run on the same port (5000). Vite middleware handles the frontend while Express handles `/api/*` routes. In production, Vite builds to `dist/public` and Express serves it statically.

### Server

- **`server/index.ts`** - Express setup, request logging middleware, Vite integration
- **`server/routes.ts`** - All API endpoints (~2700 lines). Uses `isAuthenticated` middleware which injects a default local dev user. All endpoints return `{ status, message, data }` shape
- **`server/storage.ts`** - `IStorage` interface + factory that selects provider via `DB_PROVIDER` env var. All DB access goes through the `storage` singleton
- **`server/providers/`** - Database provider implementations:
  - `postgres-storage.ts` - PostgreSQL via Drizzle ORM (pg driver / Neon serverless)
  - `sqlite-storage.ts` - SQLite via Drizzle ORM (better-sqlite3)
  - `mssql-storage.ts` - SQL Server via `mssql` package with raw parameterized queries
- **`server/db.ts`** - Backward-compat re-export (connection now lives in each provider)
- **`server/translation/`** - Pluggable translation providers. `manager.ts` exports a singleton `TranslationServiceManager` that initializes providers based on available API keys. Default preference: Microsoft > first available

### Client

- **React 18 + TypeScript** with Wouter for routing, TanStack React Query for server state, Radix UI + Tailwind CSS for UI
- **`client/src/App.tsx`** - Root component. Unauthenticated users see Landing; authenticated users get sidebar layout with all project routes
- **`client/src/i18n.ts`** - i18next config with en-CA (default) and fr-CA. Namespaces: common, dashboard, project, editor, landing. Detection: localStorage > navigator > en-CA fallback
- **Path aliases**: `@` -> `client/src/`, `@shared` -> `shared/`, `@assets` -> `attached_assets/`

### Shared

- **`shared/schema.ts`** - Single source of truth for the data model (PostgreSQL). Drizzle ORM table definitions, relations, Zod insert schemas (via `drizzle-zod`), and the translation status state machine (`VALID_TRANSITIONS`, `isValidTransition()`)
- **`shared/schema-sqlite.ts`** - SQLite Drizzle schema mirroring `schema.ts`. Types are still imported from `schema.ts`

### Data Model (key tables)

All tables use UUID PKs with `gen_random_uuid()`. Foreign keys cascade on delete.

- **users** - Accounts (email unique)
- **projects** - Translation projects owned by a user
- **projectLanguages** - Languages enabled per project (one marked `isDefault`)
- **translationKeys** - Dot-notation keys (e.g., "home.welcome.title") with optional maxLength and priority
- **translations** - Values per key+language. Status machine: draft -> in_review -> approved (with revert paths). Check `VALID_TRANSITIONS` in schema.ts
- **projectMembers** - Role-based access (developer/translator/reviewer)
- **documents** - Uploaded files (PDF/Word), stored in `.local-storage/uploads/`
- **translationMemory** - Reusable approved translations, unique on (sourceText, targetLanguageCode)
- **translationKeyChangeHistory** - Audit log for key modifications

### Testing

Playwright E2E tests in `tests/`. Config: serial execution, 1 worker, 60s timeout, Chromium only. Auto-starts dev server. Results in `playwright-report/`.

## Environment Variables

```
DB_PROVIDER=postgres|sqlite|mssql  # Optional. Defaults to "postgres"
DATABASE_URL=postgresql://...      # Required for postgres and mssql providers
SQLITE_PATH=./data/localemanager.db  # Optional for sqlite provider (this is the default)
OPENAI_API_KEY=...                 # Optional. Enables OpenAI translation provider
MICROSOFT_TRANSLATOR_API_KEY=...   # Optional. Enables Microsoft translation (preferred default)
GOOGLE_TRANSLATE_API_KEY=...       # Optional. Enables Google translation
PORT=5000                          # Optional. Server port
```

### Database Provider Notes

- **PostgreSQL** (`DB_PROVIDER=postgres`): Uses Drizzle ORM. Schema managed via `npm run db:push`
- **SQLite** (`DB_PROVIDER=sqlite`): Uses Drizzle ORM + better-sqlite3. Schema managed via `DB_PROVIDER=sqlite npm run db:push`. Data stored in `SQLITE_PATH`
- **SQL Server** (`DB_PROVIDER=mssql`): Uses `mssql` package with raw queries. Tables auto-created on startup via `CREATE TABLE IF NOT EXISTS` DDL

## Conventions

- API routes return `{ status: "success"|"error", message, data }` consistently
- All DB operations go through `IStorage` interface in `server/storage.ts`, never raw SQL
- Zod schemas from `drizzle-zod` validate all request bodies before DB access
- Translation status changes must respect `VALID_TRANSITIONS` in `shared/schema.ts`
- New UI strings go in the appropriate i18n namespace JSON files under `client/src/locales/{en-CA,fr-CA}/`
- Drizzle schema is the single source for both DB types and API validation types
