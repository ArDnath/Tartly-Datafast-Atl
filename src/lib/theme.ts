export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tartly-theme';
export const DEFAULT_THEME: Theme = 'dark';

/**
 * Runs synchronously in `<head>` before the first paint so the stored theme is
 * on `<html>` before React hydrates. The same key and attribute are used by
 * `ThemeToggle`, which keeps the server and client markup identical.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t='${DEFAULT_THEME}'}var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t;}catch(e){}})();`;

export function resolveTheme(value: string | null | undefined): Theme {
  return value === 'light' || value === 'dark' ? value : DEFAULT_THEME;
}
