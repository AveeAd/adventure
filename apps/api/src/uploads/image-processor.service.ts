import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp, { type Sharp } from 'sharp';

// (name, target width) - height derives from the source aspect ratio.
// `fit: 'inside'` + `withoutEnlargement: true` (set per-call below) means a
// source narrower than a given width is left at its own size rather than
// upscaled, so "small"/"medium"/"large" are ceilings, not guarantees.
const SIZES: { name: 'small' | 'medium' | 'large'; width: number }[] = [
  { name: 'small', width: 400 },
  { name: 'medium', width: 800 },
  { name: 'large', width: 1600 },
];

export interface ProcessedImage {
  id: string;
  urls: Record<'small' | 'medium' | 'large', string>;
}

@Injectable()
export class ImageProcessorService {
  // Validates, auto-orients (reads the EXIF orientation tag, applies the
  // rotation, then drops the tag - `.rotate()` with no args does both in
  // one step), strips all other metadata (GPS/camera EXIF, ICC profiles -
  // sharp only keeps metadata when `.withMetadata()` is explicitly called,
  // so simply never calling it is the strip), resizes to three ceilings,
  // and re-encodes everything as WebP. Writes to
  // `{uploadDir}/photos/{id}/{small,medium,large}.webp` and returns the
  // public URLs for all three - the caller decides which one is "the" url
  // for backward-compat single-URL consumers.
  async process(buffer: Buffer, id: string, uploadDir: string, publicApiUrl: string): Promise<ProcessedImage> {
    let image: Sharp;
    try {
      image = sharp(buffer, { failOn: 'error' }).rotate();
      // Forces sharp to actually decode the pixel data now rather than
      // lazily on first .toBuffer()/.toFile() - a corrupt/non-image buffer
      // throws here instead of surfacing as an opaque 500 later.
      await image.metadata();
    } catch {
      throw new BadRequestException('Uploaded file is not a valid image');
    }

    const dir = join(uploadDir, 'photos', id);
    await mkdir(dir, { recursive: true });

    const urls = {} as Record<'small' | 'medium' | 'large', string>;
    for (const { name, width } of SIZES) {
      const outputBuffer = await sharp(buffer, { failOn: 'error' })
        .rotate()
        .resize({ width, withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: 80 })
        .toBuffer();
      const filePath = join(dir, `${name}.webp`);
      await writeFile(filePath, outputBuffer);
      urls[name] = `${publicApiUrl}/uploads/photos/${id}/${name}.webp`;
    }

    return { id, urls };
  }
}
