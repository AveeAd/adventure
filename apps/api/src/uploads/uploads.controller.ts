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
import { memoryStorage } from 'multer';
import { ImageProcessorService } from './image-processor.service';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Multer needs its options at decorator-evaluation time, before Nest's DI
// container is available, so this reads process.env directly - same
// defaults as config/config.module.ts's zod schema for UPLOAD_DIR /
// MAX_UPLOAD_SIZE_MB, just not routed through ConfigService.
const uploadDir = process.env.UPLOAD_DIR ?? '/app/uploads';
const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5);

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      // memoryStorage, not diskStorage: sharp needs the raw bytes to
      // process (resize/reorient/convert), and the pipeline writes its own
      // output files under a fresh id-named folder rather than keeping
      // whatever multer would have saved.
      storage: memoryStorage(),
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
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const publicApiUrl = this.configService.get<string>('PUBLIC_API_URL') ?? 'http://localhost:3000';
    const id = randomUUID();
    // An animated GIF only keeps its first frame through this pipeline -
    // sharp's default behavior without { animated: true }, which webp
    // re-encoding doesn't attempt to preserve either. Accepted tradeoff:
    // static-image resizing/reorientation/metadata-stripping matters far
    // more here than animated-GIF support for a hiking/wiki site's photo
    // uploads.
    const { urls } = await this.imageProcessor.process(file.buffer, id, uploadDir, publicApiUrl);
    return { url: urls.large, smallUrl: urls.small, mediumUrl: urls.medium, largeUrl: urls.large };
  }
}
