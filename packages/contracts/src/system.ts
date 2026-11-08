/**
 * System endpoints, version 1. Used by the API, the web app and, in M2, by the deployment check.
 * Each contract has a TypeScript type and a JSON Schema; the API validates its responses with the schema.
 */

/** `GET /health` – the service is running. */
export interface HealthResponse {
  status: "ok";
}

/** `GET /version` – what is deployed. */
export interface VersionResponse {
  /** System name. */
  name: string;
  /** Semantic version of the release. */
  version: string;
  /** Git commit the build was made from, or `"unknown"` for a local build. */
  commit: string;
  /** Deployment environment, e.g. `development`, `test`, `production`. */
  environment: string;
}

export const healthResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string", const: "ok" },
  },
} as const;

export const versionResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "version", "commit", "environment"],
  properties: {
    name: { type: "string", minLength: 1 },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+(?:[-+][0-9A-Za-z.-]+)?$" },
    commit: { type: "string", minLength: 1 },
    environment: { type: "string", minLength: 1 },
  },
} as const;
