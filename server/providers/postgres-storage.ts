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
  apiKeys,
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
  type ApiKey,
  type InsertApiKey,
} from "@shared/schema";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { IStorage } from "../storage";

// Initialize PostgreSQL connection (supports local pg and Neon serverless)
async function createPostgresDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for PostgreSQL provider.");
  }

  const isLocalPostgres =
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1");

  if (isLocalPostgres) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });
    return { db, pool };
  } else {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const ws = await import("ws");
    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });
    return { db, pool };
  }
}

const { db, pool: pgPool } = await createPostgresDb();
export { pgPool as pool };

export class PostgresStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async updateProject(
    id: string,
    updates: Partial<InsertProject>,
  ): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
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
      .values(language)
      .returning();
    return newLanguage;
  }

  async getProjectLanguages(projectId: string): Promise<ProjectLanguage[]> {
    return await db
      .select()
      .from(projectLanguages)
      .where(eq(projectLanguages.projectId, projectId));
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
      .set(language)
      .where(eq(projectLanguages.id, id))
      .returning();
    return updated;
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
        sql`${projectLanguages.id} = ${languageId} AND ${projectLanguages.projectId} = ${projectId}`,
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
      .values(key)
      .returning();
    return newKey;
  }

  async getTranslationKey(id: string): Promise<TranslationKey | undefined> {
    const [key] = await db
      .select()
      .from(translationKeys)
      .where(eq(translationKeys.id, id));
    return key;
  }

  async getProjectKeys(projectId: string): Promise<TranslationKey[]> {
    return await db
      .select()
      .from(translationKeys)
      .where(eq(translationKeys.projectId, projectId))
      .orderBy(translationKeys.key);
  }

  async updateTranslationKey(
    id: string,
    updates: Partial<InsertTranslationKey>,
  ): Promise<TranslationKey> {
    const [updated] = await db
      .update(translationKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(translationKeys.id, id))
      .returning();
    return updated;
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
      .values(translation)
      .returning();
    return newTranslation;
  }

  async getTranslation(id: string): Promise<Translation | undefined> {
    const [translation] = await db
      .select()
      .from(translations)
      .where(eq(translations.id, id));
    return translation;
  }

  async getProjectTranslations(projectId: string): Promise<Translation[]> {
    return await db
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
  }

  async updateTranslation(
    id: string,
    updates: Partial<InsertTranslation>,
  ): Promise<Translation> {
    const [updated] = await db
      .update(translations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(translations.id, id))
      .returning();
    return updated;
  }

  async deleteTranslation(id: string): Promise<void> {
    await db.delete(translations).where(eq(translations.id, id));
  }

  async searchTranslationsAcrossProjects(
    query: string,
    excludeProjectId: string,
  ) {
    const pattern = `%${query}%`;
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
          sql`(${translationKeys.key} ILIKE ${pattern} OR ${translations.value} ILIKE ${pattern})`,
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
      .values(member)
      .returning();
    return newMember;
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
  }

  async removeMemberFromProject(id: string): Promise<void> {
    await db.delete(projectMembers).where(eq(projectMembers.id, id));
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document;
  }

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.createdAt));
  }

  async updateDocument(
    id: string,
    updates: Partial<InsertDocument>,
  ): Promise<Document> {
    const [updated] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Translation Memory operations
  async upsertTranslationMemory(
    memory: InsertTranslationMemory,
  ): Promise<TranslationMemory> {
    const [result] = await db
      .insert(translationMemory)
      .values(memory)
      .onConflictDoUpdate({
        target: [
          translationMemory.sourceText,
          translationMemory.targetLanguageCode,
        ],
        set: {
          translatedText: memory.translatedText,
          usageCount: sql`${translationMemory.usageCount} + 1`,
          lastUsedAt: new Date(),
        },
      })
      .returning();
    return result;
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
    return result;
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

    const recentActivity = await db
      .select({ count: sql<number>`count(*)` })
      .from(translations)
      .where(
        and(
          eq(translations.translatedBy, userId),
          sql`${translations.updatedAt} > NOW() - INTERVAL '7 days'`,
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
    try {
      const [newHyperlink] = await db
        .insert(projectHyperlinks)
        .values(hyperlink)
        .returning();
      if (!newHyperlink) {
        throw new Error("Failed to create hyperlink: no data returned");
      }
      return newHyperlink;
    } catch (error) {
      console.error("Database error creating hyperlink:", error);
      throw error;
    }
  }

  async getProjectHyperlinks(
    projectId: string,
  ): Promise<ProjectHyperlink[]> {
    return await db
      .select()
      .from(projectHyperlinks)
      .where(eq(projectHyperlinks.projectId, projectId))
      .orderBy(projectHyperlinks.createdAt);
  }

  async updateProjectHyperlink(
    id: string,
    updates: Partial<InsertProjectHyperlink>,
  ): Promise<ProjectHyperlink> {
    const [updated] = await db
      .update(projectHyperlinks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectHyperlinks.id, id))
      .returning();
    return updated;
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
    try {
      const [newHyperlink] = await db
        .insert(translationKeyHyperlinks)
        .values(hyperlink)
        .returning();
      if (!newHyperlink) {
        throw new Error(
          "Failed to create translation key hyperlink: no data returned",
        );
      }
      return newHyperlink;
    } catch (error) {
      console.error(
        "Database error creating translation key hyperlink:",
        error,
      );
      throw error;
    }
  }

  async getTranslationKeyHyperlinks(
    translationKeyId: string,
  ): Promise<TranslationKeyHyperlink[]> {
    return await db
      .select()
      .from(translationKeyHyperlinks)
      .where(eq(translationKeyHyperlinks.translationKeyId, translationKeyId))
      .orderBy(translationKeyHyperlinks.createdAt);
  }

  async updateTranslationKeyHyperlink(
    id: string,
    updates: Partial<InsertTranslationKeyHyperlink>,
  ): Promise<TranslationKeyHyperlink> {
    const [updated] = await db
      .update(translationKeyHyperlinks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(translationKeyHyperlinks.id, id))
      .returning();
    return updated;
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
      .values(change)
      .returning();
    return newChange;
  }

  async getTranslationKeyChangeHistory(
    translationKeyId: string,
  ): Promise<TranslationKeyChangeHistory[]> {
    return await db
      .select()
      .from(translationKeyChangeHistory)
      .where(
        eq(translationKeyChangeHistory.translationKeyId, translationKeyId),
      )
      .orderBy(desc(translationKeyChangeHistory.createdAt));
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [newKey] = await db.insert(apiKeys).values(apiKey).returning();
    return newKey;
  }

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByHash(hash: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hash));
    return key;
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }
}
