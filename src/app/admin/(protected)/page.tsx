import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { listAllPosts } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

// Always reflects the current database state, never a cached snapshot.
export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

export default async function AdminHomePage() {
  await requireAdmin();

  const posts = await listAllPosts();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Posty</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Nový post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-neutral-500">Zatím tu nic není.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {posts.map((post) => (
            <li key={post.id} className="flex items-baseline gap-3 py-3">
              <Link
                href={`/admin/posts/${post.id}`}
                className="font-medium hover:underline"
              >
                {post.title}
              </Link>

              {post.publishedAt ? (
                <span className="text-xs text-neutral-500">
                  publikováno {dateFormat.format(post.publishedAt)}
                </span>
              ) : (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  koncept
                </span>
              )}

              <span className="ml-auto font-mono text-xs text-neutral-400">/{post.slug}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
