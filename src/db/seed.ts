/**
 * Development seed. Idempotent: skips a post whose slug already exists.
 *
 *   docker compose exec web npm run db:seed
 */
import { eq } from 'drizzle-orm';
import { getDb } from './index';
import { posts } from './schema';
import { slugify } from '../lib/slug';

const TITLE = 'Příliš žluťoučký kůň úpěl ďábelské ódy';

const CONTENT_MD = `Tenhle post vznikl seedem a slouží k ověření markdown pipeline.

## Nadpis druhé úrovně

Odstavec s **tučným textem**, *kurzívou*, \`inline kódem\` a
[odkazem](https://example.com).

### Seznam

- první položka
- druhá položka
  - vnořená položka
- třetí položka

### Blok kódu

\`\`\`ts
type Post = {
  slug: string;
  publishedAt: Date | null;
};

export function isPublished(post: Post): boolean {
  return post.publishedAt !== null && post.publishedAt <= new Date();
}
\`\`\`

### Tabulka (GFM)

| Sloupec | Typ | Poznámka |
| --- | --- | --- |
| \`slug\` | text | unikátní |
| \`published_at\` | timestamptz | NULL = draft |

> Citace na závěr.
`;

async function main(): Promise<void> {
  const db = getDb();
  const slug = slugify(TITLE);

  const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug));

  if (existing.length > 0) {
    console.log(`Seed skipped, post "${slug}" already exists (id ${existing[0].id}).`);
    return;
  }

  const [inserted] = await db
    .insert(posts)
    .values({
      slug,
      title: TITLE,
      excerpt: 'Ukázkový post ze seedu — nadpisy, seznam, tabulka a blok kódu.',
      contentMd: CONTENT_MD,
      publishedAt: new Date(),
    })
    .returning({ id: posts.id, slug: posts.slug });

  console.log(`Seeded post #${inserted.id} (${inserted.slug}).`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
