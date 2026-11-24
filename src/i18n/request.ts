import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // The tools' strings (both raters, accounts, cases, the privacy notice)
  // live in their own catalogue so that the error boundary, which imports
  // the main one into every page's bundle, does not carry them too.
  const [main, tools] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/tools/${locale}.json`),
  ]);
  return { locale, messages: { ...main.default, ...tools.default } };
});
