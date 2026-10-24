/**
 * Primary navigation. `key` is the message key in `messages/{mn,en}.json`
 * (`nav.<key>`) — navigation labels are never written into a component.
 */
export const navItems = [
  { key: 'home', path: '/' },
  { key: 'impact', path: '/impact' },
  { key: 'methodology', path: '/methodology' },
  { key: 'research', path: '/research' },
  { key: 'policy', path: '/policy' },
  { key: 'about', path: '/about' },
] as const;

export type NavItem = (typeof navItems)[number];
export type PageKey = NavItem['key'];
