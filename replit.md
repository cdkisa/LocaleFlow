# LocaleFlow - Localization Management System

## Overview

LocaleFlow is a collaborative localization management platform that enables teams to manage translations across multiple projects and languages. The system provides translation workflows with status tracking (draft, in review, approved), role-based access control, and import/export capabilities for JSON and CSV formats. Built as a productivity-focused SaaS application, it emphasizes efficient information processing through clean Material Design + Linear-inspired aesthetics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- React Hook Form with Zod for form validation and schema validation

**UI Framework:**
- Shadcn/ui components based on Radix UI primitives
- Tailwind CSS for utility-first styling
- Custom design system with dark mode as primary theme
- Consistent color palette: deep navy-blue backgrounds (220 15% 12%), vibrant blue primary (210 100% 55%)

**State Management:**
- TanStack Query handles all server state with automatic caching and refetching disabled by default
- Local component state managed with React hooks
- Global theme state via Context API (ThemeProvider)

**Architecture Pattern:**
- Page-based routing structure under `client/src/pages/`
- Shared UI components in `client/src/components/ui/`
- Custom hooks for reusable logic (useAuth, useToast, useIsMobile)
- Path aliases configured: `@/` for client code, `@shared/` for shared types

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- Drizzle ORM for type-safe database queries
- Neon serverless PostgreSQL database
- Session-based authentication via Replit Auth (OpenID Connect)

**API Design:**
- RESTful API endpoints under `/api` prefix
- Authentication middleware (isAuthenticated) protects all routes except auth endpoints
- Consistent error handling with HTTP status codes
- Request/response logging for API endpoints

**Database Layer:**
- Drizzle ORM provides schema definition and query building
- Storage abstraction layer (`storage.ts`) decouples business logic from database implementation
- Connection pooling via `@neondatabase/serverless`

**Key Architectural Decisions:**
- Separation of concerns: routes.ts handles HTTP, storage.ts handles data access
- Schema validation using Zod schemas derived from Drizzle tables
- WebSocket support for Neon serverless via ws package

### Data Storage

**Database Schema (PostgreSQL via Drizzle ORM):**

**Core Tables:**
- `users` - User profiles with email, name, profile image (synced from Replit Auth)
- `sessions` - Express session storage (required for Replit Auth)
- `projects` - Translation projects with owner references
- `project_languages` - Languages configured per project (code, name, is_default flag)
- `translation_keys` - Translatable string keys with optional descriptions
- `translations` - Actual translation values per key/language with status workflow
- `project_members` - Team collaboration with role-based permissions (owner, admin, translator, viewer)

**Relationships:**
- Projects belong to users (owner)
- Projects have many languages and translation keys
- Translation keys have many translations (one per language)
- Projects have many members with different roles

**Status Workflow:**
- Translations support three states: draft → in_review → approved
- Visual indicators: slate for draft, chart-3 color for in review, chart-2 color for approved

### Authentication & Authorization

**Replit Auth Integration:**
- OpenID Connect flow via passport-openid-client
- Session management with connect-pg-simple (PostgreSQL session store)
- User profile auto-creation/update on login (upsertUser pattern)
- JWT claims stored in session, user ID extracted from `sub` claim

**Security Measures:**
- HTTP-only cookies for session management
- Secure flag enabled for production
- 1-week session TTL
- All API routes protected except `/api/login`, `/api/callback`, `/api/logout`

**Authorization Pattern:**
- Role-based access via project_members table
- Roles: owner (full control), admin (manage translations), translator (edit translations), viewer (read-only)
- Frontend handles unauthorized errors (401) by redirecting to login

### External Dependencies

**Third-Party Services:**
- Replit Auth (OpenID Connect) - User authentication and profile management
- Neon Database - Serverless PostgreSQL hosting
- Google Fonts - Inter (UI text) and JetBrains Mono (code/keys) typefaces

**Key NPM Packages:**
- `@neondatabase/serverless` - Neon PostgreSQL client with WebSocket support
- `drizzle-orm` - Type-safe ORM for database queries
- `express-session` + `connect-pg-simple` - Session management
- `passport` + `openid-client` - OAuth/OIDC authentication
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Headless UI components
- `react-hook-form` + `zod` - Form handling and validation
- `tailwindcss` - Utility-first CSS framework

