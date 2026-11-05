import fs from 'fs';
import path from 'path';
import os from 'os';

export interface SharedFileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  itemCount?: number;
}

export class StorageManager {
  private static uploadDir: string = '';
  private static sharedItems: SharedFileItem[] = [];

  /**
   * Initializes storage location with priority:
   * 1. Explicit CLI argument / program option
   * 2. DROP_STORAGE_PATH from .env or environment variable
   * 3. User's OS Downloads folder (~/Downloads/OfflineDrop)
   * 4. Fallback to ./storage in current working directory
   */
  static init(customUploadDir?: string): void {
    let targetDir = customUploadDir || process.env.DROP_STORAGE_PATH;

    if (!targetDir || targetDir.trim() === '') {
      targetDir = path.join(os.homedir(), 'Downloads', 'OfflineDrop');
    }

    this.uploadDir = path.resolve(targetDir);

    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (err: any) {
      // If folder already exists or access check passes on real host, keep the user's chosen folder
      console.warn(`[i] Note regarding "${this.uploadDir}": ${err?.message || err}`);
    }
  }

  static getUploadDir(): string {
    return this.uploadDir;
  }

  static addSharedPath(targetPath: string): SharedFileItem | null {
    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) return null;

    const stats = fs.statSync(resolved);
    const id = Buffer.from(resolved).toString('base64url');
    const name = path.basename(resolved);

    let itemCount: number | undefined;
    if (stats.isDirectory()) {
      itemCount = fs.readdirSync(resolved).length;
    }

    const item: SharedFileItem = {
      id,
      name,
      path: resolved,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      itemCount,
    };

    const existingIndex = this.sharedItems.findIndex((i) => i.id === id);
    if (existingIndex >= 0) {
      this.sharedItems[existingIndex] = item;
    } else {
      this.sharedItems.push(item);
    }

    return item;
  }

  static getSharedItems(): SharedFileItem[] {
    return this.sharedItems;
  }

  static getSharedItemById(id: string): SharedFileItem | undefined {
    return this.sharedItems.find((i) => i.id === id);
  }

  static clearSharedItems(): void {
    this.sharedItems = [];
  }
}
