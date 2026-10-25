/**
 * Sets the theme before the first paint.
 *
 * Without this the page renders in the system theme and then jumps to the
 * reader's choice a frame later. It runs in <head>, synchronously, and is the
 * only inline script on the site; everything in it must survive being run
 * before any stylesheet or bundle has loaded.
 *
 * `localStorage` throws in a private window with site data blocked, so the
 * whole thing is wrapped — a failure means the system theme, which is a
 * perfectly good answer.
 */
export const THEME_STORAGE_KEY = 'theme';

const script = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
