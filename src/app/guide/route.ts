import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The editors' handbook, served at /guide.
 *
 * It is a standalone HTML document with its own styles, written for people
 * who do not read the docs folder on GitHub — so it is served as-is rather
 * than rebuilt as a React page. Reading happens at build time
 * (`force-static`), so the deployment carries the rendered bytes and never
 * touches the filesystem on a request.
 *
 * A real route, not a file in `public/`, because every top-level path is a
 * candidate locale for `[locale]` and would be redirected to /mn/...; a
 * static route wins over the dynamic segment. `src/proxy.ts` leaves /guide
 * alone for the same reason.
 */

export const dynamic = 'force-static';

const handbook = () =>
  readFileSync(path.join(process.cwd(), 'docs', 'editor-handbook.html'), 'utf8');

export function GET(): Response {
  return new Response(handbook(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Not for search engines: it is internal, and it names no one.
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
