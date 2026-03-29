# i18n Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Internationalize the LocaleManager app with en-CA and fr-CA support, including locale-aware date/number formatting and a sidebar language toggle.

**Architecture:** react-i18next with bundled JSON translation files (no lazy loading needed for 2 locales). 5 namespaces (common, dashboard, project, editor, landing) keep files focused. A `useLocaleFormat` hook wraps `Intl` APIs for dates/numbers. Language detection: localStorage > browser > en-CA fallback.

**Tech Stack:** i18next, react-i18next, i18next-browser-languagedetector

---

### Task 1: Install dependencies and create i18n infrastructure

**Files:**
- Create: `client/src/i18n.ts`
- Create: `client/src/hooks/useLocaleFormat.ts`
- Create: `client/src/locales/en-CA/common.json`
- Create: `client/src/locales/en-CA/dashboard.json`
- Create: `client/src/locales/en-CA/project.json`
- Create: `client/src/locales/en-CA/editor.json`
- Create: `client/src/locales/en-CA/landing.json`
- Create: `client/src/locales/fr-CA/common.json`
- Create: `client/src/locales/fr-CA/dashboard.json`
- Create: `client/src/locales/fr-CA/project.json`
- Create: `client/src/locales/fr-CA/editor.json`
- Create: `client/src/locales/fr-CA/landing.json`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Install i18n packages**

```bash
pnpm add i18next react-i18next i18next-browser-languagedetector
```

- [ ] **Step 2: Create en-CA common.json**

This namespace covers: nav labels, shared buttons, toast titles, error messages, status labels, transition labels, role labels, validation messages, and other shared strings.

Create `client/src/locales/en-CA/common.json`:
```json
{
  "nav.dashboard": "Dashboard",
  "nav.projects": "Projects",
  "nav.signOut": "Sign Out",
  "brand": "LocaleFlow",
  "noProjectsYet": "No projects yet",

  "actions.save": "Save",
  "actions.cancel": "Cancel",
  "actions.delete": "Delete",
  "actions.edit": "Edit",
  "actions.add": "Add",
  "actions.back": "Back",
  "actions.backToProject": "Back to Project",
  "actions.import": "Import",
  "actions.export": "Export",
  "actions.settings": "Settings",
  "actions.createProject": "Create Project",
  "actions.addLink": "Add Link",
  "actions.addFirstLink": "Add First Link",
  "actions.addLanguage": "Add Language",
  "actions.addMember": "Add Member",
  "actions.addKey": "Add Key",
  "actions.addImage": "Add Image",
  "actions.apply": "Apply",
  "actions.uploadDocument": "Upload Document",
  "actions.uploadFirstDocument": "Upload First Document",
  "actions.creating": "Creating...",
  "actions.adding": "Adding...",
  "actions.deleting": "Deleting...",
  "actions.importing": "Importing...",
  "actions.exporting": "Exporting...",
  "actions.generating": "Generating...",

  "toast.success": "Success",
  "toast.error": "Error",
  "toast.unauthorized": "Unauthorized",
  "toast.unauthorizedDesc": "You are logged out. Logging in again...",

  "status.draft": "Draft",
  "status.in_review": "In Review",
  "status.approved": "Approved",

  "transition.draft-in_review": "Submit for Review",
  "transition.in_review-approved": "Approve",
  "transition.in_review-draft": "Needs Work",
  "transition.approved-draft": "Reopen",

  "roles.developer": "Developer",
  "roles.translator": "Translator",
  "roles.reviewer": "Reviewer",

  "validation.required": "This field is required",
  "validation.keyRequired": "Key is required",
  "validation.nameRequired": "Project name is required",
  "validation.labelRequired": "Label is required",
  "validation.validUrl": "Must be a valid URL",

  "labels.label": "Label",
  "labels.url": "URL",
  "labels.key": "Key",
  "labels.description": "Description",
  "labels.email": "Email Address",
  "labels.role": "Role",
  "labels.projectName": "Project Name",
  "labels.fileName": "File Name",
  "labels.type": "Type",
  "labels.size": "Size",
  "labels.status": "Status",
  "labels.uploaded": "Uploaded",
  "labels.actions": "Actions",
  "labels.default": "Default",

  "language.en": "EN",
  "language.fr": "FR",
  "language.switchTo": "Switch language",

  "notFound.title": "404 Page Not Found",
  "notFound.description": "Did you forget to add the page to the router?"
}
```

- [ ] **Step 3: Create en-CA dashboard.json**

Create `client/src/locales/en-CA/dashboard.json`:
```json
{
  "welcome": "Welcome Back",
  "subtitle": "Manage your localization projects and translations",
  "stats.totalProjects": "Total Projects",
  "stats.languages": "Languages",
  "stats.translationKeys": "Translation Keys",
  "stats.recentActivity": "Recent Activity",
  "projects": "Projects",
  "newProject": "New Project",
  "viewTranslations": "View translations",
  "empty.title": "No projects yet",
  "empty.description": "Create your first localization project to start managing translations"
}
```

- [ ] **Step 4: Create en-CA project.json**

