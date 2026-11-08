import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env["APP_VERSION"] || pkg.version),
    __GIT_COMMIT__: JSON.stringify(process.env["GIT_COMMIT"] || "unknown"),
  },
  server: {
    port: 5173,
    // In development the API runs on its own port; the browser only talks to /api on the web origin.
    proxy: {
      "/api": {
        target: process.env["API_URL"] || "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "node",
  },
});
