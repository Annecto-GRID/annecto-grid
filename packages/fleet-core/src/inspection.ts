/** Periodic inspection, driving ban and acknowledgement of warnings (B-021, B-022). */

import { addDays, addMonths, daysBetween, isoOf, parseIso, todayIso } from "./dates.ts";
import { TRANSFERRED } from "./status.ts";
import type { IsoDate, Vehicle } from "./types.ts";

export interface InspectionConfig {
  intervalMonths: number;
  firstMonths: number;
  endOfMonth: boolean;
  firstEndOfMonth: boolean;
  warnDays: number;
  redDays: number;
  /** Days after the last inspection day before the driving ban applies (0 = the day after). */
  banAfterDays: number;
  /** Statuses that need no inspection. */
  excluded: string[];
  /** Statuses that show no alerts. */
  noAlert: string[];
}

/** Company configuration: overrides of the defaults, globally and per category. */
export type InspectionSettings = Partial<Record<keyof InspectionConfig, unknown>> & {
  byCategory?: Record<string, Partial<Record<keyof InspectionConfig, unknown>>>;
};

export const INSP_DEF: InspectionConfig = {
  intervalMonths: 12,
  firstMonths: 12,
  endOfMonth: true,
  firstEndOfMonth: false,
  warnDays: 30,
  redDays: 3,
  banAfterDays: 0,
  excluded: ["deregistered", "exported"],
  noAlert: ["off_road"],
};

/** Effective configuration for a category: default → company → category. */
export function inspCfg(cfg: InspectionSettings | null | undefined, categoryId: unknown): InspectionConfig {
  const g = cfg || {};
  const bc = (g.byCategory || {})[String(categoryId)] || {};
  const c: Record<string, unknown> = {};
  (Object.keys(INSP_DEF) as Array<keyof InspectionConfig>).forEach((k) => {
    c[k] = INSP_DEF[k];
    if (g[k] !== undefined && g[k] !== null) c[k] = g[k];
    if (bc[k] !== undefined && bc[k] !== null && bc[k] !== "") c[k] = bc[k];
  });
  return c as unknown as InspectionConfig;
}

export function noInspection(v: Vehicle, cfg: InspectionSettings | null | undefined): boolean {
  return v.status === TRANSFERRED || inspCfg(cfg, v.categoryId).excluded.indexOf(String(v.status)) >= 0;
}

/** Last day for the next inspection, or `null` when none applies or no date is known. */
export function dueDate(v: Vehicle, cfg: InspectionSettings | null | undefined): IsoDate | null {
  if (noInspection(v, cfg)) return null;
  const c = inspCfg(cfg, v.categoryId);
  const last = parseIso(v.lastInspection);
  const reg = parseIso(v.registrationDate);
  if (last) return isoOf(addMonths(last, c.intervalMonths, c.endOfMonth));
  if (reg) return isoOf(addMonths(reg, c.firstMonths, c.firstEndOfMonth));
  return null;
}

export type InspectionLevel = "ban" | "red" | "warn" | "";

export interface InspectionState {
  due: IsoDate;
  days: number;
  level: InspectionLevel;
  /** First day with a driving ban: last inspection day + banAfterDays + 1. */
  banFrom: IsoDate;
  banned: boolean;
  banInDays: number;
  /** `false` when the status has no alerts. */
  alerts: boolean;
}

export function inspState(
  v: Vehicle,
  cfg: InspectionSettings | null | undefined,
  today?: IsoDate,
): InspectionState | null {
  const due = dueDate(v, cfg);
  if (!due) return null;
  const td = today || todayIso();
  const c = inspCfg(cfg, v.categoryId);
  const n = daysBetween(td, due);
  const banFrom = addDays(due, (+c.banAfterDays || 0) + 1);
  const banned = td >= banFrom;
  const level: InspectionLevel = banned ? "ban" : n <= c.redDays ? "red" : n <= c.warnDays ? "warn" : "";
  return {
    due,
    days: n,
    level,
    banFrom,
    banned,
    banInDays: daysBetween(td, banFrom),
    alerts: c.noAlert.indexOf(String(v.status)) < 0,
  };
}

/** An acknowledged warning (B-022). */
export interface InspectionAck {
  due: IsoDate;
  level: InspectionLevel;
  [key: string]: unknown;
}

export const LEVEL_RANK: Record<InspectionLevel, number> = { "": 0, warn: 1, red: 2, ban: 3 };

/**
 * An acknowledgement covers the same last inspection day up to the acknowledged level.
 * If the level rises (soon → urgent → ban) or the date changes, the warning shows again.
 */
export function ackCovers(ack: InspectionAck | null | undefined, st: InspectionState | null | undefined): boolean {
  if (!ack || !st || !st.level) return false;
  return ack.due === st.due && (LEVEL_RANK[ack.level] || 0) >= (LEVEL_RANK[st.level] || 0);
}
