import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rm, unlink } from 'fs/promises';
import { join } from 'path';

const UPLOAD_URL_PREFIX = '/uploads/';
// Matches the image-processor's `{uploadDir}/photos/{id}/{size}.webp`
// layout, capturing the id so the whole folder (all three size variants)
// can be removed in one go instead of just the one file the caller's `url`
// happens to point at.
const PHOTOS_FOLDER_PATTERN = /^photos\/([^/]+)\/(?:small|medium|large)\.webp$/;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly configService: ConfigService) {}

  // Best-effort cleanup when a Media row referencing one of our own
  // uploads is deleted. Silently skips external URLs (a gallery photo can
  // still be added by pasting a link, same as before uploads existed) and
  // swallows ENOENT so a missing file never blocks the delete. Uploaded
  // URLs are absolute (see uploads.controller.ts's PUBLIC_API_URL prefix),
  // so this matches on the path rather than the full string. Only needs
  // the row's single `url` (not smallUrl/mediumUrl/largeUrl too) because
  // for anything run through the image-processing pipeline, `url` already
  // points inside the same `photos/{id}/` folder the other two sizes live
  // in - deleting the folder gets all three no matter which size `url`
  // happened to be.
  async deleteFile(url: string): Promise<void> {
    const pathname = this.extractUploadsPathname(url);
    if (!pathname) {
      return;
    }
    const uploadDir = this.configService.get<string>('UPLOAD_DIR') ?? '/app/uploads';
    const relativePath = pathname.slice(UPLOAD_URL_PREFIX.length);
    const photosMatch = relativePath.match(PHOTOS_FOLDER_PATTERN);
    try {
      if (photosMatch) {
        await rm(join(uploadDir, 'photos', photosMatch[1]), { recursive: true, force: true });
      } else {
        // Pre-pipeline upload: a single flat file at `{uploadDir}/{filename}`.
        await unlink(join(uploadDir, relativePath));
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to delete upload ${relativePath}: ${(err as Error).message}`);
      }
    }
  }

  private extractUploadsPathname(url: string): string | null {
    try {
      const pathname = new URL(url).pathname;
      return pathname.startsWith(UPLOAD_URL_PREFIX) ? pathname : null;
    } catch {
      return url.startsWith(UPLOAD_URL_PREFIX) ? url : null;
    }
  }
}
