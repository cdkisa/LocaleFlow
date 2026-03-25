import {
  users,
  projects,
  projectLanguages,
  translationKeys,
  translations,
  projectMembers,
  documents,
  translationMemory,
  projectHyperlinks,
  translationKeyHyperlinks,
  translationKeyChangeHistory,
} from "../../shared/schema-sqlite";
import * as schema from "../../shared/schema-sqlite";
import {
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type ProjectLanguage,
  type InsertProjectLanguage,
  type TranslationKey,
  type InsertTranslationKey,
  type Translation,
  type InsertTranslation,
  type ProjectMember,
  type InsertProjectMember,
  type Document,
  type InsertDocument,
  type TranslationMemory,
  type InsertTranslationMemory,
  type ProjectHyperlink,
  type InsertProjectHyperlink,
  type TranslationKeyHyperlink,
  type InsertTranslationKeyHyperlink,
  type TranslationKeyChangeHistory,
  type InsertTranslationKeyChangeHistory,
} from "@shared/schema";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import type { IStorage } from "../storage";

// Initialize SQLite connection
const sqlitePath = process.env.SQLITE_PATH || "./data/localemanager.db";
mkdirSync(dirname(sqlitePath), { recursive: true });

const sqlite = new Database(sqlitePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Helper: convert Date to ISO string for SQLite storage
function toIso(d?: Date | null): string | undefined {
  if (!d) return undefined;
  return d instanceof Date ? d.toISOString() : String(d);
}

// Helper: convert ISO string back to Date for return types
function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  return new Date(s);
}

// Helper: map a SQLite row (text dates) to the PG-typed shape (Date objects)
function mapDates<T extends Record<string, any>>(row: T): any {
  const mapped: any = { ...row };
  for (const key of Object.keys(mapped)) {
    if (
      (key.endsWith("At") || key === "expire") &&
      typeof mapped[key] === "string"
    ) {
      mapped[key] = new Date(mapped[key]);
    }
  }
  return mapped;
}

function mapDatesList<T extends Record<string, any>>(rows: T[]): any[] {
  return rows.map(mapDates);
}

