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