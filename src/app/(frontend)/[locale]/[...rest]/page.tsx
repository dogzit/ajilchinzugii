import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

/**
 * Anything under a locale that is not a page of this site.
 *
 * Without it, an address like /mn/no-such-page falls past the locale
 * entirely and Next answers with its own built-in 404 — in English, with no
 * header, no footer and no way back. This brings the request inside the
 * locale so `[locale]/not-found.tsx` can answer it in the reader's language.
 *
 * It renders nothing itself: `notFound()` is the whole of it.
 */
export default async function CatchAll({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);

  notFound();
}
