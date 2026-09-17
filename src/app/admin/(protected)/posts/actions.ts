'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import { posts } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/guard';
import { renderMarkdown } from '@/lib/markdown';
import { storeImage, UploadError } from '@/lib/media';
import { isSlugTaken } from '@/lib/posts';
import { slugify, uniqueSlug } from '@/lib/slug';

export type PostFormState = {
  error?: string;
  /** ISO timestamp of the last successful save; drives the "saved" hint. */
  savedAt?: string;
};

/** "autosave" comes from the editor's timer and leaves publication state alone. */
type SaveIntent = 'publish' | 'draft' | 'autosave';

type ParsedForm = {
  title: string;
  slug: string;
  excerpt: string | null;
  contentMd: string;
  categoryId: number | null;
  coverMediaId: number | null;
  intent: SaveIntent;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function parseForm(formData: FormData): ParsedForm | string {
  const title = readString(formData, 'title');
  const contentMd = readString(formData, 'contentMd');

  if (!title) {
    return 'Titulek je povinný.';
  }

  if (!contentMd) {
    return 'Obsah nemůže být prázdný.';
  }

  const excerpt = readString(formData, 'excerpt');

  // A category deleted while the editor was open simply lands as "none".
  const rawCategory = readString(formData, 'categoryId');
  const categoryId = /^\d+$/.test(rawCategory) ? Number(rawCategory) : null;

  const rawCover = readString(formData, 'coverMediaId');
  const coverMediaId = /^\d+$/.test(rawCover) ? Number(rawCover) : null;

  const rawIntent = readString(formData, 'intent');

  return {
    title,
    slug: readString(formData, 'slug'),
    excerpt: excerpt || null,
    contentMd,
    categoryId,
    coverMediaId,
    // Anything unrecognised saves without publishing.
    intent: rawIntent === 'publish' || rawIntent === 'autosave' ? rawIntent : 'draft',
  };
}

/** Refreshes the public pages a post appears on. */
function revalidatePublic(slug: string): void {
  revalidatePath('/');
  revalidatePath(`/blog/${slug}`);
  revalidatePath('/categories');
  revalidatePath('/categories/[slug]', 'page');
  revalidatePath('/rss.xml');
}

export async function createPostAction(
  _previousState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (typeof parsed === 'string') {
    return { error: parsed };
  }

  const slug = await uniqueSlug(parsed.slug || parsed.title, (candidate) => isSlugTaken(candidate));

  const [created] = await getDb()
    .insert(posts)
    .values({
      slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      contentMd: parsed.contentMd,
      categoryId: parsed.categoryId,
      coverMediaId: parsed.coverMediaId,
      publishedAt: parsed.intent === 'publish' ? new Date() : null,
    })
    .returning({ id: posts.id });

  revalidatePath('/admin');
  revalidatePublic(slug);

  redirect(`/admin/posts/${created.id}`);
}

export async function updatePostAction(
  _previousState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireAdmin();

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) {
    return { error: 'Neplatné ID postu.' };
  }

  const parsed = parseForm(formData);
  if (typeof parsed === 'string') {
    return { error: parsed };
  }

  const db = getDb();
  const [existing] = await db
    .select({ slug: posts.slug, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  if (!existing) {
    return { error: 'Post neexistuje.' };
  }

  const requestedSlug = slugify(parsed.slug || parsed.title);
  const slug =
    requestedSlug === existing.slug
      ? existing.slug
      : await uniqueSlug(requestedSlug, (candidate) => isSlugTaken(candidate, id));

  // Publishing keeps the original date if the post was already published; the
  // "draft" intent unpublishes it and an autosave leaves it as it is.
  const publishedAt =
    parsed.intent === 'autosave'
      ? existing.publishedAt
      : parsed.intent === 'publish'
        ? (existing.publishedAt ?? new Date())
        : null;

  await db
    .update(posts)
    .set({
      slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      contentMd: parsed.contentMd,
      categoryId: parsed.categoryId,
      coverMediaId: parsed.coverMediaId,
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  revalidatePath('/admin');
  revalidatePath(`/admin/posts/${id}`);
  revalidatePublic(slug);
  if (slug !== existing.slug) {
    revalidatePublic(existing.slug);
  }

  return { savedAt: new Date().toISOString() };
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) {
    redirect('/admin');
  }

  const db = getDb();
  const [deleted] = await db.delete(posts).where(eq(posts.id, id)).returning({ slug: posts.slug });

  revalidatePath('/admin');
  if (deleted) {
    revalidatePublic(deleted.slug);
  }

  redirect('/admin');
}

/** Server-side markdown preview for the editor. */
export async function renderPreviewAction(source: string): Promise<string> {
  await requireAdmin();
  return renderMarkdown(source);
}

export type UploadResult =
  | { ok: true; id: number; alt: string }
  | { ok: false; error: string };

/** Accepts one image from the editor and returns what to insert into the text. */
export async function uploadImageAction(formData: FormData): Promise<UploadResult> {
  await requireAdmin();

  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Žádný soubor k nahrání.' };
  }

  try {
    const stored = await storeImage(file);
    // Filename without extension makes a serviceable default alt text.
    const alt = (stored.originalName ?? '').replace(/\.[^.]+$/, '') || 'obrázek';
    return { ok: true, id: stored.id, alt };
  } catch (error) {
    if (error instanceof UploadError) {
      return { ok: false, error: error.message };
    }

    console.error('Upload failed', error);
    return { ok: false, error: 'Nahrání selhalo. Zkus to prosím znovu.' };
  }
}
