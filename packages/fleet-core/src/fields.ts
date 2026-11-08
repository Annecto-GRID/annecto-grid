/** Vehicle fields: definitions and normalisation. */

import { isEmpty, normAxle, normNum, normReg, normText, normVin } from "./normalize.ts";
import type { FieldValue } from "./types.ts";

export type FieldType = "text" | "reg" | "vin" | "axle" | "int" | "date" | "list" | "status" | "trans" | "textarea";

export type FieldGroup =
  | "identity"
  | "placement"
  | "vehicle"
  | "dims"
  | "doors"
  | "capacity"
  | "tech"
  | "inspection"
  | "other";

/** Master data lists a field can refer to. */
export type ListName = "units" | "depots" | "classes" | "categories" | "fuels" | "emissions";

export interface FieldDef {
  k: string;
  type: FieldType;
  g: FieldGroup;
  req?: boolean;
  min?: number;
  max?: number;
  list?: ListName;
  /** The value belongs to the model and is suggested from the model registry (B-007). */
  model?: boolean;
}

export const FIELDS: readonly FieldDef[] = [
  { k: "status", type: "status", g: "identity", req: true },
  { k: "fleetNumber", type: "text", g: "identity", req: true, max: 20 },
  { k: "regNumber", type: "reg", g: "identity" },
  { k: "vin", type: "vin", g: "identity" },
  { k: "unitId", type: "list", list: "units", g: "placement" },
  { k: "depotId", type: "list", list: "depots", g: "placement" },
  { k: "manufacturer", type: "text", g: "vehicle", max: 60 },
  { k: "model", type: "text", g: "vehicle", max: 60 },
  { k: "modelYear", type: "int", g: "vehicle", min: 1900, max: 2100 },
  { k: "color", type: "text", g: "vehicle", max: 60 },
  { k: "classId", type: "list", list: "classes", g: "vehicle" },
  { k: "categoryId", type: "list", list: "categories", g: "vehicle" },
  { k: "length", type: "int", g: "dims", min: 1, max: 30000, model: true },
  { k: "width", type: "int", g: "dims", min: 1, max: 5000, model: true },
  { k: "height", type: "int", g: "dims", min: 1, max: 6000, model: true },
  { k: "axleConfig", type: "axle", g: "dims", model: true },
  { k: "doorsFront", type: "int", g: "doors", min: 0, max: 9, model: true },
  { k: "doorsMid", type: "int", g: "doors", min: 0, max: 9, model: true },
  { k: "doorsRear", type: "int", g: "doors", min: 0, max: 9, model: true },
  { k: "seats", type: "int", g: "capacity", min: 0, max: 300 },
  { k: "foldingSeats", type: "int", g: "capacity", min: 0, max: 100 },
  { k: "standing", type: "int", g: "capacity", min: 0, max: 300 },
  { k: "wheelchairSpaces", type: "int", g: "capacity", min: 0, max: 20 },
  { k: "fuelId", type: "list", list: "fuels", g: "tech" },
  { k: "emissionId", type: "list", list: "emissions", g: "tech" },
  { k: "transmission", type: "trans", g: "tech" },
  // Estimated range (km) on a full tank or fully charged battery. Standard field so that Planner
  // and Dispatcher can read it via Fleet Manager's API (B-058).
  { k: "estimatedRange", type: "int", g: "tech", min: 1, max: 5000 },
  { k: "registrationDate", type: "date", g: "inspection" },
  { k: "lastInspection", type: "date", g: "inspection" },
  { k: "odometer", type: "int", g: "inspection", min: 0, max: 9999999 },
  { k: "info", type: "textarea", g: "other", max: 2000 },
];

export const GROUPS: readonly FieldGroup[] = [
  "identity",
  "placement",
  "vehicle",
  "dims",
  "doors",
  "capacity",
  "tech",
  "inspection",
  "other",
];

export const MODEL_FIELDS: readonly string[] = FIELDS.filter((f) => f.model).map((f) => f.k);

export const TRANSMISSIONS: readonly string[] = ["manual", "automatic"];

/** A vehicle with every field normalised. */
export type NormalizedVehicle = Record<string, FieldValue>;

export function normField(f: FieldDef, raw: unknown): FieldValue {
  switch (f.type) {
    case "reg":
      return normReg(raw);
    case "vin":
      return normVin(raw);
    case "axle":
      return normAxle(raw);
    case "int":
      return normNum(raw);
    case "textarea":
      return isEmpty(raw) ? null : String(raw).trim();
    case "text":
      return normText(raw);
    default:
      return isEmpty(raw) ? null : String(raw);
  }
}

export function normalizeVehicle(raw: Record<string, unknown>): NormalizedVehicle {
  const o: NormalizedVehicle = {};
  FIELDS.forEach((f) => {
    o[f.k] = normField(f, raw[f.k]);
  });
  return o;
}
