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

**JSON Import:** Supports flat format (uses default language), namespace format (auto-flattens nested objects), single-language, and multi-language formats with auto-detection.
**JSON Export:** 
- Flat format: `{ "en": { "greeting.hello": "Hello" } }` (default)
- Nested namespace format: `{ "en": { "greeting": { "hello": "Hello" } } }` (optional)
- User can toggle nested namespaces via checkbox in export UI
- Handles edge cases: nested children take priority when both flat and nested keys exist
**CSV:** Flat structure with `key`, `language_code`, `value` columns.
**Validation:** Zod for row-level error reporting, PapaParse for robust CSV parsing.

### AI-Powered Translation Suggestions

**OpenAI Integration:** Uses user's OpenAI subscription (gpt-5 model) via `OPENAI_API_KEY` secret.
**Backend API:** Protected endpoint for AI suggestions, identifies source language, sends key name, description, source, and target language for context.
**Frontend UI:** Sparkles icon in translation editor, loading indicators, toast notifications for feedback.
**Auto-Save Behavior:** AI suggestions automatically save the translated value and set status to "in_review" for quality control workflow.
**Security:** API key stored server-side, endpoint protected by authentication.

### Bulk Translation Feature

**Functionality:** Translate multiple selected keys at once using AI-powered suggestions.
**UI Components:**
- Bulk actions toolbar appears when keys are selected
- Shows selection count and action buttons (Clear, Translate Selected)
- Real-time progress indicator during bulk operations
- Completion toast with success/failure counts

**Smart Translation:**
- Only translates empty fields (preserves existing translations)
- Validates prerequisites (default language, source text)
- Processes all non-default languages for selected keys
- Auto-creates translation records as needed
- Invalidates queries to keep UI in sync with database

**User Experience:** Select keys via checkboxes, click "Translate Selected", watch progress, get immediate feedback on completion.

### Translation Memory

**Purpose:** Avoid repeated common translations by storing and suggesting previously approved translations.

**Backend Implementation:**
- `translation_memory` table stores: sourceText (from default language), targetLanguageCode, translatedText, usageCount, lastUsedAt
- Unique constraint on (sourceText, targetLanguageCode) ensures no duplicates
- Automatic population: When a translation is approved, it's automatically added to memory
- Upsert logic increments usage count on duplicate entries
- `/api/translation-memory/suggest` endpoint fetches suggestions

**Frontend UI:**
- When editing a non-default language translation, automatically checks for memory suggestions
- If source text matches an approved translation, displays suggestion banner
- Banner shows: History icon, "Translation Memory: {suggestion}", and "Apply" button
- Clicking Apply fills the translation with remembered text (doesn't auto-save)

**User Experience:**
1. Translator approves a translation (e.g., "Hello" → "Bonjour")
2. System automatically stores it in translation memory
3. Later, when translating another key with same source text "Hello"
4. Editor shows memory suggestion "Bonjour" with Apply button
5. Translator clicks Apply to reuse the translation
6. Result: Consistency across translations, reduced repetitive work

**Key Features:**
- Cross-project memory: All projects share memory for maximum reuse
- Exact match only: Suggestions appear only when source text matches exactly
- Non-intrusive: Optional banner, doesn't interfere with manual editing
- Quality-focused: Only approved translations are added to memory
- Usage tracking: Counts how often each memory entry is reused

### Add Keys in Translation Editor

**Purpose:** Allow users to create translation keys directly from the translation editor without navigating away from their workflow.

**Implementation:**
- "Add Key" button located in the header next to the search input
- Opens a modal dialog with a form for creating new translation keys
- Uses React Hook Form with Zod validation
- API endpoint: POST /api/translation-keys

**Form Fields:**
- Key (required): Text input for the translation key name (e.g., "home.welcome.title")
- Description (optional): Textarea for providing context to translators

**User Experience:**
1. Click "Add Key" button in the translation editor header
2. Dialog opens with the form
3. Fill in the key name and optional description
4. Submit the form
5. Success toast appears
6. Dialog closes and resets
7. Translation keys list automatically refreshes to show the new key
8. Empty state includes helpful message prompting users to add their first key

**Key Features:**
- No page navigation required: Stay in the editor while adding keys
- Instant feedback: Success toasts and automatic list refresh
- Validation: Form validates key name is required before submission
- Empty state support: Works even when there are no existing keys
- Seamless integration: Uses same styling and patterns as the rest of the application

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