/**
 * @annecto-grid/i18n – the platform's texts in Swedish, English and German (B-003, B-015).
 *
 * Code and identifiers are in English; everything the user reads comes from here.
 * In M3 the company overrides and the text resolution from the prototype
 * (`fleet-core/src/platform/texts.ts`) move into this package.
 */

import { de } from "./locales/de.ts";
import { en } from "./locales/en.ts";
import { sv } from "./locales/sv.ts";
import type { MessageKey, Messages } from "./types.ts";

export type { MessageKey, Messages } from "./types.ts";

export const LOCALES = ["sv", "en", "de"] as const;
export type Locale = (typeof LOCALES)[number];

/** The default language, also the first fallback. */
export const DEFAULT_LOCALE: Locale = "sv";

export const messages: Readonly<Record<Locale, Messages>> = { sv, en, de };

export function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && (LOCALES as readonly string[]).includes(x);
}

/** Picks the first supported language from preferences such as `navigator.languages`. */
export function matchLocale(preferred: readonly string[] | null | undefined): Locale {
  for (const p of preferred || []) {
    const base = p.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Replaces `{name}` placeholders. Missing values give an empty string. */
export function interpolate(text: string, params?: Record<string, unknown>): string {
  return text.replace(/\{(\w+)\}/g, (_m, k: string) => {
    const v = params ? params[k] : undefined;
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Text for a key in a language. The build guarantees that every language has every key. */
export function translate(locale: Locale, key: MessageKey, params?: Record<string, unknown>): string {
  return interpolate(messages[locale][key], params);
}

export { checkMessages, type CheckIssue } from "./check.ts";
