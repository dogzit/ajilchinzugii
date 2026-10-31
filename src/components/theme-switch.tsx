'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/components/theme-script';
import { Icon, type IconName } from '@/components/ui/icon';

/**
 * Auto / Light / Dark, in two shapes: a labelled group for the footer, and a
 * single round button for the header, where there is room for one control
 * beside the language pill and no room for three.
 *
 * "Auto" is the absence of a choice: it removes the attribute and lets
 * `prefers-color-scheme` decide, which is what the stylesheet does on its
 * own. The other two write an attribute the tokens override on.
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

export type Theme = 'auto' | 'light' | 'dark';

const THEMES: Theme[] = ['auto', 'light', 'dark'];

const ICONS: Record<Theme, IconName> = {
  auto: 'auto-theme',
  light: 'sun',
  dark: 'moon',
};

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab of the same site changed the choice.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function current(): Theme {
  const value = document.documentElement.getAttribute('data-theme');
  return value === 'light' || value === 'dark' ? value : 'auto';
}

/** The server cannot know the reader's choice; it renders "auto". */
const onServer = (): Theme => 'auto';

function choose(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  try {
    if (theme === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private window, blocked site data: the choice holds for this page only.
  }

  listeners.forEach((notify) => notify());
}

function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, onServer);
}

/**
 * The header control: one button that steps through the three settings.
 *
 * Its accessible name says where it stands and what pressing it does, so it
 * is never a mystery icon — "Харагдац: Авто. Дарвал Гэрэлтэй болно."
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
      onClick={() => choose(next)}
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
              onClick={() => choose(option)}
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
