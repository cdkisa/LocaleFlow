# LocaleFlow - Localization Management System

## Overview

LocaleFlow is a collaborative SaaS platform for managing translations across multiple projects and languages. It offers translation workflows with status tracking, role-based access control, and robust import/export functionalities for JSON and CSV formats. The system is designed for productivity, featuring a clean Material Design and Linear-inspired user interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** React with TypeScript, Vite, Wouter, TanStack Query, React Hook Form with Zod.
**UI Framework:** Shadcn/ui (Radix UI-based), Tailwind CSS, custom design system with a primary dark mode (deep navy-blue backgrounds, vibrant blue primary).
**State Management:** TanStack Query for server state (caching disabled by default), React hooks for local state, Context API for global theme.
**Architecture Pattern:** Page-based routing, shared UI components, custom hooks for reusable logic, path aliases (`@/`, `@shared/`).

### Backend Architecture

**Technology Stack:** Express.js with TypeScript, Drizzle ORM, Neon serverless PostgreSQL, Session-based authentication via Replit Auth (OpenID Connect).
**API Design:** RESTful endpoints (`/api` prefix), authentication middleware, consistent error handling, request/response logging.
**Database Layer:** Drizzle ORM for schema and queries, storage abstraction layer (`storage.ts`), connection pooling via `@neondatabase/serverless`.
**Key Architectural Decisions:** Separation of concerns (routes vs. data access), Zod schema validation derived from Drizzle, WebSocket support for Neon.

### Data Storage

**Database Schema (PostgreSQL via Drizzle ORM):**
- **Core Tables:** `users`, `sessions`, `projects`, `project_languages`, `translation_keys`, `translations`, `project_members`, `documents`.
- **Relationships:** Projects belong to users, have languages and keys. Keys have translations. Projects have members.
- **Status Workflow:** Translations progress through `draft`, `in_review`, `approved` states.

### Authentication & Authorization

**Replit Auth Integration:** OpenID Connect via `passport-openid-client`, session management with `connect-pg-simple`, user profile upsert on login.
**Security Measures:** HTTP-only cookies, secure flag for production, 1-week session TTL, protected API routes (except auth).
**Authorization Pattern:** Role-based access (`owner`, `admin`, `translator`, `viewer`) via `project_members` table.

### Document Management
- **Functionality:** Upload Word (.docx) and PDF files, automatic text extraction for key creation (max 50 keys/document), CRUD operations for documents.
- **Storage:** Replit object storage for secure file uploads.
- **Security:** Owner-only upload/delete, private file storage with ACLs.

### Import/Export Formats

**JSON:** Supports flat format (uses default language), namespace format (auto-flattens nested objects), single-language, and multi-language formats with auto-detection.
**CSV:** Flat structure with `key`, `language_code`, `value` columns.
**Validation:** Zod for row-level error reporting, PapaParse for robust CSV parsing.

### AI-Powered Translation Suggestions

**OpenAI Integration:** Uses user's OpenAI subscription (gpt-5 model) via `OPENAI_API_KEY` secret.
**Backend API:** Protected endpoint for AI suggestions, identifies source language, sends key name, description, source, and target language for context.
**Frontend UI:** Sparkles icon in translation editor, loading indicators, toast notifications for feedback.
**Security:** API key stored server-side, endpoint protected by authentication.

## External Dependencies

**Third-Party Services:**
- **Replit Auth:** User authentication and profile management.
- **Neon Database:** Serverless PostgreSQL hosting.
- **OpenAI API:** AI-powered translation suggestions (gpt-5 model).
- **Google Fonts:** Inter and JetBrains Mono typefaces.

**Key NPM Packages:**
- `@neondatabase/serverless`
- `drizzle-orm`
- `express-session`, `connect-pg-simple`
- `passport`, `openid-client`
- `@tanstack/react-query`
- `@radix-ui/*`
- `react-hook-form`, `zod`
- `tailwindcss`
- `mammoth` (for .docx parsing)
- `pdf-parse` (for .pdf parsing)
- `papaparse` (for CSV parsing)

**Development Tools:**
- Vite plugins (runtime error overlay, cartographer, dev banner)
- TypeScript
- ESBuild