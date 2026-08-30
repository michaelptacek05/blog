import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, type Category } from '@/db/schema';

export { DEFAULT_ICON, ICON_KEYS, isIconKey, type IconKey } from './category-icons';

export async function listCategories(): Promise<Category[]> {
  return getDb().select().from(categories).orderBy(asc(categories.name));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const [row] = await getDb()
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  return row ?? null;
}
