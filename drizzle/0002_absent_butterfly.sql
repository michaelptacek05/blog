CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'tag' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DROP INDEX "posts_category_idx";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_category_idx" ON "posts" USING btree ("category_id");--> statement-breakpoint
-- Seed the categories that until now lived in lib/categories.ts, then point
-- existing posts at them. Written by hand: drizzle-kit diffs schema, not data.
INSERT INTO "categories" ("slug", "name", "icon") VALUES
  ('design', 'Design', 'palette'),
  ('programming', 'Programming', 'code'),
  ('generative-art', 'Generative Art', 'sparkles'),
  ('thoughts', 'Thoughts', 'heart')
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
UPDATE "posts" SET "category_id" = "categories"."id"
  FROM "categories" WHERE "posts"."category" = "categories"."slug";
