/** Odometer reading when the vehicle was added and km added by Dispatcher reports (B-027, B-036). */

import type { Vehicle, VehicleEvent } from "./types.ts";

/** A mileage report as received; `applied` = it was added to the odometer. */
export interface AppliedReport {
  km?: unknown;
  applied?: boolean;
  [key: string]: unknown;
}

/** Km added via Dispatcher reports (only reports that were added to the odometer). */
export function addedKm(reports: AppliedReport[] | null | undefined): number {
  return (reports || []).reduce<number>(
    (s, r) => (!r.applied ? s : Math.round((s + (Number(r.km) || 0)) * 10) / 10),
    0,
  );
}

/**
 * Odometer reading when the vehicle was added to the system (B-036): the stored value,
 * otherwise the value in the "created" event. Older records without a stored value: the value in
 * the "created" event, otherwise the current reading minus Dispatcher's km when the reading has never
 * been changed manually. Otherwise unknown (`null`).
 */
export function initialOdometer(
  v: Vehicle | null | undefined,
  events: VehicleEvent[] | null | undefined,
  reports: AppliedReport[] | null | undefined,
): number | null {
  if (v && typeof v.initialOdometer === "number") return v.initialOdometer;
  let c: number | null = null;
  let manual = false;
  for (const e of events || []) {
    for (const x of e.changes || []) {
      if (x.f !== "odometer") continue;
      if (e.type === "created") {
        if (typeof x.to === "number") c = x.to;
      } else manual = true;
    }
  }
  if (c !== null) return c;
  if (!manual && v && typeof v.odometer === "number") {
    return Math.round((v.odometer - addedKm(reports)) * 10) / 10;
  }
  return null;
}