Create `client/src/locales/en-CA/project.json`:
```json
{
  "dashboard.translationEditor": "Translation Editor",
  "dashboard.deleteProject": "Delete Project",
  "dashboard.confirmDelete": "Are you sure?",
  "dashboard.confirmDeleteDesc": "This action cannot be undone. This will permanently delete the project \"{{name}}\" and all of its translation keys, translations, and documents.",
  "dashboard.projectNotFound": "Project not found",
  "dashboard.stats.progress": "Progress",
  "dashboard.stats.translations": "{{completed}} of {{total}} translations",
  "dashboard.stats.approved": "Approved",
  "dashboard.stats.inReview": "In Review",
  "dashboard.stats.missing": "Missing",
  "dashboard.languages": "Languages",
  "dashboard.languagesConfigured": "{{count}} languages configured",
  "dashboard.hyperlinks": "Hyperlinks",
  "dashboard.hyperlinksDesc": "External links related to this project",
  "dashboard.editHyperlink": "Edit Hyperlink",
  "dashboard.addHyperlink": "Add Hyperlink",
  "dashboard.addHyperlinkDesc": "Add an external link related to this project",
  "dashboard.noHyperlinks": "No hyperlinks added yet",
  "dashboard.documents": "Documents",
  "dashboard.documentsDesc": "Upload Word or PDF documents to automatically extract translation keys",
  "dashboard.noDocuments": "No documents uploaded yet",
  "dashboard.fileTypePdf": "PDF",
  "dashboard.fileTypeWord": "Word",

  "toast.hyperlinkAdded": "Hyperlink added successfully",
  "toast.hyperlinkUpdated": "Hyperlink updated successfully",
  "toast.hyperlinkDeleted": "Hyperlink deleted",
  "toast.documentDeleted": "Document deleted",
  "toast.projectDeleted": "Project deleted successfully",
  "toast.documentUploaded": "Document uploaded and processing started",
  "toast.failedCreateHyperlink": "Failed to create hyperlink",
  "toast.failedUpdateHyperlink": "Failed to update hyperlink",
  "toast.failedDeleteHyperlink": "Failed to delete hyperlink",
  "toast.failedDeleteDocument": "Failed to delete document",
  "toast.failedDeleteProject": "Failed to delete project",
  "toast.failedProcessDocument": "Failed to process document",
  "toast.uploadUrlError": "Could not determine upload URL",
  "toast.apiNotFound": "API endpoint not found. Please check if the server is running correctly.",
  "toast.serverError": "Server error ({{code}}). Please try again later.",

  "new.title": "Create New Project",
  "new.subtitle": "Set up a new localization project with languages and team members",
  "new.projectDetails": "Project Details",
  "new.projectDetailsDesc": "Basic information about your project",
  "new.placeholder.name": "My App",
  "new.placeholder.description": "Describe your project...",
  "new.descriptionOptional": "Description (Optional)",
  "new.languagesTitle": "Languages",
  "new.languagesDesc": "Add languages for your project",
  "new.selectLanguage": "Select language...",
  "new.searchLanguages": "Search languages...",
  "new.loadingLanguages": "Loading languages...",
  "new.errorLoadingLanguages": "Error loading languages. Please try again.",
  "new.noLanguageFound": "No language found.",
  "new.languageExists": "Language code already exists",
  "new.atLeastOneLanguage": "At least one language is required",

  "settings.title": "Project Settings",
  "settings.projectDetails": "Project Details",
  "settings.projectDetailsDesc": "Manage basic project information",
  "settings.descriptionPlaceholder": "Enter project description...",
  "settings.noDescription": "No description",
  "settings.addLanguage": "Add Language",
  "settings.selectLanguage": "Select Language",
  "settings.selectLanguagePlaceholder": "Select language...",
  "settings.searchLanguages": "Search languages...",
  "settings.noLanguageFound": "No language found.",
  "settings.languageCodePlaceholder": "en, fr, fr-CA",
  "settings.languageNamePlaceholder": "English, French, French Canadian",
  "settings.currentLanguages": "Current Languages",
  "settings.setDefault": "Set Default",
  "settings.noLanguages": "No languages configured. Add your first language above.",
  "settings.languagesTitle": "Languages",
  "settings.languagesDesc": "Manage the languages available for translation in this project",
  "settings.teamMembers": "Team Members",
  "settings.teamMembersDesc": "Manage who has access to this project and their roles",
  "settings.addTeamMember": "Add Team Member",
  "settings.emailPlaceholder": "colleague@example.com",
  "settings.currentMembers": "Current Members",
  "settings.noMembers": "No team members yet. Add your first team member above.",
  "settings.rolePermissions": "Role Permissions",
  "settings.developerDesc": "Full access to keys and translations",
  "settings.translatorDesc": "Can create and edit translations",
  "settings.reviewerDesc": "View-only access",

  "toast.memberAdded": "Member added successfully",
  "toast.memberRemoved": "Member removed successfully",
  "toast.languageAdded": "Language added successfully",
  "toast.languageUpdated": "Language updated successfully",
  "toast.defaultLanguageUpdated": "Default language updated",
  "toast.languageRemoved": "Language removed successfully",
  "toast.projectNameUpdated": "Project name updated successfully",
  "toast.projectDescUpdated": "Project description updated successfully",
  "toast.failedAddMember": "Failed to add member",
  "toast.failedRemoveMember": "Failed to remove member",
  "toast.failedAddLanguage": "Failed to add language",
  "toast.failedUpdateLanguage": "Failed to update language",
  "toast.failedSetDefault": "Failed to set default language",
  "toast.failedRemoveLanguage": "Failed to remove language",
  "toast.failedUpdateName": "Failed to update project name",
  "toast.failedUpdateDesc": "Failed to update project description",

  "import.title": "Import Translations",
  "import.subtitle": "Upload your translation files in JSON or CSV format",
  "import.selectFormat": "Select Format",
  "import.selectFormatDesc": "Choose the format of your import file",
  "import.json": "JSON",
  "import.csv": "CSV",
  "import.uploadFile": "Upload File",
  "import.uploadFileDesc": "Drag and drop or click to select a file",
  "import.dropHere": "Drop your {{format}} file here",
  "import.orBrowse": "or click to browse",
  "import.flatFormat": "Flat Format:",
  "import.flatFormatDesc": "Simple key-value pairs use the project's default language.",
  "import.namespaceFormat": "Namespace Format:",
  "import.namespaceFormatDesc": "Nested namespaces auto-flatten to dot-notation keys (common.settings).",
  "import.languageSingle": "Language Format (single):",
  "import.languageSingleDesc": "Wrap in language code. Auto-creates drafts for other languages.",
  "import.languageMulti": "Language Format (multi):",
  "import.languageMultiDesc": "Import multiple languages at once.",
  "import.csvFormat": "CSV Format:",
  "import.csvFormatDesc": "Use columns: key, language_code, value, status. Example header:",
  "import.importedCount_one": "Imported {{count}} translation",
  "import.importedCount_other": "Imported {{count}} translations",
  "import.importedWithDrafts": "Imported {{count}} translation(s) and auto-created {{drafts}} draft(s) for other languages",
  "import.selectFile": "Please select a file to import",
  "import.failedRead": "Failed to read file content",
  "import.failedImport": "Failed to import translations",

  "export.title": "Export Translations",
  "export.subtitle": "Download your translations in JSON or CSV format",
  "export.selectFormat": "Select Format",
  "export.selectFormatDesc": "Choose the export format",
  "export.jsonFormat": "JSON - Multi-language format",
  "export.csvFormat": "CSV - Spreadsheet format for easy editing",
  "export.nestedNamespaces": "Use nested namespaces",
  "export.nestedNamespacesDesc": "Convert dot-separated keys to nested objects (e.g., \"greeting.hello\" → { \"greeting\": { \"hello\": \"...\" } })",
  "export.selectLanguages": "Select Languages",
  "export.selectLanguagesDesc": "Choose which languages to include in the export",
  "export.selectAtLeastOne": "Please select at least one language",
  "export.exported": "Translations exported successfully",
  "export.failedExport": "Failed to export translations",

  "editKey.title": "Edit Translation Key",
  "editKey.loading": "Loading...",
  "editKey.notFound": "Translation key not found",
  "editKey.keyPlaceholder": "e.g., home.welcome.title",
  "editKey.keyDesc": "A unique identifier for this translation (use dot notation)",
  "editKey.descriptionOptional": "Description (Optional)",
  "editKey.descriptionPlaceholder": "Provide context for translators...",
  "editKey.descriptionHelp": "Help translators understand the context and usage. Click \"AI Suggest\" to generate a description automatically.",
  "editKey.aiSuggest": "AI Suggest",
  "editKey.tagsOptional": "Tags (Optional)",
  "editKey.tagPlaceholder": "Add a tag...",
  "editKey.tagsHelp": "Add tags to categorize and organize your translation keys",
  "editKey.imagesOptional": "Context Images (Optional)",
  "editKey.imagesDesc": "Upload images to provide visual context for translators",
  "editKey.imageAlt": "Context {{index}}",
  "editKey.clickFullSize": "Click to view full size",
  "editKey.hyperlinksOptional": "Hyperlinks (Optional)",
  "editKey.hyperlinksDesc": "Add external links related to this translation key",
  "editKey.addHyperlinkDesc": "Add an external link related to this translation key",
  "editKey.editHyperlink": "Edit Hyperlink",
  "editKey.addHyperlink": "Add Hyperlink",
  "editKey.noHyperlinks": "No hyperlinks added yet",
  "editKey.placeholderLabel": "e.g., Documentation, Reference",
  "editKey.placeholderUrl": "https://example.com",

  "toast.keyUpdated": "Translation key updated successfully",
  "toast.keyDeleted": "Translation key deleted successfully",
  "toast.imageAdded": "Image added successfully",
  "toast.imageRemoved": "Image removed successfully",
  "toast.descSuggestion": "Description suggestion generated",
  "toast.noSuggestion": "No suggestion received from server",
  "toast.failedUpdateKey": "Failed to update translation key",
  "toast.failedDeleteKey": "Failed to delete translation key",
  "toast.failedAddImage": "Failed to add image",
  "toast.failedRemoveImage": "Failed to remove image",
  "toast.failedSuggestion": "Failed to generate description suggestion",
  "toast.keyHyperlinkAdded": "Hyperlink added successfully",
  "toast.keyHyperlinkUpdated": "Hyperlink updated successfully",
  "toast.keyHyperlinkDeleted": "Hyperlink deleted",
  "toast.failedCreateKeyHyperlink": "Failed to create hyperlink",
  "toast.failedUpdateKeyHyperlink": "Failed to update hyperlink",
  "toast.failedDeleteKeyHyperlink": "Failed to delete hyperlink",

  "newKey.title": "Add Translation Key",
  "newKey.subtitle": "Create a new key that can be translated into all project languages",
  "newKey.keyDetails": "Key Details",
  "newKey.keyDetailsDesc": "Define the translation key and provide context",
  "newKey.keyPlaceholder": "home.welcome.title",
  "newKey.descriptionOptional": "Description (Optional)",
  "newKey.descriptionPlaceholder": "Provide context for translators...",
  "newKey.keyFormatHelp": "Use dot notation for namespacing (e.g., home.welcome.title)",
  "newKey.descriptionHelp": "Help translators understand the context and usage",
  "newKey.createKey": "Create Key",
  "toast.keyCreated": "Translation key created",
  "toast.failedCreateKey": "Failed to create key"
}
```

