import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

/**
 * Sanitize schema.
 *
 * Sanitizing *after* rehype-pretty-code means the schema has to permit what
 * Shiki emits, or every token loses its colour: inline `style` (the
 * --shiki-light / --shiki-dark custom properties), `class` and the
 * data-* attributes the plugin annotates figures and lines with.
 *
 * `style` is granted only on the elements Shiki actually decorates, not
 * globally, and raw HTML never reaches this point anyway — remark-rehype runs
 * with allowDangerousHtml disabled.
 */
const SHIKI_ELEMENTS = ['pre', 'code', 'span', 'figure', 'figcaption', 'div'] as const;

const schema = {
  ...defaultSchema,
  // rehype-sanitize prefixes every id with "user-content-" to guard against DOM
  // clobbering, which would break the "#slug" hrefs rehype-autolink-headings
  // just generated. Ids here come from rehype-slug on the author's own
  // headings, not from untrusted input, so the prefix is turned off.
  clobberPrefix: '',
  tagNames: [...(defaultSchema.tagNames ?? []), 'figure', 'figcaption'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'id', 'data*'],
    ...Object.fromEntries(
      SHIKI_ELEMENTS.map((tag) => [
        tag,
        [...(defaultSchema.attributes?.[tag] ?? []), 'className', 'style', 'data*'],
      ]),
    ),
    // rehype-autolink-headings wraps the heading text in an anchor.
    a: [...(defaultSchema.attributes?.a ?? []), 'ariaHidden', 'tabIndex'],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // Raw HTML in the markdown source is dropped, not rendered.
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  // 'wrap' turns the heading text itself into the anchor; it is styled with a
  // descendant selector, so no class is needed on the element.
  .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
  .use(rehypePrettyCode, {
    theme: { light: 'github-light', dark: 'github-dark' },
    // Let the prose styles own the code block background.
    keepBackground: false,
  })
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

/**
 * Renders markdown to sanitized HTML. Server-side only — syntax highlighting
 * happens here so no highlighting JavaScript is ever sent to the browser.
 */
export async function renderMarkdown(source: string): Promise<string> {
  const file = await processor.process(source);
  return String(file);
}
