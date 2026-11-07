/**
 * API configuration from environment variables. Validated at start; an invalid value stops the
 * server with a clear message instead of running with a guess. Secrets are never logged.
 */

import pkg from "../package.json" with { type: "json" };

export interface ApiConfig {
  host: string;
  port: number;
  /** Released version; defaults to the version in package.json. */
  version: string;
  /** Git commit the build was made from. */
  commit: string;
  environment: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
}

const LOG_LEVELS: readonly ApiConfig["logLevel"][] = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];

export class ConfigError extends Error {
  override name = "ConfigError";
}

function text(env: Record<string, string | undefined>, key: string, fallback: string): string {
  const v = env[key]?.trim();
  return v ? v : fallback;
}

export function loadConfig(env: Record<string, string | undefined>): ApiConfig {
  const portText = text(env, "PORT", "3000");
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(`PORT must be an integer between 1 and 65535, got "${portText}"`);
  }
  const logLevel = text(env, "LOG_LEVEL", "info") as ApiConfig["logLevel"];
  if (!LOG_LEVELS.includes(logLevel)) {
    throw new ConfigError(`LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}, got "${logLevel}"`);
  }
  return {
    host: text(env, "HOST", "0.0.0.0"),
    port,
    version: text(env, "APP_VERSION", pkg.version),
    commit: text(env, "GIT_COMMIT", "unknown"),
    environment: text(env, "APP_ENV", "development"),
    logLevel,
  };
}
