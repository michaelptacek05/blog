import { PostRow } from '@/components/post-row';
import { groupByYear, listPublishedPosts } from '@/lib/posts';

// Read straight from the database on every request. The server actions also
// call revalidatePath(), so switching this to ISR later needs no other change.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const posts = await listPublishedPosts();
  const years = groupByYear(posts);

  return (
    <div className="pb-24">
      <section className="max-w-xl py-20 sm:py-28">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Michaels blog
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          Welcome to my space, where I talk about things i find {' '}
          <span className="text-foreground underline decoration-border underline-offset-4">
            cool.
          </span>
        </p>
      </section>

      {years.length === 0 ? (
        <p className="border-t border-border py-10 text-xs text-muted-foreground">
          Nothing published yet.
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
