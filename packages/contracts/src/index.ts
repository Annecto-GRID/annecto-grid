/**
 * @annecto-grid/contracts – versioned API contracts and events between modules.
 *
 * M1 contains only the system endpoints. Module APIs (OpenAPI) and events are added
 * in M3 and M5. A contract is changed only in a backwards compatible way; breaking changes
 * get a new version.
 */

export * from "./system.ts";

/** The system's name as shown to users and reported by `/version`. */
export const SYSTEM_NAME = "Annecto Grid";
