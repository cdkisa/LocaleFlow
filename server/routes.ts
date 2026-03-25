import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { RequestHandler } from "express";

const DEFAULT_USER_ID = "local-dev-user-id";

// No-auth middleware: always sets a default user
const isAuthenticated: RequestHandler = (req: any, _res, next) => {
  if (!req.user) {
    req.user = {
      claims: { sub: DEFAULT_USER_ID },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
  }
  next();
};
import {
  insertProjectSchema,
  insertProjectLanguageSchema,
  insertTranslationKeySchema,
  insertTranslationSchema,
  insertProjectMemberSchema,
  insertProjectHyperlinkSchema,
  insertTranslationKeyHyperlinkSchema,
  type Translation,
  type TranslationStatus,
  isValidTransition,
  getNextStatuses,
  TRANSLATION_STATUSES,
} from "@shared/schema";
import { z } from "zod";
import Papa from "papaparse";
import OpenAI from "openai";
import {
  getTranslationSuggestion,
  translationService,
} from "./translation/manager";
import type { TranslationProviderType } from "./translation/types";
import { cultureCodes } from "./cultureCodes";

function convertToNestedObject(
  flatObj: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (!(part in current)) {
        current[part] = {};
      } else if (typeof current[part] !== "object" || current[part] === null) {
        current[part] = {};
      }

      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    if (typeof current[lastPart] === "object" && current[lastPart] !== null) {
      continue;
    }
    current[lastPart] = value;
  }

  return result;
}

