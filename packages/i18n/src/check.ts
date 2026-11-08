/**
 * Completeness check for the texts (B-015). Runs in the build (`pnpm i18n:check`) and in the tests.
 * Every language must have exactly the default language's keys, no empty texts and the same
 * placeholders as the default language.
 */

export interface CheckIssue {
  locale: string;
  key: string;
  problem: "missing" | "extra" | "empty" | "placeholders";
  detail?: string;
}

function placeholders(text: string): string {
  return Array.from(text.matchAll(/\{(\w+)\}/g), (m) => m[1])
    .sort()
    .join(",");
}

export function checkMessages(all: Record<string, Record<string, string>>, defaultLocale: string): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const base = all[defaultLocale];
  if (!base) return [{ locale: defaultLocale, key: "*", problem: "missing", detail: "default locale has no texts" }];
  const baseKeys = Object.keys(base);
  for (const [locale, dict] of Object.entries(all)) {
    for (const key of baseKeys) {
      const text = dict[key];
      if (text === undefined) issues.push({ locale, key, problem: "missing" });
      else if (text.trim() === "") issues.push({ locale, key, problem: "empty" });
      else if (placeholders(text) !== placeholders(base[key] as string)) {
        issues.push({
          locale,
          key,
          problem: "placeholders",
          detail: `{${placeholders(text)}} ≠ {${placeholders(base[key] as string)}}`,
        });
      }
    }
    for (const key of Object.keys(dict)) if (!(key in base)) issues.push({ locale, key, problem: "extra" });
  }
  return issues;
}
