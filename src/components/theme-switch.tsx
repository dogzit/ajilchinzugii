'use client';

import { useSyncExternalStore } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import {
  chooseTheme,
  currentTheme,
  DEFAULT_THEME,
  subscribeToTheme,
  THEMES,
  type Theme,
} from '@/lib/theme';

/**
 * Light / Dark / Auto, in two shapes: a labelled group for the footer, and a
 * single round button for the header, where there is room for one control
 * beside the language pill and no room for three.
 *
 * Light comes first because it is the default: a reader who has never
 * touched this is on light, whatever their system is set to. "Auto" is the
 * one setting that hands the decision to `prefers-color-scheme`.
 *
 * The current theme is read from the document rather than held in state: the
 * inline script in <head> has already set it before React runs, and reading
 * the same place it writes means the buttons can never disagree with the
 * colours on screen. A change in another tab — or in the other control on
 * this page — arrives through the same subscription.
 *
 * Labels arrive as props. next-intl is deliberately kept out of the browser
 * bundle (see tests/unit/bundle-budget.test.ts), so no client component on
 * this site reads a message catalogue.
 */

export type { Theme } from '@/lib/theme';

const ICONS: Record<Theme, IconName> = {
  light: 'sun',
  dark: 'moon',
  auto: 'auto-theme',
};

/** The server cannot know the reader's choice; it renders the default. */
const onServer = (): Theme => DEFAULT_THEME;

function useTheme(): Theme {
  return useSyncExternalStore(subscribeToTheme, currentTheme, onServer);
}

/**
 * The header control: one button that steps through the three settings.
 *
 * Its accessible name says where it stands and what pressing it does, so it
 * is never a mystery icon — "Харагдац: Гэрэлтэй. Дарвал Харанхуй болно."
 */
export function ThemeToggle({
  actions,
  className = '',
}: {
  /**
   * One finished sentence per state, already translated — a server component
   * cannot hand a function to a client one, and this button only ever needs
   * three strings.
   */
  actions: Record<Theme, string>;
  className?: string;
}) {
  const theme = useTheme();
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] as Theme;

  return (
    <button
      type="button"
      onClick={() => chooseTheme(next)}
      aria-label={actions[theme]}
      className={`border-border text-ink-soft hover:bg-surface-tint hover:text-ink inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${className}`}
    >
      <Icon name={ICONS[theme]} className="h-[1.15rem] w-[1.15rem]" />
    </button>
  );
}

/** The footer control: all three settings, named. */
export function ThemeSwitch({
  legend,
  labels,
  className,
}: {
  legend: string;
  labels: Record<Theme, string>;
  className?: string;
}) {
  const theme = useTheme();

  return (
    <div className={className}>
      <p
        className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase"
        id="theme-switch-label"
      >
        {legend}
      </p>
      <div
        role="group"
        aria-labelledby="theme-switch-label"
        className="border-border bg-surface mt-3 flex w-fit max-w-full flex-wrap rounded-full border p-1"
      >
        {THEMES.map((option) => {
          const active = option === theme;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => chooseTheme(option)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active ? 'bg-accent-surface text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon name={ICONS[option]} className="h-3.5 w-3.5" />
              {labels[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
