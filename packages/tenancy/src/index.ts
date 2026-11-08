/**
 * @annecto-grid/tenancy – companies, one database per company, connections and migrations (B-055).
 *
 * M1 contains the migration conventions. The company register, database per company and the
 * migration runner are built in M3. Moves here in M3 from fleet-core: modules and data flows per company
 * (`fleet-core/src/platform/integration.ts`).
 */

export * from "./migrations.ts";

/** Name of the system database. */
export const SYSTEM_DATABASE = "grid_system";

/** Name of a company's database: `grid_t_<company>`. The company key must be lower case a–z, 0–9 and `_`. */
export function tenantDatabaseName(companyKey: string): string {
  if (!/^[a-z0-9_]{1,40}$/.test(companyKey)) throw new Error(`Invalid company key: ${companyKey}`);
  return `grid_t_${companyKey}`;
}
