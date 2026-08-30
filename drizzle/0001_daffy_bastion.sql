ALTER TABLE "posts" ADD COLUMN "category" text;--> statement-breakpoint
CREATE INDEX "posts_category_idx" ON "posts" USING btree ("category");