// Helper function to log translation key changes
async function logTranslationKeyChange(
  translationKeyId: string,
  userId: string,
  action: "create" | "update" | "delete",
  field: string | null = null,
  oldValue: any = null,
  newValue: any = null
): Promise<void> {
  try {
    await storage.createTranslationKeyChangeHistory({
      translationKeyId,
      userId,
      action,
      field,
      oldValue: oldValue !== null ? JSON.stringify(oldValue) : null,
      newValue: newValue !== null ? JSON.stringify(newValue) : null,
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error("Error logging translation key change:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          email: "dev@localhost",
          firstName: "Local",
          lastName: "Developer",
          profileImageUrl: null,
        });
      }

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

  // Culture codes endpoint for autocomplete
  app.get("/api/culture-codes", isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      let filteredCodes = cultureCodes;

      // Apply search filter if provided
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        filteredCodes = cultureCodes.filter(
          (item) =>
            item.code.toLowerCase().includes(searchLower) ||
            item.name.toLowerCase().includes(searchLower)
        );
      }

      res.json(filteredCodes);
    } catch (error) {
      console.error("Error fetching culture codes:", error);
      res.status(500).json({ message: "Failed to fetch culture codes" });
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
        keys = keys.filter(
          (key) =>
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
      const userId = req.user.claims.sub;
      const validatedData = insertTranslationKeySchema.parse(req.body);
      const key = await storage.createTranslationKey(validatedData);
      
      // Log creation
      await logTranslationKeyChange(
        key.id,
        userId,
        "create",
        null,
        null,
        validatedData
      );
      
      res.json(key);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating key:", error);
      res.status(500).json({ message: "Failed to create key" });
    }
  });

  // AI description suggestion endpoint for translation keys (must be before /:id route)
  app.post(
    "/api/translation-keys/:id/suggest-description",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const keyId = req.params.id;

        // Get the translation key
        const translationKey = await storage.getTranslationKey(keyId);
        if (!translationKey) {
          return res.status(404).json({ message: "Translation key not found" });
        }

        // Get translations for this key to provide context
        const translations = await storage.getProjectTranslations(
          translationKey.projectId
        );
        const keyTranslations = translations.filter(
          (t) => t.keyId === keyId && t.value && t.value.trim()
        );

        // Use TranslationServiceManager to generate description suggestion
        try {
          // Get OpenAI provider from TranslationServiceManager
          const openaiProvider = translationService.getProvider("openai");

          // Check if it's an OpenAIProvider (has generateDescription method)
          if (
            typeof (openaiProvider as any).generateDescription !== "function"
          ) {
            return res.status(503).json({
              message:
                "OpenAI provider not available for description generation",
            });
          }

          // Build context from translations
          const translationContext = keyTranslations
            .slice(0, 3)
            .map((t) => t.value)
            .join(", ");

          // Use the OpenAI provider's generateDescription method
          const suggestion = await (openaiProvider as any).generateDescription(
            translationKey.key,
            translationContext || undefined
          );

          if (!suggestion) {
            return res.status(500).json({
              message: "Failed to generate description suggestion",
            });
          }

          res.json({ suggestion });
        } catch (error: any) {
          console.error("Error generating description:", error);
          return res.status(500).json({
            message:
              error.message || "Failed to generate description suggestion",
          });
        }
      } catch (error) {
        console.error("Error suggesting description:", error);
        res.status(500).json({ message: "Failed to suggest description" });
      }
    }
  );

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

  app.get("/api/translation-keys/:id/change-history", isAuthenticated, async (req, res) => {
    try {
      const keyId = req.params.id;
      
      // Verify the key exists
      const key = await storage.getTranslationKey(keyId);
      if (!key) {
        return res.status(404).json({ message: "Key not found" });
      }
      
      const changeHistory = await storage.getTranslationKeyChangeHistory(keyId);
      
      // Enrich with user information
      const enrichedHistory = await Promise.all(
        changeHistory.map(async (change) => {
          const user = await storage.getUser(change.userId);
          return {
            ...change,
            user: user
              ? {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                }
              : null,
          };
        })
      );
      
      res.json(enrichedHistory);
    } catch (error) {
      console.error("Error fetching change history:", error);
      res.status(500).json({ message: "Failed to fetch change history" });
    }
  });

  app.patch("/api/translation-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const keyId = req.params.id;
      
      // Get the old key values before updating
      const oldKey = await storage.getTranslationKey(keyId);
      if (!oldKey) {
        return res.status(404).json({ message: "Key not found" });
      }
      
      const updates = req.body;
      const key = await storage.updateTranslationKey(keyId, updates);
      
      // Log changes for each field that was updated
      const fieldsToTrack = ["key", "description", "tags", "imageUrls"];
      for (const field of fieldsToTrack) {
        if (field in updates) {
          const oldVal = oldKey[field as keyof typeof oldKey];
          const newVal = updates[field];
          
          // Only log if the value actually changed
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            await logTranslationKeyChange(
              keyId,
              userId,
              "update",
              field,
              oldVal,
              newVal
            );
          }
        }
      }
      
      res.json(key);
    } catch (error) {
      console.error("Error updating key:", error);
      res.status(500).json({ message: "Failed to update key" });
    }
  });

  app.delete("/api/translation-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const keyId = req.params.id;
      
      // Get the key before deleting to log it
      const key = await storage.getTranslationKey(keyId);
      
      await storage.deleteTranslationKey(keyId);
      
      // Log deletion
      if (key) {
        await logTranslationKeyChange(
          keyId,
          userId,
          "delete",
          null,
          key,
          null
        );
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting key:", error);
      res.status(500).json({ message: "Failed to delete key" });
    }
  });

  // Add/update images for a translation key
  app.post(
    "/api/translation-keys/:id/images",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const keyId = req.params.id;
        const { uploadUrl } = req.body;

        if (!uploadUrl || typeof uploadUrl !== "string") {
          return res.status(400).json({ message: "uploadUrl is required" });
        }

        // Get the translation key to verify it exists and user has access
        const translationKey = await storage.getTranslationKey(keyId);
        if (!translationKey) {
          return res.status(404).json({ message: "Translation key not found" });
        }

        // Verify user has access to the project
        const project = await storage.getProject(translationKey.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // Check permissions (owner or developer)
        const members = await storage.getProjectMembers(
          translationKey.projectId
        );
        const userMember = members.find((m) => m.userId === userId);
        const isOwner = project.ownerId === userId;
        const isDeveloper = userMember?.role === "developer";

        if (!isOwner && !isDeveloper) {
          return res.status(403).json({
            message:
              "You don't have permission to add images to this translation key",
          });
        }

        let downloadUrl: string;

        const { LocalStorageService } = await import("./localStorage");
        const localStorageService = new LocalStorageService();
        const storagePath =
          localStorageService.normalizeObjectEntityPath(uploadUrl);
        await localStorageService.trySetObjectEntityAclPolicy(uploadUrl, {
          owner: userId,
          visibility: "private",
        });
        downloadUrl = storagePath;

        // Add the image URL to the translation key
        const currentImageUrls = (translationKey.imageUrls as string[]) || [];
        const updatedImageUrls = [...currentImageUrls, downloadUrl];

        const updated = await storage.updateTranslationKey(keyId, {
          imageUrls: updatedImageUrls,
        });

        // Log the change
        await logTranslationKeyChange(
          keyId,
          userId,
          "update",
          "imageUrls",
          currentImageUrls,
          updatedImageUrls
        );

        res.json(updated);
      } catch (error) {
        console.error("Error adding image to translation key:", error);
        res.status(500).json({ message: "Failed to add image" });
      }
    }
  );

  // Remove an image from a translation key
  app.delete(
    "/api/translation-keys/:id/images",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const keyId = req.params.id;
        const { imageUrl } = req.body;

        if (!imageUrl || typeof imageUrl !== "string") {
          return res.status(400).json({ message: "imageUrl is required" });
        }

        // Get the translation key
        const translationKey = await storage.getTranslationKey(keyId);
        if (!translationKey) {
          return res.status(404).json({ message: "Translation key not found" });
        }

        // Verify user has access
        const project = await storage.getProject(translationKey.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        const members = await storage.getProjectMembers(
          translationKey.projectId
        );
        const userMember = members.find((m) => m.userId === userId);
        const isOwner = project.ownerId === userId;
        const isDeveloper = userMember?.role === "developer";

        if (!isOwner && !isDeveloper) {
          return res.status(403).json({
            message:
              "You don't have permission to remove images from this translation key",
          });
        }

        // Remove the image URL
        const currentImageUrls = (translationKey.imageUrls as string[]) || [];
        const updatedImageUrls = currentImageUrls.filter(
          (url) => url !== imageUrl
        );

        const updated = await storage.updateTranslationKey(keyId, {
          imageUrls: updatedImageUrls,
        });

        // Log the change
        await logTranslationKeyChange(
          keyId,
          userId,
          "update",
          "imageUrls",
          currentImageUrls,
          updatedImageUrls
        );

        res.json(updated);
      } catch (error) {
        console.error("Error removing image from translation key:", error);
        res.status(500).json({ message: "Failed to remove image" });
      }
    }
  );

  // Global search endpoint across keys and translations
  app.get("/api/projects/:id/search", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== "string") {
        return res
          .status(400)
          .json({ message: "Search query 'q' is required" });
      }

      const searchLower = q.toLowerCase();

      // Search across translation keys
      const keys = await storage.getProjectKeys(req.params.id);
      const matchingKeys = keys.filter(
        (key) =>
          key.key.toLowerCase().includes(searchLower) ||
          key.description?.toLowerCase().includes(searchLower)
      );

      // Search across translations
      const translations = await storage.getProjectTranslations(req.params.id);
      const matchingTranslations = translations.filter((t) =>
        t.value.toLowerCase().includes(searchLower)
      );

      // Get unique key IDs from matching translations
      const keyIdsFromTranslations = new Set(
        matchingTranslations.map((t) => t.keyId)
      );
      const additionalKeys = keys.filter(
        (k) =>
          keyIdsFromTranslations.has(k.id) &&
          !matchingKeys.find((mk) => mk.id === k.id)
      );

      res.json({
        keys: matchingKeys,
        translations: matchingTranslations,
        additionalKeys,
        totalResults: matchingKeys.length + matchingTranslations.length,
      });
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Failed to search" });
    }
  });

  // Translation endpoints with filtering
  app.get(
    "/api/projects/:id/translations",
    isAuthenticated,
    async (req, res) => {
      try {
        const { keyId, languageId, status, search } = req.query;
        let translations = await storage.getProjectTranslations(req.params.id);

        // Apply filters if provided
        if (keyId && typeof keyId === "string") {
          translations = translations.filter((t) => t.keyId === keyId);
        }

        if (languageId && typeof languageId === "string") {
          translations = translations.filter(
            (t) => t.languageId === languageId
          );
        }

        if (status && typeof status === "string") {
          translations = translations.filter((t) => t.status === status);
        }

        // Apply search filter across translation values
        if (search && typeof search === "string") {
          const searchLower = search.toLowerCase();
          translations = translations.filter((t) =>
            t.value.toLowerCase().includes(searchLower)
          );
        }

        res.json(translations);
      } catch (error) {
        console.error("Error fetching translations:", error);
        res.status(500).json({ message: "Failed to fetch translations" });
      }
    }
  );

  // Get all translations for a key with language codes (for cross-project copy)
  app.get("/api/translation-keys/:id/translations-with-languages", isAuthenticated, async (req: any, res) => {
    try {
      const keyId = req.params.id;
      const key = await storage.getTranslationKey(keyId);
      if (!key) {
        return res.status(404).json({ message: "Key not found" });
      }
      const projectTranslations = await storage.getProjectTranslations(key.projectId);
      const keyTranslations = projectTranslations.filter(t => t.keyId === keyId);
      const languages = await storage.getProjectLanguages(key.projectId);
      const langMap = new Map(languages.map(l => [l.id, l]));

      const result = keyTranslations.map(t => {
        const lang = langMap.get(t.languageId);
        return {
          languageCode: lang?.languageCode || "",
          value: t.value,
          status: t.status,
        };
      }).filter(t => t.languageCode);

      res.json(result);
    } catch (error) {
      console.error("Error getting key translations:", error);
      res.status(500).json({ message: "Failed to get key translations" });
    }
  });

  app.get("/api/translations/search", isAuthenticated, async (req: any, res) => {
    try {
      const q = req.query.q as string;
      const excludeProjectId = req.query.excludeProjectId as string;
      if (!q || !excludeProjectId) {
        return res.status(400).json({ message: "q and excludeProjectId are required" });
      }
      const results = await storage.searchTranslationsAcrossProjects(q, excludeProjectId);
      res.json({ results });
    } catch (error) {
      console.error("Error searching translations:", error);
      res.status(500).json({ message: "Failed to search translations" });
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

      // Enforce status state machine if status is being changed
      if (req.body.status) {
        const newStatus = req.body.status as TranslationStatus;
        if (!TRANSLATION_STATUSES.includes(newStatus)) {
          return res.status(400).json({
            message: `Invalid status '${newStatus}'. Must be one of: ${TRANSLATION_STATUSES.join(", ")}`,
          });
        }

        const existing = await storage.getTranslation(req.params.id);
        if (!existing) {
          return res.status(404).json({ message: "Translation not found" });
        }

        const currentStatus = existing.status as TranslationStatus;
        if (!isValidTransition(currentStatus, newStatus)) {
          return res.status(400).json({
            message: `Invalid status transition: '${currentStatus}' → '${newStatus}'. Allowed transitions from '${currentStatus}': ${
              getNextStatuses(currentStatus).join(", ") || "none"
            }`,
          });
        }
      }

      const updates = {
        ...req.body,
        translatedBy: userId,
      };
      const translation = await storage.updateTranslation(
        req.params.id,
        updates
      );

      // If translation is approved, add to translation memory
      if (translation.status === "approved" && translation.value) {
        try {
          // Get translation key to find project
          const translationKey = await storage.getTranslationKey(
            translation.keyId
          );
          if (translationKey) {
            // Get languages to find source language
            const languages = await storage.getProjectLanguages(
              translationKey.projectId
            );
            const sourceLang = languages.find((l) => l.isDefault);
            const targetLang = languages.find(
              (l) => l.id === translation.languageId
            );

            if (sourceLang && targetLang) {
              // Get source translation
              const allTranslations = await storage.getProjectTranslations(
                translationKey.projectId
              );
              const sourceTranslation = allTranslations.find(
                (t) =>
                  t.keyId === translation.keyId &&
                  t.languageId === sourceLang.id
              );

              if (sourceTranslation && sourceTranslation.value) {
                // Add to translation memory
                await storage.upsertTranslationMemory({
                  sourceText: sourceTranslation.value,
                  targetLanguageCode: targetLang.languageCode,
                  translatedText: translation.value,
                  usageCount: 1,
                  lastUsedAt: new Date(),
                });
              }
            }
          }
        } catch (memoryError) {
          // Log but don't fail the request if translation memory update fails
          console.error("Error updating translation memory:", memoryError);
        }
      }

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

  // Translation memory suggestion endpoint
  app.get(
    "/api/translation-memory/suggest",
    isAuthenticated,
    async (req, res) => {
      try {
        const { sourceText, targetLanguageCode } = req.query;

        if (!sourceText || !targetLanguageCode) {
          return res.status(400).json({
            message: "sourceText and targetLanguageCode are required",
          });
        }

        const suggestion = await storage.findTranslationMemorySuggestion(
          sourceText as string,
          targetLanguageCode as string
        );

        res.json(suggestion || null);
      } catch (error) {
        console.error("Error finding translation memory suggestion:", error);
        res
          .status(500)
          .json({ message: "Failed to find translation memory suggestion" });
      }
    }
  );

  // Get available translation providers
  app.get(
    "/api/translation-providers",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const providers = translationService.getAvailableProviders();
        res.json({ providers });
      } catch (error) {
        console.error("Error getting translation providers:", error);
        res
          .status(500)
          .json({ message: "Failed to get translation providers" });
      }
    }
  );

  // AI translation suggestion endpoint
  app.post(
    "/api/translations/:id/ai-suggest",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const translationId = req.params.id;

        // Get the translation
        const translation = await storage.getTranslation(translationId);
        if (!translation) {
          return res.status(404).json({ message: "Translation not found" });
        }

        // Get the translation key details
        const translationKey = await storage.getTranslationKey(
          translation.keyId
        );
        if (!translationKey) {
          return res.status(404).json({ message: "Translation key not found" });
        }

        // Get project languages to find source and target
        const languages = await storage.getProjectLanguages(
          translationKey.projectId
        );
        const targetLanguage = languages.find(
          (l) => l.id === translation.languageId
        );
        if (!targetLanguage) {
          return res.status(404).json({ message: "Target language not found" });
        }

        // Find source language (prefer default, fallback to first language)
        const defaultLang = languages.find((l) => l.isDefault);
        const sourceLang =
          defaultLang || languages.find((l) => l.id !== translation.languageId);
        if (!sourceLang) {
          return res.status(400).json({
            message:
              "No source language found. Please add at least one other language to the project.",
          });
        }

        // Get all translations for this key to find source text
        const allTranslations = await storage.getProjectTranslations(
          translationKey.projectId
        );
        const sourceTranslation = allTranslations.find(
          (t) => t.keyId === translation.keyId && t.languageId === sourceLang.id
        );

        if (!sourceTranslation) {
          return res.status(400).json({
            message: `No translation found for source language (${sourceLang.languageName}). Please add a translation in the source language first.`,
          });
        }

        // Get provider from query parameter or body, default to undefined (uses default provider)
        const providerType = (req.query.provider || req.body.provider) as
          | TranslationProviderType
          | undefined;

        // Get AI suggestion
        const suggestion = await getTranslationSuggestion(
          {
            keyName: translationKey.key,
            description: translationKey.description || undefined,
            sourceText: sourceTranslation.value,
            sourceLangName: sourceLang.languageName,
            targetLangName: targetLanguage.languageName,
            sourceLanguageCode: sourceLang.languageCode,
            targetLanguageCode: targetLanguage.languageCode,
          },
          providerType
        );

        res.json({ suggestion });
      } catch (error) {
        console.error("Error getting AI suggestion:", error);
        res.status(500).json({ message: "Failed to get AI suggestion" });
      }
    }
  );

  // Batch pre-translate endpoint
  app.post("/api/projects/:id/pre-translate", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.claims.sub;
      const { languageId } = req.body;

      if (!languageId) {
        return res.status(400).json({ message: "languageId is required" });
      }

      // Get project and verify it exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get all languages for the project
      const languages = await storage.getProjectLanguages(projectId);
      const targetLanguage = languages.find(l => l.id === languageId);
      if (!targetLanguage) {
        return res.status(404).json({ message: "Target language not found" });
      }

      // Find the default (source) language
      const defaultLang = languages.find(l => l.isDefault);
      if (!defaultLang) {
        return res.status(400).json({ message: "No default language set for this project" });
      }

      if (targetLanguage.id === defaultLang.id) {
        return res.status(400).json({ message: "Cannot pre-translate the default language" });
      }

      // Get all keys and existing translations
      const keys = await storage.getProjectKeys(projectId);
      const allTranslations = await storage.getProjectTranslations(projectId);

      // Build lookup maps
      const translationMap = new Map(
        allTranslations.map(t => [`${t.keyId}:${t.languageId}`, t])
      );

      let translated = 0;
      let skipped = 0;
      let errors = 0;

      for (const key of keys) {
        try {
          // Check if target translation already exists and has a non-empty value
          const existingTranslation = translationMap.get(`${key.id}:${languageId}`);
          if (existingTranslation && existingTranslation.value && existingTranslation.value.trim()) {
            skipped++;
            continue;
          }

          // Get the source text from the default language
          const sourceTranslation = translationMap.get(`${key.id}:${defaultLang.id}`);
          if (!sourceTranslation || !sourceTranslation.value || !sourceTranslation.value.trim()) {
            skipped++;
            continue;
          }

          // Get AI translation
          const suggestion = await getTranslationSuggestion({
            keyName: key.key,
            description: key.description || undefined,
            sourceText: sourceTranslation.value,
            sourceLangName: defaultLang.languageName,
            targetLangName: targetLanguage.languageName,
          });

          if (!suggestion || !suggestion.trim()) {
            errors++;
            continue;
          }

          // Create or update the translation with draft status
          if (existingTranslation) {
            await storage.updateTranslation(existingTranslation.id, {
              value: suggestion,
              status: "draft",
              translatedBy: userId,
            });
          } else {
            await storage.createTranslation({
              keyId: key.id,
              languageId,
              value: suggestion,
              status: "draft",
              translatedBy: userId,
            });
          }

          translated++;
        } catch (err) {
          console.error(`Pre-translate error for key ${key.key}:`, err);
          errors++;
        }
      }

      res.json({ translated, skipped, errors });
    } catch (error) {
      console.error("Error in pre-translate:", error);
      res.status(500).json({ message: "Failed to pre-translate" });
    }
  });

  // Language management endpoints
  app.post(
    "/api/projects/:id/languages",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const projectId = req.params.id;

        // Check if user has access to this project
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (project.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Only project owners can add languages" });
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
    }
  );

  app.put(
    "/api/projects/:id/languages/:languageId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const projectId = req.params.id;

        // Check if user has access to this project
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (project.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Only project owners can update languages" });
        }

        const language = await storage.updateLanguage(
          req.params.languageId,
          req.body
        );
        res.json(language);
      } catch (error) {
        console.error("Error updating language:", error);
        res.status(500).json({ message: "Failed to update language" });
      }
    }
  );

  app.post(
    "/api/projects/:id/languages/:languageId/set-default",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const projectId = req.params.id;

        // Check if user has access to this project
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (project.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Only project owners can set default language" });
        }

        await storage.setDefaultLanguage(projectId, req.params.languageId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error setting default language:", error);
        res.status(500).json({ message: "Failed to set default language" });
      }
    }
  );

  app.delete(
    "/api/projects/:id/languages/:languageId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const projectId = req.params.id;

        // Check if user has access to this project
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        if (project.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Only project owners can delete languages" });
        }

        await storage.deleteLanguage(req.params.languageId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting language:", error);
        res.status(500).json({ message: "Failed to delete language" });
      }
    }
  );

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
            user: user
              ? {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  profileImageUrl: user.profileImageUrl,
                }
              : null,
          };
        })
      );

      res.json(membersWithDetails);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post(
    "/api/projects/:id/members",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const projectId = req.params.id;

        // Check if user is owner
        const project = await storage.getProject(projectId);
        if (!project || project.ownerId !== userId) {
          return res.status(403).json({
            message: "Only project owners can add members",
          });
        }

        // For simplicity, we'll use the email as userId for this MVP
        // In production, you'd look up the user by email first
        const { email, role } = req.body;

        if (!email || !role) {
          return res
            .status(400)
            .json({ message: "Email and role are required" });
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
    }
  );

  app.delete(
    "/api/projects/:id/members/:memberId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const projectId = req.params.id;

        // Check if user is owner
        const project = await storage.getProject(projectId);
        if (!project || project.ownerId !== userId) {
          return res.status(403).json({
            message: "Only project owners can remove members",
          });
        }

        await storage.removeMemberFromProject(req.params.memberId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ message: "Failed to remove member" });
      }
    }
  );

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { LocalStorageService } = await import("./localStorage");
      const localStorageService = new LocalStorageService();
      const uploadURL = await localStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Handle file uploads to local storage
  {
    const express = await import("express");

    // Handle OPTIONS preflight for CORS
    app.options("/api/objects/upload/:objectId", (req: any, res) => {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Max-Age", "86400");
      res.sendStatus(200);
    });

    app.put(
      "/api/objects/upload/:objectId",
      express.raw({ type: "*/*", limit: "50mb" }),
      isAuthenticated,
      async (req: any, res) => {
        try {
          const { LocalStorageService, LocalFile } = await import(
            "./localStorage"
          );
          const localStorageService = new LocalStorageService();
          const { join } = await import("path");
          const objectId = req.params.objectId;
          const fullPath = join(
            process.env.LOCAL_STORAGE_DIR || ".local-storage",
            "uploads",
            objectId
          );

          // Ensure directory exists
          const { mkdir } = await import("fs/promises");
          const { dirname } = await import("path");
          await mkdir(dirname(fullPath), { recursive: true });

          // If body is already parsed as Buffer (from express.raw()), use it directly
          // Otherwise, collect chunks from stream
          let fileData: Buffer | undefined;
          if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            fileData = req.body;
          } else {
            const chunks: Buffer[] = [];
            req.on("data", (chunk: Buffer) => {
              chunks.push(chunk);
            });

            await new Promise<void>((resolve, reject) => {
              req.on("end", () => {
                try {
                  fileData = Buffer.concat(chunks);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              });
              req.on("error", reject);
            });
          }

          if (!fileData || fileData.length === 0) {
            return res.status(400).json({ message: "No file data received" });
          }

          try {
            const file = new LocalFile(fullPath, {
              contentType:
                req.headers["content-type"] || "application/octet-stream",
            });
            await file.save(fileData);

            console.log(
              `File saved successfully: ${fullPath}, size: ${fileData.length} bytes`
            );

            // Generate ETag (MD5 hash) - Uppy's AwsS3 plugin requires this header
            const { createHash } = await import("crypto");
            const etag = createHash("md5").update(fileData).digest("hex");
            const etagWithQuotes = `"${etag}"`;

            // Return success with proper headers (S3-compatible response)
            // Uppy's AwsS3 plugin expects a 200 OK with ETag header for PUT requests
            // Set CORS headers first
            if (req.headers.origin) {
              res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
              res.setHeader("Access-Control-Allow-Credentials", "true");
              // Expose ETag header for CORS (required for Uppy to read it)
              res.setHeader("Access-Control-Expose-Headers", "ETag");
            }
            // Set ETag header (required by Uppy's AwsS3 plugin)
            res.setHeader("ETag", etagWithQuotes);
            // Send 200 OK with empty body - this is what S3 returns for successful PUT
            res.sendStatus(200);
          } catch (error) {
            console.error("Error saving file:", error);
            if (!res.headersSent) {
              res.status(500).json({ message: "Failed to save file" });
            }
          }
        } catch (error) {
          console.error("Error handling upload:", error);
          if (!res.headersSent) {
            res.status(500).json({ message: "Failed to handle upload" });
          }
        }
      }
    );
  }

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      const { LocalStorageService } = await import("./localStorage");
      const localStorageService = new LocalStorageService();
      const objectFile = await localStorageService.getObjectEntityFile(
        req.path
      );
      const canAccess = await localStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });

      if (!canAccess) {
        return res.sendStatus(401);
      }

      await localStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Error accessing object:", error);
      if (
        error.name === "ObjectNotFoundError" ||
        error.message === "Object not found"
      ) {
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

  app.post(
    "/api/projects/:id/documents",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const projectId = req.params.id;

        const project = await storage.getProject(projectId);
        if (!project || project.ownerId !== userId) {
          return res.status(403).json({
            message:
              "You don't have permission to upload documents to this project",
          });
        }

        const { fileName, fileType, fileSize, uploadUrl } = req.body;

        if (!fileName || !fileType || !fileSize || !uploadUrl) {
          return res.status(400).json({
            message: "fileName, fileType, fileSize, and uploadUrl are required",
          });
        }

        let storagePath: string;
        let objectFile: any;

        const { LocalStorageService } = await import("./localStorage");
        const localStorageService = new LocalStorageService();
        storagePath =
          localStorageService.normalizeObjectEntityPath(uploadUrl);

        await localStorageService.trySetObjectEntityAclPolicy(uploadUrl, {
          owner: userId,
          visibility: "private",
        });

        try {
          objectFile = await localStorageService.getObjectEntityFile(
            storagePath
          );
        } catch (error) {
          console.error("Error getting file object:", error);
        }

        const document = await storage.createDocument({
          projectId,
          fileName,
          fileType,
          fileSize,
          storagePath,
          status: "pending",
          uploadedBy: userId,
        });

        // Only parse if we have the file object
        if (!objectFile) {
          console.warn(
            "No file object available for parsing, document saved with storagePath:",
            storagePath
          );
          return res.json(document);
        }

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
                .filter((s) => s.trim().length > 0)
                .slice(0, 50);

              for (const sentence of sentences) {
                const keyName = sentence
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_|_$/g, "")
                  .slice(0, 100);

                const existingKey = await storage.getProjectKeys(projectId);
                const keyExists = existingKey.some((k) => k.key === keyName);

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
    }
  );

  app.delete(
    "/api/projects/:id/documents/:documentId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const projectId = req.params.id;
        const documentId = req.params.documentId;

        const project = await storage.getProject(projectId);
        if (!project || project.ownerId !== userId) {
          return res.status(403).json({
            message:
              "You don't have permission to delete documents from this project",
          });
        }

        await storage.deleteDocument(documentId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ message: "Failed to delete document" });
      }
    }
  );

  // AI Translation suggestion endpoint
  app.post("/api/translate/suggest", isAuthenticated, async (req, res) => {
    try {
      const { text, sourceLanguage, targetLanguage, provider } = req.body;

      if (!text || !targetLanguage) {
        return res
          .status(400)
          .json({ message: "Text and target language are required" });
      }

      // Find language names from culture codes
      const sourceCulture = sourceLanguage
        ? cultureCodes.find((c) => c.code === sourceLanguage)
        : cultureCodes.find((c) => c.code === "en"); // Default to English if not specified
      const targetCulture = cultureCodes.find((c) => c.code === targetLanguage);

      if (!targetCulture) {
        return res.status(400).json({
          message: `Target language code '${targetLanguage}' not found`,
        });
      }

      const sourceLangName = sourceCulture?.name || "English";
      const targetLangName = targetCulture.name;
      const sourceLangCode = sourceCulture?.code || "en";
      const targetLangCode = targetCulture.code;

      // Use TranslationServiceManager to perform translation
      const suggestion = await getTranslationSuggestion(
        {
          keyName: "translation.suggest", // Generic key name for standalone translations
          sourceText: text,
          sourceLangName,
          targetLangName,
          sourceLanguageCode: sourceLangCode,
          targetLanguageCode: targetLangCode,
        },
        provider as TranslationProviderType | undefined
      );

      res.json({
        translation: suggestion,
        confidence: 0.8, // Translation providers don't return confidence, using default
      });
    } catch (error: any) {
      console.error("Error suggesting translation:", error);
      res.status(500).json({
        message: error.message || "Failed to suggest translation",
      });
    }
  });

  // Import endpoint
  app.post(
    "/api/projects/:id/import",
    isAuthenticated,
    async (req: any, res) => {
      try {
        // Validate request body - accept any data type, validate structure later
        const importSchema = z.object({
          format: z.enum(["json", "csv"]),
          data: z.any(),
        });

        const validated = importSchema.safeParse(req.body);
        if (!validated.success) {
          console.error(
            "Import validation failed:",
            JSON.stringify(validated.error.errors, null, 2)
          );
          console.error("Received body:", JSON.stringify(req.body, null, 2));
          return res.status(400).json({
            message: "Invalid import data",
            errors: validated.error.errors,
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
        const languageMap = new Map(
          languages.map((l) => [l.languageCode, l.id])
        );

        const existingKeys = await storage.getProjectKeys(projectId);
        const keyMap = new Map(existingKeys.map((k) => [k.key, k]));

        const existingTranslations = await storage.getProjectTranslations(
          projectId
        );
        const translationMap = new Map(
          existingTranslations.map((t) => [`${t.keyId}:${t.languageId}`, t])
        );

        // Helper function to flatten nested objects into dot-notation keys
        const flattenObject = (
          obj: any,
          prefix = ""
        ): Record<string, string> => {
          const result: Record<string, string> = {};

          for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (
              typeof value === "object" &&
              !Array.isArray(value) &&
              value !== null
            ) {
              // Recursively flatten nested objects
              Object.assign(result, flattenObject(value, newKey));
            } else if (typeof value === "string") {
              // Add string values to result
              result[newKey] = value;
            }
            // Skip non-string primitive values (numbers, booleans, arrays, null)
          }

          return result;
        };

        // Helper to check if an object contains only nested string values (namespace structure)
        const isNamespaceStructure = (obj: any): boolean => {
          for (const value of Object.values(obj)) {
            if (
              typeof value === "object" &&
              !Array.isArray(value) &&
              value !== null
            ) {
              // Check if this nested object eventually leads to strings
              if (
                !Object.values(value).every(
                  (v) =>
                    typeof v === "string" ||
                    (typeof v === "object" &&
                      !Array.isArray(v) &&
                      v !== null &&
                      isNamespaceStructure(v))
                )
              ) {
                return false;
              }
            } else if (typeof value !== "string") {
              return false;
            }
          }
          return true;
        };

        if (format === "json") {
          // Validate JSON structure
          if (typeof data !== "object" || Array.isArray(data)) {
            return res.status(400).json({
              message:
                'Invalid JSON format. Expected object with key-value pairs or nested by language: { "key": "value" } or { "en": { "key": "value" } }',
            });
          }

          // Detect format type
          // 1. Flat format: { "home.title": "Welcome" } - all values are strings
          // 2. Namespace format: { "common": { "settings": "Settings" } } - nested objects with string leaves
          // 3. Language format: { "en": { "home.title": "Welcome" } } - language codes at top level
          const entries = Object.entries(data);
          const hasObjectValue = entries.some(
            ([_, value]) =>
              typeof value === "object" &&
              !Array.isArray(value) &&
              value !== null
          );

          let isNestedFormat = false;
          let shouldFlatten = false;

          if (hasObjectValue) {
            // Check if any top-level key matches a configured language code
            // If yes, it's a language-wrapped format; otherwise, check if it's namespace structure
            const hasLanguageCode = entries.some(
              ([key, value]) =>
                typeof value === "object" &&
                !Array.isArray(value) &&
                value !== null &&
                (languageMap.has(key) ||
                  cultureCodes.some(
                    (c) => c.code.toLowerCase() === key.toLowerCase()
                  ))
            );

            if (hasLanguageCode) {
              // At least one top-level key is a recognized language code
              isNestedFormat = true;
            } else if (isNamespaceStructure(data)) {
              // No language codes found, and structure leads to strings - it's a namespace format
              shouldFlatten = true;
            } else {
              // Has objects but doesn't match namespace pattern - treat as nested format
              // (This handles mixed metadata or malformed data)
              isNestedFormat = true;
            }
          }

          if (!isNestedFormat) {
            // Flat or namespace format - use default language
            const defaultLanguage = languages.find((l) => l.isDefault);
            if (!defaultLanguage) {
              return res.status(400).json({
                message:
                  "No default language set for this project. Please set a default language in project settings or use nested format with language codes.",
              });
            }

            // Flatten if needed (namespace structure), otherwise use as-is (flat format)
            const translations = shouldFlatten
              ? flattenObject(data)
              : (data as Record<string, string>);
            const languageId = defaultLanguage.id;

            for (const [key, value] of Object.entries(translations)) {
              if (typeof value !== "string") {
                warnings.push(`Non-string value for key '${key}' - skipped`);
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
                errors.push(
                  `Failed to import '${key}': ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
              }
            }
          } else {
            // Nested format - process by language code
            for (const [langCode, translations] of Object.entries(
              data as Record<string, any>
            )) {
              // Skip non-object top-level values (metadata, version numbers, etc.)
              if (
                typeof translations !== "object" ||
                Array.isArray(translations) ||
                translations === null
              ) {
                warnings.push(
                  `Skipping non-object top-level key '${langCode}' (metadata or invalid format)`
                );
                continue;
              }

              let languageId = languageMap.get(langCode);
              if (!languageId) {
                // Auto-create the language if it's a valid culture code
                const cultureMatch = cultureCodes.find(
                  (c) => c.code.toLowerCase() === langCode.toLowerCase()
                );
                if (cultureMatch) {
                  const newLang = await storage.addLanguageToProject({
                    projectId,
                    languageCode: cultureMatch.code,
                    languageName: cultureMatch.name,
                    isDefault: false,
                  });
                  languageId = newLang.id;
                  languageMap.set(cultureMatch.code, newLang.id);
                  // Also map the original case variant
                  if (cultureMatch.code !== langCode) {
                    languageMap.set(langCode, newLang.id);
                  }
                  warnings.push(
                    `Auto-created language '${cultureMatch.name}' (${cultureMatch.code}) from import`
                  );
                } else {
                  warnings.push(
                    `Unknown language code '${langCode}' - skipped all translations for this language`
                  );
                  continue;
                }
              }

              for (const [key, value] of Object.entries(translations)) {
                if (typeof value !== "string") {
                  warnings.push(
                    `Non-string value for key '${key}' in language '${langCode}' - skipped`
                  );
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
                  errors.push(
                    `Failed to import '${key}' for '${langCode}': ${
                      err instanceof Error ? err.message : String(err)
                    }`
                  );
                }
              }
            }
          }
        } else if (format === "csv") {
          // Parse CSV with proper quote/comma handling
          const csvData = typeof data === "string" ? data : String(data);
          const parsed = Papa.parse<{
            key: string;
            language_code: string;
            value: string;
            status?: string;
          }>(csvData, {
            header: true,
            skipEmptyLines: true,
          });

          if (parsed.errors.length > 0) {
            return res.status(400).json({
              message: "CSV parsing failed",
              errors: parsed.errors,
            });
          }

          // Validate CSV headers using metadata
          const requiredHeaders = ["key", "language_code", "value"];
          const headers = parsed.meta.fields || [];
          const missingHeaders = requiredHeaders.filter(
            (h) => !headers.includes(h)
          );
          if (missingHeaders.length > 0) {
            return res.status(400).json({
              message: `Missing required CSV headers: ${missingHeaders.join(
                ", "
              )}. Expected: ${requiredHeaders.join(", ")}`,
            });
          }

          // Handle empty CSV (header only)
          if (parsed.data.length === 0) {
            return res.json({
              imported: 0,
              message: "No data rows to import (CSV contains only headers)",
            });
          }

          // Process CSV rows
          for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i];
            const rowNum = i + 2; // +2 for header row and 0-index

            if (!row.key || !row.language_code || row.value === undefined) {
              errors.push(
                `Row ${rowNum}: Missing required fields (key, language_code, or value)`
              );
              continue;
            }

            const languageId = languageMap.get(row.language_code);
            if (!languageId) {
              warnings.push(
                `Row ${rowNum}: Unknown language code '${row.language_code}' - skipped`
              );
              continue;
            }

            // Validate status
            const validStatuses = ["draft", "in_review", "approved"];
            const status =
              row.status && validStatuses.includes(row.status)
                ? row.status
                : "draft";
            if (row.status && !validStatuses.includes(row.status)) {
              warnings.push(
                `Row ${rowNum}: Invalid status '${row.status}' - defaulted to 'draft'`
              );
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
              errors.push(
                `Row ${rowNum}: Failed to import - ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
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
                console.error(
                  `Failed to create draft translation for key ${keyId} in language ${language.languageCode}:`,
                  err
                );
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
            message: `Import completed with ${errors.length} error(s), ${importedCount} successful import(s), and ${draftCreatedCount} draft(s) auto-created`,
          });
        }

        res.json({
          imported: importedCount,
          draftsCreated: draftCreatedCount,
          warnings: warnings.length > 0 ? warnings : undefined,
          message:
            importedCount > 0
              ? `Successfully imported ${importedCount} translation(s)${
                  draftCreatedCount > 0
                    ? ` and auto-created ${draftCreatedCount} draft(s) for other languages`
                    : ""
                }${
                  warnings.length > 0
                    ? ` with ${warnings.length} warning(s)`
                    : ""
                }`
              : "No translations were imported",
        });
      } catch (error) {
        console.error("Error importing:", error);
        res.status(500).json({ message: "Failed to import translations" });
      }
    }
  );

  // Export endpoint
  // Project hyperlink endpoints
  app.get("/api/projects/:id/hyperlinks", isAuthenticated, async (req, res) => {
    try {
      const hyperlinks = await storage.getProjectHyperlinks(req.params.id);
      res.json(hyperlinks);
    } catch (error) {
      console.error("Error fetching hyperlinks:", error);
      res.status(500).json({ message: "Failed to fetch hyperlinks" });
    }
  });

  app.post(
    "/api/projects/:id/hyperlinks",
    isAuthenticated,
    async (req: any, res) => {
      console.log("=== HYPERLINK ROUTE HIT ===");
      console.log("Method:", req.method);
      console.log("Path:", req.path);
      console.log("Original URL:", req.originalUrl);
      console.log("Body:", req.body);
      try {
        console.log("Creating hyperlink with data:", req.body);
        const validatedData = insertProjectHyperlinkSchema.parse({
          ...req.body,
          projectId: req.params.id,
        });
        console.log("Validated data:", validatedData);
        const hyperlink = await storage.createProjectHyperlink(validatedData);
        console.log("Created hyperlink:", hyperlink);
        res.json(hyperlink);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Validation error creating hyperlink:", error.errors);
          return res.status(400).json({
            message: error.errors[0].message,
            errors: error.errors,
          });
        }
        console.error("Error creating hyperlink:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create hyperlink";
        console.error("Sending error response:", errorMessage);
        res.status(500).json({
          message: errorMessage,
        });
      }
    }
  );

  app.patch(
    "/api/projects/:id/hyperlinks/:hyperlinkId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const updates = req.body;
        const hyperlink = await storage.updateProjectHyperlink(
          req.params.hyperlinkId,
          updates
        );
        res.json(hyperlink);
      } catch (error) {
        console.error("Error updating hyperlink:", error);
        res.status(500).json({ message: "Failed to update hyperlink" });
      }
    }
  );

  app.delete(
    "/api/projects/:id/hyperlinks/:hyperlinkId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        await storage.deleteProjectHyperlink(req.params.hyperlinkId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting hyperlink:", error);
        res.status(500).json({ message: "Failed to delete hyperlink" });
      }
    }
  );

  // Translation key hyperlink endpoints
  app.get("/api/translation-keys/:keyId/hyperlinks", isAuthenticated, async (req, res) => {
    try {
      const hyperlinks = await storage.getTranslationKeyHyperlinks(req.params.keyId);
      res.json(hyperlinks);
    } catch (error) {
      console.error("Error fetching translation key hyperlinks:", error);
      res.status(500).json({ message: "Failed to fetch hyperlinks" });
    }
  });

  app.post(
    "/api/translation-keys/:keyId/hyperlinks",
    isAuthenticated,
    async (req: any, res) => {
      console.log("=== TRANSLATION KEY HYPERLINK ROUTE HIT ===");
      console.log("Method:", req.method);
      console.log("Path:", req.path);
      console.log("Body:", req.body);
      try {
        console.log("Creating translation key hyperlink with data:", req.body);
        const validatedData = insertTranslationKeyHyperlinkSchema.parse({
          ...req.body,
          translationKeyId: req.params.keyId,
        });
        console.log("Validated data:", validatedData);
        const hyperlink = await storage.createTranslationKeyHyperlink(validatedData);
        console.log("Created translation key hyperlink:", hyperlink);
        res.json(hyperlink);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Validation error creating translation key hyperlink:", error.errors);
          return res.status(400).json({
            message: error.errors[0].message,
            errors: error.errors,
          });
        }
        console.error("Error creating translation key hyperlink:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create translation key hyperlink";
        console.error("Sending error response:", errorMessage);
        res.status(500).json({
          message: errorMessage,
        });
      }
    }
  );

  app.patch(
    "/api/translation-keys/:keyId/hyperlinks/:hyperlinkId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const updates = req.body;
        const hyperlink = await storage.updateTranslationKeyHyperlink(
          req.params.hyperlinkId,
          updates
        );
        res.json(hyperlink);
      } catch (error) {
        console.error("Error updating translation key hyperlink:", error);
        res.status(500).json({ message: "Failed to update hyperlink" });
      }
    }
  );

  app.delete(
    "/api/translation-keys/:keyId/hyperlinks/:hyperlinkId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        await storage.deleteTranslationKeyHyperlink(req.params.hyperlinkId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting translation key hyperlink:", error);
        res.status(500).json({ message: "Failed to delete hyperlink" });
      }
    }
  );

  app.get("/api/projects/:id/export", isAuthenticated, async (req, res) => {
    try {
      const { format, languages: languageFilter, nested } = req.query;
      const projectId = req.params.id;

      const keys = await storage.getProjectKeys(projectId);
      const translations = await storage.getProjectTranslations(projectId);
      const languages = await storage.getProjectLanguages(projectId);

      const selectedLanguages = languageFilter
        ? languages.filter((l) =>
            (languageFilter as string).split(",").includes(l.id)
          )
        : languages;

      if (format === "json") {
        const useNested = nested === "true";
        const result: Record<
          string,
          Record<string, string> | Record<string, any>
        > = {};

        selectedLanguages.forEach((lang) => {
          const flatTranslations: Record<string, string> = {};
          keys.forEach((key) => {
            const translation = translations.find(
              (t: Translation) => t.keyId === key.id && t.languageId === lang.id
            );
            flatTranslations[key.key] = translation?.value || "";
          });

          result[lang.languageCode] = useNested
            ? convertToNestedObject(flatTranslations)
            : flatTranslations;
        });

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="translations.json"`
        );
        res.json(result);
      } else {
        // CSV format: key,language_code,value,status
        let csv = "key,language_code,value,status\n";

        keys.forEach((key) => {
          selectedLanguages.forEach((lang) => {
            const translation = translations.find(
              (t: Translation) => t.keyId === key.id && t.languageId === lang.id
            );
            const value = translation?.value || "";
            const status = translation?.status || "draft";
            csv += `${key.key},${lang.languageCode},"${value.replace(
              /"/g,
              '""'
            )}",${status}\n`;
          });
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="translations.csv"`
        );
        res.send(csv);
      }
    } catch (error) {
      console.error("Error exporting:", error);
      res.status(500).json({ message: "Failed to export translations" });
    }
  });

  // Find & Replace - Preview endpoint
  app.post("/api/projects/:id/find-preview", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { find, replace, languageId, caseSensitive } = req.body;

      if (!find || typeof find !== "string" || find.trim().length === 0) {
        return res.status(400).json({ message: "Find text is required" });
      }
      if (replace === undefined || replace === null || typeof replace !== "string") {
        return res.status(400).json({ message: "Replace text is required" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const allTranslations = await storage.getProjectTranslations(projectId);
      const keys = await storage.getProjectKeys(projectId);
      const languages = await storage.getProjectLanguages(projectId);

      const keyMap = new Map(keys.map(k => [k.id, k]));
      const langMap = new Map(languages.map(l => [l.id, l]));

      const matches: Array<{
        translationId: string;
        keyName: string;
        languageCode: string;
        oldValue: string;
        newValue: string;
      }> = [];

      for (const translation of allTranslations) {
        if (languageId && translation.languageId !== languageId) {
          continue;
        }

        const value = translation.value;
        if (!value) continue;

        const hasMatch = caseSensitive
          ? value.includes(find)
          : value.toLowerCase().includes(find.toLowerCase());

        if (hasMatch) {
          const key = keyMap.get(translation.keyId);
          const lang = langMap.get(translation.languageId);

          let newValue: string;
          if (caseSensitive) {
            newValue = value.split(find).join(replace);
          } else {
            const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            newValue = value.replace(regex, replace);
          }

          matches.push({
            translationId: translation.id,
            keyName: key?.key || "Unknown",
            languageCode: lang?.languageCode || "Unknown",
            oldValue: value,
            newValue,
          });

          if (matches.length >= 100) break;
        }
      }

      res.json(matches);
    } catch (error) {
      console.error("Error previewing find & replace:", error);
      res.status(500).json({ message: "Failed to preview find & replace" });
    }
  });

  // Find & Replace - Execute endpoint
  app.post("/api/projects/:id/find-replace", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { find, replace, languageId, caseSensitive } = req.body;

      if (!find || typeof find !== "string" || find.trim().length === 0) {
        return res.status(400).json({ message: "Find text is required" });
      }
      if (replace === undefined || replace === null || typeof replace !== "string") {
        return res.status(400).json({ message: "Replace text is required" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const allTranslations = await storage.getProjectTranslations(projectId);
      let updated = 0;

      for (const translation of allTranslations) {
        if (languageId && translation.languageId !== languageId) {
          continue;
        }

        const value = translation.value;
        if (!value) continue;

        const hasMatch = caseSensitive
          ? value.includes(find)
          : value.toLowerCase().includes(find.toLowerCase());

        if (hasMatch) {
          let newValue: string;
          if (caseSensitive) {
            newValue = value.split(find).join(replace);
          } else {
            const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            newValue = value.replace(regex, replace);
          }

          await storage.updateTranslation(translation.id, { value: newValue });
          updated++;
        }
      }

      res.json({ updated });
    } catch (error) {
      console.error("Error executing find & replace:", error);
      res.status(500).json({ message: "Failed to execute find & replace" });
    }
  });

  // Pseudo-localization endpoint
  app.post("/api/projects/:id/pseudo-localize", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.id;
      const { targetLanguageId } = req.body;

      if (!targetLanguageId) {
        return res.status(400).json({ message: "targetLanguageId is required" });
      }

      // Verify project exists and user has access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get languages and verify target language belongs to this project
      const languages = await storage.getProjectLanguages(projectId);
      const targetLanguage = languages.find(l => l.id === targetLanguageId);
      if (!targetLanguage) {
        return res.status(404).json({ message: "Target language not found in this project" });
      }

      // Find the default (source) language
      const defaultLanguage = languages.find(l => l.isDefault);
      if (!defaultLanguage) {
        return res.status(400).json({ message: "No default language configured for this project" });
      }

      if (targetLanguageId === defaultLanguage.id) {
        return res.status(400).json({ message: "Cannot pseudo-localize the default (source) language" });
      }

      // Get all keys and existing translations
      const keys = await storage.getProjectKeys(projectId);
      const allTranslations = await storage.getProjectTranslations(projectId);

      // Build lookup maps
      const sourceTranslationMap = new Map<string, string>();
      const targetTranslationMap = new Map<string, Translation>();

      for (const t of allTranslations) {
        if (t.languageId === defaultLanguage.id) {
          sourceTranslationMap.set(t.keyId, t.value);
        }
        if (t.languageId === targetLanguageId) {
          targetTranslationMap.set(t.keyId, t);
        }
      }

      const { pseudoLocalize } = await import("./pseudoLocalize");

      let generated = 0;

      for (const key of keys) {
        const sourceValue = sourceTranslationMap.get(key.id);
        if (!sourceValue || sourceValue.trim().length === 0) {
          continue; // Skip keys without source text
        }

        const pseudoValue = pseudoLocalize(sourceValue);
        const existingTarget = targetTranslationMap.get(key.id);

        if (existingTarget) {
          await storage.updateTranslation(existingTarget.id, {
            value: pseudoValue,
            status: "draft",
          });
        } else {
          await storage.createTranslation({
            keyId: key.id,
            languageId: targetLanguageId,
            value: pseudoValue,
            status: "draft",
            translatedBy: userId,
          });
        }

        generated++;
      }

      res.json({ generated });
    } catch (error) {
      console.error("Error pseudo-localizing:", error);
      res.status(500).json({ message: "Failed to pseudo-localize translations" });
    }
  });

  // Batch pre-translate endpoint
  app.post("/api/projects/:id/pre-translate", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.claims.sub;
      const { languageId } = req.body;

      if (!languageId) {
        return res.status(400).json({ message: "languageId is required" });
      }

      // Get project and verify it exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get all languages for the project
      const languages = await storage.getProjectLanguages(projectId);
      const targetLanguage = languages.find(l => l.id === languageId);
      if (!targetLanguage) {
        return res.status(404).json({ message: "Target language not found" });
      }

      // Find the default (source) language
      const defaultLang = languages.find(l => l.isDefault);
      if (!defaultLang) {
        return res.status(400).json({ message: "No default language set for this project" });
      }

      if (targetLanguage.id === defaultLang.id) {
        return res.status(400).json({ message: "Cannot pre-translate the default language" });
      }

      // Get all keys and existing translations
      const keys = await storage.getProjectKeys(projectId);
      const allTranslations = await storage.getProjectTranslations(projectId);

      // Build lookup maps
      const translationMap = new Map(
        allTranslations.map(t => [`${t.keyId}:${t.languageId}`, t])
      );

      let translated = 0;
      let skipped = 0;
      let errors = 0;

      for (const key of keys) {
        try {
          // Check if target translation already exists and has a non-empty value
          const existingTranslation = translationMap.get(`${key.id}:${languageId}`);
          if (existingTranslation && existingTranslation.value && existingTranslation.value.trim()) {
            skipped++;
            continue;
          }

          // Get the source text from the default language
          const sourceTranslation = translationMap.get(`${key.id}:${defaultLang.id}`);
          if (!sourceTranslation || !sourceTranslation.value || !sourceTranslation.value.trim()) {
            skipped++;
            continue;
          }

          // Get AI translation
          const suggestion = await getTranslationSuggestion({
            keyName: key.key,
            description: key.description || undefined,
            sourceText: sourceTranslation.value,
            sourceLangName: defaultLang.languageName,
            targetLangName: targetLanguage.languageName,
          });

          if (!suggestion || !suggestion.trim()) {
            errors++;
            continue;
          }

          // Create or update the translation with draft status
          if (existingTranslation) {
            await storage.updateTranslation(existingTranslation.id, {
              value: suggestion,
              status: "draft",
              translatedBy: userId,
            });
          } else {
            await storage.createTranslation({
              keyId: key.id,
              languageId,
              value: suggestion,
              status: "draft",
              translatedBy: userId,
            });
          }

          translated++;
        } catch (err) {
          console.error(`Pre-translate error for key ${key.key}:`, err);
          errors++;
        }
      }

      res.json({ translated, skipped, errors });
    } catch (error) {
      console.error("Error in pre-translate:", error);
      res.status(500).json({ message: "Failed to pre-translate" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
