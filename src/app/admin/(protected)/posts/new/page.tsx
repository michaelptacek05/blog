import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guard';
import { listCategories } from '@/lib/categories';
import { PostForm } from '../post-form';

export const metadata: Metadata = {
  title: 'Nový post',
  robots: { index: false, follow: false },
};

export default async function NewPostPage() {
  await requireAdmin();

  const categories = await listCategories();

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Nový post</h1>
      <PostForm categories={categories} />
    </div>
  );
}
