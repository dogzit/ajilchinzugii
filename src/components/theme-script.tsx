import { themeScriptSource } from '@/lib/theme';

/**
 * Sets the theme before the first paint.
 *
 * Light is the default and needs no help — it is what the stylesheet renders
 * on its own. This is for the reader who has chosen dark, or auto: without it
 * the page would paint cream and jump a frame later.
 *
 * It runs in <head>, synchronously, and is the only inline script on the
 * site; everything in it must survive being run before any stylesheet or
 * bundle has loaded. `localStorage` throws in a private window with site data
 * blocked, so the whole thing is wrapped — a failure means the default theme,
 * which is a perfectly good answer.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScriptSource }} />;
}
