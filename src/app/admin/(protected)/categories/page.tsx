import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guard';
import { listCategories } from '@/lib/categories';
import { countPublishedByCategory } from '@/lib/posts';
import { CategoryManager } from './category-manager';

export const metadata: Metadata = {
  title: 'Kategorie',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const [categories, counts] = await Promise.all([
    listCategories(),
    countPublishedByCategory(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Kategorie</h1>
      <CategoryManager categories={categories} counts={Object.fromEntries(counts)} />
    </div>
  );
}
