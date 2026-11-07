/**
 * Calendar dates. Dates are handled as `YYYY-MM-DD` strings and computed in UTC
 * so that the result never depends on the server's or browser's time zone.
 * "Today" is always taken in the system time zone (TZ).
 */
import type { IsoDate } from "./types.ts";

export const TZ = "Europe/Stockholm";

export interface DateParts {
  y: number;
  m: number;
  d: number;
}

export function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

/** Parses a strict `YYYY-MM-DD` date. Invalid dates (e.g. 2026-02-30) → null. */
export function parseIso(x: unknown): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x || ""));
  if (!m) return null;
  const y = +m[1]!,
    mo = +m[2]!,
    d = +m[3]!;
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
  return { y, m: mo, d };
}

export function isoOf(p: DateParts): IsoDate {
  return p.y + "-" + pad2(p.m) + "-" + pad2(p.d);
}

/** Adds months. `eom` = land on the last day of the month; otherwise clamp the day. */
export function addMonths(p: DateParts, n: number, eom?: boolean): DateParts {
  const t = p.y * 12 + (p.m - 1) + n,
    y = Math.floor(t / 12),
    m = (t % 12) + 1;
  const ld = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { y, m, d: eom ? ld : Math.min(p.d, ld) };
}

/** Today's date in the system time zone, not the browser's. */
export function todayIso(now?: Date): IsoDate {
  const d = now || new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const o: Record<string, string> = {};
    parts.forEach((x) => {
      o[x.type] = x.value;
    });
    return o.year + "-" + o.month + "-" + o.day;
  } catch {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
}

/** Number of days from `a` to `b` (negative if `b` is earlier). Both must be valid dates. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const pa = parseIso(a)!,
    pb = parseIso(b)!;
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

export function addDays(iso: IsoDate, n: number): IsoDate {
  const p = parseIso(iso)!,
    d = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
  return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
}

export function nowUtc(): string {
  return new Date().toISOString();
}
