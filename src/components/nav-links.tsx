import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Locale } from '@/i18n/routing';
import { localeHref } from '@/lib/locale-href';
import { navItems, type PageKey } from '@/lib/nav';

/** The primary navigation list, shared by the desktop bar and the mobile menu. */
export function NavLinks({
  locale,
  className,
  linkClassName,
  exclude,
}: {
  locale: Locale;
  className?: string;
  linkClassName?: string;
  /** Hidden in the desktop bar, where the logo already goes home. */
  exclude?: PageKey;
}) {
  const t = useTranslations('nav');
  const items = exclude ? navItems.filter((item) => item.key !== exclude) : navItems;

  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={localeHref(locale, item.path)}
            className={`text-ink-soft hover:text-ink hover:decoration-accent-mark block rounded-sm py-1 underline-offset-4 hover:underline ${linkClassName ?? ''}`}
          >
            {t(item.key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
