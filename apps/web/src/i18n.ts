/** The chosen language: stored per browser, otherwise the browser's preferred language. */

import { isLocale, matchLocale, type Locale } from "@annecto-grid/i18n";

const STORAGE_KEY = "annecto-grid.locale";

export function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); fall back to the browser language.
  }
  return matchLocale(navigator.languages);
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Not stored; the choice still applies until the page is reloaded.
  }
}
