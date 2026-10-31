/**
 * The reader's choice of appearance: light, dark, or auto.
 *
 * Light is the default. A first-time reader gets the cream page the design
 * was drawn for, whatever their operating system is set to; dark is a theme
 * they ask for, either by choosing it or by choosing "auto" and letting
 * `prefers-color-scheme` answer. In the document that reads:
 *
 *   no attribute   light — the default, and what the stylesheet renders
 *                  before a line of JavaScript has run
 *   data-theme=dark   dark, chosen
 *   data-theme=auto   whatever the system asks for
 *
 * Everything that touches the choice lives here — the storage key, the
 * attribute, and the script that runs before the first paint — so the
 * stylesheet, the switch and the <head> script can never disagree.
 *
 * Plain functions, no React, no `use client`: the inline script is emitted by
 * a server component and the switch is a client one, and both import this.
 */

export const THEME_STORAGE_KEY = 'theme';

export const THEME_ATTRIBUTE = 'data-theme';

export type Theme = 'light' | 'dark' | 'auto';

/** Light first: it is the default, and the order the switch is read in. */
export const THEMES: readonly Theme[] = ['light', 'dark', 'auto'];

export const DEFAULT_THEME: Theme = 'light';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'auto';
}

/**
 * The choice when `localStorage` cannot be used at all.
 *
 * A private window with site data blocked throws on both read and write. The
 * choice then cannot outlive the tab, but it should at least survive a
 * language switch, which re-mounts the page without reloading it — so it is
 * held here too. Module state, so it lives as long as the document.
 */
let held: Theme | null = null;

/** The stored choice, or null when nothing has been chosen. */
export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    // Blocked site data: all we have is what this document remembers.
    return held;
  }
}

/** What the document is showing right now. */
export function currentTheme(): Theme {
  const value = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return isTheme(value) && value !== 'light' ? value : DEFAULT_THEME;
}

function markDocument(theme: Theme) {
  const root = document.documentElement;
  // Light is the absence of a mark: the stylesheet's own default.
  if (theme === DEFAULT_THEME) root.removeAttribute(THEME_ATTRIBUTE);
  else root.setAttribute(THEME_ATTRIBUTE, theme);
}

const listeners = new Set<() => void>();

function announce() {
  listeners.forEach((notify) => notify());
}

/** Every control showing the current choice re-reads it through this. */
export function subscribeToTheme(onChange: () => void) {
  listeners.add(onChange);
  // Another tab of the same site changed the choice.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** The reader pressed a button. */
export function chooseTheme(theme: Theme) {
  held = theme;
  markDocument(theme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private window, blocked site data: the choice holds for this document.
  }

  announce();
}

/**
 * Put the stored choice back on the document.
 *
 * React treats <html>, <head> and <body> as singletons, and when the element
 * that renders them unmounts it strips every attribute off them — including
 * the one the <head> script wrote. Switching language does exactly that,
 * because `<html>` is rendered by the `[locale]` layout and the locale is
 * part of that layout's identity. This runs in a layout effect afterwards,
 * before the browser paints, so the choice comes back without a flash.
 */
export function restoreTheme() {
  markDocument(storedTheme() ?? DEFAULT_THEME);
  announce();
}

/**
 * The same restoration, as a string, for the <head> on a full page load —
 * before any stylesheet or bundle has arrived, so it must stand alone.
 *
 * Only `dark` and `auto` are written: light needs no mark, which means a
 * reader who has never touched the switch gets the default with no work.
 */
export const themeScriptSource =
  `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');` +
  `if(t==='dark'||t==='auto'){document.documentElement.setAttribute('${THEME_ATTRIBUTE}',t)}` +
  `}catch(e){}})()`;
