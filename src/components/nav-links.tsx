import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { navItems } from '@/lib/nav';

/** The primary navigation list, shared by the desktop bar and the mobile menu. */
export function NavLinks({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  const t = useTranslations('nav');

  return (
    <ul className={className}>
      {navItems.map((item) => (
        <li key={item.key}>
          <Link
            href={item.path}
            className={`text-ink-soft hover:text-ink hover:decoration-accent-mark block rounded-sm py-1 underline-offset-4 hover:underline ${linkClassName ?? ''}`}
          >
            {t(item.key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
