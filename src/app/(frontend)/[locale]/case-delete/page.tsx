import type { Metadata } from 'next';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { CaseDelete } from '@/components/rater/case-delete';
import type { CaseMessages } from '@/components/rater/case-intake';
import type { Locale } from '@/i18n/routing';

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

/**
 * The page the emailed delete link opens. The token rides in the URL's
 * fragment, which the browser never sends to a server or a log; the page
 * posts it only when the reader presses Delete.
 */
export default async function CaseDeletePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { cases } = (await getMessages({ locale })) as { cases: CaseMessages };
  return (
    <div className="shell py-14 md:py-20">
      <CaseDelete t={cases} />
    </div>
  );
}
