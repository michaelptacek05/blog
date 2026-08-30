import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CategoryIcon } from '@/components/category-icon';
import { formatDate, isoDate } from '@/lib/format';
import { renderMarkdown } from '@/lib/markdown';
import { getPublishedPostBySlug } from '@/lib/posts';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt ?? undefined,
      publishedTime: post.publishedAt ? isoDate(post.publishedAt) : undefined,
      images: post.cover ? [{ url: `/media/${post.cover.id}` }] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  // Covers both an unknown slug and a draft — getPublishedPostBySlug filters
  // out anything with a NULL published_at.
  if (!post) {
    notFound();
  }

  const html = await renderMarkdown(post.contentMd);
  const { category } = post;

  return (
    <article className="pb-24">
      <header className="max-w-2xl py-16 sm:py-20">
        {post.publishedAt ? (
          <time
            dateTime={isoDate(post.publishedAt)}
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            {formatDate(post.publishedAt)}
          </time>
        ) : null}

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-[2.5rem] sm:leading-[1.15]">
          {post.title}
        </h1>

        {post.excerpt ? (
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{post.excerpt}</p>
        ) : null}

        {category ? (
          <Link
            href={`/categories/${category.slug}`}
            className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <CategoryIcon icon={category.icon} />
            {category.name}
          </Link>
        ) : null}
      </header>

      {post.cover ? (
        // Served by our own /media route, so next/image would add nothing but a
        // second copy of the bytes.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/media/${post.cover.id}`}
          alt={post.cover.alt ?? ''}
          width={post.cover.width}
          height={post.cover.height}
          className="mb-16 aspect-[16/9] w-full rounded-xl object-cover"
        />
      ) : null}

      <div
        className="prose prose-neutral dark:prose-invert max-w-2xl"
        // Sanitized in the markdown pipeline (rehype-sanitize); raw HTML in the
        // source is dropped before it ever gets here.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <footer className="mt-16 max-w-2xl border-t border-border pt-6">
        <Link
          href="/"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to all posts
        </Link>
      </footer>
    </article>
  );
}
