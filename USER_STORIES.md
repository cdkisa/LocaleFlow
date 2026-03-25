# User Stories - LocaleManager

This document contains user stories for all features in the LocaleManager application, organized by functional area.

## Authentication & User Management

### US-001: User Authentication

**As a** user  
**I want to** authenticate using Replit Auth  
**So that** I can securely access my translation projects

**Acceptance Criteria:**

- User can log in using Replit authentication
- User session is maintained across browser sessions
- User is redirected to login if not authenticated
- Local development supports fake user for testing

### US-002: View User Profile

**As a** user  
**I want to** view my profile information  
**So that** I can see my account details

**Acceptance Criteria:**

- User can see their email, first name, last name, and profile image
- Profile information is displayed in the sidebar
- Profile image is displayed if available

### US-003: View User Statistics

**As a** user  
**I want to** view my translation statistics  
**So that** I can track my activity across projects

**Acceptance Criteria:**

- User can see total projects, keys, and translations
- Statistics are displayed on the dashboard
- Statistics update in real-time

## Project Management

### US-004: Create New Project

**As a** project owner  
**I want to** create a new translation project  
**So that** I can organize translations for different applications or features

**Acceptance Criteria:**

- User can create a project with name and description
- User can add initial languages during project creation
- First language is automatically set as default
- Project is created with user as owner
- User is redirected to project dashboard after creation

### US-005: View Project Dashboard

**As a** user  
**I want to** view a project dashboard  
**So that** I can see project overview and access key features

**Acceptance Criteria:**

- Dashboard displays project name and description
- Dashboard shows project statistics (keys, languages, completion status)
- Dashboard provides quick access to editor, import, export, and settings
- Dashboard displays project hyperlinks
- Dashboard shows recent documents

### US-006: View All Projects

**As a** user  
**I want to** view all my projects  
**So that** I can navigate between different translation projects

**Acceptance Criteria:**

- User can see a list of all projects they own or are a member of
- Projects are displayed with name, description, and key statistics
- User can click on a project to navigate to its dashboard
- Projects are sorted by most recently updated

### US-007: Update Project Details

**As a** project owner  
**I want to** update project name and description  
**So that** I can keep project information current

**Acceptance Criteria:**

- Project owner can edit project name inline
- Project owner can edit project description inline
- Changes are saved automatically
- Success feedback is provided

### US-008: Delete Project

**As a** project owner  
**I want to** delete a project  
**So that** I can remove projects that are no longer needed

**Acceptance Criteria:**

- Project owner can delete a project from settings
- Confirmation dialog prevents accidental deletion
- All project data (keys, translations, documents) are deleted
- User is redirected to dashboard after deletion

## Language Management

### US-009: Add Language to Project

**As a** project owner  
**I want to** add languages to my project  
**So that** I can support multiple locales

**Acceptance Criteria:**

- Project owner can add languages from project settings
- Language code and name are required
- Culture code autocomplete helps find correct language codes
- New language is added to the project
- Empty translations are created for all existing keys in the new language

### US-010: Update Language Settings

**As a** project owner  
**I want to** update language name  
**So that** I can correct or clarify language information

**Acceptance Criteria:**

- Project owner can edit language name
- Changes are saved and reflected immediately

### US-011: Set Default Language

**As a** project owner  
**I want to** set a default language for my project  
**So that** the system knows which language is the source language

**Acceptance Criteria:**

- Project owner can set any language as default
- Only one language can be default at a time
- Setting a new default language removes default from previous language
- Default language is used for AI translation suggestions

### US-012: Remove Language from Project

**As a** project owner  
**I want to** remove a language from my project  
**So that** I can stop supporting locales that are no longer needed

**Acceptance Criteria:**

- Project owner can delete a language from settings
- All translations for that language are deleted
- Language cannot be deleted if it's the only language in the project
- Confirmation prevents accidental deletion

## Translation Key Management

### US-013: Create Translation Key

**As a** developer  
**I want to** create translation keys  
**So that** I can define what needs to be translated

**Acceptance Criteria:**

- Developer can create keys with dot-notation (e.g., "home.welcome.title")
- Key name is required and must be unique within project
- Optional description can be added for translator context
- Optional tags can be added for categorization
- Key is immediately available in translation editor
- Change history is logged

### US-014: View Translation Keys

**As a** user  
**I want to** view all translation keys in a project  
**So that** I can see what needs to be translated

**Acceptance Criteria:**

