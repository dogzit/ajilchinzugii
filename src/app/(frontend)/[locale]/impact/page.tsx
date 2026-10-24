import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { PlaceholderPage } from '@/components/placeholder-page';
import type { Locale } from '@/i18n/routing';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'impact', '/impact');
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PlaceholderPage pageKey="impact" />;
}
