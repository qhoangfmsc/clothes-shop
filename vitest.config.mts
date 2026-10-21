import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import coverage from "./tests/_support/coverage.json";

const root = fileURLToPath(new URL(".", import.meta.url));

/* Unit, component and integration tests; see tests/README.md. Coverage thresholds only go up, never down. */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: /^@\//, replacement: root }] },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    setupFiles: ["tests/_support/setup.ts"],
    env: { NEXT_PUBLIC_API_URL: "http://api.test" },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: coverage.include,
      thresholds: coverage.thresholds,
    },
  },
});
