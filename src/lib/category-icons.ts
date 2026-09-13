/**
 * Shared by the admin picker (client) and the category actions (server), so
 * this module deliberately imports nothing — pulling these from lib/categories.ts
 * would drag drizzle and pg into the browser bundle.
 *
 * Icons cannot live in the database, so a category row stores a key into this
 * set. Adding an option means adding a case in components/category-icon.tsx.
 */
export const ICON_KEYS = [
  'tag',
  'palette',
  'code',
  'sparkles',
  'heart',
  'book',
  'camera',
  'terminal',
  'music',
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export const DEFAULT_ICON: IconKey = 'tag';

export function isIconKey(value: string): value is IconKey {
  return (ICON_KEYS as readonly string[]).includes(value);
}