- Keys can be viewed in table format
- Keys can be viewed in folder tree format (organized by dot-notation)
- User can switch between views
- Keys display with their descriptions and tags
- Keys show translation status per language

### US-015: Search Translation Keys

**As a** user  
**I want to** search for translation keys  
**So that** I can quickly find specific keys

**Acceptance Criteria:**

- User can search by key name
- User can search by description
- Search works in both table and folder views
- Search is case-insensitive
- Results update as user types

### US-016: Update Translation Key

**As a** developer  
**I want to** update translation key details  
**So that** I can modify key names, descriptions, or tags

**Acceptance Criteria:**

- Developer can edit key name (with validation)
- Developer can edit description
- Developer can add/remove tags
- Changes are logged in change history
- All translations remain linked to the key

### US-017: Delete Translation Key

**As a** developer  
**I want to** delete translation keys  
**So that** I can remove keys that are no longer needed

**Acceptance Criteria:**

- Developer can delete a key
- All translations for that key are deleted
- Deletion is logged in change history
- Confirmation prevents accidental deletion

### US-018: Add Images to Translation Key

**As a** developer  
**I want to** add images to translation keys  
**So that** translators have visual context for translations

**Acceptance Criteria:**

- Developer can upload images to a translation key
- Multiple images can be added per key
- Images are stored securely with proper access control
- Images are displayed in the translation editor
- Images can be removed

### US-019: Add Hyperlinks to Translation Key

**As a** developer  
**I want to** add hyperlinks to translation keys  
**So that** translators can access external resources for context

**Acceptance Criteria:**

- Developer can add hyperlinks with label and URL
- Multiple hyperlinks can be added per key
- Hyperlinks are validated (must be valid URLs)
- Hyperlinks are displayed in the translation editor
- Hyperlinks can be edited or removed

### US-020: View Translation Key Change History

**As a** user  
**I want to** view the change history for a translation key  
**So that** I can track who made what changes and when

**Acceptance Criteria:**

- Change history shows all create, update, and delete actions
- History includes user information, timestamp, and field changes
- Old and new values are displayed for updates
- History is displayed in chronological order

### US-021: Get AI Description Suggestion

**As a** developer  
**I want to** get AI-generated descriptions for translation keys  
**So that** I can quickly add helpful context for translators

**Acceptance Criteria:**

- Developer can request AI description suggestion
- Suggestion is based on key name and existing translations
- Suggestion can be accepted or edited
- Suggestion uses OpenAI or configured translation provider

## Translation Management

### US-022: Create Translation

**As a** translator  
**I want to** create translations for keys  
**So that** I can provide translations in different languages

**Acceptance Criteria:**

- Translator can create translations for any key and language
- Translation value is required
- Translation status defaults to "draft"
- Translator is recorded as the creator

### US-023: Update Translation

**As a** translator  
**I want to** update translations  
**So that** I can improve or correct translations

**Acceptance Criteria:**

- Translator can edit translation values
- Changes are auto-saved
- Status can be updated (draft, in_review, approved)
- Updated timestamp is recorded

### US-024: Delete Translation

**As a** user  
**I want to** delete translations  
**So that** I can remove incorrect or obsolete translations

**Acceptance Criteria:**

- User can delete a translation
- Deletion is permanent
- Confirmation prevents accidental deletion

### US-025: Filter Translations

**As a** user  
**I want to** filter translations by key, language, or status  
**So that** I can focus on specific subsets of translations

**Acceptance Criteria:**

- User can filter by translation key
- User can filter by language
- User can filter by status (draft, in_review, approved)
- Multiple filters can be combined
- Filters work with search

### US-026: Search Translations

**As a** user  
**I want to** search translation values  
**So that** I can find translations containing specific text

**Acceptance Criteria:**

- User can search across all translation values
- Search is case-insensitive
- Search results highlight matching keys
- Search works across all languages

### US-027: Update Translation Status

**As a** reviewer  
**I want to** update translation status  
**So that** I can track translation workflow

**Acceptance Criteria:**

- Reviewer can change status from draft to in_review
- Reviewer can change status from in_review to approved
- Reviewer can change status back to draft if needed
- Status changes are recorded with reviewer information
- Approved translations are added to translation memory

### US-028: Bulk Translate with AI

**As a** translator  
**I want to** bulk translate multiple keys using AI  
**So that** I can quickly translate many keys at once

**Acceptance Criteria:**

- User can select multiple keys for bulk translation
- AI translation is applied to all selected keys
- Progress indicator shows translation progress
- Translations are created with "draft" status
- User can review and edit AI-generated translations

