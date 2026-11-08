/**
 * Km driven, reported by Dispatcher (B-027, B-029).
 *
 * A report per vehicle, vehicle block and traffic day with the trips the vehicle had:
 * `{ vehicleId, blockId, trafficDay, trips: [{ line, plannedKm, status: run|aborted|cancelled, kmBeforeAbort }] }`.
 * Planned km are used. A cancelled trip counts 0. An aborted trip counts km up to the abort.
 * If the same block and traffic day is sent again, the new report replaces the old one and the
 * odometer is adjusted by the difference.
 */

import { parseIso, todayIso } from "./dates.ts";
import { normText, numOf, r1 } from "./normalize.ts";
import type { Errors, FieldError, IsoDate, Vehicle } from "./types.ts";

export const TRIP_STATUS = ["run", "aborted", "cancelled"] as const;
export type TripStatus = (typeof TRIP_STATUS)[number];
export const MAX_TRIP_KM = 500;

export interface TripInput {
  line?: unknown;
  plannedKm?: unknown;
  status?: unknown;
  kmBeforeAbort?: unknown;
}

export interface MileageReportInput {
  vehicleId?: unknown;
  blockId?: unknown;
  trafficDay?: unknown;
  trips?: TripInput[] | null;
}

/** A normalised trip as stored. */
export interface Trip {
  line: string | null;
  plannedKm: number;
  status: TripStatus;
  kmBeforeAbort?: number;
}

/** A received report as stored per vehicle. */
export interface ReceivedReport {
  key: string;
  km: number;
  trips: Trip[];
  applied?: boolean;
  trafficDay: IsoDate;
  blockId: string;
  [key: string]: unknown;
}

/** Errors for a report. `trips` holds one error object per trip when any trip is invalid. */
export type MileageErrors = Record<string, FieldError | Errors[]>;

export function validateTrip(tr: TripInput): Errors {
  const e: Errors = {};
  const pk = numOf(tr.plannedKm);
  const line = normText(tr.line);
  if (line && line.length > 20) e["line"] = { key: "err.tooLong", params: { max: 20 } };
  if (pk === null || pk === undefined) e["plannedKm"] = { key: "err.required", params: {} };
  else if (typeof pk !== "number" || isNaN(pk)) e["plannedKm"] = { key: "err.number", params: {} };
  else if (pk <= 0 || pk > MAX_TRIP_KM) e["plannedKm"] = { key: "err.range", params: { min: 0.1, max: MAX_TRIP_KM } };
  if ((TRIP_STATUS as readonly unknown[]).indexOf(tr.status) < 0) e["status"] = { key: "err.required", params: {} };
  if (tr.status === "aborted") {
    const ab = numOf(tr.kmBeforeAbort);
    if (ab === null || ab === undefined) e["kmBeforeAbort"] = { key: "err.required", params: {} };
    else if (typeof ab !== "number" || isNaN(ab)) e["kmBeforeAbort"] = { key: "err.number", params: {} };
    else if (ab < 0 || (typeof pk === "number" && ab > pk)) {
      e["kmBeforeAbort"] = {
        key: "err.range",
        params: { min: 0, max: typeof pk === "number" && !isNaN(pk) ? pk : MAX_TRIP_KM },
      };
    }
  }
  return e;
}

export function validateMileage(r: MileageReportInput, today?: IsoDate): MileageErrors {
  const e: MileageErrors = {};
  const td = today || todayIso();
  const b = normText(r.blockId);
  if (!r.vehicleId) e["vehicleId"] = { key: "err.required", params: {} };
  if (!b) e["blockId"] = { key: "err.required", params: {} };
  else if (b.length > 40) e["blockId"] = { key: "err.tooLong", params: { max: 40 } };
  if (!parseIso(r.trafficDay)) e["trafficDay"] = { key: "err.date", params: {} };
  else if ((r.trafficDay as string) > td) e["trafficDay"] = { key: "err.future", params: {} };
  if (!r.trips || !r.trips.length) e["trips"] = { key: "err.required", params: {} };
  else {
    const te = r.trips.map(validateTrip);
    if (te.some((x) => Object.keys(x).length)) e["trips"] = te;
  }
  return e;
}

