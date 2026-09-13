import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { postViews, posts } from '@/db/schema';

/** Day boundaries follow the author's clock, not the database server's UTC. */
const TODAY = sql`(now() at time zone 'Europe/Prague')::date`;

/** Counts one view. Unknown posts and drafts are silently ignored. */
export async function recordView(postId: number): Promise<void> {
  const db = getDb();

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), isNotNull(posts.publishedAt)))
    .limit(1);

  if (!post) {
    return;
  }

  await db
    .insert(postViews)
    .values({ postId: post.id, day: TODAY, views: 1 })
    .onConflictDoUpdate({
      target: [postViews.postId, postViews.day],
      set: { views: sql`${postViews.views} + 1` },
    });
}

export type ViewStats = {
  total: number;
  last30Days: number;
  last7Days: number;
  today: number;
  /** First day anything was counted, as YYYY-MM-DD; null when never viewed. */
  since: string | null;
};

export async function getViewStats(postId: number): Promise<ViewStats> {
  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${postViews.views}), 0)::int`,
      last30Days: sql<number>`coalesce(sum(${postViews.views}) filter (where ${postViews.day} > ${TODAY} - 30), 0)::int`,
      last7Days: sql<number>`coalesce(sum(${postViews.views}) filter (where ${postViews.day} > ${TODAY} - 7), 0)::int`,
      today: sql<number>`coalesce(sum(${postViews.views}) filter (where ${postViews.day} = ${TODAY}), 0)::int`,
      since: sql<string | null>`min(${postViews.day})::text`,
    })
    .from(postViews)
    .where(eq(postViews.postId, postId));

  return row ?? { total: 0, last30Days: 0, last7Days: 0, today: 0, since: null };
}
