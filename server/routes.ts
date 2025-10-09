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
} from "@shared/schema";
import { z } from "zod";

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

  // Language endpoints
  app.get("/api/projects/:id/languages", isAuthenticated, async (req, res) => {
    try {
      const languages = await storage.getProjectLanguages(req.params.id);
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  app.post("/api/projects/:id/languages", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProjectLanguageSchema.parse({
        ...req.body,
        projectId: req.params.id,
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

  // Translation key endpoints
  app.get("/api/projects/:id/keys", isAuthenticated, async (req, res) => {
    try {
      const keys = await storage.getProjectKeys(req.params.id);
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

  // Translation endpoints
  app.get("/api/projects/:id/translations", isAuthenticated, async (req, res) => {
    try {
      const translations = await storage.getProjectTranslations(req.params.id);
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
      // For MVP, return success with placeholder count
      res.json({ imported: 0, message: "Import functionality will be implemented" });
    } catch (error) {
      console.error("Error importing:", error);
      res.status(500).json({ message: "Failed to import translations" });
    }
  });

  // Export endpoint
  app.get("/api/projects/:id/export", isAuthenticated, async (req, res) => {
    try {
      const { format, languages } = req.query;

      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="translations.json"`);
        res.json({});
      } else {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="translations.csv"`);
        res.send("key,language_code,value,status\n");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      res.status(500).json({ message: "Failed to export translations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