export class SqliteStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ? mapDates(user) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = await this.getUser(userData.id!);
    if (existing) {
      const [updated] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date().toISOString() } as any)
        .where(eq(users.id, userData.id!))
        .returning();
      return mapDates(updated);
    }
    const [user] = await db
      .insert(users)
      .values(userData as any)
      .returning();
    return mapDates(user);
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project as any)
      .returning();
    return mapDates(newProject);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project ? mapDates(project) : undefined;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    const results = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.createdAt));
    return mapDatesList(results);
  }

  async updateProject(
    id: string,
    updates: Partial<InsertProject>,
  ): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date().toISOString() } as any)
      .where(eq(projects.id, id))
      .returning();
    return mapDates(updated);
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Language operations
  async addLanguageToProject(
    language: InsertProjectLanguage,
  ): Promise<ProjectLanguage> {
    const [newLanguage] = await db
      .insert(projectLanguages)
      .values(language as any)
      .returning();
    return mapDates(newLanguage);
  }

  async getProjectLanguages(projectId: string): Promise<ProjectLanguage[]> {
    const results = await db
      .select()
      .from(projectLanguages)
      .where(eq(projectLanguages.projectId, projectId));
    return mapDatesList(results);
  }

  async updateLanguage(
    id: string,
    language: Partial<InsertProjectLanguage>,
  ): Promise<ProjectLanguage> {
    const existing = await db
      .select()
      .from(projectLanguages)
      .where(eq(projectLanguages.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      throw new Error("Language not found");
    }

    const [updated] = await db
      .update(projectLanguages)
      .set(language as any)
      .where(eq(projectLanguages.id, id))
      .returning();
    return mapDates(updated);
  }

  async setDefaultLanguage(
    projectId: string,
    languageId: string,
  ): Promise<void> {
    const language = await db
      .select()
      .from(projectLanguages)
      .where(eq(projectLanguages.id, languageId))
      .limit(1);

    if (
      !language ||
      language.length === 0 ||
      language[0].projectId !== projectId
    ) {
      throw new Error("Language not found in project");
    }

    await db
      .update(projectLanguages)
      .set({ isDefault: false })
      .where(eq(projectLanguages.projectId, projectId));

    await db
      .update(projectLanguages)
      .set({ isDefault: true })
      .where(
        and(
          eq(projectLanguages.id, languageId),
          eq(projectLanguages.projectId, projectId),
        ),
      );
  }

  async deleteLanguage(id: string): Promise<void> {
    const existing = await db
      .select()
      .from(projectLanguages)
      .where(eq(projectLanguages.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      throw new Error("Language not found");
    }

    await db.delete(projectLanguages).where(eq(projectLanguages.id, id));
  }

  // Translation key operations
  async createTranslationKey(
    key: InsertTranslationKey,
  ): Promise<TranslationKey> {
    const [newKey] = await db
      .insert(translationKeys)
      .values(key as any)
      .returning();
    return mapDates(newKey);
  }

  async getTranslationKey(id: string): Promise<TranslationKey | undefined> {
    const [key] = await db
      .select()
      .from(translationKeys)
      .where(eq(translationKeys.id, id));
    return key ? mapDates(key) : undefined;
  }

  async getProjectKeys(projectId: string): Promise<TranslationKey[]> {
    const results = await db
      .select()
      .from(translationKeys)
      .where(eq(translationKeys.projectId, projectId))
      .orderBy(translationKeys.key);
    return mapDatesList(results);
  }

  async updateTranslationKey(
    id: string,
    updates: Partial<InsertTranslationKey>,
  ): Promise<TranslationKey> {
    const [updated] = await db
      .update(translationKeys)
      .set({ ...updates, updatedAt: new Date().toISOString() } as any)
      .where(eq(translationKeys.id, id))
      .returning();
    return mapDates(updated);
  }

  async deleteTranslationKey(id: string): Promise<void> {
    await db.delete(translationKeys).where(eq(translationKeys.id, id));
  }

  // Translation operations
  async createTranslation(
    translation: InsertTranslation,
  ): Promise<Translation> {
    const [newTranslation] = await db
      .insert(translations)
      .values(translation as any)
      .returning();
    return mapDates(newTranslation);
  }

  async getTranslation(id: string): Promise<Translation | undefined> {
    const [translation] = await db
      .select()
      .from(translations)
      .where(eq(translations.id, id));
    return translation ? mapDates(translation) : undefined;
  }

  async getProjectTranslations(projectId: string): Promise<Translation[]> {
    const results = await db
      .select({
        id: translations.id,
        keyId: translations.keyId,
        languageId: translations.languageId,
        value: translations.value,
        status: translations.status,
        translatedBy: translations.translatedBy,
        reviewedBy: translations.reviewedBy,
        createdAt: translations.createdAt,
        updatedAt: translations.updatedAt,
      })
      .from(translations)
      .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
      .where(eq(translationKeys.projectId, projectId));
    return mapDatesList(results);
  }

  async updateTranslation(
    id: string,
    updates: Partial<InsertTranslation>,
  ): Promise<Translation> {
    const [updated] = await db
      .update(translations)
      .set({ ...updates, updatedAt: new Date().toISOString() } as any)
      .where(eq(translations.id, id))
      .returning();
    return mapDates(updated);
  }

  async deleteTranslation(id: string): Promise<void> {
    await db.delete(translations).where(eq(translations.id, id));
  }

  async searchTranslationsAcrossProjects(
    query: string,
    excludeProjectId: string,
  ) {
    const pattern = `%${query}%`;
    // SQLite LIKE is case-insensitive for ASCII by default
    const results = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        keyId: translationKeys.id,
        key: translationKeys.key,
        value: translations.value,
        languageCode: projectLanguages.languageCode,
      })
      .from(translations)
      .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
      .innerJoin(projects, eq(translationKeys.projectId, projects.id))
      .innerJoin(
        projectLanguages,
        and(
          eq(translations.languageId, projectLanguages.id),
          eq(projectLanguages.isDefault, true),
        ),
      )
      .where(
        and(
          sql`${translationKeys.projectId} != ${excludeProjectId}`,
          or(
            like(translationKeys.key, pattern),
            like(translations.value, pattern),
          ),
        ),
      )
      .limit(20);
    return results;
  }

  // Project member operations
  async addMemberToProject(
    member: InsertProjectMember,
  ): Promise<ProjectMember> {
    const [newMember] = await db
      .insert(projectMembers)
      .values(member as any)
      .returning();
    return mapDates(newMember);
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const results = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    return mapDatesList(results);
  }

  async removeMemberFromProject(id: string): Promise<void> {
    await db.delete(projectMembers).where(eq(projectMembers.id, id));
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document as any)
      .returning();
    return mapDates(newDocument);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document ? mapDates(document) : undefined;
  }

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    const results = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.createdAt));
    return mapDatesList(results);
  }

  async updateDocument(
    id: string,
    updates: Partial<InsertDocument>,
  ): Promise<Document> {
    const [updated] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date().toISOString() } as any)
      .where(eq(documents.id, id))
      .returning();
    return mapDates(updated);
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Translation Memory operations
  async upsertTranslationMemory(
    memory: InsertTranslationMemory,
  ): Promise<TranslationMemory> {
    // SQLite supports ON CONFLICT via Drizzle
    const existing = await db
      .select()
      .from(translationMemory)
      .where(
        and(
          eq(translationMemory.sourceText, memory.sourceText),
          eq(translationMemory.targetLanguageCode, memory.targetLanguageCode),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(translationMemory)
        .set({
          translatedText: memory.translatedText,
          usageCount: sql`${translationMemory.usageCount} + 1`,
          lastUsedAt: new Date().toISOString(),
        } as any)
        .where(eq(translationMemory.id, existing[0].id))
        .returning();
      return mapDates(updated);
    }

    const [result] = await db
      .insert(translationMemory)
      .values(memory as any)
      .returning();
    return mapDates(result);
  }

  async findTranslationMemorySuggestion(
    sourceText: string,
    targetLanguageCode: string,
  ): Promise<TranslationMemory | undefined> {
    const [result] = await db
      .select()
      .from(translationMemory)
      .where(
        and(
          eq(translationMemory.sourceText, sourceText),
          eq(translationMemory.targetLanguageCode, targetLanguageCode),
        ),
      )
      .limit(1);
    return result ? mapDates(result) : undefined;
  }

  async getUserStats(userId: string): Promise<{
    totalProjects: number;
    totalLanguages: number;
    totalKeys: number;
    recentActivity: number;
  }> {
    const userProjects = await this.getProjectsByUser(userId);
    const projectIds = userProjects.map((p) => p.id);

    let totalLanguages = 0;
    let totalKeys = 0;

    if (projectIds.length > 0) {
      const languages = await db
        .select({ count: sql<number>`count(*)` })
        .from(projectLanguages)
        .where(sql`${projectLanguages.projectId} IN ${projectIds}`);

      const keys = await db
        .select({ count: sql<number>`count(*)` })
        .from(translationKeys)
        .where(sql`${translationKeys.projectId} IN ${projectIds}`);

      totalLanguages = Number(languages[0]?.count || 0);
      totalKeys = Number(keys[0]?.count || 0);
    }

    // SQLite date comparison: datetime('now', '-7 days')
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const recentActivity = await db
      .select({ count: sql<number>`count(*)` })
      .from(translations)
      .where(
        and(
          eq(translations.translatedBy, userId),
          sql`${translations.updatedAt} > ${sevenDaysAgo}`,
        ),
      );

    return {
      totalProjects: userProjects.length,
      totalLanguages,
      totalKeys,
      recentActivity: Number(recentActivity[0]?.count || 0),
    };
  }

  // Project hyperlink operations
  async createProjectHyperlink(
    hyperlink: InsertProjectHyperlink,
  ): Promise<ProjectHyperlink> {
    const [newHyperlink] = await db
      .insert(projectHyperlinks)
      .values(hyperlink as any)
      .returning();
    if (!newHyperlink) {
      throw new Error("Failed to create hyperlink: no data returned");
    }
    return mapDates(newHyperlink);
  }

  async getProjectHyperlinks(
    projectId: string,
  ): Promise<ProjectHyperlink[]> {
    const results = await db
      .select()
      .from(projectHyperlinks)
      .where(eq(projectHyperlinks.projectId, projectId))
      .orderBy(projectHyperlinks.createdAt);
    return mapDatesList(results);
  }

  async updateProjectHyperlink(
    id: string,
    updates: Partial<InsertProjectHyperlink>,
  ): Promise<ProjectHyperlink> {
    const [updated] = await db
      .update(projectHyperlinks)
      .set({ ...updates, updatedAt: new Date().toISOString() } as any)
      .where(eq(projectHyperlinks.id, id))
      .returning();
    return mapDates(updated);
  }

  async deleteProjectHyperlink(id: string): Promise<void> {
    await db
      .delete(projectHyperlinks)
      .where(eq(projectHyperlinks.id, id));
  }

  // Translation key hyperlink operations
  async createTranslationKeyHyperlink(
    hyperlink: InsertTranslationKeyHyperlink,
  ): Promise<TranslationKeyHyperlink> {
    const [newHyperlink] = await db
      .insert(translationKeyHyperlinks)
      .values(hyperlink as any)
      .returning();
    if (!newHyperlink) {
      throw new Error(
        "Failed to create translation key hyperlink: no data returned",
      );
    }
    return mapDates(newHyperlink);
  }

  async getTranslationKeyHyperlinks(
    translationKeyId: string,
  ): Promise<TranslationKeyHyperlink[]> {
    const results = await db
      .select()
      .from(translationKeyHyperlinks)
      .where(eq(translationKeyHyperlinks.translationKeyId, translationKeyId))
      .orderBy(translationKeyHyperlinks.createdAt);
    return mapDatesList(results);
  }

  async updateTranslationKeyHyperlink(
    id: string,
    updates: Partial<InsertTranslationKeyHyperlink>,
  ): Promise<TranslationKeyHyperlink> {
    const [updated] = await db
      .update(translationKeyHyperlinks)
      .set({ ...updates, updatedAt: new Date().toISOString() } as any)
      .where(eq(translationKeyHyperlinks.id, id))
      .returning();
    return mapDates(updated);
  }

  async deleteTranslationKeyHyperlink(id: string): Promise<void> {
    await db
      .delete(translationKeyHyperlinks)
      .where(eq(translationKeyHyperlinks.id, id));
  }

  // Translation key change history operations
  async createTranslationKeyChangeHistory(
    change: InsertTranslationKeyChangeHistory,
  ): Promise<TranslationKeyChangeHistory> {
    const [newChange] = await db
      .insert(translationKeyChangeHistory)
      .values(change as any)
      .returning();
    return mapDates(newChange);
  }

  async getTranslationKeyChangeHistory(
    translationKeyId: string,
  ): Promise<TranslationKeyChangeHistory[]> {
    const results = await db
      .select()
      .from(translationKeyChangeHistory)
      .where(
        eq(translationKeyChangeHistory.translationKeyId, translationKeyId),
      )
      .orderBy(desc(translationKeyChangeHistory.createdAt));
    return mapDatesList(results);
  }
}
