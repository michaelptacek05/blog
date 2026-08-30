/**
 * Shared by the editor (client) and the upload action (server), so this module
 * deliberately imports nothing — pulling these from lib/media.ts would drag
 * sharp and node:fs into the browser bundle.
 */

/**
 * Largest accepted upload. Kept below next.config.ts's
 * serverActions.bodySizeLimit (20 MB) so multipart overhead cannot push a
 * legitimate file over the hard limit and turn a clear message into a 413.
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
