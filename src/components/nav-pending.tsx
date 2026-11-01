'use client';

import { useLinkStatus } from 'next/link';
import { useEffect } from 'react';

/**
 * The one piece of this site's motion that cannot be done in CSS.
 *
 * Next holds the page the reader is on until the next one has arrived — the
 * URL does not even change until then — and because every page here is
 * prerendered, a route's own `loading.tsx` is never reached on a click: the
 * payload comes back whole or not at all. So between the click and the new
 * page there is a silence, and on a slow connection it is long enough for a
 * reader to wonder whether the site heard them.
 *
 * `useLinkStatus` knows about that silence, but only from inside the link
 * that caused it. Rather than draw something in each link, this marks the
 * document — one attribute, from however many links are pending — and
 * globals.css draws the honey line across the top of the page. Nothing here
 * renders, nothing measures, nothing can shift the layout.
 *
 * The count is what makes it safe: a reader who clicks twice, or clicks one
 * link while another is still pending, must not have the line taken away by
 * whichever link finishes first.
 */

let pending = 0;

export function NavPending() {
  const status = useLinkStatus();

  useEffect(() => {
    if (!status.pending) return;

    const root = document.documentElement;
    pending += 1;
    root.dataset.navPending = '';

    return () => {
      pending -= 1;
      if (pending === 0) delete root.dataset.navPending;
    };
  }, [status.pending]);

  return null;
}
