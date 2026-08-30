import type { Metadata } from 'next';
import Link from 'next/link';
import { CategoryIcon } from '@/components/category-icon';
import { listCategories } from '@/lib/categories';
import { countPublishedByCategory } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse posts by category.',
};

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([listCategories(), countPublishedByCategory()]);

  return (
    <div className="pb-24">
      <h1 className="max-w-xl py-16 text-3xl font-semibold tracking-tight sm:py-20 sm:text-4xl">
        Categories
      </h1>

      {categories.length === 0 ? (
        <p className="border-t border-border py-10 text-xs text-muted-foreground">
          No categories yet.
        </p>
      ) : null}

      <ul className="max-w-2xl border-t border-border">
        {categories.map((category) => {
          const count = counts.get(category.id) ?? 0;

          return (
            <li key={category.id} className="border-b border-border">
              <Link
                href={`/categories/${category.slug}`}
                className="flex items-center gap-4 py-5 transition-opacity hover:opacity-70"
              >
                <CategoryIcon icon={category.icon} className="text-muted-foreground" />
                <span className="flex-1 text-[15px] font-medium">{category.name}</span>
                <span className="text-xs text-muted-foreground">
                  {count} {count === 1 ? 'post' : 'posts'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
