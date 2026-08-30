import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CategoryIcon } from '@/components/category-icon';
import { PostRow } from '@/components/post-row';
import { getCategoryBySlug } from '@/lib/categories';
import { groupByYear, listPublishedPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

// No generateStaticParams(): the category list now lives in the database, and
// the production image is built without one. The page is force-dynamic anyway,
// so pre-declaring params would buy nothing.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  return category ? { title: category.name } : {};
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const posts = await listPublishedPosts(category.id);
  const years = groupByYear(posts);

  return (
    <div className="pb-24">
      <header className="max-w-xl py-16 sm:py-20">
        <Link
          href="/categories"
          className="text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          ← All categories
        </Link>
        <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          <CategoryIcon icon={category.icon} className="size-7 text-muted-foreground" />
          {category.name}
        </h1>
      </header>

      {years.length === 0 ? (
        <p className="border-t border-border py-10 text-xs text-muted-foreground">
          Nothing published in this category yet.
        </p>
      ) : (
        years.map(({ year, posts: yearPosts }) => (
          <section key={year} className="border-t border-border py-10 sm:flex sm:gap-16">
            <h2 className="mb-6 shrink-0 text-xs text-muted-foreground sm:mb-0 sm:w-24 sm:pt-5">
              {year}
            </h2>
            <ul className="min-w-0 flex-1">
              {yearPosts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
