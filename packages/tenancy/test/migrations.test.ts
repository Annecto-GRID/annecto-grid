import { describe, expect, it } from "vitest";
import { orderMigrations, parseMigrationName, tenantDatabaseName } from "../src/index.ts";

describe("tenancy", () => {
  it("parses migration file names", () => {
    expect(parseMigrationName("0001_create_companies.sql")).toEqual({
      seq: 1,
      name: "create_companies",
      file: "0001_create_companies.sql",
    });
    expect(parseMigrationName("1_x.sql")).toBeNull();
    expect(parseMigrationName("0001_Create.sql")).toBeNull();
    expect(parseMigrationName("0001_x__y.sql")).toBeNull();
  });

  it("orders migrations and rejects gaps and duplicates", () => {
    expect(orderMigrations(["0002_b.sql", ".gitkeep", "0001_a.sql"]).map((m) => m.file)).toEqual([
      "0001_a.sql",
      "0002_b.sql",
    ]);
    expect(orderMigrations([])).toEqual([]);
    expect(() => orderMigrations(["0001_a.sql", "0003_c.sql"])).toThrow(/gap before 0003_c\.sql/);
    expect(() => orderMigrations(["0001_a.sql", "0001_b.sql"])).toThrow(/used twice/);
    expect(() => orderMigrations(["0001-a.sql"])).toThrow(/Invalid migration file name/);
  });

  it("names company databases", () => {
    expect(tenantDatabaseName("exn")).toBe("grid_t_exn");
    expect(() => tenantDatabaseName("EXN; drop")).toThrow(/Invalid company key/);
  });

  it("keeps the repository's migration folders valid", async () => {
    const { readdirSync } = await import("node:fs");
    for (const dir of ["system", "tenant"]) {
      const files = readdirSync(new URL(`../migrations/${dir}/`, import.meta.url));
      expect(() => orderMigrations(files)).not.toThrow();
    }
  });
});
