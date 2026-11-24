/**
 * State-changing account requests must come from this site's own pages.
 * Clerk's session cookie is SameSite=Lax already; this is the second lock.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
