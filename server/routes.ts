import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertProjectSchema,
  insertProjectLanguageSchema,
  insertTranslationKeySchema,
  insertTranslationSchema,
  insertProjectMemberSchema,
  type Translation,
} from "@shared/schema";
import { z } from "zod";
import Papa from "papaparse";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes (Blueprint: javascript_log_in_with_replit)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Project endpoints
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { languages, ...projectData } = req.body;

      // Validate project data
      const validatedData = insertProjectSchema.parse({
        ...projectData,
        ownerId: userId,
      });

      const project = await storage.createProject(validatedData);

      // Add languages
      if (languages && Array.isArray(languages)) {
        for (let i = 0; i < languages.length; i++) {
          const lang = languages[i];
          await storage.addLanguageToProject({
            projectId: project.id,
            languageCode: lang.code,
            languageName: lang.name,
            isDefault: i === 0, // First language is default
          });
        }
      }

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updates = req.body;
      const project = await storage.updateProject(req.params.id, updates);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Language endpoints - GET only (other operations in Language Management section below)
  app.get("/api/projects/:id/languages", isAuthenticated, async (req, res) => {
    try {
      const languages = await storage.getProjectLanguages(req.params.id);
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  // Translation key endpoints with search/filter
  app.get("/api/projects/:id/keys", isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      let keys = await storage.getProjectKeys(req.params.id);
      
      // Apply search filter if provided
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        keys = keys.filter(key => 
          key.key.toLowerCase().includes(searchLower) ||
          key.description?.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(keys);
    } catch (error) {
      console.error("Error fetching keys:", error);
      res.status(500).json({ message: "Failed to fetch keys" });
    }
  });

  app.post("/api/translation-keys", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTranslationKeySchema.parse(req.body);
      const key = await storage.createTranslationKey(validatedData);
      res.json(key);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating key:", error);
      res.status(500).json({ message: "Failed to create key" });
    }
  });

  app.get("/api/translation-keys/:id", isAuthenticated, async (req, res) => {
    try {
      const key = await storage.getTranslationKey(req.params.id);
      if (!key) {
        return res.status(404).json({ message: "Key not found" });
      }
      res.json(key);
    } catch (error) {
      console.error("Error fetching key:", error);
      res.status(500).json({ message: "Failed to fetch key" });
    }
  });

  app.patch("/api/translation-keys/:id", isAuthenticated, async (req, res) => {
    try {
      const key = await storage.updateTranslationKey(req.params.id, req.body);
      res.json(key);
    } catch (error) {
      console.error("Error updating key:", error);
      res.status(500).json({ message: "Failed to update key" });
    }
  });

  app.delete("/api/translation-keys/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTranslationKey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting key:", error);
      res.status(500).json({ message: "Failed to delete key" });
    }
  });

  // Global search endpoint across keys and translations
  app.get("/api/projects/:id/search", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query 'q' is required" });
      }
      
      const searchLower = q.toLowerCase();
      
      // Search across translation keys
      const keys = await storage.getProjectKeys(req.params.id);
      const matchingKeys = keys.filter(key => 
        key.key.toLowerCase().includes(searchLower) ||
        key.description?.toLowerCase().includes(searchLower)
      );
      
      // Search across translations
      const translations = await storage.getProjectTranslations(req.params.id);
      const matchingTranslations = translations.filter(t => 
        t.value.toLowerCase().includes(searchLower)
      );
      
      // Get unique key IDs from matching translations
      const keyIdsFromTranslations = new Set(matchingTranslations.map(t => t.keyId));
      const additionalKeys = keys.filter(k => 
        keyIdsFromTranslations.has(k.id) && !matchingKeys.find(mk => mk.id === k.id)
      );
      
      res.json({
        keys: matchingKeys,
        translations: matchingTranslations,
        additionalKeys,
        totalResults: matchingKeys.length + matchingTranslations.length
      });
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Failed to search" });
    }
  });

  // Translation endpoints with filtering
  app.get("/api/projects/:id/translations", isAuthenticated, async (req, res) => {
    try {
      const { keyId, languageId, status, search } = req.query;
      let translations = await storage.getProjectTranslations(req.params.id);
      
      // Apply filters if provided
      if (keyId && typeof keyId === "string") {
        translations = translations.filter(t => t.keyId === keyId);
      }
      
      if (languageId && typeof languageId === "string") {
        translations = translations.filter(t => t.languageId === languageId);
      }
      
      if (status && typeof status === "string") {
        translations = translations.filter(t => t.status === status);
      }
      
      // Apply search filter across translation values
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        translations = translations.filter(t => 
          t.value.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(translations);
    } catch (error) {
      console.error("Error fetching translations:", error);
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });

  app.post("/api/translations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTranslationSchema.parse({
        ...req.body,
        translatedBy: userId,
      });

      const translation = await storage.createTranslation(validatedData);
      res.json(translation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating translation:", error);
      res.status(500).json({ message: "Failed to create translation" });
    }
  });

  app.get("/api/translations/:id", isAuthenticated, async (req, res) => {
    try {
      const translation = await storage.getTranslation(req.params.id);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      res.json(translation);
    } catch (error) {
      console.error("Error fetching translation:", error);
      res.status(500).json({ message: "Failed to fetch translation" });
    }
  });

  app.patch("/api/translations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = {
        ...req.body,
        translatedBy: userId,
      };
      const translation = await storage.updateTranslation(req.params.id, updates);
      res.json(translation);
    } catch (error) {
      console.error("Error updating translation:", error);
      res.status(500).json({ message: "Failed to update translation" });
    }
  });

  app.delete("/api/translations/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTranslation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting translation:", error);
      res.status(500).json({ message: "Failed to delete translation" });
    }
  });

  // Language management endpoints
  app.post("/api/projects/:id/languages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      
      // Check if user has access to this project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only project owners can add languages" });
      }
      
      const validatedData = insertProjectLanguageSchema.parse({
        ...req.body,
        projectId,
      });
      
      const language = await storage.addLanguageToProject(validatedData);
      res.json(language);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error adding language:", error);
      res.status(500).json({ message: "Failed to add language" });
    }
  });

  app.put("/api/projects/:id/languages/:languageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      
      // Check if user has access to this project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only project owners can update languages" });
      }
      
      const language = await storage.updateLanguage(req.params.languageId, req.body);
      res.json(language);
    } catch (error) {
      console.error("Error updating language:", error);
      res.status(500).json({ message: "Failed to update language" });
    }
  });

  app.post("/api/projects/:id/languages/:languageId/set-default", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      
      // Check if user has access to this project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only project owners can set default language" });
      }
      
      await storage.setDefaultLanguage(projectId, req.params.languageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default language:", error);
      res.status(500).json({ message: "Failed to set default language" });
    }
  });

  app.delete("/api/projects/:id/languages/:languageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      
      // Check if user has access to this project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.ownerId !== userId) {
        return res.status(403).json({ message: "Only project owners can delete languages" });
      }
      
      await storage.deleteLanguage(req.params.languageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting language:", error);
      res.status(500).json({ message: "Failed to delete language" });
    }
  });

  // Project member endpoints
  app.get("/api/projects/:id/members", isAuthenticated, async (req, res) => {
    try {
      const members = await storage.getProjectMembers(req.params.id);
      
      // Fetch user details for each member
      const membersWithDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: user ? {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
            } : null,
          };
        })
      );
      
      res.json(membersWithDetails);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post("/api/projects/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      
      // Check if user is owner
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ 
          message: "Only project owners can add members" 
        });
      }
      
      // For simplicity, we'll use the email as userId for this MVP
      // In production, you'd look up the user by email first
      const { email, role } = req.body;
      
      if (!email || !role) {
        return res.status(400).json({ message: "Email and role are required" });
      }
      
      const validatedData = insertProjectMemberSchema.parse({
        userId: email, // Using email as userId for MVP
        role,
        projectId,
      });
      
      const member = await storage.addMemberToProject(validatedData);
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error adding member:", error);
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  app.delete("/api/projects/:id/members/:memberId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      
      // Check if user is owner
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ 
          message: "Only project owners can remove members" 
        });
      }
      
      await storage.removeMemberFromProject(req.params.memberId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Document endpoints (Blueprint: javascript_object_storage)
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
      const { ObjectPermission } = await import("./objectAcl");
      const objectStorageService = new ObjectStorageService();
      
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(401);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Error accessing object:", error);
      if (error.name === "ObjectNotFoundError") {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/api/projects/:id/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getProjectDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/projects/:id/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ 
          message: "You don't have permission to upload documents to this project" 
        });
      }

      const { fileName, fileType, fileSize, uploadUrl } = req.body;
      
      if (!fileName || !fileType || !fileSize || !uploadUrl) {
        return res.status(400).json({ 
          message: "fileName, fileType, fileSize, and uploadUrl are required" 
        });
      }

      const { ObjectStorageService } = await import("./objectStorage");
      const { ObjectPermission } = await import("./objectAcl");
      const objectStorageService = new ObjectStorageService();
      
      const storagePath = objectStorageService.normalizeObjectEntityPath(uploadUrl);
      const objectFile = await objectStorageService.getObjectEntityFile(storagePath);
      
      await objectStorageService.trySetObjectEntityAclPolicy(uploadUrl, {
        owner: userId,
        visibility: "private",
      });

      const document = await storage.createDocument({
        projectId,
        fileName,
        fileType,
        fileSize,
        storagePath,
        status: "pending",
        uploadedBy: userId,
      });

      const { parseDocument } = await import("./documentParser");
      
      objectFile.download(async (err: Error | null, contents: Buffer) => {
        if (err) {
          console.error("Error downloading file for parsing:", err);
          await storage.updateDocument(document.id, {
            status: "failed",
            errorMessage: "Failed to download file for parsing",
          });
          return;
        }

        const parsed = await parseDocument(contents, fileType);
        
        if (parsed.error) {
          await storage.updateDocument(document.id, {
            status: "failed",
            errorMessage: parsed.error,
            extractedText: parsed.text,
          });
        } else {
          await storage.updateDocument(document.id, {
            status: "completed",
            extractedText: parsed.text,
          });
          
          if (parsed.text.trim()) {
            const sentences = parsed.text
              .split(/[.!?]\s+/)
              .filter(s => s.trim().length > 0)
              .slice(0, 50);

            for (const sentence of sentences) {
              const keyName = sentence
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_|_$/g, "")
                .slice(0, 100);
              
              const existingKey = await storage.getProjectKeys(projectId);
              const keyExists = existingKey.some(k => k.key === keyName);
              
              if (!keyExists) {
                await storage.createTranslationKey({
                  projectId,
                  key: keyName,
                  description: `From document: ${fileName}`,
                });
              }
            }
          }
        }
      });

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.delete("/api/projects/:id/documents/:documentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      const documentId = req.params.documentId;
      
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ 
          message: "You don't have permission to delete documents from this project" 
        });
      }

      await storage.deleteDocument(documentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // AI Translation suggestion endpoint
  app.post("/api/translate/suggest", isAuthenticated, async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;

      if (!text || !targetLanguage) {
        return res.status(400).json({ message: "Text and target language are required" });
      }

      // Simple passthrough for now - will integrate Google Translate API if available
      // For MVP, just return a placeholder response
      res.json({
        translation: `[${targetLanguage}] ${text}`,
        confidence: 0.8,
      });
    } catch (error) {
      console.error("Error suggesting translation:", error);
      res.status(500).json({ message: "Failed to suggest translation" });
    }
  });

  // Import endpoint
  app.post("/api/projects/:id/import", isAuthenticated, async (req: any, res) => {
    try {
      // Validate request body - accept any data type, validate structure later
      const importSchema = z.object({
        format: z.enum(["json", "csv"]),
        data: z.any(),
      });

      const validated = importSchema.safeParse(req.body);
      if (!validated.success) {
        console.error("Import validation failed:", JSON.stringify(validated.error.errors, null, 2));
        console.error("Received body:", JSON.stringify(req.body, null, 2));
        return res.status(400).json({ 
          message: "Invalid import data", 
          errors: validated.error.errors 
        });
      }

      const { format, data } = validated.data;
      const projectId = req.params.id;
      const userId = req.user.claims.sub;
      
      let importedCount = 0;
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Track keys that are actually touched during this import
      const touchedKeyIds = new Set<string>();
      
      // Pre-load project data into maps for O(1) lookups
      const languages = await storage.getProjectLanguages(projectId);
      const languageMap = new Map(languages.map(l => [l.languageCode, l.id]));
      
      const existingKeys = await storage.getProjectKeys(projectId);
      const keyMap = new Map(existingKeys.map(k => [k.key, k]));
      
      const existingTranslations = await storage.getProjectTranslations(projectId);
      const translationMap = new Map(
        existingTranslations.map(t => [`${t.keyId}:${t.languageId}`, t])
      );

      if (format === "json") {
        // Validate JSON structure
        if (typeof data !== "object" || Array.isArray(data)) {
          return res.status(400).json({ 
            message: "Invalid JSON format. Expected nested object: { \"en\": { \"key\": \"value\" } }" 
          });
        }

        // Process nested JSON format: { "en": { "key1": "value1" }, "fr": { "key1": "valeur1" } }
        for (const [langCode, translations] of Object.entries(data as Record<string, Record<string, string>>)) {
          const languageId = languageMap.get(langCode);
          if (!languageId) {
            warnings.push(`Unknown language code '${langCode}' - skipped all translations for this language`);
            continue;
          }

          if (typeof translations !== "object" || Array.isArray(translations)) {
            errors.push(`Invalid translations for language '${langCode}'. Expected object with key-value pairs`);
            continue;
          }

          for (const [key, value] of Object.entries(translations)) {
            if (typeof value !== "string") {
              warnings.push(`Non-string value for key '${key}' in language '${langCode}' - skipped`);
              continue;
            }

            try {
              // Get or create translation key
              let translationKey = keyMap.get(key);
              if (!translationKey) {
                translationKey = await storage.createTranslationKey({
                  projectId,
                  key,
                  description: null,
                });
                keyMap.set(key, translationKey);
              }

              // Create or update translation
              const lookupKey = `${translationKey.id}:${languageId}`;
              const existingTranslation = translationMap.get(lookupKey);

              if (existingTranslation) {
                await storage.updateTranslation(existingTranslation.id, {
                  value,
                  status: "draft",
                });
              } else {
                const newTranslation = await storage.createTranslation({
                  keyId: translationKey.id,
                  languageId,
                  value,
                  status: "draft",
                  translatedBy: userId,
                });
                translationMap.set(lookupKey, newTranslation);
              }
              
              // Track this key as touched during import
              touchedKeyIds.add(translationKey.id);
              importedCount++;
            } catch (err) {
              errors.push(`Failed to import '${key}' for '${langCode}': ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      } else if (format === "csv") {
        // Parse CSV with proper quote/comma handling
        const csvData = typeof data === "string" ? data : String(data);
        const parsed = Papa.parse<{ key: string; language_code: string; value: string; status?: string }>(csvData, {
          header: true,
          skipEmptyLines: true,
        });

        if (parsed.errors.length > 0) {
          return res.status(400).json({ 
            message: "CSV parsing failed", 
            errors: parsed.errors 
          });
        }

        // Validate CSV headers using metadata
        const requiredHeaders = ["key", "language_code", "value"];
        const headers = parsed.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          return res.status(400).json({ 
            message: `Missing required CSV headers: ${missingHeaders.join(", ")}. Expected: ${requiredHeaders.join(", ")}` 
          });
        }

        // Handle empty CSV (header only)
        if (parsed.data.length === 0) {
          return res.json({ 
            imported: 0,
            message: 'No data rows to import (CSV contains only headers)'
          });
        }

        // Process CSV rows
        for (let i = 0; i < parsed.data.length; i++) {
          const row = parsed.data[i];
          const rowNum = i + 2; // +2 for header row and 0-index

          if (!row.key || !row.language_code || row.value === undefined) {
            errors.push(`Row ${rowNum}: Missing required fields (key, language_code, or value)`);
            continue;
          }

          const languageId = languageMap.get(row.language_code);
          if (!languageId) {
            warnings.push(`Row ${rowNum}: Unknown language code '${row.language_code}' - skipped`);
            continue;
          }

          // Validate status
          const validStatuses = ["draft", "in_review", "approved"];
          const status = row.status && validStatuses.includes(row.status) ? row.status : "draft";
          if (row.status && !validStatuses.includes(row.status)) {
            warnings.push(`Row ${rowNum}: Invalid status '${row.status}' - defaulted to 'draft'`);
          }

          try {
            // Get or create translation key
            let translationKey = keyMap.get(row.key);
            if (!translationKey) {
              translationKey = await storage.createTranslationKey({
                projectId,
                key: row.key,
                description: null,
              });
              keyMap.set(row.key, translationKey);
            }

            // Create or update translation
            const lookupKey = `${translationKey.id}:${languageId}`;
            const existingTranslation = translationMap.get(lookupKey);

            if (existingTranslation) {
              await storage.updateTranslation(existingTranslation.id, {
                value: row.value,
                status: status as "draft" | "in_review" | "approved",
              });
            } else {
              const newTranslation = await storage.createTranslation({
                keyId: translationKey.id,
                languageId,
                value: row.value,
                status: status as "draft" | "in_review" | "approved",
                translatedBy: userId,
              });
              translationMap.set(lookupKey, newTranslation);
            }
            
            // Track this key as touched during import
            touchedKeyIds.add(translationKey.id);
            importedCount++;
          } catch (err) {
            errors.push(`Row ${rowNum}: Failed to import - ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }

      // Auto-create draft translations for all other languages
      // Only create drafts for keys that were actually touched during this import
      let draftCreatedCount = 0;
      
      for (const keyId of Array.from(touchedKeyIds)) {
        for (const language of languages) {
          const lookupKey = `${keyId}:${language.id}`;
          
          // If translation doesn't exist for this language, create a draft with empty value
          if (!translationMap.has(lookupKey)) {
            try {
              const newTranslation = await storage.createTranslation({
                keyId,
                languageId: language.id,
                value: "",
                status: "draft",
                translatedBy: userId,
              });
              translationMap.set(lookupKey, newTranslation);
              draftCreatedCount++;
            } catch (err) {
              console.error(`Failed to create draft translation for key ${keyId} in language ${language.languageCode}:`, err);
            }
          }
        }
      }

      // Return response with errors and warnings
      if (errors.length > 0) {
        return res.status(400).json({ 
          imported: importedCount,
          draftsCreated: draftCreatedCount,
          errors,
          warnings: warnings.length > 0 ? warnings : undefined,
          message: `Import completed with ${errors.length} error(s), ${importedCount} successful import(s), and ${draftCreatedCount} draft(s) auto-created`
        });
      }

      res.json({ 
        imported: importedCount,
        draftsCreated: draftCreatedCount,
        warnings: warnings.length > 0 ? warnings : undefined,
        message: importedCount > 0 
          ? `Successfully imported ${importedCount} translation(s)${draftCreatedCount > 0 ? ` and auto-created ${draftCreatedCount} draft(s) for other languages` : ''}${warnings.length > 0 ? ` with ${warnings.length} warning(s)` : ''}`
          : 'No translations were imported'
      });
    } catch (error) {
      console.error("Error importing:", error);
      res.status(500).json({ message: "Failed to import translations" });
    }
  });

  // Export endpoint
  app.get("/api/projects/:id/export", isAuthenticated, async (req, res) => {
    try {
      const { format, languages: languageFilter } = req.query;
      const projectId = req.params.id;

      const keys = await storage.getProjectKeys(projectId);
      const translations = await storage.getProjectTranslations(projectId);
      const languages = await storage.getProjectLanguages(projectId);

      const selectedLanguages = languageFilter 
        ? languages.filter(l => (languageFilter as string).split(",").includes(l.id))
        : languages;

      if (format === "json") {
        // Nested JSON format: { "en": { "key1": "value1" }, "fr": { "key1": "valeur1" } }
        const result: Record<string, Record<string, string>> = {};
        
        selectedLanguages.forEach(lang => {
          result[lang.languageCode] = {};
          keys.forEach(key => {
            const translation = translations.find(
              (t: Translation) => t.keyId === key.id && t.languageId === lang.id
            );
            result[lang.languageCode][key.key] = translation?.value || "";
          });
        });

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="translations.json"`);
        res.json(result);
      } else {
        // CSV format: key,language_code,value,status
        let csv = "key,language_code,value,status\n";
        
        keys.forEach(key => {
          selectedLanguages.forEach(lang => {
            const translation = translations.find(
              (t: Translation) => t.keyId === key.id && t.languageId === lang.id
            );
            const value = translation?.value || "";
            const status = translation?.status || "draft";
            csv += `${key.key},${lang.languageCode},"${value.replace(/"/g, '""')}",${status}\n`;
          });
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="translations.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error("Error exporting:", error);
      res.status(500).json({ message: "Failed to export translations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
