/**
 * Calls to the API. The web app reaches the API under `/api` on its own origin; the web server
 * (nginx in the container, Vite in development) forwards those requests to the API.
 */

import type { VersionResponse } from "@annecto-grid/contracts";

export const API_BASE = "/api";

/** Checks the shape of a `/version` response before it is used. */
export function isVersionResponse(x: unknown): x is VersionResponse {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return ["name", "version", "commit", "environment"].every((k) => typeof o[k] === "string" && o[k] !== "");
}

export class ApiError extends Error {
  override name = "ApiError";
}

export async function fetchVersion(fetchFn: typeof fetch = fetch, signal?: AbortSignal): Promise<VersionResponse> {
  const res = await fetchFn(`${API_BASE}/version`, { headers: { accept: "application/json" }, signal: signal ?? null });
  if (!res.ok) throw new ApiError(`GET /version: HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (!isVersionResponse(body)) throw new ApiError("GET /version: unexpected response");
  return body;
}
