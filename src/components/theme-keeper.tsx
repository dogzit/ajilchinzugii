'use client';

import { useLayoutEffect } from 'react';
import { restoreTheme } from '@/lib/theme';

/**
 * Keeps the reader's appearance choice through a language switch.
 *
 * `<html>` is rendered by the `[locale]` layout, so moving from /mn to /en
 * re-mounts it — and React, which treats `<html>` as a singleton, strips
 * every attribute off the element on the way out, taking `data-theme` with
 * it. The <head> script cannot help: nothing is reloaded.
 *
 * So the choice is put back here, in a layout effect, which React runs
 * synchronously after the DOM is updated and before the browser paints. It
 * renders nothing and runs once per mount, which is exactly as often as the
 * attribute can be lost.
 */
export function ThemeKeeper() {
  useLayoutEffect(() => {
    restoreTheme();
  }, []);

  return null;
}
