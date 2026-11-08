/** Model registry: suggestions of model data from manufacturer and model (B-007). */

import { MODEL_FIELDS } from "./fields.ts";
import { isEmpty, normText } from "./normalize.ts";

export interface ModelRecord {
  id?: string;
  manufacturer?: unknown;
  model?: unknown;
  [key: string]: unknown;
}

/** Case-insensitive key of manufacturer and model, or `null` when either is missing. */
export function modelKey(manufacturer: unknown, model: unknown): string | null {
  const a = normText(manufacturer);
  const b = normText(model);
  if (!a || !b) return null;
  return (a + "|" + b).toLowerCase();
}

/** Fills empty values in `target` with values from `source`. Never overwrites. */
export function fillEmpty<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
  fields?: readonly string[],
): { value: T; changed: string[] } {
  const out: Record<string, unknown> = Object.assign({}, target);
  const changed: string[] = [];
  (fields || MODEL_FIELDS).forEach((k) => {
    if (isEmpty(out[k]) && !isEmpty(source[k])) {
      out[k] = source[k];
      changed.push(k);
    }
  });
  return { value: out as T, changed };
}

export function findModel(models: ModelRecord[], manufacturer: unknown, model: unknown): ModelRecord | null {
  const k = modelKey(manufacturer, model);
  if (!k) return null;
  for (const m of models) if (modelKey(m.manufacturer, m.model) === k) return m;
  return null;
}

export type ModelRegistryAction =
  | { op: null }
  | { op: "create"; data: ModelRecord }
  | { op: "fill"; id: string | undefined; data: ModelRecord; changed: string[] };

/** What should the registry do when a vehicle is saved? */
export function modelRegistryAction(models: ModelRecord[], vehicle: Record<string, unknown>): ModelRegistryAction {
  if (!modelKey(vehicle["manufacturer"], vehicle["model"])) return { op: null };
  const hit = findModel(models, vehicle["manufacturer"], vehicle["model"]);
  const vals: Record<string, unknown> = {};
  MODEL_FIELDS.forEach((k) => {
    vals[k] = isEmpty(vehicle[k]) ? null : vehicle[k];
  });
  if (!hit) {
    return {
      op: "create",
      data: Object.assign({ manufacturer: normText(vehicle["manufacturer"]), model: normText(vehicle["model"]) }, vals),
    };
  }
  const r = fillEmpty(hit, vals);
  return r.changed.length ? { op: "fill", id: hit.id, data: r.value, changed: r.changed } : { op: null };
}
