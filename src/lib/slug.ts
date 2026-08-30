/**
 * Slug helpers.
 *
 * Czech diacritics are decomposed with NFD and the combining marks are then
 * dropped, so "Příliš žluťoučký kůň" becomes "prilis-zlutoucky-kun" rather than
 * losing the accented letters entirely.
 */

const MAX_SLUG_LENGTH = 80;

export function slugify(input: string): string {
  const stripped = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Trim to the limit, then drop a hyphen the cut may have left dangling.
  return stripped.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
}

/**
 * Appends a numeric suffix until `isTaken` reports the slug as free.
 * Falls back to a timestamp suffix if something pathological happens.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || 'post';

  if (!(await isTaken(root))) {
    return root;
  }

  for (let suffix = 2; suffix <= 100; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  return `${root}-${Date.now()}`;
}
