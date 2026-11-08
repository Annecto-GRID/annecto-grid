/**
 * Text resolution (B-003, B-015) and names of master data per language (B-016).
 *
 * PLATFORM: belongs to the platform, not to Fleet Manager. Moves to `@annecto-grid/i18n` in M3.
 * Kept here unchanged in M1 so that the prototype's logic is carried over as is.
 */

import { isEmpty, normText } from "../normalize.ts";
import type { LangCode, ListItem, Names } from "../types.ts";

/** Language chain: the chosen language first, then the others in priority order. */
export function langChain(lang: LangCode, order?: LangCode[] | null): LangCode[] {
  const o = order && order.length ? order : ["sv"];
  return [lang].concat(o.filter((x) => x !== lang));
}

export type Dictionaries = Record<LangCode, Record<string, string | undefined> | undefined>;

export interface ResolvedText {
  text: string;
  source: "override" | "lang" | "fallback" | "missing";
  lang: LangCode | null;
}

/**
 * Resolution: company override in the chosen language → text in the chosen language →
 * other languages in priority order. Never an empty label or a raw key.
 */
export function resolveText(
  key: string,
  lang: LangCode,
  dicts: Dictionaries,
  overrides?: Dictionaries | null,
  order?: LangCode[] | null,
): ResolvedText {
  const ov = overrides || {};
  const a = ov[lang] && ov[lang][key];
  if (!isEmpty(a)) return { text: a as string, source: "override", lang };
  const chain = langChain(lang, order);
  for (let i = 0; i < chain.length; i++) {
    const code = chain[i] as LangCode;
    const v = dicts[code] && (dicts[code] as Record<string, string | undefined>)[key];
    if (!isEmpty(v)) return { text: v as string, source: i === 0 ? "lang" : "fallback", lang: code };
  }
  return { text: "…", source: "missing", lang: null };
}

/** Replaces `{name}` placeholders. Missing values give an empty string. */
export function interpolate(s: unknown, p?: Record<string, unknown> | null): string {
  return String(s).replace(/\{(\w+)\}/g, (_m, k: string) =>
    p && p[k] !== undefined && p[k] !== null ? String(p[k]) : "",
  );
}

/** Name of a master data value in the chosen language, with fallback through the language chain. */
export function nameOf(
  item: Pick<ListItem, "name" | "names"> | null | undefined,
  lang: LangCode,
  order?: LangCode[] | null,
): string {
  if (!item) return "";
  const n = item.names || {};
  const chain = langChain(lang, order);
  for (const c of chain) if (!isEmpty(n[c])) return n[c] as string;
  return item.name || "";
}

/**
 * Normalises `names` and sets `name` = the name in the default language.
 * Returns `null` when the default language's name is missing.
 */
export function withNames<T extends object>(
  item: T,
  names: Names | null | undefined,
  order?: LangCode[] | null,
): (T & { name: string; names: Names }) | null {
  const std = (order && order[0]) || "sv";
  const out: Names = {};
  Object.keys(names || {}).forEach((k) => {
    const v = normText((names as Names)[k]);
    if (v) out[k] = v;
  });
  if (!out[std]) return null;
  return Object.assign({}, item, { name: out[std] as string, names: out });
}

/** Does the name clash with another value in any language? Returns the clashing language, otherwise `null`. */
export function nameClash(list: ListItem[], names: Names | null | undefined, selfId?: string | null): LangCode | null {
  const langs = Object.keys(names || {});
  for (const x of list) {
    if (x.id === selfId) continue;
    const xn: Names = Object.assign({ sv: x.name }, x.names || {});
    for (const l of langs) {
      const a = normText((names as Names)[l]);
      const b = normText(xn[l]);
      if (a && b && a.toLowerCase() === b.toLowerCase()) return l;
    }
  }
  return null;
}