- [ ] **Step 5: Create en-CA editor.json**

Create `client/src/locales/en-CA/editor.json`:
```json
{
  "title": "Translation Editor",
  "subtitle": "{{totalKeys}} keys · {{translatedKeys}} fully translated",
  "searchPlaceholder": "Search keys...",
  "folderView": "Folder",
  "tableView": "Table",
  "allKeys": "All Keys",
  "addKeyTitle": "Add Translation Key",
  "addKeyDesc": "Create a new translation key for your project",
  "keyPlaceholder": "e.g., home.welcome.title",
  "keyHint": "Use dots to create folder structure (e.g., \"home.welcome.title\")",
  "currentFolder": "Current folder:",
  "descriptionOptional": "Description (optional)",
  "descriptionPlaceholder": "Context for translators...",
  "tagsOptional": "Tags (optional)",
  "tagPlaceholder": "Add a tag...",
  "tagsHelp": "Add tags to categorize and organize your translation keys",
  "translationPlaceholder": "Enter translation...",
  "translationMemory": "Translation Memory:",
  "noKeys": "No translation keys available",
  "noKeysDesc": "Get started by adding your first translation key",
  "clickFullSize": "Click to view full size",

  "toast.saved": "Saved",
  "toast.savedDesc": "Translation saved successfully",
  "toast.statusUpdated": "Status Updated",
  "toast.statusUpdatedDesc": "Translation status changed to {{status}}",
  "toast.invalidTransition": "Invalid Transition",
  "toast.invalidTransitionDesc": "This status change is not allowed",
  "toast.keyAdded": "Translation key added successfully",
  "toast.failedSave": "Failed to save translation",
  "toast.failedSuggestion": "Failed to get suggestion",
  "toast.failedCreateKey": "Failed to create translation key",
  "toast.noDefaultLanguage": "No default language set",
  "toast.sourceRequired": "Source text required",
  "toast.failedCreateRecord": "Unable to create translation record",
  "toast.aiApplied": "AI Suggestion Applied",
  "toast.aiAppliedDesc": "Translation saved with status 'In Review'",
  "toast.noTargetLanguages": "No target languages",
  "toast.noTargetLanguagesDesc": "Add non-default languages to translate to",
  "toast.noSourceText": "No source text",
  "toast.bulkComplete": "Bulk Translation Complete"
}
```

- [ ] **Step 6: Create en-CA landing.json**

Create `client/src/locales/en-CA/landing.json`:
```json
{
  "signIn": "Sign In",
  "hero.title1": "Localization Management",
  "hero.title2": "Made Simple",
  "hero.subtitle": "Manage translations across multiple projects and languages with collaborative workflows, version control, and seamless import/export capabilities.",
  "hero.cta": "Get Started Free",
  "features.multiProject": "Multi-Project Support",
  "features.multiProjectDesc": "Organize and manage translations for multiple projects from a single dashboard.",
  "features.collaborative": "Collaborative Workflow",
  "features.collaborativeDesc": "Work together with developers, translators, and reviewers with role-based permissions.",
  "features.importExport": "Import & Export",
  "features.importExportDesc": "Seamlessly import and export translations in JSON and CSV formats.",
  "features.aiTranslation": "AI Translation",
  "features.aiTranslationDesc": "Get instant translation suggestions powered by Google Translate API.",
  "features.versionControl": "Version Control",
  "features.versionControlDesc": "Track translation history and status with draft, review, and approved states.",
  "features.multiLanguage": "Multi-Language",
  "features.multiLanguageDesc": "Support for any language including regional variants like French Canadian."
}
```

- [ ] **Step 7: Create all fr-CA translation files**

