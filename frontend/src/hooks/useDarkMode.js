import { useEffect, useState } from 'react';

// Where the user's choice is remembered across reloads. The same key is read
// by the no-flash <script> in public/index.html.
const STORAGE_KEY = 'voucherpro-theme';

/**
 * Resolve the theme to start with. The inline script in index.html has usually
 * already set data-theme on <html>, so trust that first; otherwise fall back to
 * the saved preference, then the OS setting, then light.
 *
 * @returns {'light' | 'dark'}
 */
const getInitialTheme = () => {
  const fromDom = document.documentElement.getAttribute('data-theme');
  if (fromDom === 'light' || fromDom === 'dark') return fromDom;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore — storage may be unavailable */
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

/**
 * Drives the light/dark theme. Applies the choice to the document root (which
 * is what the CSS [data-theme="dark"] rules key off of) and persists it.
 *
 * @returns {{ isDark: boolean, toggle: () => void }}
 */
export const useDarkMode = () => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore — storage may be unavailable (e.g. private mode) */
    }
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return { isDark: theme === 'dark', toggle };
};

export default useDarkMode;
