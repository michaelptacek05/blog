import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { media, type Media } from '@/db/schema';

/** Kept apart from lib/media.ts so callers do not pull sharp in just to read a row. */
export async function getMediaById(id: number): Promise<Media | null> {
  const [row] = await getDb().select().from(media).where(eq(media.id, id)).limit(1);
  return row ?? null;
}
