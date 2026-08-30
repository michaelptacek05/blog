import { env } from '@/lib/env';
import { listPublishedPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

const FEED_TITLE = 'Journal — Michael Ptáček';
const FEED_DESCRIPTION = 'Notes on programming, design and the things in between.';

/** Escapes the five XML predefined entities. */
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET(): Promise<Response> {
  const siteUrl = env.SITE_URL;
  const posts = await listPublishedPosts();

  const items = posts
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`;

      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        post.publishedAt ? `      <pubDate>${post.publishedAt.toUTCString()}</pubDate>` : '',
        post.excerpt ? `      <description>${escapeXml(post.excerpt)}</description>` : '',
        post.category ? `      <category>${escapeXml(post.category.name)}</category>` : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  // Full post bodies are deliberately left out — the feed links to the site.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
