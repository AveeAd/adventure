import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Multer needs its options at decorator-evaluation time, before Nest's DI
// container is available, so this reads process.env directly - same
// defaults as config/config.module.ts's zod schema for UPLOAD_DIR /
// MAX_UPLOAD_SIZE_MB, just not routed through ConfigService.
const uploadDir = process.env.UPLOAD_DIR ?? '/app/uploads';
const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5);

@Controller('uploads')
export class UploadsController {
  constructor(private readonly configService: ConfigService) {}

  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(new BadRequestException('Only JPEG, PNG, WEBP, and GIF images are allowed'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: maxUploadSizeMb * 1024 * 1024 },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const publicApiUrl = this.configService.get<string>('PUBLIC_API_URL') ?? 'http://localhost:3000';
    return { url: `${publicApiUrl}/uploads/${file.filename}` };
  }
}
