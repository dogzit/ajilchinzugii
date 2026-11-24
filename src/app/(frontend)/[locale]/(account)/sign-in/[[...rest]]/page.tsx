import { SignIn } from '@clerk/nextjs';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

export default async function SignInPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'account' });
  return (
    <div className="shell py-12 md:py-16">
      <div className="mx-auto max-w-[28rem] text-center">
        <h1 className="text-ink">{t('signInTitle')}</h1>
        <p className="text-ink-muted mt-3">{t('signInLead')}</p>
      </div>
      <div className="mt-8 flex justify-center">
        <SignIn routing="path" path={`/${locale}/sign-in`} signUpUrl={`/${locale}/sign-up`} />
      </div>
    </div>
  );
}
