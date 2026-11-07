/** Normalisation of input values (B-005). */

export function isEmpty(x: unknown): x is null | undefined | "" {
  return x === null || x === undefined || (typeof x === "string" && x.trim() === "");
}

/** Trims and collapses whitespace. Empty → null. */
export function normText(s: unknown): string | null {
  return isEmpty(s) ? null : String(s).trim().replace(/\s+/g, " ");
}

/** Registration number: no whitespace, upper case. */
export function normReg(s: unknown): string | null {
  return isEmpty(s) ? null : String(s).replace(/\s+/g, "").toUpperCase();
}

/** Chassis number (VIN): no whitespace, upper case. */
export function normVin(s: unknown): string | null {
  return isEmpty(s) ? null : String(s).replace(/\s+/g, "").toUpperCase();
}

/** Wheel formula: no whitespace, lower case, `×` and `*` become `x`. */
export function normAxle(s: unknown): string | null {
  return isEmpty(s) ? null : String(s).replace(/\s+/g, "").toLowerCase().replace(/[×*]/g, "x");
}

/** Number with optional spaces and decimal comma. Empty → null, not a number → NaN. */
export function normNum(s: unknown): number | null {
  if (isEmpty(s)) return null;
  const n = Number(String(s).replace(/\s+/g, "").replace(",", "."));
  return isFinite(n) ? n : NaN;
}

/** Rounds to one decimal. */
export function r1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** A number as is, otherwise parsed with `normNum`. */
export function numOf(x: unknown): number | null {
  return typeof x === "number" ? x : normNum(x);
}
