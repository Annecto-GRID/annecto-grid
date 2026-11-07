/** Vehicle statuses (B-005, B-039). */

import type { StatusDef, Vehicle } from "./types.ts";

export const STATUS_DEFAULTS: StatusDef[] = [
  {
    id: "in_service",
    name: "Påställd",
    names: { sv: "Påställd", en: "In service", de: "Zugelassen" },
    color: "green",
    active: true,
    frees: false,
    clearsPlacement: false,
  },
  {
    id: "off_road",
    name: "Avställd",
    names: { sv: "Avställd", en: "Laid up", de: "Vorübergehend stillgelegt" },
    color: "orange",
    active: true,
    frees: false,
    clearsPlacement: false,
  },
  {
    id: "pre_registered",
    name: "Förregistrerad",
    names: { sv: "Förregistrerad", en: "Pre-registered", de: "Vorregistriert" },
    color: "blue",
    active: true,
    frees: false,
    clearsPlacement: false,
  },
  {
    id: "exported",
    name: "Export",
    names: { sv: "Export", en: "Exported", de: "Exportiert" },
    color: "purple",
    active: true,
    frees: false,
    clearsPlacement: true,
  },
  {
    id: "deregistered",
    name: "Avregistrerad",
    names: { sv: "Avregistrerad", en: "Deregistered", de: "Abgemeldet" },
    color: "gray",
    active: true,
    frees: true,
    clearsPlacement: true,
  },
  {
    id: "transferred",
    name: "Avförd",
    names: { sv: "Avförd", en: "Transferred out", de: "Abgegeben" },
    color: "gray",
    active: true,
    frees: true,
    clearsPlacement: true,
  },
];

/** Status set when a vehicle is sent to another company (B-039). */
export const TRANSFERRED = "transferred";

/** The company's status definition, or a neutral placeholder for an unknown id. */
export function statusOf(list: StatusDef[] | null | undefined, id: string | null | undefined): StatusDef {
  const l = list && list.length ? list : STATUS_DEFAULTS;
  for (const s of l) if (s.id === id) return s;
  return { id: id || "", name: id || "–", color: "gray", active: true, frees: false };
}

/** A vehicle "binds" its numbers unless it is archived or has a status that frees them. */
export function bindsNumbers(v: Vehicle, statuses: StatusDef[] | null | undefined): boolean {
  return !v.archived && !statusOf(statuses, v.status).frees;
}
