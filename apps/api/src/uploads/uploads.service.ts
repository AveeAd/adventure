import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';

const UPLOAD_URL_PREFIX = '/uploads/';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly configService: ConfigService) {}

  // Best-effort cleanup when a Media row referencing one of our own
  // uploads is deleted. Silently skips external URLs (a gallery photo can
  // still be added by pasting a link, same as before uploads existed) and
  // swallows ENOENT so a missing file never blocks the delete. Uploaded
  // URLs are absolute (see uploads.controller.ts's PUBLIC_API_URL prefix),
  // so this matches on the path rather than the full string.
  async deleteFile(url: string): Promise<void> {
    const pathname = this.extractUploadsPathname(url);
    if (!pathname) {
      return;
    }
    const uploadDir = this.configService.get<string>('UPLOAD_DIR') ?? '/app/uploads';
    const filename = pathname.slice(UPLOAD_URL_PREFIX.length);
    try {
      await unlink(join(uploadDir, filename));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to delete upload ${filename}: ${(err as Error).message}`);
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