Create `client/src/locales/fr-CA/common.json`:
```json
{
  "nav.dashboard": "Tableau de bord",
  "nav.projects": "Projets",
  "nav.signOut": "Se déconnecter",
  "brand": "LocaleFlow",
  "noProjectsYet": "Aucun projet pour le moment",

  "actions.save": "Enregistrer",
  "actions.cancel": "Annuler",
  "actions.delete": "Supprimer",
  "actions.edit": "Modifier",
  "actions.add": "Ajouter",
  "actions.back": "Retour",
  "actions.backToProject": "Retour au projet",
  "actions.import": "Importer",
  "actions.export": "Exporter",
  "actions.settings": "Paramètres",
  "actions.createProject": "Créer un projet",
  "actions.addLink": "Ajouter un lien",
  "actions.addFirstLink": "Ajouter un premier lien",
  "actions.addLanguage": "Ajouter une langue",
  "actions.addMember": "Ajouter un membre",
  "actions.addKey": "Ajouter une clé",
  "actions.addImage": "Ajouter une image",
  "actions.apply": "Appliquer",
  "actions.uploadDocument": "Téléverser un document",
  "actions.uploadFirstDocument": "Téléverser un premier document",
  "actions.creating": "Création...",
  "actions.adding": "Ajout...",
  "actions.deleting": "Suppression...",
  "actions.importing": "Importation...",
  "actions.exporting": "Exportation...",
  "actions.generating": "Génération...",

  "toast.success": "Succès",
  "toast.error": "Erreur",
  "toast.unauthorized": "Non autorisé",
  "toast.unauthorizedDesc": "Vous êtes déconnecté. Reconnexion en cours...",

  "status.draft": "Brouillon",
  "status.in_review": "En révision",
  "status.approved": "Approuvé",

  "transition.draft-in_review": "Soumettre pour révision",
  "transition.in_review-approved": "Approuver",
  "transition.in_review-draft": "À retravailler",
  "transition.approved-draft": "Rouvrir",

  "roles.developer": "Développeur",
  "roles.translator": "Traducteur",
  "roles.reviewer": "Réviseur",

  "validation.required": "Ce champ est requis",
  "validation.keyRequired": "La clé est requise",
  "validation.nameRequired": "Le nom du projet est requis",
  "validation.labelRequired": "Le libellé est requis",
  "validation.validUrl": "Doit être une URL valide",

  "labels.label": "Libellé",
  "labels.url": "URL",
  "labels.key": "Clé",
  "labels.description": "Description",
  "labels.email": "Adresse courriel",
  "labels.role": "Rôle",
  "labels.projectName": "Nom du projet",
  "labels.fileName": "Nom du fichier",
  "labels.type": "Type",
  "labels.size": "Taille",
  "labels.status": "Statut",
  "labels.uploaded": "Téléversé",
  "labels.actions": "Actions",
  "labels.default": "Par défaut",

  "language.en": "EN",
  "language.fr": "FR",
  "language.switchTo": "Changer de langue",

  "notFound.title": "404 Page non trouvée",
  "notFound.description": "Avez-vous oublié d'ajouter la page au routeur?"
}
```

Create `client/src/locales/fr-CA/dashboard.json`:
```json
{
  "welcome": "Bon retour",
  "subtitle": "Gérez vos projets de localisation et vos traductions",
  "stats.totalProjects": "Projets totaux",
  "stats.languages": "Langues",
  "stats.translationKeys": "Clés de traduction",
  "stats.recentActivity": "Activité récente",
  "projects": "Projets",
  "newProject": "Nouveau projet",
  "viewTranslations": "Voir les traductions",
  "empty.title": "Aucun projet pour le moment",
  "empty.description": "Créez votre premier projet de localisation pour commencer à gérer vos traductions"
}
```

