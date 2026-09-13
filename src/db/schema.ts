import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  /** File name on disk inside UPLOAD_DIR, e.g. "8f3c…-a91b.webp". */
  storageName: text('storage_name').notNull().unique(),
  originalName: text('original_name'),
  mime: text('mime').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  alt: text('alt'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** Key into the icon set in components/category-icon.tsx. */
  icon: text('icon').notNull().default('tag'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    contentMd: text('content_md').notNull(),
    /** Deleting a category leaves its posts in place, just uncategorised. */
    categoryId: integer('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    /** NULL means draft — never visible on the public side. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('posts_published_at_idx').on(table.publishedAt.desc()),
    index('posts_category_idx').on(table.categoryId),
  ],
);

/**
 * Private view counter, one row per post per day (Europe/Prague). Nothing that
 * identifies a visitor is stored — deduplication happens in memory, see
 * lib/view-dedup.ts.
 */
export const postViews = pgTable(
  'post_views',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    views: integer('views').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.postId, table.day] })],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