export function tripKm(tr: TripInput): number | null {
  return tr.status === "cancelled" ? 0 : tr.status === "aborted" ? numOf(tr.kmBeforeAbort) : numOf(tr.plannedKm);
}

export function reportKm(r: { trips?: TripInput[] | null }): number {
  return r1((r.trips || []).reduce<number>((s, tr) => s + (tripKm(tr) as number), 0));
}

function normTrips(trips: TripInput[] | null | undefined): Trip[] {
  return (trips || []).map((tr) => {
    const o: Trip = {
      line: normText(tr.line) || null,
      plannedKm: r1(numOf(tr.plannedKm) as number),
      status: tr.status as TripStatus,
    };
    if (tr.status === "aborted") o.kmBeforeAbort = r1(numOf(tr.kmBeforeAbort) as number);
    return o;
  });
}

/** Key of a report: traffic day and block (case-insensitive). */
export function mileageKey(r: MileageReportInput): string {
  return r.trafficDay + "|" + (normText(r.blockId) as string).toUpperCase();
}

export type MileageAction =
  | {
      action: "apply";
      key: string;
      km: number;
      trips: Trip[];
      replaces: boolean;
      from: number;
      to: number;
      delta: number;
    }
  | {
      action: "skip";
      key: string;
      km: number;
      trips: Trip[];
      replaces: boolean;
      reason: "duplicate" | "archived" | "noReading";
    };

/**
 * Decision for a report against the vehicle and already received reports:
 * apply (with from, to, km, delta, replaces) or skip with a reason: `duplicate` (an identical report
 * has already been received), `archived` or `noReading` (no odometer reading).
 */
export function mileageAction(
  v: Vehicle,
  r: MileageReportInput,
  received: ReceivedReport[] | null | undefined,
): MileageAction {
  const key = mileageKey(r);
  const km = reportKm(r);
  const trips = normTrips(r.trips);
  const prev = (received || []).filter((x) => x.key === key)[0];
  const base = { key, km, trips, replaces: !!prev };
  if (prev && prev.km === km && JSON.stringify(prev.trips) === JSON.stringify(trips)) {
    return Object.assign(base, { action: "skip" as const, reason: "duplicate" as const });
  }
  if (v.archived) return Object.assign(base, { action: "skip" as const, reason: "archived" as const });
  if (v.odometer === null || v.odometer === undefined || (v.odometer as unknown) === "") {
    return Object.assign(base, { action: "skip" as const, reason: "noReading" as const });
  }
  const delta = r1(km - (prev && prev.applied ? prev.km : 0));
  const from = Number(v.odometer);
  return Object.assign(base, { action: "apply" as const, from, to: r1(from + delta), delta });
}

export interface KmDay {
  day: IsoDate;
  km: number;
  blocks: string[];
  lines: string[];
  reports: ReceivedReport[];
}

/** Summary per day within [from, to] (both optional, `YYYY-MM-DD`). Only reports that were applied. */
export function kmPerDay(
  reports: ReceivedReport[] | null | undefined,
  from?: IsoDate | null,
  to?: IsoDate | null,
): KmDay[] {
  const days: Record<string, KmDay> = {};
  (reports || []).forEach((x) => {
    if (!x.applied || (from && x.trafficDay < from) || (to && x.trafficDay > to)) return;
    const d =
      days[x.trafficDay] || (days[x.trafficDay] = { day: x.trafficDay, km: 0, blocks: [], lines: [], reports: [] });
    d.km = r1(d.km + x.km);
    d.blocks.push(x.blockId);
    d.reports.push(x);
    (x.trips || []).forEach((tr) => {
      if (tr.line && tr.status !== "cancelled" && d.lines.indexOf(tr.line) < 0) d.lines.push(tr.line);
    });
  });
  const num = (a: unknown, b: unknown): number => String(a).localeCompare(String(b), undefined, { numeric: true });
  return Object.keys(days)
    .sort()
    .map((k) => {
      const d = days[k] as KmDay;
      d.lines.sort(num);
      d.blocks.sort(num);
      d.reports.sort((a, b) => num(a.blockId, b.blockId));
      return d;
    });
}
