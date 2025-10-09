import { storage } from "./storage";
import type { Request, Response, NextFunction } from "express";

export type ProjectRole = "owner" | "developer" | "translator" | "reviewer";

// Permission levels for different roles
const ROLE_PERMISSIONS = {
  owner: ["read", "write", "delete", "manage_members", "manage_settings"],
  developer: ["read", "write", "delete"],
  translator: ["read", "write"],
  reviewer: ["read"],
};

// Get user's role in a project
export async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  // Check if user is the project owner
  const project = await storage.getProject(projectId);
  if (project?.ownerId === userId) {
    return "owner";
  }

  // Check if user is a project member
  const members = await storage.getProjectMembers(projectId);
  const member = members.find((m) => m.userId === userId);
  
  return member ? (member.role as ProjectRole) : null;
}

// Check if user has a specific permission
export async function hasPermission(
  userId: string,
  projectId: string,
  permission: string
): Promise<boolean> {
  const role = await getUserProjectRole(userId, projectId);
  if (!role) return false;
  
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

// Middleware to check project access
export function requireProjectAccess(permission: string = "read") {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.claims?.sub;
      const projectId = req.params.id || req.body.projectId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }

      const allowed = await hasPermission(userId, projectId, permission);
      if (!allowed) {
        return res.status(403).json({ 
          message: "You don't have permission to perform this action" 
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
}

// Check if user can access project (any role)
export async function canAccessProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const role = await getUserProjectRole(userId, projectId);
  return role !== null;
}
