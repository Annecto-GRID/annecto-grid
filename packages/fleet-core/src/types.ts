/**
 * Shared types for Fleet Manager's core logic.
 *
 * The prototype stored loosely shaped documents. These types describe what the logic reads;
 * fields are optional where the prototype tolerated missing values.
 */

/** Calendar date `YYYY-MM-DD`. */
export type IsoDate = string;
/** UTC timestamp, e.g. `2026-11-07T21:00:00.000Z`. */
export type IsoTimestamp = string;
/** Language code, e.g. `sv`, `en`, `de`. */
export type LangCode = string;
/** Names per language, e.g. `{ sv: "Påställd", en: "In service" }`. */
export type Names = Partial<Record<LangCode, string | null>>;

/** A validation error as an i18n key with parameters. */
export interface FieldError {
  key: string;
  params: Record<string, unknown>;
}
/** Field → error. An empty object means valid. */
export type Errors = Record<string, FieldError>;

/** A normalised value of a vehicle field. */
export type FieldValue = string | number | null;
/** A normalised value of a custom field. */
export type CustomValue = string | number | boolean | null;

/** One field change in the change history. */
export interface FieldChange {
  f: string;
  from: unknown;
  to: unknown;
}

/** A vehicle status (master data). */
export interface StatusDef {
  id: string;
  name: string;
  names?: Names;
  color: string;
  active: boolean;
  /** The status frees fleet number, registration number and VIN for other vehicles. */
  frees: boolean;
  clearsPlacement?: boolean;
}

/** A master data value (drop-down list item). */
export interface ListItem {
  id: string;
  name?: string;
  names?: Names;
  active?: boolean;
  /** Categories belong to a vehicle class. */
  classId?: string | null;
}

/** A vehicle as the core logic reads it. */
export interface Vehicle {
  id?: string;
  status?: string | null;
  fleetNumber?: string | null;
  regNumber?: string | null;
  vin?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  modelYear?: number | string | null;
  classId?: string | null;
  categoryId?: string | null;
  registrationDate?: IsoDate | null;
  lastInspection?: IsoDate | null;
  odometer?: number | string | null;
  initialOdometer?: number | null;
  info?: string | null;
  archived?: boolean;
  transfer?: { state: string } | null;
  custom?: Record<string, CustomValue | undefined> | null;
  customNotes?: Record<string, string | null | undefined> | null;
  [field: string]: unknown;
}

/** Correction or deletion of one system line in an event (B-036). */
export interface LineOverride {
  eventDate?: IsoDate;
  text?: string;
  deleted?: { at: IsoTimestamp; by?: unknown };
  editedAt?: IsoTimestamp;
  editedBy?: unknown;
  prev?: Array<{ eventDate: IsoDate; text: string; at?: IsoTimestamp; by?: unknown }>;
}

/** A history event for a vehicle. */
export interface VehicleEvent {
  id?: string;
  type: string;
  at?: IsoTimestamp;
  by?: unknown;
  /** Chosen date of a manual entry. */
  eventDate?: IsoDate;
  text?: string;
  deleted?: unknown;
  editedAt?: IsoTimestamp;
  changes?: FieldChange[];
  lines?: Record<string, LineOverride>;
  [field: string]: unknown;
}
