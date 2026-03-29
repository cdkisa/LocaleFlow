import sql from "mssql";
import type {
  User,
  UpsertUser,
  Project,
  InsertProject,
  ProjectLanguage,
  InsertProjectLanguage,
  TranslationKey,
  InsertTranslationKey,
  Translation,
  InsertTranslation,
  ProjectMember,
  InsertProjectMember,
  Document,
  InsertDocument,
  TranslationMemory,
  InsertTranslationMemory,
  ProjectHyperlink,
  InsertProjectHyperlink,
  TranslationKeyHyperlink,
  InsertTranslationKeyHyperlink,
  TranslationKeyChangeHistory,
  InsertTranslationKeyChangeHistory,
} from "@shared/schema";
import type { IStorage } from "../storage";

// Initialize MSSQL connection pool
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for MSSQL provider.");
}

const pool = new sql.ConnectionPool(process.env.DATABASE_URL);
const poolConnect = pool.connect();

async function getPool(): Promise<sql.ConnectionPool> {
  await poolConnect;
  return pool;
}

// Run the DDL to create tables if they don't exist
async function initializeSchema(): Promise<void> {
  const p = await getPool();
  await p.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sessions')
    CREATE TABLE sessions (
      sid NVARCHAR(255) PRIMARY KEY,
      sess NVARCHAR(MAX) NOT NULL,
      expire DATETIME2 NOT NULL
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
    CREATE TABLE users (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      email NVARCHAR(255) NULL UNIQUE,
      first_name NVARCHAR(255) NULL,
      last_name NVARCHAR(255) NULL,
      profile_image_url NVARCHAR(500) NULL,
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projects')
    CREATE TABLE projects (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      name NVARCHAR(255) NOT NULL,
      description NVARCHAR(MAX) NULL,
      owner_id NVARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_languages')
    CREATE TABLE project_languages (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      project_id NVARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      language_code NVARCHAR(10) NOT NULL,
      language_name NVARCHAR(100) NOT NULL,
      is_default BIT DEFAULT 0,
      created_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'translation_keys')
    CREATE TABLE translation_keys (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      project_id NVARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      [key] NVARCHAR(500) NOT NULL,
      description NVARCHAR(MAX) NULL,
      max_length INT NULL,
      priority NVARCHAR(20) NOT NULL DEFAULT 'normal',
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'translations')
    CREATE TABLE translations (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      key_id NVARCHAR(255) NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
      language_id NVARCHAR(255) NOT NULL,
      value NVARCHAR(MAX) NOT NULL,
      status NVARCHAR(20) NOT NULL DEFAULT 'draft',
      translated_by NVARCHAR(255) NULL REFERENCES users(id),
      reviewed_by NVARCHAR(255) NULL REFERENCES users(id),
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_members')
    CREATE TABLE project_members (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      project_id NVARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id NVARCHAR(255) NOT NULL,
      role NVARCHAR(20) NOT NULL,
      created_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'documents')
    CREATE TABLE documents (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      project_id NVARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      file_name NVARCHAR(255) NOT NULL,
      file_type NVARCHAR(50) NOT NULL,
      file_size INT NOT NULL,
      storage_path NVARCHAR(MAX) NOT NULL,
      status NVARCHAR(20) NOT NULL DEFAULT 'pending',
      extracted_text NVARCHAR(MAX) NULL,
      error_message NVARCHAR(MAX) NULL,
      uploaded_by NVARCHAR(255) NOT NULL REFERENCES users(id),
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'translation_memory')
    CREATE TABLE translation_memory (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      source_text NVARCHAR(MAX) NOT NULL,
      target_language_code NVARCHAR(10) NOT NULL,
      translated_text NVARCHAR(MAX) NOT NULL,
      usage_count INT NOT NULL DEFAULT 1,
      last_used_at DATETIME2 DEFAULT GETDATE(),
      created_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_hyperlinks')
    CREATE TABLE project_hyperlinks (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      project_id NVARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      label NVARCHAR(255) NOT NULL,
      url NVARCHAR(MAX) NOT NULL,
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'translation_key_hyperlinks')
    CREATE TABLE translation_key_hyperlinks (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      translation_key_id NVARCHAR(255) NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
      label NVARCHAR(255) NOT NULL,
      url NVARCHAR(MAX) NOT NULL,
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'translation_key_change_history')
    CREATE TABLE translation_key_change_history (
      id NVARCHAR(255) PRIMARY KEY DEFAULT NEWID(),
      translation_key_id NVARCHAR(255) NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
      user_id NVARCHAR(255) NOT NULL REFERENCES users(id),
      action NVARCHAR(50) NOT NULL,
      field NVARCHAR(100) NULL,
      old_value NVARCHAR(MAX) NULL,
      new_value NVARCHAR(MAX) NULL,
      created_at DATETIME2 DEFAULT GETDATE()
    );
  `);
  console.log("[mssql] Schema initialized.");
}

// Map a MSSQL recordset row (snake_case columns) to camelCase typed object
function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProjectLanguage(row: any): ProjectLanguage {
  return {
    id: row.id,
    projectId: row.project_id,
    languageCode: row.language_code,
    languageName: row.language_name,
    isDefault: !!row.is_default,
    createdAt: row.created_at,
  };
}

function mapTranslationKey(row: any): TranslationKey {
  return {
    id: row.id,
    projectId: row.project_id,
    key: row.key,
    description: row.description,
    maxLength: row.max_length,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTranslation(row: any): Translation {
  return {
    id: row.id,
    keyId: row.key_id,
    languageId: row.language_id,
    value: row.value,
    status: row.status,
    translatedBy: row.translated_by,
    reviewedBy: row.reviewed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProjectMember(row: any): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at,
  };
}

function mapDocument(row: any): Document {
  return {
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    status: row.status,
    extractedText: row.extracted_text,
    errorMessage: row.error_message,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTranslationMemory(row: any): TranslationMemory {
  return {
    id: row.id,
    sourceText: row.source_text,
    targetLanguageCode: row.target_language_code,
    translatedText: row.translated_text,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

function mapProjectHyperlink(row: any): ProjectHyperlink {
  return {
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTranslationKeyHyperlink(row: any): TranslationKeyHyperlink {
  return {
    id: row.id,
    translationKeyId: row.translation_key_id,
    label: row.label,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChangeHistory(row: any): TranslationKeyChangeHistory {
  return {
    id: row.id,
    translationKeyId: row.translation_key_id,
    userId: row.user_id,
    action: row.action,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: row.created_at,
  };
}

export class MssqlStorage implements IStorage {
  constructor() {
    // Initialize schema on construction
    initializeSchema().catch((err) =>
      console.error("[mssql] Schema initialization failed:", err),
    );
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const p = await getPool();
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM users WHERE id = @id");
    return result.recordset[0] ? mapUser(result.recordset[0]) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const p = await getPool();
    const id = userData.id || crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("email", sql.NVarChar, userData.email || null)
      .input("firstName", sql.NVarChar, userData.firstName || null)
      .input("lastName", sql.NVarChar, userData.lastName || null)
      .input("profileImageUrl", sql.NVarChar, userData.profileImageUrl || null)
      .query(`
        MERGE users AS target
        USING (SELECT @id AS id) AS source ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET email = @email, first_name = @firstName, last_name = @lastName,
                     profile_image_url = @profileImageUrl, updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (id, email, first_name, last_name, profile_image_url)
          VALUES (@id, @email, @firstName, @lastName, @profileImageUrl);
      `);
    return (await this.getUser(id))!;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("name", sql.NVarChar, project.name)
      .input("description", sql.NVarChar, project.description || null)
      .input("ownerId", sql.NVarChar, project.ownerId)
      .query(
        "INSERT INTO projects (id, name, description, owner_id) VALUES (@id, @name, @description, @ownerId)",
      );
    return (await this.getProject(id))!;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const p = await getPool();
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM projects WHERE id = @id");
    return result.recordset[0] ? mapProject(result.recordset[0]) : undefined;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("ownerId", sql.NVarChar, userId)
      .query(
        "SELECT * FROM projects WHERE owner_id = @ownerId ORDER BY created_at DESC",
      );
    return result.recordset.map(mapProject);
  }

  async updateProject(
    id: string,
    updates: Partial<InsertProject>,
  ): Promise<Project> {
    const p = await getPool();
    const sets: string[] = ["updated_at = GETDATE()"];
    const req = p.request().input("id", sql.NVarChar, id);
    if (updates.name !== undefined) {
      sets.push("name = @name");
      req.input("name", sql.NVarChar, updates.name);
    }
    if (updates.description !== undefined) {
      sets.push("description = @description");
      req.input("description", sql.NVarChar, updates.description);
    }
    if (updates.ownerId !== undefined) {
      sets.push("owner_id = @ownerId");
      req.input("ownerId", sql.NVarChar, updates.ownerId);
    }
    await req.query(`UPDATE projects SET ${sets.join(", ")} WHERE id = @id`);
    return (await this.getProject(id))!;
  }

  async deleteProject(id: string): Promise<void> {
    const p = await getPool();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM projects WHERE id = @id");
  }

  // Language operations
  async addLanguageToProject(
    language: InsertProjectLanguage,
  ): Promise<ProjectLanguage> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("projectId", sql.NVarChar, language.projectId)
      .input("languageCode", sql.NVarChar, language.languageCode)
      .input("languageName", sql.NVarChar, language.languageName)
      .input("isDefault", sql.Bit, language.isDefault ? 1 : 0)
      .query(
        "INSERT INTO project_languages (id, project_id, language_code, language_name, is_default) VALUES (@id, @projectId, @languageCode, @languageName, @isDefault)",
      );
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM project_languages WHERE id = @id");
    return mapProjectLanguage(result.recordset[0]);
  }

  async getProjectLanguages(projectId: string): Promise<ProjectLanguage[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .query(
        "SELECT * FROM project_languages WHERE project_id = @projectId",
      );
    return result.recordset.map(mapProjectLanguage);
  }

  async updateLanguage(
    id: string,
    language: Partial<InsertProjectLanguage>,
  ): Promise<ProjectLanguage> {
    const p = await getPool();
    const check = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM project_languages WHERE id = @id");
    if (check.recordset.length === 0) throw new Error("Language not found");

    const sets: string[] = [];
    const req = p.request().input("id", sql.NVarChar, id);
    if (language.languageCode !== undefined) {
      sets.push("language_code = @languageCode");
      req.input("languageCode", sql.NVarChar, language.languageCode);
    }
    if (language.languageName !== undefined) {
      sets.push("language_name = @languageName");
      req.input("languageName", sql.NVarChar, language.languageName);
    }
    if (language.isDefault !== undefined) {
      sets.push("is_default = @isDefault");
      req.input("isDefault", sql.Bit, language.isDefault ? 1 : 0);
    }
    if (sets.length > 0) {
      await req.query(
        `UPDATE project_languages SET ${sets.join(", ")} WHERE id = @id`,
      );
    }
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM project_languages WHERE id = @id");
    return mapProjectLanguage(result.recordset[0]);
  }

  async setDefaultLanguage(
    projectId: string,
    languageId: string,
  ): Promise<void> {
    const p = await getPool();
    const check = await p
      .request()
      .input("id", sql.NVarChar, languageId)
      .query("SELECT * FROM project_languages WHERE id = @id");
    if (
      check.recordset.length === 0 ||
      check.recordset[0].project_id !== projectId
    ) {
      throw new Error("Language not found in project");
    }

    await p
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .query(
        "UPDATE project_languages SET is_default = 0 WHERE project_id = @projectId",
      );
    await p
      .request()
      .input("id", sql.NVarChar, languageId)
      .input("projectId", sql.NVarChar, projectId)
      .query(
        "UPDATE project_languages SET is_default = 1 WHERE id = @id AND project_id = @projectId",
      );
  }

  async deleteLanguage(id: string): Promise<void> {
    const p = await getPool();
    const check = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM project_languages WHERE id = @id");
    if (check.recordset.length === 0) throw new Error("Language not found");
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM project_languages WHERE id = @id");
  }

  // Translation key operations
  async createTranslationKey(
    key: InsertTranslationKey,
  ): Promise<TranslationKey> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("projectId", sql.NVarChar, key.projectId)
      .input("key", sql.NVarChar, key.key)
      .input("description", sql.NVarChar, key.description || null)
      .input("maxLength", sql.Int, key.maxLength || null)
      .input("priority", sql.NVarChar, key.priority || "normal")
      .query(
        "INSERT INTO translation_keys (id, project_id, [key], description, max_length, priority) VALUES (@id, @projectId, @key, @description, @maxLength, @priority)",
      );
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM translation_keys WHERE id = @id");
    return mapTranslationKey(result.recordset[0]);
  }

  async getTranslationKey(id: string): Promise<TranslationKey | undefined> {
    const p = await getPool();
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM translation_keys WHERE id = @id");
    return result.recordset[0]
      ? mapTranslationKey(result.recordset[0])
      : undefined;
  }

  async getProjectKeys(projectId: string): Promise<TranslationKey[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .query(
        "SELECT * FROM translation_keys WHERE project_id = @projectId ORDER BY [key]",
      );
    return result.recordset.map(mapTranslationKey);
  }

  async updateTranslationKey(
    id: string,
    updates: Partial<InsertTranslationKey>,
  ): Promise<TranslationKey> {
    const p = await getPool();
    const sets: string[] = ["updated_at = GETDATE()"];
    const req = p.request().input("id", sql.NVarChar, id);
    if (updates.key !== undefined) {
      sets.push("[key] = @key");
      req.input("key", sql.NVarChar, updates.key);
    }
    if (updates.description !== undefined) {
      sets.push("description = @description");
      req.input("description", sql.NVarChar, updates.description);
    }
    if (updates.maxLength !== undefined) {
      sets.push("max_length = @maxLength");
      req.input("maxLength", sql.Int, updates.maxLength);
    }
    if (updates.priority !== undefined) {
      sets.push("priority = @priority");
      req.input("priority", sql.NVarChar, updates.priority);
    }
    await req.query(
      `UPDATE translation_keys SET ${sets.join(", ")} WHERE id = @id`,
    );
    return (await this.getTranslationKey(id))!;
  }

  async deleteTranslationKey(id: string): Promise<void> {
    const p = await getPool();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM translation_keys WHERE id = @id");
  }

  // Translation operations
  async createTranslation(
    translation: InsertTranslation,
  ): Promise<Translation> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("keyId", sql.NVarChar, translation.keyId)
      .input("languageId", sql.NVarChar, translation.languageId)
      .input("value", sql.NVarChar, translation.value)
      .input("status", sql.NVarChar, translation.status || "draft")
      .input("translatedBy", sql.NVarChar, translation.translatedBy || null)
      .input("reviewedBy", sql.NVarChar, translation.reviewedBy || null)
      .query(
        "INSERT INTO translations (id, key_id, language_id, value, status, translated_by, reviewed_by) VALUES (@id, @keyId, @languageId, @value, @status, @translatedBy, @reviewedBy)",
      );
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM translations WHERE id = @id");
    return mapTranslation(result.recordset[0]);
  }

  async getTranslation(id: string): Promise<Translation | undefined> {
    const p = await getPool();
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM translations WHERE id = @id");
    return result.recordset[0]
      ? mapTranslation(result.recordset[0])
      : undefined;
  }

  async getProjectTranslations(projectId: string): Promise<Translation[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .query(`
        SELECT t.* FROM translations t
        INNER JOIN translation_keys tk ON t.key_id = tk.id
        WHERE tk.project_id = @projectId
      `);
    return result.recordset.map(mapTranslation);
  }

  async updateTranslation(
    id: string,
    updates: Partial<InsertTranslation>,
  ): Promise<Translation> {
    const p = await getPool();
    const sets: string[] = ["updated_at = GETDATE()"];
    const req = p.request().input("id", sql.NVarChar, id);
    if (updates.value !== undefined) {
      sets.push("value = @value");
      req.input("value", sql.NVarChar, updates.value);
    }
    if (updates.status !== undefined) {
      sets.push("status = @status");
      req.input("status", sql.NVarChar, updates.status);
    }
    if (updates.translatedBy !== undefined) {
      sets.push("translated_by = @translatedBy");
      req.input("translatedBy", sql.NVarChar, updates.translatedBy);
    }
    if (updates.reviewedBy !== undefined) {
      sets.push("reviewed_by = @reviewedBy");
      req.input("reviewedBy", sql.NVarChar, updates.reviewedBy);
    }
    await req.query(
      `UPDATE translations SET ${sets.join(", ")} WHERE id = @id`,
    );
    return (await this.getTranslation(id))!;
  }

  async deleteTranslation(id: string): Promise<void> {
    const p = await getPool();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM translations WHERE id = @id");
  }

  async searchTranslationsAcrossProjects(
    query: string,
    excludeProjectId: string,
  ) {
    const p = await getPool();
    const pattern = `%${query}%`;
    // MSSQL default collation is case-insensitive, so LIKE works like ILIKE
    const result = await p
      .request()
      .input("pattern", sql.NVarChar, pattern)
      .input("excludeProjectId", sql.NVarChar, excludeProjectId)
      .query(`
        SELECT TOP 20
          p.id AS project_id, p.name AS project_name,
          tk.id AS key_id, tk.[key] AS [key],
          t.value, pl.language_code
        FROM translations t
        INNER JOIN translation_keys tk ON t.key_id = tk.id
        INNER JOIN projects p ON tk.project_id = p.id
        INNER JOIN project_languages pl ON t.language_id = pl.id AND pl.is_default = 1
        WHERE tk.project_id != @excludeProjectId
          AND (tk.[key] LIKE @pattern OR t.value LIKE @pattern)
      `);
    return result.recordset.map((row: any) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      keyId: row.key_id,
      key: row.key,
      value: row.value,
      languageCode: row.language_code,
    }));
  }

  // Project member operations
  async addMemberToProject(
    member: InsertProjectMember,
  ): Promise<ProjectMember> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("projectId", sql.NVarChar, member.projectId)
      .input("userId", sql.NVarChar, member.userId)
      .input("role", sql.NVarChar, member.role)
      .query(
        "INSERT INTO project_members (id, project_id, user_id, role) VALUES (@id, @projectId, @userId, @role)",
      );
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM project_members WHERE id = @id");
    return mapProjectMember(result.recordset[0]);
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .query(
        "SELECT * FROM project_members WHERE project_id = @projectId",
      );
    return result.recordset.map(mapProjectMember);
  }

  async removeMemberFromProject(id: string): Promise<void> {
    const p = await getPool();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM project_members WHERE id = @id");
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("projectId", sql.NVarChar, document.projectId)
      .input("fileName", sql.NVarChar, document.fileName)
      .input("fileType", sql.NVarChar, document.fileType)
      .input("fileSize", sql.Int, document.fileSize)
      .input("storagePath", sql.NVarChar, document.storagePath)
      .input("status", sql.NVarChar, document.status || "pending")
      .input("extractedText", sql.NVarChar, document.extractedText || null)
      .input("errorMessage", sql.NVarChar, document.errorMessage || null)
      .input("uploadedBy", sql.NVarChar, document.uploadedBy)
      .query(`
        INSERT INTO documents (id, project_id, file_name, file_type, file_size, storage_path, status, extracted_text, error_message, uploaded_by)
        VALUES (@id, @projectId, @fileName, @fileType, @fileSize, @storagePath, @status, @extractedText, @errorMessage, @uploadedBy)
      `);
    return (await this.getDocument(id))!;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const p = await getPool();
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM documents WHERE id = @id");
    return result.recordset[0]
      ? mapDocument(result.recordset[0])
      : undefined;
  }

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .query(
        "SELECT * FROM documents WHERE project_id = @projectId ORDER BY created_at DESC",
      );
    return result.recordset.map(mapDocument);
  }

  async updateDocument(
    id: string,
    updates: Partial<InsertDocument>,
  ): Promise<Document> {
    const p = await getPool();
    const sets: string[] = ["updated_at = GETDATE()"];
    const req = p.request().input("id", sql.NVarChar, id);
    if (updates.fileName !== undefined) {
      sets.push("file_name = @fileName");
      req.input("fileName", sql.NVarChar, updates.fileName);
    }
    if (updates.status !== undefined) {
      sets.push("status = @status");
      req.input("status", sql.NVarChar, updates.status);
    }
    if (updates.extractedText !== undefined) {
      sets.push("extracted_text = @extractedText");
      req.input("extractedText", sql.NVarChar, updates.extractedText);
    }
    if (updates.errorMessage !== undefined) {
      sets.push("error_message = @errorMessage");
      req.input("errorMessage", sql.NVarChar, updates.errorMessage);
    }
    await req.query(
      `UPDATE documents SET ${sets.join(", ")} WHERE id = @id`,
    );
    return (await this.getDocument(id))!;
  }

  async deleteDocument(id: string): Promise<void> {
    const p = await getPool();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM documents WHERE id = @id");
  }

  // Translation Memory operations
  async upsertTranslationMemory(
    memory: InsertTranslationMemory,
  ): Promise<TranslationMemory> {
    const p = await getPool();
    // Check if exists
    const existing = await p
      .request()
      .input("sourceText", sql.NVarChar, memory.sourceText)
      .input("targetLang", sql.NVarChar, memory.targetLanguageCode)
      .query(
        "SELECT * FROM translation_memory WHERE source_text = @sourceText AND target_language_code = @targetLang",
      );

    if (existing.recordset.length > 0) {
      const existingId = existing.recordset[0].id;
      await p
        .request()
        .input("id", sql.NVarChar, existingId)
        .input("translatedText", sql.NVarChar, memory.translatedText)
        .query(`
          UPDATE translation_memory
          SET translated_text = @translatedText,
              usage_count = usage_count + 1,
              last_used_at = GETDATE()
          WHERE id = @id
        `);
      const result = await p
        .request()
        .input("id", sql.NVarChar, existingId)
        .query("SELECT * FROM translation_memory WHERE id = @id");
      return mapTranslationMemory(result.recordset[0]);
    }

    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("sourceText", sql.NVarChar, memory.sourceText)
      .input("targetLang", sql.NVarChar, memory.targetLanguageCode)
      .input("translatedText", sql.NVarChar, memory.translatedText)
      .input("usageCount", sql.Int, memory.usageCount || 1)
      .query(`
        INSERT INTO translation_memory (id, source_text, target_language_code, translated_text, usage_count)
        VALUES (@id, @sourceText, @targetLang, @translatedText, @usageCount)
      `);
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM translation_memory WHERE id = @id");
    return mapTranslationMemory(result.recordset[0]);
  }

  async findTranslationMemorySuggestion(
    sourceText: string,
    targetLanguageCode: string,
  ): Promise<TranslationMemory | undefined> {
    const p = await getPool();
    const result = await p
      .request()
      .input("sourceText", sql.NVarChar, sourceText)
      .input("targetLang", sql.NVarChar, targetLanguageCode)
      .query(
        "SELECT TOP 1 * FROM translation_memory WHERE source_text = @sourceText AND target_language_code = @targetLang",
      );
    return result.recordset[0]
      ? mapTranslationMemory(result.recordset[0])
      : undefined;
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
      const p = await getPool();
      const idList = projectIds.map((_, i) => `@pid${i}`).join(",");
      const langReq = p.request();
      const keyReq = p.request();
      projectIds.forEach((pid, i) => {
        langReq.input(`pid${i}`, sql.NVarChar, pid);
        keyReq.input(`pid${i}`, sql.NVarChar, pid);
      });

      const langResult = await langReq.query(
        `SELECT COUNT(*) AS cnt FROM project_languages WHERE project_id IN (${idList})`,
      );
      const keyResult = await keyReq.query(
        `SELECT COUNT(*) AS cnt FROM translation_keys WHERE project_id IN (${idList})`,
      );
      totalLanguages = langResult.recordset[0]?.cnt || 0;
      totalKeys = keyResult.recordset[0]?.cnt || 0;
    }

    const p = await getPool();
    const activityResult = await p
      .request()
      .input("userId", sql.NVarChar, userId)
      .query(
        "SELECT COUNT(*) AS cnt FROM translations WHERE translated_by = @userId AND updated_at > DATEADD(day, -7, GETDATE())",
      );

    return {
      totalProjects: userProjects.length,
      totalLanguages,
      totalKeys,
      recentActivity: activityResult.recordset[0]?.cnt || 0,
    };
  }

  // Project hyperlink operations
  async createProjectHyperlink(
    hyperlink: InsertProjectHyperlink,
  ): Promise<ProjectHyperlink> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("projectId", sql.NVarChar, hyperlink.projectId)
      .input("label", sql.NVarChar, hyperlink.label)
      .input("url", sql.NVarChar, hyperlink.url)
      .query(
        "INSERT INTO project_hyperlinks (id, project_id, label, url) VALUES (@id, @projectId, @label, @url)",
      );
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM project_hyperlinks WHERE id = @id");
    if (!result.recordset[0])
      throw new Error("Failed to create hyperlink: no data returned");
    return mapProjectHyperlink(result.recordset[0]);
  }

  async getProjectHyperlinks(
    projectId: string,
  ): Promise<ProjectHyperlink[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("projectId", sql.NVarChar, projectId)
      .query(
        "SELECT * FROM project_hyperlinks WHERE project_id = @projectId ORDER BY created_at",
      );
    return result.recordset.map(mapProjectHyperlink);
  }

  async updateProjectHyperlink(
    id: string,
    updates: Partial<InsertProjectHyperlink>,
  ): Promise<ProjectHyperlink> {
    const p = await getPool();
    const sets: string[] = ["updated_at = GETDATE()"];
    const req = p.request().input("id", sql.NVarChar, id);
    if (updates.label !== undefined) {
      sets.push("label = @label");
      req.input("label", sql.NVarChar, updates.label);
    }
    if (updates.url !== undefined) {
      sets.push("url = @url");
      req.input("url", sql.NVarChar, updates.url);
    }
    await req.query(
      `UPDATE project_hyperlinks SET ${sets.join(", ")} WHERE id = @id`,
    );
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM project_hyperlinks WHERE id = @id");
    return mapProjectHyperlink(result.recordset[0]);
  }

  async deleteProjectHyperlink(id: string): Promise<void> {
    const p = await getPool();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM project_hyperlinks WHERE id = @id");
  }

  // Translation key hyperlink operations
  async createTranslationKeyHyperlink(
    hyperlink: InsertTranslationKeyHyperlink,
  ): Promise<TranslationKeyHyperlink> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("translationKeyId", sql.NVarChar, hyperlink.translationKeyId)
      .input("label", sql.NVarChar, hyperlink.label)
      .input("url", sql.NVarChar, hyperlink.url)
      .query(
        "INSERT INTO translation_key_hyperlinks (id, translation_key_id, label, url) VALUES (@id, @translationKeyId, @label, @url)",
      );
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM translation_key_hyperlinks WHERE id = @id");
    if (!result.recordset[0])
      throw new Error(
        "Failed to create translation key hyperlink: no data returned",
      );
    return mapTranslationKeyHyperlink(result.recordset[0]);
  }

  async getTranslationKeyHyperlinks(
    translationKeyId: string,
  ): Promise<TranslationKeyHyperlink[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("translationKeyId", sql.NVarChar, translationKeyId)
      .query(
        "SELECT * FROM translation_key_hyperlinks WHERE translation_key_id = @translationKeyId ORDER BY created_at",
      );
    return result.recordset.map(mapTranslationKeyHyperlink);
  }

  async updateTranslationKeyHyperlink(
    id: string,
    updates: Partial<InsertTranslationKeyHyperlink>,
  ): Promise<TranslationKeyHyperlink> {
    const p = await getPool();
    const sets: string[] = ["updated_at = GETDATE()"];
    const req = p.request().input("id", sql.NVarChar, id);
    if (updates.label !== undefined) {
      sets.push("label = @label");
      req.input("label", sql.NVarChar, updates.label);
    }
    if (updates.url !== undefined) {
      sets.push("url = @url");
      req.input("url", sql.NVarChar, updates.url);
    }
    await req.query(
      `UPDATE translation_key_hyperlinks SET ${sets.join(", ")} WHERE id = @id`,
    );
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("SELECT * FROM translation_key_hyperlinks WHERE id = @id");
    return mapTranslationKeyHyperlink(result.recordset[0]);
  }

  async deleteTranslationKeyHyperlink(id: string): Promise<void> {
    const p = await getPool();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM translation_key_hyperlinks WHERE id = @id");
  }

  // Translation key change history operations
  async createTranslationKeyChangeHistory(
    change: InsertTranslationKeyChangeHistory,
  ): Promise<TranslationKeyChangeHistory> {
    const p = await getPool();
    const id = crypto.randomUUID();
    await p
      .request()
      .input("id", sql.NVarChar, id)
      .input("translationKeyId", sql.NVarChar, change.translationKeyId)
      .input("userId", sql.NVarChar, change.userId)
      .input("action", sql.NVarChar, change.action)
      .input("field", sql.NVarChar, change.field || null)
      .input("oldValue", sql.NVarChar, change.oldValue || null)
      .input("newValue", sql.NVarChar, change.newValue || null)
      .query(`
        INSERT INTO translation_key_change_history (id, translation_key_id, user_id, action, field, old_value, new_value)
        VALUES (@id, @translationKeyId, @userId, @action, @field, @oldValue, @newValue)
      `);
    const result = await p
      .request()
      .input("id", sql.NVarChar, id)
      .query(
        "SELECT * FROM translation_key_change_history WHERE id = @id",
      );
    return mapChangeHistory(result.recordset[0]);
  }

  async getTranslationKeyChangeHistory(
    translationKeyId: string,
  ): Promise<TranslationKeyChangeHistory[]> {
    const p = await getPool();
    const result = await p
      .request()
      .input("translationKeyId", sql.NVarChar, translationKeyId)
      .query(
        "SELECT * FROM translation_key_change_history WHERE translation_key_id = @translationKeyId ORDER BY created_at DESC",
      );
    return result.recordset.map(mapChangeHistory);
  }
}