Create `client/src/locales/fr-CA/project.json`:
```json
{
  "dashboard.translationEditor": "Éditeur de traductions",
  "dashboard.deleteProject": "Supprimer le projet",
  "dashboard.confirmDelete": "Êtes-vous sûr?",
  "dashboard.confirmDeleteDesc": "Cette action est irréversible. Cela supprimera définitivement le projet « {{name}} » ainsi que toutes ses clés de traduction, traductions et documents.",
  "dashboard.projectNotFound": "Projet introuvable",
  "dashboard.stats.progress": "Progression",
  "dashboard.stats.translations": "{{completed}} sur {{total}} traductions",
  "dashboard.stats.approved": "Approuvées",
  "dashboard.stats.inReview": "En révision",
  "dashboard.stats.missing": "Manquantes",
  "dashboard.languages": "Langues",
  "dashboard.languagesConfigured": "{{count}} langues configurées",
  "dashboard.hyperlinks": "Hyperliens",
  "dashboard.hyperlinksDesc": "Liens externes liés à ce projet",
  "dashboard.editHyperlink": "Modifier l'hyperlien",
  "dashboard.addHyperlink": "Ajouter un hyperlien",
  "dashboard.addHyperlinkDesc": "Ajouter un lien externe lié à ce projet",
  "dashboard.noHyperlinks": "Aucun hyperlien ajouté",
  "dashboard.documents": "Documents",
  "dashboard.documentsDesc": "Téléversez des documents Word ou PDF pour extraire automatiquement les clés de traduction",
  "dashboard.noDocuments": "Aucun document téléversé",
  "dashboard.fileTypePdf": "PDF",
  "dashboard.fileTypeWord": "Word",

  "toast.hyperlinkAdded": "Hyperlien ajouté avec succès",
  "toast.hyperlinkUpdated": "Hyperlien mis à jour avec succès",
  "toast.hyperlinkDeleted": "Hyperlien supprimé",
  "toast.documentDeleted": "Document supprimé",
  "toast.projectDeleted": "Projet supprimé avec succès",
  "toast.documentUploaded": "Document téléversé et traitement démarré",
  "toast.failedCreateHyperlink": "Échec de la création de l'hyperlien",
  "toast.failedUpdateHyperlink": "Échec de la mise à jour de l'hyperlien",
  "toast.failedDeleteHyperlink": "Échec de la suppression de l'hyperlien",
  "toast.failedDeleteDocument": "Échec de la suppression du document",
  "toast.failedDeleteProject": "Échec de la suppression du projet",
  "toast.failedProcessDocument": "Échec du traitement du document",
  "toast.uploadUrlError": "Impossible de déterminer l'URL de téléversement",
  "toast.apiNotFound": "Point de terminaison API introuvable. Veuillez vérifier que le serveur fonctionne correctement.",
  "toast.serverError": "Erreur du serveur ({{code}}). Veuillez réessayer plus tard.",

  "new.title": "Créer un nouveau projet",
  "new.subtitle": "Configurez un nouveau projet de localisation avec des langues et des membres d'équipe",
  "new.projectDetails": "Détails du projet",
  "new.projectDetailsDesc": "Informations de base sur votre projet",
  "new.placeholder.name": "Mon application",
  "new.placeholder.description": "Décrivez votre projet...",
  "new.descriptionOptional": "Description (facultatif)",
  "new.languagesTitle": "Langues",
  "new.languagesDesc": "Ajoutez des langues à votre projet",
  "new.selectLanguage": "Sélectionner une langue...",
  "new.searchLanguages": "Rechercher des langues...",
  "new.loadingLanguages": "Chargement des langues...",
  "new.errorLoadingLanguages": "Erreur de chargement des langues. Veuillez réessayer.",
  "new.noLanguageFound": "Aucune langue trouvée.",
  "new.languageExists": "Ce code de langue existe déjà",
  "new.atLeastOneLanguage": "Au moins une langue est requise",

  "settings.title": "Paramètres du projet",
  "settings.projectDetails": "Détails du projet",
  "settings.projectDetailsDesc": "Gérer les informations de base du projet",
  "settings.descriptionPlaceholder": "Entrer une description du projet...",
  "settings.noDescription": "Aucune description",
  "settings.addLanguage": "Ajouter une langue",
  "settings.selectLanguage": "Sélectionner une langue",
  "settings.selectLanguagePlaceholder": "Sélectionner une langue...",
  "settings.searchLanguages": "Rechercher des langues...",
  "settings.noLanguageFound": "Aucune langue trouvée.",
  "settings.languageCodePlaceholder": "en, fr, fr-CA",
  "settings.languageNamePlaceholder": "Anglais, Français, Français canadien",
  "settings.currentLanguages": "Langues actuelles",
  "settings.setDefault": "Définir par défaut",
  "settings.noLanguages": "Aucune langue configurée. Ajoutez votre première langue ci-dessus.",
  "settings.languagesTitle": "Langues",
  "settings.languagesDesc": "Gérer les langues disponibles pour la traduction dans ce projet",
  "settings.teamMembers": "Membres de l'équipe",
  "settings.teamMembersDesc": "Gérer les accès au projet et les rôles des membres",
  "settings.addTeamMember": "Ajouter un membre",
  "settings.emailPlaceholder": "collegue@exemple.com",
  "settings.currentMembers": "Membres actuels",
  "settings.noMembers": "Aucun membre d'équipe. Ajoutez votre premier membre ci-dessus.",
  "settings.rolePermissions": "Permissions des rôles",
  "settings.developerDesc": "Accès complet aux clés et traductions",
  "settings.translatorDesc": "Peut créer et modifier les traductions",
  "settings.reviewerDesc": "Accès en lecture seule",

  "toast.memberAdded": "Membre ajouté avec succès",
  "toast.memberRemoved": "Membre retiré avec succès",
  "toast.languageAdded": "Langue ajoutée avec succès",
  "toast.languageUpdated": "Langue mise à jour avec succès",
  "toast.defaultLanguageUpdated": "Langue par défaut mise à jour",
  "toast.languageRemoved": "Langue retirée avec succès",
  "toast.projectNameUpdated": "Nom du projet mis à jour avec succès",
  "toast.projectDescUpdated": "Description du projet mise à jour avec succès",
  "toast.failedAddMember": "Échec de l'ajout du membre",
  "toast.failedRemoveMember": "Échec du retrait du membre",
  "toast.failedAddLanguage": "Échec de l'ajout de la langue",
  "toast.failedUpdateLanguage": "Échec de la mise à jour de la langue",
  "toast.failedSetDefault": "Échec de la définition de la langue par défaut",
  "toast.failedRemoveLanguage": "Échec du retrait de la langue",
  "toast.failedUpdateName": "Échec de la mise à jour du nom du projet",
  "toast.failedUpdateDesc": "Échec de la mise à jour de la description du projet",

  "import.title": "Importer des traductions",
  "import.subtitle": "Téléversez vos fichiers de traduction au format JSON ou CSV",
  "import.selectFormat": "Sélectionner le format",
  "import.selectFormatDesc": "Choisissez le format de votre fichier d'importation",
  "import.json": "JSON",
  "import.csv": "CSV",
  "import.uploadFile": "Téléverser un fichier",
  "import.uploadFileDesc": "Glissez-déposez ou cliquez pour sélectionner un fichier",
  "import.dropHere": "Déposez votre fichier {{format}} ici",
  "import.orBrowse": "ou cliquez pour parcourir",
  "import.flatFormat": "Format simple :",
  "import.flatFormatDesc": "Les paires clé-valeur simples utilisent la langue par défaut du projet.",
  "import.namespaceFormat": "Format espace de noms :",
  "import.namespaceFormatDesc": "Les espaces de noms imbriqués s'aplatissent automatiquement en notation pointée (common.settings).",
  "import.languageSingle": "Format langue (simple) :",
  "import.languageSingleDesc": "Enveloppez dans un code de langue. Crée automatiquement des brouillons pour les autres langues.",
  "import.languageMulti": "Format langue (multiple) :",
  "import.languageMultiDesc": "Importez plusieurs langues à la fois.",
  "import.csvFormat": "Format CSV :",
  "import.csvFormatDesc": "Utilisez les colonnes : key, language_code, value, status. En-tête exemple :",
  "import.importedCount_one": "{{count}} traduction importée",
  "import.importedCount_other": "{{count}} traductions importées",
  "import.importedWithDrafts": "{{count}} traduction(s) importée(s) et {{drafts}} brouillon(s) créé(s) automatiquement pour les autres langues",
  "import.selectFile": "Veuillez sélectionner un fichier à importer",
  "import.failedRead": "Échec de la lecture du fichier",
  "import.failedImport": "Échec de l'importation des traductions",

  "export.title": "Exporter les traductions",
  "export.subtitle": "Téléchargez vos traductions au format JSON ou CSV",
  "export.selectFormat": "Sélectionner le format",
  "export.selectFormatDesc": "Choisissez le format d'exportation",
  "export.jsonFormat": "JSON - Format multilingue",
  "export.csvFormat": "CSV - Format tableur pour modification facile",
  "export.nestedNamespaces": "Utiliser les espaces de noms imbriqués",
  "export.nestedNamespacesDesc": "Convertir les clés séparées par des points en objets imbriqués (ex. : « greeting.hello » → { \"greeting\": { \"hello\": \"...\" } })",
  "export.selectLanguages": "Sélectionner les langues",
  "export.selectLanguagesDesc": "Choisissez les langues à inclure dans l'exportation",
  "export.selectAtLeastOne": "Veuillez sélectionner au moins une langue",
  "export.exported": "Traductions exportées avec succès",
  "export.failedExport": "Échec de l'exportation des traductions",

  "editKey.title": "Modifier la clé de traduction",
  "editKey.loading": "Chargement...",
  "editKey.notFound": "Clé de traduction introuvable",
  "editKey.keyPlaceholder": "ex. : home.welcome.title",
  "editKey.keyDesc": "Un identifiant unique pour cette traduction (utilisez la notation pointée)",
  "editKey.descriptionOptional": "Description (facultatif)",
  "editKey.descriptionPlaceholder": "Fournir du contexte pour les traducteurs...",
  "editKey.descriptionHelp": "Aidez les traducteurs à comprendre le contexte et l'utilisation. Cliquez sur « Suggestion IA » pour générer une description automatiquement.",
  "editKey.aiSuggest": "Suggestion IA",
  "editKey.tagsOptional": "Étiquettes (facultatif)",
  "editKey.tagPlaceholder": "Ajouter une étiquette...",
  "editKey.tagsHelp": "Ajoutez des étiquettes pour catégoriser et organiser vos clés de traduction",
  "editKey.imagesOptional": "Images de contexte (facultatif)",
  "editKey.imagesDesc": "Téléversez des images pour fournir un contexte visuel aux traducteurs",
  "editKey.imageAlt": "Contexte {{index}}",
  "editKey.clickFullSize": "Cliquez pour voir en taille réelle",
  "editKey.hyperlinksOptional": "Hyperliens (facultatif)",
  "editKey.hyperlinksDesc": "Ajoutez des liens externes liés à cette clé de traduction",
  "editKey.addHyperlinkDesc": "Ajouter un lien externe lié à cette clé de traduction",
  "editKey.editHyperlink": "Modifier l'hyperlien",
  "editKey.addHyperlink": "Ajouter un hyperlien",
  "editKey.noHyperlinks": "Aucun hyperlien ajouté",
  "editKey.placeholderLabel": "ex. : Documentation, Référence",
  "editKey.placeholderUrl": "https://exemple.com",

  "toast.keyUpdated": "Clé de traduction mise à jour avec succès",
  "toast.keyDeleted": "Clé de traduction supprimée avec succès",
  "toast.imageAdded": "Image ajoutée avec succès",
  "toast.imageRemoved": "Image retirée avec succès",
  "toast.descSuggestion": "Suggestion de description générée",
  "toast.noSuggestion": "Aucune suggestion reçue du serveur",
  "toast.failedUpdateKey": "Échec de la mise à jour de la clé de traduction",
  "toast.failedDeleteKey": "Échec de la suppression de la clé de traduction",
  "toast.failedAddImage": "Échec de l'ajout de l'image",
  "toast.failedRemoveImage": "Échec du retrait de l'image",
  "toast.failedSuggestion": "Échec de la génération de la suggestion de description",
  "toast.keyHyperlinkAdded": "Hyperlien ajouté avec succès",
  "toast.keyHyperlinkUpdated": "Hyperlien mis à jour avec succès",
  "toast.keyHyperlinkDeleted": "Hyperlien supprimé",
  "toast.failedCreateKeyHyperlink": "Échec de la création de l'hyperlien",
  "toast.failedUpdateKeyHyperlink": "Échec de la mise à jour de l'hyperlien",
  "toast.failedDeleteKeyHyperlink": "Échec de la suppression de l'hyperlien",

  "newKey.title": "Ajouter une clé de traduction",
  "newKey.subtitle": "Créer une nouvelle clé pouvant être traduite dans toutes les langues du projet",
  "newKey.keyDetails": "Détails de la clé",
  "newKey.keyDetailsDesc": "Définir la clé de traduction et fournir du contexte",
  "newKey.keyPlaceholder": "home.welcome.title",
  "newKey.descriptionOptional": "Description (facultatif)",
  "newKey.descriptionPlaceholder": "Fournir du contexte pour les traducteurs...",
  "newKey.keyFormatHelp": "Utilisez la notation pointée pour les espaces de noms (ex. : home.welcome.title)",
  "newKey.descriptionHelp": "Aidez les traducteurs à comprendre le contexte et l'utilisation",
  "newKey.createKey": "Créer la clé",
  "toast.keyCreated": "Clé de traduction créée",
  "toast.failedCreateKey": "Échec de la création de la clé"
}
```