## Translation Editor

### US-029: Use Translation Editor

**As a** translator  
**I want to** use a dedicated translation editor  
**So that** I can efficiently translate content

**Acceptance Criteria:**

- Editor displays keys and languages in a grid
- User can edit translations inline
- Changes are auto-saved
- Editor shows translation status
- Editor highlights placeholders (e.g., {{variable}})

### US-030: Switch Between Table and Folder Views

**As a** user  
**I want to** switch between table and folder tree views  
**So that** I can choose the view that works best for me

**Acceptance Criteria:**

- User can toggle between table view and folder tree view
- Table view shows all keys in a flat list
- Folder view organizes keys by dot-notation hierarchy
- Search and filters work in both views
- Selected view preference is maintained

### US-031: Get AI Translation Suggestion

**As a** translator  
**I want to** get AI translation suggestions  
**So that** I can get help translating content

**Acceptance Criteria:**

- User can request AI suggestion for any translation
- Suggestion uses source language translation
- Multiple translation providers are supported
- Suggestion can be accepted, edited, or rejected
- Suggestion includes key context and description

### US-032: Get Translation Memory Suggestion

**As a** translator  
**I want to** get suggestions from translation memory  
**So that** I can reuse previously approved translations

**Acceptance Criteria:**

- System suggests translations from memory when source text matches
- Suggestions appear as non-intrusive banners
- User can apply suggestion with one click
- Memory suggestions are cross-project
- Only approved translations are in memory

### US-033: Add Key from Translation Editor

**As a** developer  
**I want to** add new keys directly from the translation editor  
**So that** I don't have to navigate away from my workflow

**Acceptance Criteria:**

- "Add Key" button is available in editor header
- Dialog form allows creating key with name and description
- New key appears immediately in the editor
- Form validation prevents invalid keys

### US-034: View Translation Key Details

**As a** user  
**I want to** view detailed information about a translation key  
**So that** I can see context, images, and hyperlinks

**Acceptance Criteria:**

- User can click on a key to view details
- Details show description, tags, images, and hyperlinks
- Details show all translations for the key
- Details show change history

## Import & Export

### US-035: Import Translations (JSON)

**As a** user  
**I want to** import translations from JSON files  
**So that** I can bulk import existing translations

**Acceptance Criteria:**

- User can import flat format: `{ "key": "value" }`
- User can import nested format: `{ "namespace": { "key": "value" } }`
- User can import language-wrapped format: `{ "en": { "key": "value" } }`
- System auto-detects format type
- System creates keys and translations as needed
- System creates draft translations for other languages
- Import errors are reported with details

### US-036: Import Translations (CSV)

**As a** user  
**I want to** import translations from CSV files  
**So that** I can import translations from spreadsheet tools

**Acceptance Criteria:**

- CSV must have columns: key, language_code, value, status (optional)
- System validates CSV format
- System creates keys and translations as needed
- Invalid rows are reported with line numbers
- Import summary shows success count and errors

### US-037: Export Translations (JSON)

**As a** user  
**I want to** export translations to JSON  
**So that** I can use translations in my application

**Acceptance Criteria:**

- User can export in flat format
- User can export in nested format (organized by dot-notation)
- User can select which languages to export
- Export includes all translations or only approved
- File is downloaded with proper filename

### US-038: Export Translations (CSV)

**As a** user  
**I want to** export translations to CSV  
**So that** I can edit translations in spreadsheet tools

**Acceptance Criteria:**

- CSV includes columns: key, language_code, value, status
- User can select which languages to export
- File is downloaded with proper filename
- CSV is properly formatted with escaped quotes

## Document Management

### US-039: Upload Document

**As a** project owner  
**I want to** upload Word or PDF documents  
**So that** I can extract text for translation

**Acceptance Criteria:**

- Project owner can upload .docx or .pdf files
- File upload shows progress
- Document is stored securely
- Document status is tracked (pending, processing, completed, failed)

### US-040: View Documents

**As a** user  
**I want to** view uploaded documents  
**So that** I can see what documents are available

**Acceptance Criteria:**

- Documents are listed with name, type, size, and status
- Documents show upload date and uploader
- User can see document processing status

### US-041: Delete Document

**As a** project owner  
**I want to** delete documents  
**So that** I can remove documents that are no longer needed

**Acceptance Criteria:**

- Project owner can delete documents
- Document file is removed from storage
- Document record is removed from database
- Confirmation prevents accidental deletion

### US-042: Extract Text from Documents

