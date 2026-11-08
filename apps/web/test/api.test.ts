import { describe, expect, it } from "vitest";
import { ApiError, fetchVersion, isVersionResponse } from "../src/api.ts";

const response = (status: number, body: unknown) =>
  (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;

describe("web api client", () => {
  const info = { name: "Annecto Grid", version: "0.1.0", commit: "abc1234", environment: "test" };

  it("reads the version", async () => {
    await expect(fetchVersion(response(200, info))).resolves.toEqual(info);
  });

  it("rejects errors and unexpected responses", async () => {
    await expect(fetchVersion(response(502, {}))).rejects.toBeInstanceOf(ApiError);
    await expect(fetchVersion(response(200, { name: "x" }))).rejects.toThrow(/unexpected response/);
  });

  it("checks the response shape", () => {
    expect(isVersionResponse(info)).toBe(true);
    expect(isVersionResponse(null)).toBe(false);
    expect(isVersionResponse({ ...info, version: "" })).toBe(false);
    expect(isVersionResponse({ ...info, commit: 1 })).toBe(false);
  });
});
