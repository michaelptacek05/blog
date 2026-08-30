import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { media } from '@/db/schema';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Stored names are generated UUIDs; anything else is not ours to serve. */
const STORAGE_NAME = /^[0-9a-f-]{36}\.webp$/;

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Props): Promise<Response> {
  const { id } = await params;
  const mediaId = Number(id);

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return new Response('Not found', { status: 404 });
  }

  const [row] = await getDb().select().from(media).where(eq(media.id, mediaId)).limit(1);

  if (!row || !STORAGE_NAME.test(row.storageName)) {
    return new Response('Not found', { status: 404 });
  }

  const path = join(env.UPLOAD_DIR, row.storageName);

  // The bytes never change under a given name, so the name is enough to build a
  // stable validator.
  const etag = `"${createHash('sha1').update(row.storageName).digest('hex')}"`;

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  let bytes: Buffer;

  try {
    await stat(path);
    bytes = await readFile(path);
  } catch {
    // Row exists but the file is gone — a restored database without the
    // uploads volume, for instance.
    return new Response('Not found', { status: 404 });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': row.mime,
      'Content-Length': String(bytes.byteLength),
      // Immutable: the name is a UUID, a changed image gets a new one.
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
    },
  });
}
