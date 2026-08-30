'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/db';
import { categories } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/guard';
import { DEFAULT_ICON, isIconKey } from '@/lib/category-icons';
import { slugify, uniqueSlug } from '@/lib/slug';

export type CategoryFormState = {
  error?: string;
};

function revalidateEverywhere(): void {
  revalidatePath('/admin/categories');
  revalidatePath('/categories');
  revalidatePath('/categories/[slug]', 'page');
  revalidatePath('/');
}

async function slugTaken(candidate: string, excludeId?: number): Promise<boolean> {
  const rows = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, candidate));

  return rows.some((row) => row.id !== excludeId);
}

export async function createCategoryAction(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const rawIcon = String(formData.get('icon') ?? '');

  if (!name) {
    return { error: 'Název je povinný.' };
  }

  const slug = await uniqueSlug(name, (candidate) => slugTaken(candidate));

  await getDb()
    .insert(categories)
    .values({ slug, name, icon: isIconKey(rawIcon) ? rawIcon : DEFAULT_ICON });

  revalidateEverywhere();
  return {};
}

export async function updateCategoryAction(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const id = Number(formData.get('id'));
  const name = String(formData.get('name') ?? '').trim();
  const rawIcon = String(formData.get('icon') ?? '');

  if (!Number.isInteger(id)) {
    return { error: 'Neplatné ID kategorie.' };
  }

  if (!name) {
    return { error: 'Název je povinný.' };
  }

  const db = getDb();
  const [existing] = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!existing) {
    return { error: 'Kategorie neexistuje.' };
  }

  // The slug follows the name: renaming a category changes its public URL
  // (/categories/<slug>). That is fine for a one-author blog where renames are
  // rare, but it does mean old links to the category page stop resolving.
  const requested = slugify(name);
  const slug =
    requested === existing.slug
      ? existing.slug
      : await uniqueSlug(requested, (candidate) => slugTaken(candidate, id));

  await db
    .update(categories)
    .set({ name, slug, icon: isIconKey(rawIcon) ? rawIcon : DEFAULT_ICON })
    .where(eq(categories.id, id));

  revalidateEverywhere();
  return {};
}

/**
 * Posts are not deleted with the category — the foreign key is ON DELETE SET
 * NULL, so they simply become uncategorised.
 */
export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get('id'));

  if (Number.isInteger(id)) {
    await getDb().delete(categories).where(eq(categories.id, id));
    revalidateEverywhere();
  }
}
