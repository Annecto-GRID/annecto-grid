/** Change history: manual entries, history lines, corrections and order (B-023, B-026, B-033, B-036). */

import { parseIso, todayIso } from "./dates.ts";
import { normText } from "./normalize.ts";
import type { Errors, IsoDate, IsoTimestamp, LineOverride, VehicleEvent } from "./types.ts";

/** A manual history entry as entered in the form. */
export interface NoteInput {
  date?: unknown;
  text?: unknown;
}

/** The date may be in the past but not in the future. The text is required (B-023). */
export function validateNote(n: NoteInput, today?: IsoDate): Errors {
  const e: Errors = {};
  const td = today || todayIso();
  if (!parseIso(n.date)) e["date"] = { key: "err.date", params: {} };
  else if ((n.date as string) > td) e["date"] = { key: "err.future", params: {} };
  const tx = normText(n.text);
  if (!tx) e["text"] = { key: "err.required", params: {} };
  else if (tx.length > 1000) e["text"] = { key: "err.tooLong", params: { max: 1000 } };
  return e;
}

/** Date of the event: the chosen date for manual entries, otherwise the registration day (system time zone). */
export function eventDay(ev: VehicleEvent): IsoDate {
  return ev.eventDate || (ev.at ? todayIso(new Date(ev.at)) : "");
}

/** Deleted manual entries are hidden but kept in the data (B-033). */
export function visibleHistory(events: VehicleEvent[] | null | undefined): VehicleEvent[] {
  return (events || []).filter((e) => !e.deleted);
}

/** Key of an entry: the id when present, otherwise the registration time (older entries without id). */
export function histKey(e: VehicleEvent): string {
  return e.id || "at:" + e.at;
}

/** A base line of an event, produced by the caller's `describe` function. */
export interface BaseLine {
  id: string;
  text: string;
}

/** A history line as shown: "date - text". */
export interface HistoryLine {
  key: string;
  lid: string;
  date: IsoDate;
  text: string;
  at: IsoTimestamp;
  ord: number;
  type: string;
  edited: boolean;
  ev: VehicleEvent;
}

/**
 * History lines (B-036): every event is shown as one or more lines "date - text".
 * `describe(e)` gives the base lines `[{ id, text }]` of an event. Corrections and deletions of
 * system lines are stored in the event as `e.lines[id] = { eventDate, text, deleted, editedAt, editedBy, prev }`,
 * so that the original event is kept unchanged. Manual entries are changed directly (B-033).
 * Sorted oldest first by date, then registration time, then original order.
 */
export function historyLines(
  events: VehicleEvent[] | null | undefined,
  describe: (e: VehicleEvent) => BaseLine[] | null | undefined,
): HistoryLine[] {
  const out: HistoryLine[] = [];
  let ord = 0;
  visibleHistory(events).forEach((e) => {
    (describe(e) || []).forEach((bl) => {
      const ov = (e.lines || {})[bl.id];
      ord++;
      if (ov && ov.deleted) return;
      out.push({
        key: histKey(e),
        lid: bl.id,
        date: (ov && ov.eventDate) || eventDay(e),
        text: ov && typeof ov.text === "string" ? ov.text : bl.text,
        at: e.at || "",
        ord,
        type: e.type,
        edited: !!(ov || e.editedAt),
        ev: e,
      });
    });
  });
  return out.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    return a.ord - b.ord;
  });
}

export interface LineChange {
  eventDate?: IsoDate;
  text?: string;
  deleted?: boolean;
}

/**
 * Corrects a line in a system event. The previous content is saved in `prev`.
 * Only changed values are stored. Returns a new event; the input is not modified.
 */
export function editLine(
  e: VehicleEvent,
  lid: string,
  change: LineChange,
  base: string,
  at: IsoTimestamp,
  by: unknown,
): VehicleEvent {
  const lines: Record<string, LineOverride> = Object.assign({}, e.lines || {});
  const old: LineOverride = lines[lid] || {};
  const cur = {
    eventDate: old.eventDate || eventDay(e),
    text: typeof old.text === "string" ? old.text : base,
  };
  let nx: LineOverride = {
    editedAt: at,
    editedBy: by,
    prev: (old.prev || []).concat([
      { eventDate: cur.eventDate, text: cur.text, at: old.editedAt || e.at, by: old.editedBy || e.by },
    ]),
  };
  if (change.deleted) {
    nx = Object.assign({}, old, { deleted: { at, by } });
  } else {
    if (change.eventDate && change.eventDate !== eventDay(e)) nx.eventDate = change.eventDate;
    if (typeof change.text === "string" && change.text !== base) nx.text = change.text;
  }
  lines[lid] = nx;
  return Object.assign({}, e, { lines });
}

/** The history is read top-down: oldest event first (B-026). */
export function sortHistory(events: VehicleEvent[] | null | undefined): VehicleEvent[] {
  return (events || []).slice().sort((a, b) => {
    const da = eventDay(a);
    const db = eventDay(b);
    if (da !== db) return da < db ? -1 : 1;
    return (a.at || "") < (b.at || "") ? -1 : (a.at || "") > (b.at || "") ? 1 : 0;
  });
}
