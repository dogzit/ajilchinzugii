import { getMessages, setRequestLocale } from 'next-intl/server';
import { SignUpGate, type AccountMessages } from '@/components/accounts/sign-up-gate';
import type { Locale } from '@/i18n/routing';

export default async function SignUpPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = (await getMessages({ locale })) as { account: AccountMessages };
  return (
    <div className="shell py-12 md:py-16">
      <SignUpGate t={messages.account} locale={locale} />
    </div>
  );
}
