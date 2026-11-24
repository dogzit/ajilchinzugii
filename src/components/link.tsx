import NextLink from 'next/link';
import { NavPending } from '@/components/nav-pending';

/**
 * The site's internal link: `next/link`, and a report on whether the page it
 * points at has arrived yet. Every link that stays inside the site goes
 * through here, so a click anywhere is answered the same way — see
 * src/components/nav-pending.tsx for what is drawn and why.
 *
 * The language switch is deliberately not one of these: it reloads the
 * document, and the browser's own cross-document transition covers it.
 */
/**
 * The two tools are not prefetched. Their pages carry every question,
 * explanation and label in both raters' vocabularies, and a home page that
 * fetched both in the background spent ~30 KB of a 400 KB budget on pages
 * most readers of it never open. They load on the click instead.
 */
const NO_PREFETCH = /\/(contract-check|cv-check)(?:$|[?#])/;

export function Link({ children, ...props }: React.ComponentProps<typeof NextLink>) {
  const prefetch = props.prefetch ?? (typeof props.href === 'string' && NO_PREFETCH.test(props.href) ? false : undefined);
  return (
    <NextLink {...props} prefetch={prefetch}>
      {children}
      <NavPending />
    </NextLink>
  );
}