**Development Tools:**
- Vite plugins: runtime error overlay, cartographer (Replit integration), dev banner
- TypeScript for type safety across client and server
- ESBuild for server bundling in production

**Import/Export Formats:**
- JSON - Nested object structure with language codes as keys
- CSV - Flat structure with key, language code, and translation columns
- PapaParse library for robust CSV parsing with quote/comma handling
- Zod validation with row-level error reporting

## Recent Changes (Latest Session)

### Language Management (Completed)
- **Full CRUD for Languages**: Project settings now includes complete language management
  - Add new languages with code and name (e.g., "es", "Spanish")
  - Edit existing language details in-place
  - Set default language per project (only one can be default)
  - Delete languages no longer needed
- **API Endpoints**: POST/PUT/DELETE/set-default with owner verification
- **Storage Security**: All language operations verify project ownership and language existence
- **Route**: `/projects/:id/settings` includes language management UI

### Translation Key Editing (Completed)
- **Edit Key Page**: New dedicated page for editing translation key names and descriptions
- **Route**: `/projects/:id/keys/:keyId` renders edit form
- **Functionality**: 
  - Pre-populates form with current key and description
  - Validates changes before saving
  - Redirects back to project detail after successful update
- **API Endpoints**: Uses existing GET/PATCH `/api/translation-keys/:id`

### Bug Fixes (Completed)
- **Project Creation**: Fixed redirect after creating project (was redirecting to `/projects/undefined`)
  - Root cause: Mutation wasn't parsing JSON response
  - Solution: Added `await res.json()` to extract project data with ID
- **404 on Edit Key**: Added missing route and page for editing translation keys

### Member Management (Completed)
- **Team Collaboration**: Project settings includes member management
- **Add/Remove Members**: Owner can add team members with roles (developer, translator, reviewer)
- **Role Display**: Visual badges showing member roles with color coding
- **API Endpoints**: GET/POST/DELETE for project members with owner verification

### Security Enhancements
- **Language Operations**: All language mutations verify project ownership before allowing changes
- **Duplicate Route Removal**: Removed insecure language POST route without ownership checks
- **Project Scoping**: setDefaultLanguage and updateLanguage verify language belongs to project

### Document Upload Feature (Completed - October 17, 2025)
- **Object Storage Integration**: Replit object storage configured for secure file uploads
- **Document Parsing**: Support for Word (.docx) and PDF files with automatic text extraction
  - Uses mammoth library for Word document parsing
  - Uses pdf-parse library (dynamic import) for PDF document parsing
  - **Technical Fix**: PDF parsing uses `(await import("pdf-parse")).default` to resolve CommonJS/ESM compatibility
- **Automatic Key Creation**: Extracted text is split into sentences and converted to translation keys
  - Keys are automatically generated with descriptive names
  - Limited to 50 keys per document to prevent overload
- **Document Management**: Full CRUD operations for uploaded documents
  - Upload documents with drag-and-drop interface (Uppy dashboard)
  - View documents with status tracking (pending, processing, completed, failed)
  - Delete documents with owner permission checks
- **API Endpoints**: 
  - POST /api/objects/upload - Get presigned upload URL
  - GET /objects/:objectPath - Download document with ACL checks
  - GET /api/projects/:id/documents - List project documents
  - POST /api/projects/:id/documents - Create document after upload
  - DELETE /api/projects/:id/documents/:documentId - Delete document
- **Database Schema**: New documents table with metadata tracking (filename, type, size, storage path, extraction status, error messages)
- **UI Components**: Documents tab in project detail page with upload button, document table, and status badges
- **Security**: Owner-only upload/delete operations, private file storage with ACL policies

### Import Translation Auto-Draft Feature (Completed - October 21, 2025)
- **Auto-Draft Creation**: When importing translations for a single language, automatically creates draft translations for all other project languages
  - Only creates drafts for keys present in the uploaded data (not all project keys)
  - Uses `touchedKeyIds` Set to track keys modified during import
  - Prevents unintended side effects on unrelated translation keys
- **Implementation Pattern**: Track affected resource IDs during batch operations to avoid scope creep
  - JSON import handler tracks touched keys during create/update
  - CSV import handler tracks touched keys during create/update
  - Auto-draft loop only iterates over touched keys, not entire project
- **UI Documentation**: Updated import page with clearer information about single-language imports and multi-language format expectations
- **Performance**: Sequential writes for auto-draft creation (could be optimized with batching for larger projects)