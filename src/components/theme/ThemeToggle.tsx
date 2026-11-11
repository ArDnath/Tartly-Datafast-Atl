'use client';

import { useLayoutEffect } from 'react';
import { HalfMoon as MoonGlyph, SunLight as SunGlyph } from '@/components/icons';
import { resolveTheme, THEME_STORAGE_KEY } from '@/lib/theme';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
  /** Float the control in the top-right corner of the viewport. */
  floating?: boolean;
  className?: string;
}

/**
 * Light/dark switch for the product surfaces (`/login`, `/onboarding`, `/app`).
 *
 * The rendered markup is identical on the server and the client. Which glyph is
 * visible is decided by CSS from the `data-theme` attribute that the inline
 * script in the root layout sets before paint, so hydration never disagrees.
 */
export function ThemeToggle({ floating = false, className }: ThemeToggleProps) {
  // React's development Strict Mode remount resets <html> attributes to the
  // values it manages, which can drop the theme the inline script applied.
  // Re-apply the stored value before paint; this is a no-op in production.
  useLayoutEffect(() => {
    let stored: string | null = null;

    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      return;
    }

    if (stored !== 'light' && stored !== 'dark') {
      return;
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', stored);
    root.style.colorScheme = stored;
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const next = resolveTheme(root.getAttribute('data-theme')) === 'dark' ? 'light' : 'dark';

    root.setAttribute('data-theme', next);
    root.style.colorScheme = next;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode, disabled cookies); the theme
      // still applies for the current page.
    }
  }

  const classes = [
    'talivia-theme-toggle',
    styles.toggle,
    floating ? styles.floating : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      data-test="button-theme-toggle"
    >
      <SunIcon />
      <MoonIcon />
    </button>
  );
}

function SunIcon() {
  return (
    <SunGlyph
      className={`${styles.icon} ${styles.sun}`}
      strokeWidth={1.7}
      aria-hidden="true"
      focusable="false"
    />
  );
}

function MoonIcon() {
  return (
    <MoonGlyph
      className={`${styles.icon} ${styles.moon}`}
      strokeWidth={1.7}
      aria-hidden="true"
      focusable="false"
    />
  );
}
