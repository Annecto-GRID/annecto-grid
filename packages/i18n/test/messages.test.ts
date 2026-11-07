import { describe, expect, it } from "vitest";
import { checkMessages, DEFAULT_LOCALE, interpolate, LOCALES, matchLocale, messages, translate } from "../src/index.ts";

describe("i18n", () => {
  it("has every key in every language", () => {
    expect(checkMessages(messages, DEFAULT_LOCALE)).toEqual([]);
    expect(Object.keys(messages)).toEqual([...LOCALES]);
  });

  it("reports missing, extra, empty and mismatched texts", () => {
    const issues = checkMessages({ sv: { a: "A {x}", b: "B", c: "C" }, en: { a: "A", b: " ", d: "D" } }, "sv");
    expect(issues).toEqual([
      { locale: "en", key: "a", problem: "placeholders", detail: "{} ≠ {x}" },
      { locale: "en", key: "b", problem: "empty" },
      { locale: "en", key: "c", problem: "missing" },
      { locale: "en", key: "d", problem: "extra" },
    ]);
  });

  it("translates with placeholders and picks a supported language", () => {
    expect(translate("en", "err.range", { min: 1, max: 5 })).toBe("Enter a value between 1 and 5.");
    expect(translate("de", "status.title")).toBe("Systemstatus");
    expect(interpolate("{a}-{b}", { a: 1 })).toBe("1-");
    expect(matchLocale(["de-CH", "en"])).toBe("de");
    expect(matchLocale(["fr-FR"])).toBe("sv");
    expect(matchLocale(undefined)).toBe("sv");
  });
});
