import { and, desc, eq, isNotNull, ne, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, media, posts, type Category, type Media, type Post } from '@/db/schema';

/** A post with the two rows it points at: its cover image and its category. */
export type PostWithRelations = Post & { cover: Media | null; category: Category | null };

function withRelations(row: {
  posts: Post;
  media: Media | null;
  categories: Category | null;
}): PostWithRelations {
  return { ...row.posts, cover: row.media, category: row.categories };
}

/** All posts, drafts included, newest activity first. Admin only. */
export async function listAllPosts(): Promise<Post[]> {
  return getDb()
    .select()
    .from(posts)
    .orderBy(desc(sql`coalesce(${posts.publishedAt}, ${posts.updatedAt})`));
}

export async function getPostById(id: number): Promise<Post | null> {
  const [post] = await getDb().select().from(posts).where(eq(posts.id, id)).limit(1);
  return post ?? null;
}

/** `excludeId` lets a post keep its own slug while being edited. */
export async function isSlugTaken(slug: string, excludeId?: number): Promise<boolean> {
  const condition =
    excludeId === undefined
      ? eq(posts.slug, slug)
      : and(eq(posts.slug, slug), ne(posts.id, excludeId));

  const [row] = await getDb().select({ id: posts.id }).from(posts).where(condition).limit(1);
  return row !== undefined;
}

/**
 * Published posts for the public side. A NULL published_at means draft, and a
 * draft must never appear here — this predicate is the only gate between the
 * two, so it is deliberately kept in one place.
 */
export async function listPublishedPosts(categoryId?: number): Promise<PostWithRelations[]> {
  const published =
    categoryId === undefined
      ? isNotNull(posts.publishedAt)
      : and(isNotNull(posts.publishedAt), eq(posts.categoryId, categoryId));

  const rows = await getDb()
    .select()
    .from(posts)
    .leftJoin(media, eq(posts.coverMediaId, media.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(published)
    .orderBy(desc(posts.publishedAt));

  return rows.map(withRelations);
}

/** Returns null for an unknown slug *and* for a draft. */
export async function getPublishedPostBySlug(slug: string): Promise<PostWithRelations | null> {
  const [row] = await getDb()
    .select()
    .from(posts)
    .leftJoin(media, eq(posts.coverMediaId, media.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(eq(posts.slug, slug), isNotNull(posts.publishedAt)))
    .limit(1);

  return row ? withRelations(row) : null;
}

/**
 * Whether a published post shows this image — as its cover or inside its body.
 * Media ids are sequential, so anything uploaded for a draft would otherwise be
 * one guess away for anyone.
 */
export async function isMediaInPublishedPost(mediaId: number): Promise<boolean> {
  // The trailing class keeps /media/5 from matching inside /media/50.
  const inBody = `/media/${mediaId}([^0-9]|$)`;

  const [row] = await getDb()
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        isNotNull(posts.publishedAt),
        or(eq(posts.coverMediaId, mediaId), sql`${posts.contentMd} ~ ${inBody}`),
      ),
    )
    .limit(1);

  return row !== undefined;
}

/** How many published posts each category holds, keyed by category id. */
export async function countPublishedByCategory(): Promise<Map<number, number>> {
  const rows = await getDb()
    .select({ categoryId: posts.categoryId, count: sql<number>`count(*)::int` })
    .from(posts)
    .where(isNotNull(posts.publishedAt))
    .groupBy(posts.categoryId);

  return new Map(
    rows.filter((row) => row.categoryId !== null).map((row) => [row.categoryId!, row.count]),
  );
}

/** Groups posts by publication year, newest year first. */
export function groupByYear(
  items: PostWithRelations[],
): { year: number; posts: PostWithRelations[] }[] {
  const groups = new Map<number, PostWithRelations[]>();

  for (const post of items) {
    if (!post.publishedAt) {
      continue;
    }

    const year = post.publishedAt.getFullYear();
    const bucket = groups.get(year);

    if (bucket) {
      bucket.push(post);
    } else {
      groups.set(year, [post]);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, yearPosts]) => ({ year, posts: yearPosts }));
}
