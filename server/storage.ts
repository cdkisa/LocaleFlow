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

export interface IStorage {
  // User operations
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
  searchTranslationsAcrossProjects(query: string, excludeProjectId: string): Promise<{
    projectId: string;
    projectName: string;
    keyId: string;
    key: string;
    value: string;
    languageCode: string;
  }[]>;

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

  // Translation Memory operations
  upsertTranslationMemory(memory: InsertTranslationMemory): Promise<TranslationMemory>;
  findTranslationMemorySuggestion(sourceText: string, targetLanguageCode: string): Promise<TranslationMemory | undefined>;

  // Project hyperlink operations
  createProjectHyperlink(hyperlink: InsertProjectHyperlink): Promise<ProjectHyperlink>;
  getProjectHyperlinks(projectId: string): Promise<ProjectHyperlink[]>;
  updateProjectHyperlink(id: string, updates: Partial<InsertProjectHyperlink>): Promise<ProjectHyperlink>;
  deleteProjectHyperlink(id: string): Promise<void>;

  // Translation key hyperlink operations
  createTranslationKeyHyperlink(hyperlink: InsertTranslationKeyHyperlink): Promise<TranslationKeyHyperlink>;
  getTranslationKeyHyperlinks(translationKeyId: string): Promise<TranslationKeyHyperlink[]>;
  updateTranslationKeyHyperlink(id: string, updates: Partial<InsertTranslationKeyHyperlink>): Promise<TranslationKeyHyperlink>;
  deleteTranslationKeyHyperlink(id: string): Promise<void>;

  // Translation key change history operations
  createTranslationKeyChangeHistory(change: InsertTranslationKeyChangeHistory): Promise<TranslationKeyChangeHistory>;
  getTranslationKeyChangeHistory(translationKeyId: string): Promise<TranslationKeyChangeHistory[]>;

  // Stats
  getUserStats(userId: string): Promise<{
    totalProjects: number;
    totalLanguages: number;
    totalKeys: number;
    recentActivity: number;
  }>;
}

// Factory: select storage provider based on DB_PROVIDER env var
const provider = process.env.DB_PROVIDER || "postgres";
let storage: IStorage;

switch (provider) {
  case "postgres": {
    const { PostgresStorage } = await import("./providers/postgres-storage");
    storage = new PostgresStorage();
    break;
  }
  case "sqlite": {
    const { SqliteStorage } = await import("./providers/sqlite-storage");
    storage = new SqliteStorage();
    break;
  }
  case "mssql": {
    const { MssqlStorage } = await import("./providers/mssql-storage");
    storage = new MssqlStorage();
    break;
  }
  default:
    throw new Error(
      `Unknown DB_PROVIDER: "${provider}". Valid options: postgres, sqlite, mssql`,
    );
}

console.log(`[storage] Using database provider: ${provider}`);

export { storage };
