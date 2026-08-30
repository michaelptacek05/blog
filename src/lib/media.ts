import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type OutputInfo } from 'sharp';
import { getDb } from '@/db';
import { media, type Media } from '@/db/schema';
import { env } from './env';
import { MAX_UPLOAD_BYTES, formatBytes } from './upload-limits';

/** Widest edge we keep; anything narrower is left alone. */
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;

export const ACCEPTED_MIME_PREFIX = 'image/';

export class UploadError extends Error {}

/**
 * Converts an uploaded image to WebP, writes it into UPLOAD_DIR under a random
 * name and records it in the media table.
 *
 * sharp drops EXIF and every other metadata block unless withMetadata() is
 * called, so the stored file carries no camera or GPS data. rotate() is applied
 * first, otherwise dropping the EXIF orientation flag would leave phone photos
 * lying on their side.
 */
export async function storeImage(file: File): Promise<Media> {
  if (!file.type.startsWith(ACCEPTED_MIME_PREFIX)) {
    throw new UploadError('Tohle není obrázek.');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `Soubor má ${formatBytes(file.size)}, limit je ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

  let output: Buffer;
  let info: OutputInfo;

  try {
    const result = await sharp(input)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    output = result.data;
    info = result.info;
  } catch {
    throw new UploadError('Obrázek se nepodařilo zpracovat — je soubor v pořádku?');
  }

  const storageName = `${randomUUID()}.webp`;
  const uploadDir = env.UPLOAD_DIR;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, storageName), output);

  const [row] = await getDb()
    .insert(media)
    .values({
      storageName,
      originalName: file.name || null,
      mime: 'image/webp',
      width: info.width,
      height: info.height,
      sizeBytes: info.size,
      alt: null,
    })
    .returning();

  return row;
}
