/** Validation of vehicles and restore from the archive (B-005, B-006, B-014). */

import { parseIso } from "./dates.ts";
import { FIELDS, TRANSMISSIONS, type ListName, type NormalizedVehicle } from "./fields.ts";
import { parseAxle, validVin } from "./identifiers.ts";
import { isEmpty } from "./normalize.ts";
import { bindsNumbers, STATUS_DEFAULTS, statusOf } from "./status.ts";
import type { Errors, ListItem, StatusDef, Vehicle } from "./types.ts";

export interface ValidationContext {
  /** Id of the vehicle being edited (excluded from duplicate checks). */
  id?: string | null;
  vehicles?: Vehicle[] | null;
  statuses?: StatusDef[] | null;
  lists?: Partial<Record<ListName, ListItem[]>> | null;
}

/**
 * Validates a normalised vehicle. Returns `{ field: { key, params } }` with i18n keys.
 * An empty object means valid.
 */
export function validateVehicle(o: NormalizedVehicle, ctx: ValidationContext): Errors {
  const e: Errors = {};
  const statuses = ctx.statuses;
  const others = (ctx.vehicles || []).filter((v) => v.id !== ctx.id);
  const binds = !statusOf(statuses, o["status"] as string | null).frees;
  const live = others.filter((v) => bindsNumbers(v, statuses));
  function err(k: string, key: string, params?: Record<string, unknown>): void {
    if (!e[k]) e[k] = { key, params: params || {} };
  }

  FIELDS.forEach((f) => {
    const v = o[f.k];
    if (f.req && isEmpty(v)) {
      err(f.k, "err.required");
      return;
    }
    if (v === null) return;
    if (f.type === "int") {
      const n = v as number;
      if (isNaN(n) || Math.floor(n) !== n) err(f.k, "err.integer");
      else if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        err(f.k, "err.range", { min: f.min, max: f.max });
      }
    }
    if (f.max && (f.type === "text" || f.type === "textarea") && String(v).length > f.max) {
      err(f.k, "err.tooLong", { max: f.max });
    }
    if (f.type === "date" && !parseIso(v)) err(f.k, "err.date");
    if (f.type === "list" && ctx.lists && !(ctx.lists[f.list as ListName] || []).some((x) => x.id === v)) {
      err(f.k, "err.unknownItem");
    }
    if (f.type === "status" && !(statuses && statuses.length ? statuses : STATUS_DEFAULTS).some((x) => x.id === v)) {
      err(f.k, "err.unknownItem");
    }
    if (f.type === "trans" && TRANSMISSIONS.indexOf(v as string) < 0) err(f.k, "err.unknownItem");
  });

  const reg = o["regNumber"] as string | null;
  const vin = o["vin"] as string | null;
  if (reg && !/^[A-Z0-9]{2,10}$/.test(reg)) err("regNumber", "err.reg");
  if (vin && !validVin(vin)) err("vin", "err.vin");
  if (o["axleConfig"] && !parseAxle(o["axleConfig"])) err("axleConfig", "err.axle");

  // The category must belong to the selected vehicle class.
  if (o["categoryId"] && o["classId"] && ctx.lists) {
    const cat = (ctx.lists.categories || []).filter((x) => x.id === o["categoryId"])[0];
    if (cat && cat.classId && cat.classId !== o["classId"]) err("categoryId", "err.categoryClass");
  }
  const regDate = o["registrationDate"] as string | null;
  const lastInsp = o["lastInspection"] as string | null;
  if (regDate && lastInsp && parseIso(regDate) && parseIso(lastInsp) && lastInsp < regDate) {
    err("lastInspection", "err.inspBeforeReg");
  }

  if (binds) {
    const fl = String(o["fleetNumber"] || "").toLowerCase();
    if (fl && live.some((v) => String(v.fleetNumber || "").toLowerCase() === fl)) err("fleetNumber", "err.dupFleet");
    if (reg && live.some((v) => v.regNumber === reg)) err("regNumber", "err.dupReg");
    if (vin && live.some((v) => v.vin === vin)) err("vin", "err.dupVin");
  }
  return e;
}

/** Can an archived vehicle be restored? Returns the fields that collide with live vehicles. */
export function restoreConflicts(v: Vehicle, vehicles: Vehicle[], statuses: StatusDef[] | null | undefined): string[] {
  if (statusOf(statuses, v.status).frees) return [];
  const live = vehicles.filter((x) => x.id !== v.id && bindsNumbers(x, statuses));
  const out: string[] = [];
  if (
    v.fleetNumber &&
    live.some((x) => String(x.fleetNumber || "").toLowerCase() === String(v.fleetNumber).toLowerCase())
  ) {
    out.push("fleetNumber");
  }
  if (v.regNumber && live.some((x) => x.regNumber === v.regNumber)) out.push("regNumber");
  if (v.vin && live.some((x) => x.vin === v.vin)) out.push("vin");
  return out;
}
