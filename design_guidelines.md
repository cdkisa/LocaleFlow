# Localization Management System - Design Guidelines

## Design Approach: Design System Foundation

**Selected Approach:** Material Design + Linear-inspired aesthetics for a clean, productivity-focused SaaS platform

**Justification:** This is a data-heavy, utility-focused productivity tool requiring:
- Efficient information processing across translation tables and project dashboards
- Clear visual hierarchy for multiple user roles and permission states
- Consistent, learnable patterns for daily workflow tasks
- Professional appearance for enterprise and team collaboration

**Key Design Principles:**
- Clarity over decoration: Every element serves a functional purpose
- Information density without overwhelming: Smart use of whitespace and grouping
- Role-aware interfaces: Visual cues for different permission levels
- Workflow-optimized: Reduce clicks and cognitive load for common tasks

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary):**
- Background: 220 15% 12% (deep navy-blue base)
- Surface: 220 15% 16% (elevated panels)
- Surface elevated: 220 15% 20% (cards, modals)
- Border: 220 10% 25% (subtle divisions)
- Primary brand: 210 100% 55% (vibrant blue for CTAs, active states)
- Primary hover: 210 100% 60%
- Success: 142 70% 45% (approved translations, completed tasks)
- Warning: 38 92% 50% (pending reviews, drafts)
- Error: 0 72% 51% (conflicts, errors)
- Text primary: 0 0% 95%
- Text secondary: 0 0% 70%
- Text muted: 0 0% 50%

**Light Mode:**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Surface elevated: 220 15% 98%
- Border: 220 10% 88%
- Primary brand: 210 100% 50%
- Primary hover: 210 100% 45%
- Text primary: 220 15% 15%
- Text secondary: 220 10% 40%
- Text muted: 220 8% 55%

### B. Typography

**Font Families:**
- Primary: 'Inter', system-ui, sans-serif (via Google Fonts CDN)
- Monospace: 'JetBrains Mono', 'Fira Code', monospace (for translation keys, code)

**Type Scale:**
- Headings: H1: 2rem/600, H2: 1.5rem/600, H3: 1.25rem/600, H4: 1.125rem/600
- Body: Base: 0.9375rem/400, Small: 0.875rem/400, Tiny: 0.8125rem/400
- Code/Keys: 0.875rem/500 (monospace)

**Usage:**
- Dashboard titles: H1 weight 600
- Section headers: H3 weight 600
- Table headers: Base weight 600 uppercase tracking-wide
- Translation keys: Monospace weight 500
- Body content: Base weight 400 leading-relaxed

### C. Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16** consistently
- Component padding: p-4, p-6
- Section spacing: gap-8, gap-12
- Page margins: m-8, m-12
- Micro spacing: gap-2, gap-4

**Grid Structure:**
- Dashboard: 12-column grid with 6-8 column main content, 4-6 column sidebar
- Translation editor: 2-column split (source language | target language)
- Project cards: Grid of 3 columns on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Maximum content width: max-w-7xl for dashboard, max-w-6xl for focused content

### D. Component Library

**Navigation:**
- Top bar: Fixed height (h-16), logo left, user menu/settings right, project switcher center
- Side navigation: Fixed width (w-64), collapsible to w-16 icon-only mode
- Breadcrumbs: Text-sm with chevron separators for deep navigation

**Data Tables:**
- Striped rows with hover states (bg-surface-elevated on hover)
- Sticky header with sort indicators
- Row actions on hover (edit, delete, status change)
- Compact density: py-3 px-4 cell padding
- Checkbox selection with bulk actions bar

**Forms & Inputs:**
- Input fields: h-10, px-3, border rounded-md with focus ring-2 ring-primary
- Textarea for translations: min-h-24, auto-resize based on content
- Inline editing: Click-to-edit with save/cancel actions
- Language selector: Dropdown with flag icons (use Hero Icons for chevrons)

**Cards:**
- Project cards: p-6, rounded-lg, border, with header/content/footer sections
- Translation cards: Compact p-4, key in monospace, language tags, status badge
- Stat cards: Large numbers (text-3xl font-bold), label (text-sm text-muted)

**Buttons & Actions:**
- Primary: bg-primary text-white rounded-md px-4 py-2
- Secondary: border border-border bg-transparent rounded-md px-4 py-2
- Danger: bg-error text-white
- Icon buttons: p-2 rounded-md hover:bg-surface-elevated
- Use Heroicons for all icons (CDN)

**Status Indicators:**
- Badge pills: px-2.5 py-0.5 rounded-full text-xs font-medium
- Draft: bg-slate-500/10 text-slate-400 border border-slate-500/20
- In Review: bg-warning/10 text-warning border border-warning/20
- Approved: bg-success/10 text-success border border-success/20

**Modals & Overlays:**
- Modal: max-w-2xl, p-6, rounded-lg, backdrop blur
- Slide-over panels: Fixed right, w-96, full-height for detailed views
- Dropdown menus: min-w-48, rounded-md, shadow-lg

### E. Animations

Use sparingly and purposefully:
- Page transitions: None (instant for productivity)
- Hover states: transition-colors duration-150
- Modal/dropdown entry: duration-200 ease-out
- Loading states: Subtle pulse on skeleton screens

---

## Page-Specific Layouts

**Dashboard:**
- Welcome header with project stats (4-column grid of stat cards)
- Recent activity feed (chronological list with avatars)
- Quick actions section (Import, Create Project, Invite User buttons)
- Active projects grid (3-column cards with progress bars)

**Translation Editor:**
- Split view: Source language (left) | Target language (right)
- Key browser sidebar (left, w-80, collapsible): Tree view of translation namespaces
- Center: Side-by-side translation pairs with inline editing
- Right panel (w-96, toggleable): Translation suggestions, history, comments

**Project Management:**
- Header: Project name, description, language list with progress indicators
- Tabs: Overview | Translations | Members | Settings
- Overview: Stats grid, recent changes, activity feed
- Translations: Full-width data table with filters (language, status, search)

**Import/Export:**
- Drag-drop zone (h-64, border-dashed, centered icon and text)
- Format selector: Radio buttons for JSON/CSV
- Preview table before import
- Export: Checkboxes for languages/namespaces, format selector

---

## Images

**Dashboard Hero Header:**
- Location: Top of dashboard, partial height (h-48 to h-64)
- Description: Abstract geometric pattern representing language connections - interconnected nodes and lines in primary brand colors with subtle gradients, giving a sense of global collaboration
- Treatment: Semi-transparent overlay with white text, ensuring readability

**Empty States:**
- No projects: Friendly illustration of a world map with translation pins
- No translations: Illustration of a document with checkmarks
- Use illustration style: Minimal line art in primary color

**Icons:**
- Use Heroicons (CDN) for all UI icons
- Language flags: Use emoji flags or a minimal flag icon set
- File type icons: Document, download, upload from Heroicons