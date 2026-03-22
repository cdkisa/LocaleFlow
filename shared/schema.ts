import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (Replit Auth blueprint - mandatory)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (Replit Auth blueprint - mandatory)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Projects table - represents translation projects
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project languages - which languages are enabled for a project
export const projectLanguages = pgTable("project_languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  languageCode: varchar("language_code", { length: 10 }).notNull(), // e.g., "en", "fr-CA"
  languageName: varchar("language_name", { length: 100 }).notNull(), // e.g., "English", "French Canadian"
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectLanguagesRelations = relations(projectLanguages, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectLanguages.projectId],
    references: [projects.id],
  }),
  translations: many(translations),
}));

export const insertProjectLanguageSchema = createInsertSchema(projectLanguages).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectLanguage = z.infer<typeof insertProjectLanguageSchema>;
export type ProjectLanguage = typeof projectLanguages.$inferSelect;

// Translation keys - the keys that need to be translated
export const translationKeys = pgTable("translation_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 500 }).notNull(), // e.g., "home.welcome.title"
  description: text("description"), // optional context for translators
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // critical, high, normal, low
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const translationKeysRelations = relations(translationKeys, ({ one, many }) => ({
  project: one(projects, {
    fields: [translationKeys.projectId],
    references: [projects.id],
  }),
  translations: many(translations),
}));

export const insertTranslationKeySchema = createInsertSchema(translationKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTranslationKey = z.infer<typeof insertTranslationKeySchema>;
export type TranslationKey = typeof translationKeys.$inferSelect;

// Translations - the actual translation values
export const translations = pgTable("translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyId: varchar("key_id").notNull().references(() => translationKeys.id, { onDelete: "cascade" }),
  languageId: varchar("language_id").notNull().references(() => projectLanguages.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, in_review, approved
  translatedBy: varchar("translated_by").references(() => users.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;

// Project members - who has access to a project and their role
export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // developer, translator, reviewer
  createdAt: timestamp("created_at").defaultNow(),
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

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

// Documents - uploaded Word and PDF files for translation
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(), // "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  fileSize: integer("file_size").notNull(), // in bytes
  storagePath: text("storage_path").notNull(), // object storage path
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  extractedText: text("extracted_text"), // extracted content from the document
  errorMessage: text("error_message"), // if extraction failed
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Translation Memory - stores approved translations for reuse across projects
export const translationMemory = pgTable("translation_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceText: text("source_text").notNull(), // original text from default language
  targetLanguageCode: varchar("target_language_code", { length: 10 }).notNull(), // e.g., "fr", "es"
  translatedText: text("translated_text").notNull(), // the approved translation
  usageCount: integer("usage_count").notNull().default(1), // how many times this has been used
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    sourceTargetUnique: unique("tm_source_target_unique").on(table.sourceText, table.targetLanguageCode),
  };
});

export const insertTranslationMemorySchema = createInsertSchema(translationMemory).omit({
  id: true,
  createdAt: true,
});

export type InsertTranslationMemory = z.infer<typeof insertTranslationMemorySchema>;
export type TranslationMemory = typeof translationMemory.$inferSelect;

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  projectMemberships: many(projectMembers),
  translations: many(translations),
  uploadedDocuments: many(documents),
}));
