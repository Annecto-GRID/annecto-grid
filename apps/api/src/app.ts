/**
 * The API application. Built by a function so that tests can create it without opening a port.
 * M1: system endpoints only. Module routes are registered as Fastify plugins from M3.
 */

import {
  healthResponseSchema,
  SYSTEM_NAME,
  versionResponseSchema,
  type HealthResponse,
  type VersionResponse,
} from "@annecto-grid/contracts";
import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "./config.ts";

export interface BuildOptions {
  /** Log requests (off in tests). */
  logger?: boolean;
}

export function buildApp(config: ApiConfig, options: BuildOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ? { level: config.logLevel } : false,
    // Never trust client-supplied host or forwarding headers for anything security related.
    trustProxy: false,
  });

  app.get("/health", { schema: { response: { 200: healthResponseSchema } } }, async (): Promise<HealthResponse> => {
    return { status: "ok" };
  });

  app.get("/version", { schema: { response: { 200: versionResponseSchema } } }, async (): Promise<VersionResponse> => {
    return {
      name: SYSTEM_NAME,
      version: config.version,
      commit: config.commit,
      environment: config.environment,
    };
  });

  return app;
}
