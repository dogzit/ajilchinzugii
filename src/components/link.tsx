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
export function Link({ children, ...props }: React.ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <NavPending />
    </NextLink>
  );
}
