/**
 * Statistics (B-032). Pure calculations without AI and without database. The same functions can
 * run on the server and be used by Analytics, so that statistics are always calculated the same way.
 */

import { addDays, addMonths, isoOf, parseIso, todayIso } from "./dates.ts";
import type { InspectionState } from "./inspection.ts";
import { kmPerDay, tripKm, type ReceivedReport } from "./mileage.ts";
import { r1 } from "./normalize.ts";
import type { IsoDate, Vehicle } from "./types.ts";

export interface CountRow {
  key: string;
  n: number;
}

/** Count per key. `keyFn(v)` → key ("" = missing). Sorted by count, then key ("" last). */
export function countBy<T>(list: T[] | null | undefined, keyFn: (v: T) => unknown): CountRow[] {
  const m: Record<string, number> = {};
  (list || []).forEach((v) => {
    let k = keyFn(v);
    k = k === null || k === undefined ? "" : String(k);
    m[k as string] = (m[k as string] || 0) + 1;
  });
  return Object.keys(m)
    .map((k) => ({ key: k, n: m[k] as number }))
    .sort(
      (a, b) =>
        b.n - a.n || (a.key === "" ? 1 : b.key === "" ? -1 : a.key.localeCompare(b.key, undefined, { numeric: true })),
    );
}

/** Age groups by model year: 0–4, 5–9, 10–14, 15+ years and unknown. */
export const AGE_GROUPS = ["0-4", "5-9", "10-14", "15+", ""] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export function ageOf(v: Vehicle, today?: IsoDate): number | null {
  const y = Number(v.modelYear);
  return y > 1900 ? Math.max(0, Number((today || todayIso()).slice(0, 4)) - y) : null;
}

export function ageGroup(age: number | null): AgeGroup {
  return age === null ? "" : age < 5 ? "0-4" : age < 10 ? "5-9" : age < 15 ? "10-14" : "15+";
}

export interface AgeStats {
  avg: number | null;
  known: number;
  groups: Array<{ key: AgeGroup; n: number }>;
}

export function ageStats(list: Vehicle[] | null | undefined, today?: IsoDate): AgeStats {
  const ages = (list || []).map((v) => ageOf(v, today));
  const known = ages.filter((a): a is number => a !== null);
  const groups = AGE_GROUPS.map((g) => ({ key: g, n: ages.filter((a) => ageGroup(a) === g).length }));
  return {
    avg: known.length ? r1(known.reduce((s, a) => s + a, 0) / known.length) : null,
    known: known.length,
    groups,
  };
}

export interface InspectionSummary {
  ok: number;
  warn: number;
  red: number;
  ban: number;
  none: number;
  overdue: number;
  perMonth: Array<{ month: string; n: number }>;
}

/** Inspection overview: `states` = `inspState` results or null. Forecast per month for the next `months` months. */
export function inspSummary(
  states: Array<InspectionState | null> | null | undefined,
  today?: IsoDate,
  months?: number,
): InspectionSummary {
  const td = today || todayIso();
  const n = months || 12;
  const out: InspectionSummary = { ok: 0, warn: 0, red: 0, ban: 0, none: 0, overdue: 0, perMonth: [] };
  const start = td.slice(0, 7);
  for (let i = 0; i < n; i++) {
    const d = parseIso(start + "-01");
    const m = addMonths(d as NonNullable<typeof d>, i);
    out.perMonth.push({ month: isoOf(m).slice(0, 7), n: 0 });
  }
  (states || []).forEach((st) => {
    if (!st) {
      out.none++;
      return;
    }
    if (st.level === "ban") out.ban++;
    else if (st.level === "red") out.red++;
    else if (st.level === "warn") out.warn++;
    else out.ok++;
    if (st.due < td) out.overdue++;
    const pm = out.perMonth.filter((x) => x.month === st.due.slice(0, 7))[0];
    if (pm) pm.n++;
  });
  return out;
}

export interface KmStats {
  total: number;
  perDay: Array<{ day: IsoDate; km: number }>;
  avgPerDay: number;
  perVehicle: Array<{ id: string; km: number }>;
  perLine: Array<{ line: string; km: number }>;
}

/** Km driven in the period: `byVehicle` = { vehicle id: reports }. Only reports that were applied. */
export function kmStats(
  byVehicle: Record<string, ReceivedReport[]> | null | undefined,
  from?: IsoDate | null,
  to?: IsoDate | null,
): KmStats {
  const days: Record<string, number> = {};
  const veh: Record<string, number> = {};
  const lines: Record<string, number> = {};
  let total = 0;
  Object.keys(byVehicle || {}).forEach((id) => {
    kmPerDay((byVehicle as Record<string, ReceivedReport[]>)[id], from, to).forEach((d) => {
      days[d.day] = r1((days[d.day] || 0) + d.km);
      veh[id] = r1((veh[id] || 0) + d.km);
      total = r1(total + d.km);
      d.reports.forEach((rp) => {
        (rp.trips || []).forEach((tr) => {
          const k = tripKm(tr);
          if (!k) return;
          const ln = tr.line || "";
          lines[ln] = r1((lines[ln] || 0) + k);
        });
      });
    });
  });
  let perDay: Array<{ day: IsoDate; km: number }> = [];
  if (parseIso(from) && parseIso(to) && (from as string) <= (to as string)) {
    for (let d = from as string, g = 0; d <= (to as string) && g < 400; d = addDays(d, 1), g++) {
      perDay.push({ day: d, km: days[d] || 0 });
    }
  } else {
    perDay = Object.keys(days)
      .map((k) => ({ day: k, km: days[k] as number }))
      .sort((a, b) => (a.day < b.day ? -1 : 1));
  }
  const nDays = perDay.length;
  return {
    total,
    perDay,
    avgPerDay: nDays ? r1(total / nDays) : 0,
    perVehicle: Object.keys(veh)
      .map((k) => ({ id: k, km: veh[k] as number }))
      .sort((a, b) => b.km - a.km),
    perLine: Object.keys(lines)
      .map((k) => ({ line: k, km: lines[k] as number }))
      .sort((a, b) => b.km - a.km || String(a.line).localeCompare(String(b.line), undefined, { numeric: true })),
  };
}
