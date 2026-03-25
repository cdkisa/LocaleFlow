import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Sessions table
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess", { mode: "json" }).notNull(),
    expire: text("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

// Projects table
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  languages: many(projectLanguages),
  keys: many(translationKeys),
  members: many(projectMembers),
  documents: many(documents),
}));

// Project languages
export const projectLanguages = sqliteTable("project_languages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  languageCode: text("language_code").notNull(),
  languageName: text("language_name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const projectLanguagesRelations = relations(projectLanguages, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectLanguages.projectId],
    references: [projects.id],
  }),
  translations: many(translations),
}));

// Translation keys
export const translationKeys = sqliteTable("translation_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  description: text("description"),
  maxLength: integer("max_length"),
  priority: text("priority").notNull().default("normal"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const translationKeysRelations = relations(translationKeys, ({ one, many }) => ({
  project: one(projects, {
    fields: [translationKeys.projectId],
    references: [projects.id],
  }),
  translations: many(translations),
}));

// Translations
export const translations = sqliteTable("translations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  keyId: text("key_id").notNull().references(() => translationKeys.id, { onDelete: "cascade" }),
  languageId: text("language_id").notNull().references(() => projectLanguages.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  status: text("status").notNull().default("draft"),
  translatedBy: text("translated_by").references(() => users.id),
  reviewedBy: text("reviewed_by").references(() => users.id),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const translationsRelations = relations(translations, ({ one }) => ({
  key: one(translationKeys, {
    fields: [translations.keyId],
    references: [translationKeys.id],
  }),
  language: one(projectLanguages, {
    fields: [translations.languageId],
    references: [projectLanguages.id],
  }),
  translator: one(users, {
    fields: [translations.translatedBy],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [translations.reviewedBy],
    references: [users.id],
  }),
}));

// Project members
export const projectMembers = sqliteTable("project_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

// Documents
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  status: text("status").notNull().default("pending"),
  extractedText: text("extracted_text"),
  errorMessage: text("error_message"),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

// Translation Memory
export const translationMemory = sqliteTable("translation_memory", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceText: text("source_text").notNull(),
  targetLanguageCode: text("target_language_code").notNull(),
  translatedText: text("translated_text").notNull(),
  usageCount: integer("usage_count").notNull().default(1),
  lastUsedAt: text("last_used_at").$defaultFn(() => new Date().toISOString()),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex("tm_source_target_unique").on(table.sourceText, table.targetLanguageCode),
]);

// Project Hyperlinks
export const projectHyperlinks = sqliteTable("project_hyperlinks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  url: text("url").notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const projectHyperlinksRelations = relations(projectHyperlinks, ({ one }) => ({
  project: one(projects, {
    fields: [projectHyperlinks.projectId],
    references: [projects.id],
  }),
}));

// Translation Key Hyperlinks
export const translationKeyHyperlinks = sqliteTable("translation_key_hyperlinks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  translationKeyId: text("translation_key_id").notNull().references(() => translationKeys.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  url: text("url").notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export const translationKeyHyperlinksRelations = relations(translationKeyHyperlinks, ({ one }) => ({
  translationKey: one(translationKeys, {
    fields: [translationKeyHyperlinks.translationKeyId],
    references: [translationKeys.id],
  }),
}));

// Translation Key Change History
export const translationKeyChangeHistory = sqliteTable("translation_key_change_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  translationKeyId: text("translation_key_id").notNull().references(() => translationKeys.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  field: text("field"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const translationKeyChangeHistoryRelations = relations(translationKeyChangeHistory, ({ one }) => ({
  translationKey: one(translationKeys, {
    fields: [translationKeyChangeHistory.translationKeyId],
    references: [translationKeys.id],
  }),
  user: one(users, {
    fields: [translationKeyChangeHistory.userId],
    references: [users.id],
  }),
}));

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  projectMemberships: many(projectMembers),
  translations: many(translations),
  uploadedDocuments: many(documents),
}));
