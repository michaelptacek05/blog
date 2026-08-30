CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_name" text NOT NULL,
	"original_name" text,
	"mime" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"alt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_name_unique" UNIQUE("storage_name")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"content_md" text NOT NULL,
	"cover_media_id" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at" DESC NULLS LAST);