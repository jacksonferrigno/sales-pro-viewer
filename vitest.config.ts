import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Vitest sets NODE_ENV=test. Next's loadEnvConfig skips .env.local in test mode.
loadDotenv({ path: path.join(rootDir, ".env.local") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      // `server-only` throws outside the Next bundler; tests use the no-op export.
      "server-only": path.resolve(rootDir, "node_modules/server-only/empty.js"),
    },
  },
});
