'use client';

import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/icon';

/**
 * The header's account entry: "Sign in", or "My account" once Clerk's
 * session marker cookie says the reader is signed in. Reading one cookie is
 * all it does — Clerk's own JavaScript loads only on the account pages.
 */
const subscribe = () => () => undefined;
const signedInNow = () => {
  const match = document.cookie.match(/(?:^|;\s*)__client_uat(?:_[^=]*)?=(\d+)/);
  return Boolean(match && match[1] !== '0');
};

export function AccountLink({ href, signedOut, signedIn }: { href: string; signedOut: string; signedIn: string }) {
  const active = useSyncExternalStore(subscribe, signedInNow, () => false);
  return (
    <a
      href={href}
      className="border-border text-ink hover:bg-surface-tint inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium"
    >
      <Icon name="user" className="h-4 w-4" />
      <span className="hidden sm:inline">{active ? signedIn : signedOut}</span>
      <span className="sr-only sm:hidden">{active ? signedIn : signedOut}</span>
    </a>
  );
}
