/** Entry point: reads the configuration, starts the API and stops it cleanly on SIGTERM/SIGINT. */

import { buildApp } from "./app.ts";
import { ConfigError, loadConfig, type ApiConfig } from "./config.ts";

function configOrExit(): ApiConfig {
  try {
    return loadConfig(process.env);
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(`Configuration error: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
}

async function main(): Promise<void> {
  const config = configOrExit();
  const app = buildApp(config, { logger: true });

  const stop = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    process.exit(0);
  };
  process.once("SIGTERM", () => void stop("SIGTERM"));
  process.once("SIGINT", () => void stop("SIGINT"));

  await app.listen({ host: config.host, port: config.port });
  app.log.info({ version: config.version, commit: config.commit, environment: config.environment }, "api started");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