**As a** system  
**I want to** automatically extract text from uploaded documents  
**So that** translation keys can be created from document content

**Acceptance Criteria:**

- System extracts text from Word documents
- System extracts text from PDF documents
- Extracted text is stored with document
- System creates translation keys from extracted sentences
- Extraction errors are logged and displayed

## Project Members & Collaboration

### US-043: Add Project Member

**As a** project owner  
**I want to** add members to my project  
**So that** they can help with translations

**Acceptance Criteria:**

- Project owner can add members by email
- Member role must be specified (developer, translator, reviewer)
- Member is added to project
- Member can access project based on role

### US-044: View Project Members

**As a** user  
**I want to** view project members  
**So that** I can see who has access to the project

**Acceptance Criteria:**

- Members are listed with name, email, role, and avatar
- Members are sorted by role or join date
- Owner is clearly identified

### US-045: Remove Project Member

**As a** project owner  
**I want to** remove members from my project  
**So that** I can revoke access when needed

**Acceptance Criteria:**

- Project owner can remove members
- Removed member loses access immediately
- Confirmation prevents accidental removal

### US-046: Role-Based Access Control

**As a** system  
**I want to** enforce role-based permissions  
**So that** users can only perform actions appropriate to their role

**Acceptance Criteria:**

- Developers can create/edit/delete keys and add images/hyperlinks
- Translators can create/edit translations
- Reviewers can approve translations
- Project owners have full access
- Permissions are enforced on all API endpoints

## Project Hyperlinks

### US-047: Add Project Hyperlink

**As a** project owner  
**I want to** add hyperlinks to my project  
**So that** team members can access relevant resources

**Acceptance Criteria:**

- Project owner can add hyperlinks with label and URL
- URL must be valid
- Hyperlinks are displayed on project dashboard
- Multiple hyperlinks can be added

### US-048: Update Project Hyperlink

**As a** project owner  
**I want to** update project hyperlinks  
**So that** I can correct or change links

**Acceptance Criteria:**

- Project owner can edit hyperlink label and URL
- Changes are saved immediately
- Validation ensures URL is valid

### US-049: Delete Project Hyperlink

**As a** project owner  
**I want to** delete project hyperlinks  
**So that** I can remove outdated links

**Acceptance Criteria:**

- Project owner can delete hyperlinks
- Deletion is permanent
- Confirmation prevents accidental deletion

## Translation Memory

### US-050: Store Approved Translations

**As a** system  
**I want to** automatically store approved translations in memory  
**So that** they can be reused across projects

**Acceptance Criteria:**

- When translation is approved, it's added to translation memory
- Memory stores source text, target language, and translated text
- Memory is shared across all projects
- Duplicate entries update usage count

### US-051: Get Translation Memory Suggestions

**As a** translator  
**I want to** get suggestions from translation memory  
**So that** I can reuse previously approved translations

**Acceptance Criteria:**

- System suggests from memory when source text matches exactly
- Suggestions show usage count
- User can apply suggestion with one click
- Suggestions are non-intrusive

### US-052: Track Translation Memory Usage

**As a** system  
**I want to** track how often translation memory entries are used  
**So that** I can identify frequently reused translations

**Acceptance Criteria:**

- Usage count increments when memory entry is used
- Last used timestamp is updated
- Usage statistics can be viewed

## AI Translation Features

### US-053: Get AI Translation Suggestion

**As a** translator  
**I want to** get AI translation suggestions  
**So that** I can get help translating content

**Acceptance Criteria:**

- User can request AI suggestion for any translation
- Multiple translation providers are supported (OpenAI, etc.)
- Suggestion uses source language and key context
- Suggestion can be accepted, edited, or rejected
- Provider can be selected if multiple are available

### US-054: Configure Translation Providers

**As a** system administrator  
**I want to** configure translation providers  
**So that** users can use different AI translation services

**Acceptance Criteria:**

- System supports multiple translation providers
- Providers can be enabled/disabled
- Provider configuration is stored securely
- Default provider can be set

## UI/UX Features

### US-055: Toggle Theme

**As a** user  
**I want to** toggle between light and dark themes  
**So that** I can use the interface in my preferred mode

**Acceptance Criteria:**

- Theme toggle is available in the UI
- Theme preference is saved
- Theme applies to all pages
- Theme persists across sessions

### US-056: Responsive Design

**As a** user  
**I want to** use the application on different screen sizes  
**So that** I can work from any device

**Acceptance Criteria:**

