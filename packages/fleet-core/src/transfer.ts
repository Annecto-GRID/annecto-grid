/** Sending vehicles between companies (B-039). */

import { TRANSFERRED } from "./status.ts";
import type { ListItem, Names, Vehicle } from "./types.ts";

export type SendBlockReason = "missing" | "archived" | "pending" | "";

/** Why a vehicle cannot be sent: archived, already transferred or awaiting an answer. Empty = can be sent. */
export function sendBlock(v: Vehicle | null | undefined): SendBlockReason {
  if (!v) return "missing";
  if (v.archived) return "archived";
  if (v.status === TRANSFERRED || (v.transfer && v.transfer.state === "pending")) return "pending";
  return "";
}

/**
 * Matches a master data value from another company against the own list by name
 * (all languages, case-insensitive). Only active values match. Returns the id or `null`.
 */
export function matchByName(
  names: Names | string | null | undefined,
  list: ListItem[] | null | undefined,
): string | null {
  const want = (typeof names === "string" ? [names] : Object.keys(names || {}).map((k) => (names as Names)[k]))
    .filter(Boolean)
    .map((x) => String(x).trim().toLowerCase());
  if (!want.length) return null;
  const hit = (list || []).filter((it) => {
    const have = [it.name]
      .concat(Object.keys(it.names || {}).map((k) => (it.names as Names)[k] as string))
      .filter(Boolean)
      .map((x) => String(x).trim().toLowerCase());
    return it.active !== false && have.some((h) => want.indexOf(h) >= 0);
  })[0];
  return hit ? hit.id : null;
}
