import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { ConfigError, loadConfig } from "../src/config.ts";

describe("api", () => {
  const config = loadConfig({ APP_VERSION: "1.2.3", GIT_COMMIT: "abc1234", APP_ENV: "test" });
  const app = buildApp(config);
  afterAll(() => app.close());

  it("GET /health answers ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /version reports name, version, commit and environment", async () => {
    const res = await app.inject({ method: "GET", url: "/version" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.json()).toEqual({ name: "Annecto Grid", version: "1.2.3", commit: "abc1234", environment: "test" });
  });

  it("answers 404 for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
  });
});

describe("config", () => {
  it("has defaults", () => {
    const c = loadConfig({});
    expect(c).toMatchObject({
      host: "0.0.0.0",
      port: 3000,
      commit: "unknown",
      environment: "development",
      logLevel: "info",
    });
    expect(c.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("rejects invalid values", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: "70000" })).toThrow(/PORT/);
    expect(() => loadConfig({ LOG_LEVEL: "loud" })).toThrow(/LOG_LEVEL/);
  });
});