Create `client/src/locales/fr-CA/editor.json`:
```json
{
  "title": "Éditeur de traductions",
  "subtitle": "{{totalKeys}} clés · {{translatedKeys}} entièrement traduites",
  "searchPlaceholder": "Rechercher des clés...",
  "folderView": "Dossier",
  "tableView": "Tableau",
  "allKeys": "Toutes les clés",
  "addKeyTitle": "Ajouter une clé de traduction",
  "addKeyDesc": "Créer une nouvelle clé de traduction pour votre projet",
  "keyPlaceholder": "ex. : home.welcome.title",
  "keyHint": "Utilisez des points pour créer une arborescence (ex. : « home.welcome.title »)",
  "currentFolder": "Dossier actuel :",
  "descriptionOptional": "Description (facultatif)",
  "descriptionPlaceholder": "Contexte pour les traducteurs...",
  "tagsOptional": "Étiquettes (facultatif)",
  "tagPlaceholder": "Ajouter une étiquette...",
  "tagsHelp": "Ajoutez des étiquettes pour catégoriser et organiser vos clés de traduction",
  "translationPlaceholder": "Entrer la traduction...",
  "translationMemory": "Mémoire de traduction :",
  "noKeys": "Aucune clé de traduction disponible",
  "noKeysDesc": "Commencez par ajouter votre première clé de traduction",
  "clickFullSize": "Cliquez pour voir en taille réelle",

  "toast.saved": "Enregistré",
  "toast.savedDesc": "Traduction enregistrée avec succès",
  "toast.statusUpdated": "Statut mis à jour",
  "toast.statusUpdatedDesc": "Le statut de la traduction a été changé pour {{status}}",
  "toast.invalidTransition": "Transition invalide",
  "toast.invalidTransitionDesc": "Ce changement de statut n'est pas autorisé",
  "toast.keyAdded": "Clé de traduction ajoutée avec succès",
  "toast.failedSave": "Échec de l'enregistrement de la traduction",
  "toast.failedSuggestion": "Échec de l'obtention de la suggestion",
  "toast.failedCreateKey": "Échec de la création de la clé de traduction",
  "toast.noDefaultLanguage": "Aucune langue par défaut définie",
  "toast.sourceRequired": "Texte source requis",
  "toast.failedCreateRecord": "Impossible de créer l'enregistrement de traduction",
  "toast.aiApplied": "Suggestion IA appliquée",
  "toast.aiAppliedDesc": "Traduction enregistrée avec le statut « En révision »",
  "toast.noTargetLanguages": "Aucune langue cible",
  "toast.noTargetLanguagesDesc": "Ajoutez des langues non par défaut pour traduire vers",
  "toast.noSourceText": "Aucun texte source",
  "toast.bulkComplete": "Traduction en lot terminée"
}
```

