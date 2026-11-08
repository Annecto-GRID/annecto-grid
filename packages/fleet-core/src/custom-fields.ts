/**
 * Custom fields per company (B-019), supplementary information (B-046) and comments on
 * custom fields (B-049).
 *
 * - `yesno`: Yes/No/Unknown with optional alternatives on Yes. Stored as `"yes"`, `"yes:<option-id>"`
 *   or `"no"`; `null` = Unknown.
 * - `list` with `allowOther`: besides the options, an own value (free text) can be given ("Other").
 * - `section`: `"tech"` (technical data) or `"equip"` (equipment). Yes/No/Unknown goes under equipment by default.
 */

import { parseIso } from "./dates.ts";
import { normNum, normText } from "./normalize.ts";
import type { CustomValue, Errors, FieldChange, Names, Vehicle } from "./types.ts";

export const CUSTOM_TYPES = ["text", "number", "date", "bool", "list", "yesno"] as const;
export type CustomType = (typeof CUSTOM_TYPES)[number];

export const CUSTOM_SECTIONS = ["tech", "equip"] as const;
export type CustomSection = (typeof CUSTOM_SECTIONS)[number];

export interface CustomOption {
  id: string;
  name?: string;
  names?: Names;
}

/** Definition of a custom field. */
export interface CustomFieldDef {
  id: string;
  name?: string;
  names?: Names;
  type: CustomType;
  options?: CustomOption[];
  active?: boolean;
  section?: CustomSection;
  allowOther?: boolean;
  allowComment?: boolean;
}

export function customSection(
  def: Pick<CustomFieldDef, "type" | "section"> | null | undefined,
): CustomSection | null | undefined {
  if (def && (CUSTOM_SECTIONS as readonly unknown[]).indexOf(def.section) >= 0) return def.section;
  if (!def) return def;
  return def.type === "yesno" || def.type === "bool" ? "equip" : "tech";
}

export interface YesNo {
  a: "yes" | "no";
  opt: string | null;
}

export function parseYesNo(v: unknown): YesNo | null {
  if (v === null || v === undefined) return null;
  const m = /^(yes|no)(?::(.+))?$/.exec(String(v));
  return m ? { a: m[1] as YesNo["a"], opt: m[2] || null } : null;
}

/** Does the vehicle have any supplementary information (custom fields, comments or free text)? */
export function hasExtra(v: Vehicle | null | undefined, defs: CustomFieldDef[] | null | undefined): boolean {
  if (v && v.info && String(v.info).trim()) return true;
  const c = (v && v.custom) || {};
  const n = (v && v.customNotes) || {};
  return (defs || []).some(
    (d) =>
      d.active !== false &&
      ((c[d.id] !== null && c[d.id] !== undefined && c[d.id] !== "") || (d.allowComment && n[d.id])),
  );
}

/** Maximum length of a comment on a custom field. An empty comment is not stored. */
export const NOTE_MAX = 200;

export function normNotes(
  raw: Record<string, unknown> | null | undefined,
  defs: CustomFieldDef[] | null | undefined,
): Record<string, string> {
  const o: Record<string, string> = {};
  (defs || []).forEach((d) => {
    if (!d.allowComment || !raw) return;
    const x = normText(raw[d.id]);
    if (x) o[d.id] = x;
  });
  return o;
}

export function validateNotes(
  notes: Record<string, unknown> | null | undefined,
  defs: CustomFieldDef[] | null | undefined,
): Errors {
  const e: Errors = {};
  (defs || []).forEach((d) => {
    const x = notes && notes[d.id];
    if (x && String(x).length > NOTE_MAX) e["cfn:" + d.id] = { key: "err.tooLong", params: { max: NOTE_MAX } };
  });
  return e;
}

export function diffNotes(
  oldN: Record<string, string> | null | undefined,
  newN: Record<string, string> | null | undefined,
  defs: CustomFieldDef[] | null | undefined,
): FieldChange[] {
  const out: FieldChange[] = [];
  (defs || []).forEach((d) => {
    const a = oldN && oldN[d.id] ? oldN[d.id] : null;
    const b = newN && newN[d.id] ? newN[d.id] : null;
    if (a !== b) out.push({ f: "cfn:" + d.id, from: a, to: b });
  });
  return out;
}

export function normCustom(def: Pick<CustomFieldDef, "type">, raw: unknown): CustomValue {
  if (raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")) return null;
  switch (def.type) {
    case "yesno": {
      const p = parseYesNo(raw);
      return p ? p.a + (p.a === "yes" && p.opt ? ":" + p.opt : "") : null;
    }
    case "list":
      return normText(raw);
    case "number":
      return normNum(raw);
    case "bool":
      return raw === true || raw === "true" ? true : raw === false || raw === "false" ? false : null;
    case "text":
      return normText(raw);
    default:
      return String(raw);
  }
}

export function validateCustom(
  values: Record<string, CustomValue> | null | undefined,
  defs: CustomFieldDef[] | null | undefined,
): Errors {
  const e: Errors = {};
  (defs || []).forEach((d) => {
    const v = values ? values[d.id] : null;
    const k = "cf:" + d.id;
    if (v === null || v === undefined) return;
    if (d.type === "number" && (typeof v !== "number" || isNaN(v))) e[k] = { key: "err.number", params: {} };
    if (d.type === "date" && !parseIso(v)) e[k] = { key: "err.date", params: {} };
    if (d.type === "text" && String(v).length > 200) e[k] = { key: "err.tooLong", params: { max: 200 } };
    if (d.type === "list" && !(d.options || []).some((o) => o.id === v)) {
      if (!d.allowOther) e[k] = { key: "err.unknownItem", params: {} };
      else if (String(v).length > 200) e[k] = { key: "err.tooLong", params: { max: 200 } };
    }
    if (d.type === "yesno") {
      const yn = parseYesNo(v);
      if (!yn || (yn.opt && (yn.a !== "yes" || !(d.options || []).some((o) => o.id === yn.opt)))) {
        e[k] = { key: "err.unknownItem", params: {} };
      }
    }
  });
  return e;
}

export function diffCustom(
  oldC: Record<string, CustomValue> | null | undefined,
  newC: Record<string, CustomValue> | null | undefined,
  defs: CustomFieldDef[] | null | undefined,
): FieldChange[] {
  const out: FieldChange[] = [];
  (defs || []).forEach((d) => {
    const a = oldC && oldC[d.id] !== undefined ? oldC[d.id] : null;
    const b = newC && newC[d.id] !== undefined ? newC[d.id] : null;
    if (a !== b) out.push({ f: "cf:" + d.id, from: a, to: b });
  });
  return out;
}
