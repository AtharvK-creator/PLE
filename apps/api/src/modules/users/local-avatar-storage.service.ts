import { Injectable, BadRequestException } from '@nestjs/common';
import { AvatarStorageService } from './avatar-storage.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalAvatarStorageService implements AvatarStorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'avatars');

  constructor() {
    // Ensure the uploads/avatars directory exists on startup
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadAvatar(userId: string, file: any): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

    if (!allowedExts.includes(ext)) {
      throw new BadRequestException('Invalid file type. Supported types: jpg, jpeg, png, webp');
    }

    // Clean up any existing avatars for this user first
    await this.cleanupUserAvatars(userId);

    const filename = `${userId}_${Date.now()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    // Save the file to local disk
    await fs.promises.writeFile(filePath, file.buffer);

    return `/uploads/avatars/${filename}`;
  }

  async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl) return;

    try {
      // Extract the filename from the URL path (e.g. /uploads/avatars/userId_timestamp.webp)
      const cleanUrl = avatarUrl.split('?')[0];
      const filename = path.basename(cleanUrl);
      const filePath = path.join(this.uploadDir, filename);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error('Failed to delete local avatar file:', error);
    }
  }

  /**
   * Helper to delete all files matching user's ID to prevent old files from lingering
   */
  private async cleanupUserAvatars(userId: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.uploadDir);
      for (const file of files) {
        if (file.startsWith(`${userId}_`)) {
          const filePath = path.join(this.uploadDir, file);
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup user avatars:', error);
    }
  }
}