Create `client/src/locales/fr-CA/landing.json`:
```json
{
  "signIn": "Se connecter",
  "hero.title1": "Gestion de la localisation",
  "hero.title2": "simplifiée",
  "hero.subtitle": "Gérez les traductions de plusieurs projets et langues avec des flux de travail collaboratifs, le contrôle de version et des capacités d'importation/exportation transparentes.",
  "hero.cta": "Commencer gratuitement",
  "features.multiProject": "Support multi-projets",
  "features.multiProjectDesc": "Organisez et gérez les traductions de plusieurs projets depuis un seul tableau de bord.",
  "features.collaborative": "Flux de travail collaboratif",
  "features.collaborativeDesc": "Travaillez en équipe avec les développeurs, traducteurs et réviseurs grâce aux permissions basées sur les rôles.",
  "features.importExport": "Importation et exportation",
  "features.importExportDesc": "Importez et exportez vos traductions facilement aux formats JSON et CSV.",
  "features.aiTranslation": "Traduction IA",
  "features.aiTranslationDesc": "Obtenez des suggestions de traduction instantanées propulsées par l'API Google Translate.",
  "features.versionControl": "Contrôle de version",
  "features.versionControlDesc": "Suivez l'historique et le statut des traductions avec les états brouillon, révision et approuvé.",
  "features.multiLanguage": "Multilingue",
  "features.multiLanguageDesc": "Prise en charge de toutes les langues, y compris les variantes régionales comme le français canadien."
}
```

- [ ] **Step 8: Create i18n configuration**

Create `client/src/i18n.ts`:
```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCACommon from "./locales/en-CA/common.json";
import enCADashboard from "./locales/en-CA/dashboard.json";
import enCAProject from "./locales/en-CA/project.json";
import enCAEditor from "./locales/en-CA/editor.json";
import enCALanding from "./locales/en-CA/landing.json";
import frCACommon from "./locales/fr-CA/common.json";
import frCADashboard from "./locales/fr-CA/dashboard.json";
import frCAProject from "./locales/fr-CA/project.json";
import frCAEditor from "./locales/fr-CA/editor.json";
import frCALanding from "./locales/fr-CA/landing.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-CA": {
        common: enCACommon,
        dashboard: enCADashboard,
        project: enCAProject,
        editor: enCAEditor,
        landing: enCALanding,
      },
      "fr-CA": {
        common: frCACommon,
        dashboard: frCADashboard,
        project: frCAProject,
        editor: frCAEditor,
        landing: frCALanding,
      },
    },
    fallbackLng: "en-CA",
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Update html lang attribute on language change
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});
// Set initial lang
document.documentElement.lang = i18n.language;

export default i18n;
```

- [ ] **Step 9: Create useLocaleFormat hook**

Create `client/src/hooks/useLocaleFormat.ts`:
```typescript
import { useTranslation } from "react-i18next";

export function useLocaleFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return {
    formatDate: (date: Date | string) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        new Date(date)
      ),
    formatNumber: (n: number) => new Intl.NumberFormat(locale).format(n),
    formatFileSize: (bytes: number) => {
      if (bytes < 1024 * 1024) {
        const kb = bytes / 1024;
        return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(kb)} KB`;
      }
      const mb = bytes / 1024 / 1024;
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(mb)} MB`;
    },
  };
}
```

- [ ] **Step 10: Import i18n in main.tsx**

Modify `client/src/main.tsx`:
```typescript
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 11: Commit infrastructure**

```bash
git add client/src/i18n.ts client/src/hooks/useLocaleFormat.ts client/src/locales/ client/src/main.tsx package.json pnpm-lock.yaml
git commit -m "feat: add i18n infrastructure with en-CA and fr-CA translations"
```

---

### Task 2: Add language switcher to sidebar

**Files:**
- Modify: `client/src/components/app-sidebar.tsx`

- [ ] **Step 1: Add language toggle and localize sidebar strings**

In `app-sidebar.tsx`, add `useTranslation` hook, replace all hardcoded strings with `t()` calls, and add an EN/FR toggle button in the sidebar footer above Sign Out.

The toggle is a simple segmented control:
```tsx
import { useTranslation } from "react-i18next";

// Inside the component:
const { t, i18n } = useTranslation();

// Language toggle (place in sidebar footer, above sign out):
<div className="flex items-center gap-1 rounded-md border p-1">
  <Button
    variant={i18n.language.startsWith("en") ? "default" : "ghost"}
    size="sm"
    className="h-7 px-2 text-xs"
    onClick={() => i18n.changeLanguage("en-CA")}
  >
    {t("language.en")}
  </Button>
  <Button
    variant={i18n.language.startsWith("fr") ? "default" : "ghost"}
    size="sm"
    className="h-7 px-2 text-xs"
    onClick={() => i18n.changeLanguage("fr-CA")}
  >
    {t("language.fr")}
  </Button>
</div>
```

Replace strings:
- "Dashboard" → `t("nav.dashboard")`
- "LocaleFlow" → `t("brand")`
- "Projects" → `t("nav.projects")`
- "No projects yet" → `t("noProjectsYet")`
- "Sign Out" → `t("nav.signOut")`

- [ ] **Step 2: Verify sidebar renders correctly**

Run dev server, check sidebar shows English strings, toggle to FR, confirm French strings appear.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/app-sidebar.tsx
git commit -m "feat: add language switcher to sidebar and localize nav strings"
```

---

### Task 3: Localize dashboard page

**Files:**
- Modify: `client/src/pages/dashboard.tsx`

- [ ] **Step 1: Replace all hardcoded strings with t() calls**

Add `useTranslation` with the `dashboard` namespace:
```tsx
const { t } = useTranslation("dashboard");
const { t: tc } = useTranslation("common");
```

Replace strings:
- "Welcome Back" → `t("welcome")`
- "Manage your localization projects and translations" → `t("subtitle")`
- "Total Projects" → `t("stats.totalProjects")`
- "Languages" → `t("stats.languages")`
- "Translation Keys" → `t("stats.translationKeys")`
- "Recent Activity" → `t("stats.recentActivity")`
- "Projects" → `t("projects")`
- "New Project" → `t("newProject")`
- "View translations" → `t("viewTranslations")`
- "No projects yet" → `t("empty.title")`
- "Create your first localization project..." → `t("empty.description")`
- "Create Project" → `tc("actions.createProject")`

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/dashboard.tsx
git commit -m "feat: localize dashboard page"
```

---

### Task 4: Localize landing page

**Files:**
- Modify: `client/src/pages/landing.tsx`

- [ ] **Step 1: Replace all hardcoded strings with t() calls**

Add `useTranslation` with the `landing` namespace:
```tsx
const { t } = useTranslation("landing");
const { t: tc } = useTranslation("common");
```

Replace all strings using the landing.json keys. "LocaleFlow" → `tc("brand")`, "Sign In" → `t("signIn")`, hero text, and all 6 feature cards.

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/landing.tsx
git commit -m "feat: localize landing page"
```

