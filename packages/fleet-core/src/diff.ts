/** Field changes between two versions of a vehicle, for the change history. */

import { FIELDS } from "./fields.ts";
import type { FieldChange } from "./types.ts";

function same(a: unknown, b: unknown): boolean {
  return (a === undefined ? null : a) === (b === undefined ? null : b);
}

/** Changes for every field in `FIELDS`. `undefined` counts as `null`. */
export function diff(oldV: Record<string, unknown> | null | undefined, newV: Record<string, unknown>): FieldChange[] {
  const out: FieldChange[] = [];
  FIELDS.forEach((f) => {
    const a = oldV ? oldV[f.k] : null;
    const b = newV[f.k];
    if (!same(a, b)) out.push({ f: f.k, from: a === undefined ? null : a, to: b === undefined ? null : b });
  });
  return out;
}
