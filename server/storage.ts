// Blueprint: javascript_database and javascript_log_in_with_replit integration
import {
  users,
  projects,
  projectLanguages,
  translationKeys,
  translations,
  projectMembers,
  documents,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (Replit Auth - mandatory)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Language operations
  addLanguageToProject(language: InsertProjectLanguage): Promise<ProjectLanguage>;
  getProjectLanguages(projectId: string): Promise<ProjectLanguage[]>;
  updateLanguage(id: string, language: Partial<InsertProjectLanguage>): Promise<ProjectLanguage>;
  setDefaultLanguage(projectId: string, languageId: string): Promise<void>;
  deleteLanguage(id: string): Promise<void>;

  // Translation key operations
  createTranslationKey(key: InsertTranslationKey): Promise<TranslationKey>;
  getTranslationKey(id: string): Promise<TranslationKey | undefined>;
  getProjectKeys(projectId: string): Promise<TranslationKey[]>;
  updateTranslationKey(id: string, updates: Partial<InsertTranslationKey>): Promise<TranslationKey>;
  deleteTranslationKey(id: string): Promise<void>;

  // Translation operations
  createTranslation(translation: InsertTranslation): Promise<Translation>;
  getTranslation(id: string): Promise<Translation | undefined>;
  getProjectTranslations(projectId: string): Promise<Translation[]>;
  updateTranslation(id: string, updates: Partial<InsertTranslation>): Promise<Translation>;
  deleteTranslation(id: string): Promise<void>;

  // Project member operations
  addMemberToProject(member: InsertProjectMember): Promise<ProjectMember>;
  getProjectMembers(projectId: string): Promise<ProjectMember[]>;
  removeMemberFromProject(id: string): Promise<void>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getProjectDocuments(projectId: string): Promise<Document[]>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Stats
  getUserStats(userId: string): Promise<{
    totalProjects: number;
    totalLanguages: number;
    totalKeys: number;
    recentActivity: number;
  }>;
}

export class DatabaseStorage implements IStorage {
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
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
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
  async addLanguageToProject(language: InsertProjectLanguage): Promise<ProjectLanguage> {
    const [newLanguage] = await db.insert(projectLanguages).values(language).returning();
    return newLanguage;
  }

  async getProjectLanguages(projectId: string): Promise<ProjectLanguage[]> {
    return await db
      .select()
      .from(projectLanguages)
      .where(eq(projectLanguages.projectId, projectId));
  }

  async updateLanguage(id: string, language: Partial<InsertProjectLanguage>): Promise<ProjectLanguage> {
    // Verify language exists first
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

  async setDefaultLanguage(projectId: string, languageId: string): Promise<void> {
    // Verify the language belongs to the project
    const language = await db
      .select()
      .from(projectLanguages)
      .where(eq(projectLanguages.id, languageId))
      .limit(1);
    
    if (!language || language.length === 0 || language[0].projectId !== projectId) {
      throw new Error("Language not found in project");
    }
    
    // First, unset all default languages for this project
    await db
      .update(projectLanguages)
      .set({ isDefault: false })
      .where(eq(projectLanguages.projectId, projectId));

    // Then set the specified language as default (with additional projectId check)
    await db
      .update(projectLanguages)
      .set({ isDefault: true })
      .where(sql`${projectLanguages.id} = ${languageId} AND ${projectLanguages.projectId} = ${projectId}`);
  }

  async deleteLanguage(id: string): Promise<void> {
    // Verify language exists first
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
  async createTranslationKey(key: InsertTranslationKey): Promise<TranslationKey> {
    const [newKey] = await db.insert(translationKeys).values(key).returning();
    return newKey;
  }

  async getTranslationKey(id: string): Promise<TranslationKey | undefined> {
    const [key] = await db.select().from(translationKeys).where(eq(translationKeys.id, id));
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
    updates: Partial<InsertTranslationKey>
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
  async createTranslation(translation: InsertTranslation): Promise<Translation> {
    const [newTranslation] = await db.insert(translations).values(translation).returning();
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
    updates: Partial<InsertTranslation>
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

  // Project member operations
  async addMemberToProject(member: InsertProjectMember): Promise<ProjectMember> {
    const [newMember] = await db.insert(projectMembers).values(member).returning();
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
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.createdAt));
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
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

  // Stats
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
          sql`${translations.updatedAt} > NOW() - INTERVAL '7 days'`
        )
      );

    return {
      totalProjects: userProjects.length,
      totalLanguages,
      totalKeys,
      recentActivity: Number(recentActivity[0]?.count || 0),
    };
  }
}

export const storage = new DatabaseStorage();