---

### Task 5: Localize project dashboard page

**Files:**
- Modify: `client/src/pages/project-dashboard.tsx`

- [ ] **Step 1: Replace all hardcoded strings with t() calls and add locale formatting**

Add `useTranslation` with the `project` namespace and `useLocaleFormat`:
```tsx
const { t } = useTranslation("project");
const { t: tc } = useTranslation("common");
const { formatDate, formatFileSize } = useLocaleFormat();
```

Replace all strings: headings, button labels, dialog content, toast messages, table headers, empty states. Use `formatDate()` for document dates and `formatFileSize()` for file sizes. Use interpolation for dynamic values: `t("dashboard.confirmDeleteDesc", { name: project.name })`, `t("dashboard.stats.translations", { completed: stats.completed, total: stats.total })`.

For status labels use `tc("status." + translation.status)`.
For transition labels use `tc("transition." + from + "-" + to)`.

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/project-dashboard.tsx
git commit -m "feat: localize project dashboard page"
```

---

### Task 6: Localize project settings page

**Files:**
- Modify: `client/src/pages/project-settings.tsx`

- [ ] **Step 1: Replace all hardcoded strings with t() calls**

Add `useTranslation` with the `project` namespace:
```tsx
const { t } = useTranslation("project");
const { t: tc } = useTranslation("common");
```

Replace all strings: headings, form labels, button labels, placeholders, toast messages, role labels, empty states.

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/project-settings.tsx
git commit -m "feat: localize project settings page"
```

---

### Task 7: Localize new project page

**Files:**
- Modify: `client/src/pages/new-project.tsx`

- [ ] **Step 1: Replace all hardcoded strings with t() calls**

Add `useTranslation` with the `project` namespace. Replace headings, form labels, placeholders, validation messages, combobox strings, toast messages.

For the Zod validation, move the schema inside the component so it can access `t()`:
```tsx
const projectSchema = z.object({
  name: z.string().min(1, tc("validation.nameRequired")),
});
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/new-project.tsx
git commit -m "feat: localize new project page"
```

---

### Task 8: Localize translation editor page

**Files:**
- Modify: `client/src/pages/translation-editor.tsx`

- [ ] **Step 1: Replace all hardcoded strings with t() calls**

Add `useTranslation` with the `editor` namespace:
```tsx
const { t } = useTranslation("editor");
const { t: tc } = useTranslation("common");
```

Replace all strings: page title, search placeholder, view tab labels, add key dialog, translation cell placeholders, toast messages. Use `tc("status." + status)` for status labels and `tc("transition." + from + "-" + to)` for transition button labels.

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/translation-editor.tsx
git commit -m "feat: localize translation editor page"
```

---

### Task 9: Localize import and export pages

**Files:**
- Modify: `client/src/pages/import-translations.tsx`
- Modify: `client/src/pages/export-translations.tsx`

- [ ] **Step 1: Localize import page**

Add `useTranslation("project")` and replace all strings: headings, format labels, file upload text, format help text, toast messages.

- [ ] **Step 2: Localize export page**

Add `useTranslation("project")` and replace all strings: headings, format labels, checkbox labels, language selection text, toast messages.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/import-translations.tsx client/src/pages/export-translations.tsx
git commit -m "feat: localize import and export pages"
```

---

### Task 10: Localize edit key and new key pages

**Files:**
- Modify: `client/src/pages/edit-key.tsx`
- Modify: `client/src/pages/new-key.tsx`

- [ ] **Step 1: Localize edit key page**

Add `useTranslation("project")` and replace all strings: headings, form labels, placeholders, validation messages, toast messages, hyperlink dialog, image section.

**Important:** The Zod schema (`keySchema`) is defined at module scope. Move it inside the component so it can access `t()` for validation messages (e.g., `z.string().min(1, tc("validation.keyRequired"))`). Same for the hyperlink schema.

Map `"Creating..."` → `tc("actions.creating")`, `"Generating..."` → `tc("actions.generating")`.

- [ ] **Step 2: Localize new key page**

Add `useTranslation("project")` and replace all strings. Move the Zod `keySchema` inside the component to access `t()`. Map `"Creating..."` → `tc("actions.creating")`. Map the FormDescription "Use dot notation..." → `t("newKey.keyFormatHelp")`.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/edit-key.tsx client/src/pages/new-key.tsx
git commit -m "feat: localize edit key and new key pages"
```

---

### Task 11: Localize not-found page

**Files:**
- Modify: `client/src/pages/not-found.tsx`

- [ ] **Step 1: Replace strings**

This is a tiny page. Add `useTranslation("common")`. The 404 text can go in common namespace or just stay hardcoded since it's developer-facing. If localizing, add keys to common.json for both locales.

Add to en-CA/common.json: `"notFound.title": "404 Page Not Found"`, `"notFound.description": "Did you forget to add the page to the router?"`
Add to fr-CA/common.json: `"notFound.title": "404 Page non trouvée"`, `"notFound.description": "Avez-vous oublié d'ajouter la page au routeur?"`

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/not-found.tsx client/src/locales/
git commit -m "feat: localize not-found page"
```

---

### Task 12: Update Playwright tests

**Files:**
- Modify: `tests/app.spec.ts`

- [ ] **Step 1: Verify existing tests still pass**

Since en-CA is the fallback and all English strings are preserved in the translation files, existing tests should pass without changes. Run the full suite:

```bash
npx playwright test
```

Expected: All 85 tests pass.

- [ ] **Step 2: Add language toggle test**

Add a new test section for i18n:

```typescript
test.describe("i18n Language Toggle", () => {
  test("should switch UI to French when FR is clicked", async ({ request, page }) => {
    await createProjectViaAPI(request, "i18n Test " + Date.now());
    await page.goto("/");
    await expect(page.getByText("Welcome Back")).toBeVisible();

    // Click FR toggle
    await page.getByRole("button", { name: "FR" }).click();
    await expect(page.getByText("Bon retour")).toBeVisible();
  });

  test("should persist language preference across page loads", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "FR" }).click();
    await expect(page.getByText("Bon retour")).toBeVisible();

    // Reload page
    await page.reload();
    await expect(page.getByText("Bon retour")).toBeVisible();
  });

  test("should switch back to English when EN is clicked", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "FR" }).click();
    await expect(page.getByText("Bon retour")).toBeVisible();

    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.getByText("Welcome Back")).toBeVisible();
  });
});
```

- [ ] **Step 3: Run full test suite**

```bash
npx playwright test
```

Expected: All tests pass (85 existing + 3 new = 88).

- [ ] **Step 4: Commit**

```bash
git add tests/app.spec.ts
git commit -m "test: add i18n language toggle tests"
```
