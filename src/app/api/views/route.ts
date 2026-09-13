import { getSession } from '@/lib/auth/session';
import { clientIp } from '@/lib/auth/client-ip';
import { isBot, shouldCountView } from '@/lib/view-dedup';
import { recordView } from '@/lib/views';

export const dynamic = 'force-dynamic';

/**
 * Receives the beacon from <ViewBeacon> on a post page.
 *
 * Always answers 204 with an empty body, whatever happened: the counter is
 * private, so the endpoint must not reveal counts or even whether a view was
 * counted.
 */
export async function POST(request: Request): Promise<Response> {
  const noContent = new Response(null, { status: 204 });

  // Browsers send this on every fetch; a cross-site form or script trying to
  // inflate the numbers shows up as something other than same-origin.
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite !== null && fetchSite !== 'same-origin') {
    return noContent;
  }

  const userAgent = request.headers.get('user-agent') ?? '';
  if (isBot(userAgent)) {
    return noContent;
  }

  const body: unknown = await request.json().catch(() => null);
  const postId =
    body !== null && typeof body === 'object' && 'postId' in body ? Number(body.postId) : NaN;

  if (!Number.isInteger(postId) || postId <= 0) {
    return noContent;
  }

  // The author reading their own post is not a view.
  if (await getSession()) {
    return noContent;
  }

  if (!shouldCountView(postId, await clientIp(), userAgent)) {
    return noContent;
  }

  try {
    await recordView(postId);
  } catch (error) {
    // A lost view is not worth a 500 in the visitor's console.
    console.error('Failed to record view:', error);
  }

  return noContent;
}
