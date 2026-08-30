import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { listCategories } from '@/lib/categories';
import { getMediaById } from '@/lib/media-queries';
import { getPostById } from '@/lib/posts';
import { PostForm } from '../post-form';

export const metadata: Metadata = {
  title: 'Editace postu',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: Props) {
  await requireAdmin();

  const categories = await listCategories();

  const { id } = await params;
  const postId = Number(id);

  if (!Number.isInteger(postId)) {
    notFound();
  }

  const post = await getPostById(postId);

  if (!post) {
    notFound();
  }

  const cover = post.coverMediaId ? await getMediaById(post.coverMediaId) : null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Editace postu</h1>
      <PostForm post={post} cover={cover} categories={categories} />
    </div>
  );
}
