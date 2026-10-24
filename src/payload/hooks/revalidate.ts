import { routing } from '../../i18n/routing';

/**
 * Both locales of a route are separate cache entries, so every content change
 * has to clear `/mn/...` and `/en/...`. Called from Payload `afterChange` and
 * `afterDelete` hooks.
 */
export async function revalidateLocalizedPaths(
  paths: string[],
  type: 'layout' | 'page' = 'page',
): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    for (const locale of routing.locales) {
      for (const path of paths) {
        revalidatePath(`/${locale}${path === '/' ? '' : path}`, type);
      }
    }
  } catch {
    // Outside a Next.js request — the CLI, a migration or the seed script.
    // Nothing is cached there, so there is nothing to revalidate.
  }
}
