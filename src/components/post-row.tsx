import Link from 'next/link';
import { CategoryIcon } from '@/components/category-icon';
import type { PostWithRelations } from '@/lib/posts';

function ArrowIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/**
 * One line of the index: title, category, arrow. The whole row is the link;
 * the category sits inside it as plain text rather than a nested anchor.
 */
export function PostRow({ post }: { post: PostWithRelations }) {
  const { category } = post;

  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/blog/${post.slug}`}
        className="group flex items-center gap-4 py-5 transition-opacity hover:opacity-70 sm:gap-8"
      >
        <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug">{post.title}</span>

        {category ? (
          <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <CategoryIcon icon={category.icon} />
            {category.name}
          </span>
        ) : null}

        <span className="shrink-0 text-muted-foreground">
          <ArrowIcon />
        </span>
      </Link>
    </li>
  );
}
