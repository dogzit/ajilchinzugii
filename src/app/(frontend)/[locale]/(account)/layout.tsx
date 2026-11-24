import { ClerkProvider } from '@clerk/nextjs';
import { enUS, mnMN } from '@clerk/localizations';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { CLERK_PROXY_PATH, clerkConfigured } from '@/lib/accounts/clerk';

/**
 * The only place Clerk's client JavaScript is loaded: sign-in, sign-up and
 * the account page. Every other page reads the session on the server, if it
 * needs to at all (tests/unit/bundle-budget.test.ts holds this).
 *
 * Clerk's widgets take the site's own colours and type from the CSS
 * variables in globals.css, so they follow the light and dark themes.
 */
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!clerkConfigured()) {
    const t = await getTranslations({ locale, namespace: 'account' });
    return (
      <div className="shell py-16">
        <p className="border-border bg-surface text-ink mx-auto max-w-[40rem] rounded-3xl border p-6">{t('notConfigured')}</p>
      </div>
    );
  }
  return (
    <ClerkProvider
      localization={locale === 'mn' ? mnMN : enUS}
      proxyUrl={CLERK_PROXY_PATH}
      signInUrl={`/${locale}/sign-in`}
      signUpUrl={`/${locale}/sign-up`}
      signInFallbackRedirectUrl={`/${locale}/account`}
      signUpFallbackRedirectUrl={`/${locale}/account`}
      afterSignOutUrl={`/${locale}`}
      appearance={{
        variables: {
          colorPrimary: 'var(--accent)',
          colorPrimaryForeground: 'var(--accent-ink)',
          colorForeground: 'var(--ink)',
          colorMutedForeground: 'var(--ink-muted)',
          colorBackground: 'var(--surface)',
          colorInput: 'var(--surface)',
          colorInputForeground: 'var(--ink)',
          colorBorder: 'var(--border-strong)',
          colorRing: 'var(--focus)',
          colorDanger: 'var(--score-red)',
          colorSuccess: 'var(--score-green)',
          fontFamily: 'var(--font-onest), system-ui, sans-serif',
          borderRadius: '1rem',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
