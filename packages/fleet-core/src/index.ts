/**
 * @annecto-grid/fleet-core – Fleet Manager's core logic.
 *
 * Pure logic without DOM, database or network, carried over from the prototype's `Core`
 * (Fleet Manager · Annecto Grid, prototype v2) without changes to its behaviour (M1).
 * The public names are the same as in the prototype.
 *
 * Modules under `platform/` belong to the platform and move to their own packages in M3.
 */

export * from "./types.ts";
export * from "./normalize.ts";
export * from "./identifiers.ts";
export * from "./dates.ts";
export * from "./status.ts";
export * from "./inspection.ts";
export * from "./history.ts";
export * from "./odometer.ts";
export * from "./transfer.ts";
export * from "./mileage.ts";
export * from "./statistics.ts";
export * from "./custom-fields.ts";
export * from "./fields.ts";
export * from "./validation.ts";
export * from "./diff.ts";
export * from "./model-registry.ts";
export * from "./platform/texts.ts";
export * from "./platform/branding.ts";
export * from "./platform/integration.ts";
