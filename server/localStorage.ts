import { Response } from "express";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local storage directory
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || join(__dirname, "../.local-storage");

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
    await fs.mkdir(join(LOCAL_STORAGE_DIR, "uploads"), { recursive: true });
  } catch (error) {
    console.error("Error creating storage directory:", error);
  }
}

// Initialize on import
ensureStorageDir();

export class LocalFile {
  name: string;
  path: string;
  metadata: { contentType?: string; size?: number };

  constructor(path: string, metadata: { contentType?: string; size?: number } = {}) {
    this.path = path;
    this.name = path.split("/").pop() || "";
    this.metadata = metadata;
  }

  async exists(): Promise<[boolean]> {
    try {
      await fs.access(this.path);
      return [true];
    } catch {
      return [false];
    }
  }

  async getMetadata(): Promise<[{ contentType?: string; size?: number }]> {
    const stats = await fs.stat(this.path);
    return [{
      contentType: this.metadata.contentType || "application/octet-stream",
      size: stats.size,
    }];
  }

  createReadStream() {
    return createReadStream(this.path);
  }

  async download(callback: (err: Error | null, contents: Buffer) => void) {
    try {
      const contents = await fs.readFile(this.path);
      callback(null, contents);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)), Buffer.alloc(0));
    }
  }

  async save(data: Buffer | string) {
    await fs.mkdir(dirname(this.path), { recursive: true });
    await fs.writeFile(this.path, data);
  }
}

export class LocalStorageService {
  private storageDir: string;

  constructor() {
    this.storageDir = LOCAL_STORAGE_DIR;
  }

  getPrivateObjectDir(): string {
    return "local-storage";
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const fullPath = join(this.storageDir, "uploads", objectId);
    
    // Return a signed URL-like format that the client can use
    // In local dev, we'll use a special endpoint to handle uploads
    return `http://localhost:${process.env.PORT || 5000}/api/objects/upload/${objectId}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<LocalFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new Error("Object not found");
    }

    const entityId = objectPath.slice("/objects/".length);
    const fullPath = join(this.storageDir, entityId);
    
    const exists = await fs.access(fullPath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error("Object not found");
    }

    const stats = await fs.stat(fullPath);
    return new LocalFile(fullPath, {
      size: stats.size,
    });
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Handle both local:// paths and HTTP upload URLs
    if (rawPath.startsWith("local://")) {
      const localPath = rawPath.slice("local://".length);
      const relativePath = localPath.replace(this.storageDir, "").replace(/^\/+/, "");
      return `/objects/${relativePath}`;
    }
    
    // Handle HTTP upload URLs (from getObjectEntityUploadURL)
    if (rawPath.includes("/api/objects/upload/")) {
      const objectId = rawPath.split("/api/objects/upload/")[1];
      return `/objects/uploads/${objectId}`;
    }
    
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    _aclPolicy: any
  ): Promise<string> {
    // ACL is not needed for local storage
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity({
    userId: _userId,
    objectFile: _objectFile,
    requestedPermission: _requestedPermission,
  }: {
    userId?: string;
    objectFile: LocalFile;
    requestedPermission?: any;
  }): Promise<boolean> {
    // In local dev, allow all access
    return true;
  }

  async downloadObject(file: LocalFile, res: Response, cacheTtlSec: number = 3600): Promise<void> {
    try {
      const [metadata] = await file.getMetadata();
      
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": String(metadata.size || 0),
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
}