- Application works on desktop, tablet, and mobile
- Layout adapts to screen size
- Touch interactions work on mobile
- Navigation is accessible on all devices

### US-057: Placeholder Highlighting

**As a** translator  
**I want to** see placeholders highlighted in translations  
**So that** I can identify variables that should not be translated

**Acceptance Criteria:**

- Placeholders like {{variable}} are highlighted
- Placeholders are visually distinct
- Placeholders are preserved in translations
- Multiple placeholders in one translation are all highlighted

### US-058: Status Badges

**As a** user  
**I want to** see translation status with color-coded badges  
**So that** I can quickly identify translation status

**Acceptance Criteria:**

- Draft status is shown in gray
- In review status is shown in yellow/orange
- Approved status is shown in green
- Badges are consistent across the application

### US-059: Loading States

**As a** user  
**I want to** see loading indicators  
**So that** I know when the system is processing my request

**Acceptance Criteria:**

- Loading skeletons are shown while data loads
- Spinners are shown for actions in progress
- Progress indicators are shown for bulk operations
- Loading states are clear and non-intrusive

### US-060: Error Handling

**As a** user  
**I want to** see clear error messages  
**So that** I understand what went wrong and how to fix it

**Acceptance Criteria:**

- Error messages are user-friendly
- Validation errors are shown inline
- Network errors are handled gracefully
- Users are redirected to login on authentication errors

## Statistics & Reporting

### US-061: View Project Statistics

**As a** user  
**I want to** view project statistics  
**So that** I can track translation progress

**Acceptance Criteria:**

- Dashboard shows total keys count
- Dashboard shows total languages count
- Dashboard shows translation completion percentage
- Statistics update in real-time

### US-062: View Translation Progress

**As a** user  
**I want to** see translation progress per language  
**So that** I can identify which languages need attention

**Acceptance Criteria:**

- Progress shows number of translated keys per language
- Progress shows number of approved translations
- Progress is displayed as percentages or counts
- Progress is color-coded by status

## Search & Navigation

### US-063: Global Search

**As a** user  
**I want to** search across keys and translations  
**So that** I can quickly find content

**Acceptance Criteria:**

- Search works across key names and translation values
- Search results show matching keys and translations
- Search is case-insensitive
- Search highlights matching text

### US-064: Navigate with Breadcrumbs

**As a** user  
**I want to** see breadcrumb navigation  
**So that** I can understand my location and navigate back

**Acceptance Criteria:**

- Breadcrumbs show current page and parent pages
- Breadcrumbs are clickable for navigation
- Breadcrumbs are visible on all pages

## Key Folder Tree

### US-065: View Keys in Folder Structure

**As a** user  
**I want to** view translation keys organized in a folder tree  
**So that** I can navigate keys by their namespace structure

**Acceptance Criteria:**

- Keys are organized by dot-notation (e.g., "home.welcome" → home/welcome/)
- User can expand/collapse folders
- User can select a folder to see all keys in that folder
- Search works within folder view
- Folder structure reflects key hierarchy

### US-066: Filter Keys by Folder

**As a** user  
**I want to** filter keys by folder path  
**So that** I can focus on specific namespaces

**Acceptance Criteria:**

- User can select a folder to filter keys
- Only keys in selected folder are shown
- Filter can be cleared to show all keys
- Folder selection works with search

## Edit Key Page

### US-067: Edit Key Details

**As a** developer  
**I want to** edit a translation key in a dedicated page  
**So that** I can manage all key details in one place

**Acceptance Criteria:**

- User can navigate to edit key page
- Page shows key name, description, tags
- Page shows all translations for the key
- Page shows images and hyperlinks
- Page shows change history
- User can edit all key properties
- Changes are saved with validation

---

## Summary

This document contains **67 user stories** covering all major features of the LocaleManager application, organized into the following categories:

- Authentication & User Management (3 stories)
- Project Management (5 stories)
- Language Management (4 stories)
- Translation Key Management (9 stories)
- Translation Management (7 stories)
- Translation Editor (6 stories)
- Import & Export (4 stories)
- Document Management (4 stories)
- Project Members & Collaboration (4 stories)
- Project Hyperlinks (3 stories)
- Translation Memory (3 stories)
- AI Translation Features (2 stories)
- UI/UX Features (6 stories)
- Statistics & Reporting (2 stories)
- Search & Navigation (2 stories)
- Key Folder Tree (2 stories)
- Edit Key Page (1 story)

Each user story follows the format: **As a** [user type], **I want to** [action], **So that** [benefit], with detailed acceptance criteria.
