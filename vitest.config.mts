import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

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
      include: [
        "src/lib/**",
        "src/hooks/**",
        "src/contexts/**",
        "src/store/**",
        /* components that carry rules (module specs say which): auth guards, prompts and screens */
        "src/app/[locale]/_components/{RoleGuard,AdminPasswordGate,SystemPasswordPrompt,LoginPromptModal,SignOutButton,UnauthenticatedState}.tsx",
        "src/app/[locale]/(auth)/login/**",
        "src/app/[locale]/unauthorized/**",
      ],
      thresholds: {
        "src/lib/session.ts": { lines: 90, branches: 85, functions: 90 },
        "src/lib/auth-api.ts": { lines: 90, branches: 85, functions: 90 },
        "src/lib/api.ts": { lines: 90, functions: 90 },
        "src/hooks/use-api-auth.ts": { lines: 90, branches: 80, functions: 90 },
        "src/contexts/auth-context.tsx": { lines: 85, functions: 70 },
        /* auth module: rules and guards (T0). permissions.ts keeps a few exports that nothing calls yet */
        "src/lib/permissions.ts": { lines: 85, branches: 95 },
        "src/hooks/use-auth-action.ts": { lines: 95, branches: 75 },
        "**/RoleGuard.tsx": { lines: 90, branches: 85, functions: 90 },
        "**/AdminPasswordGate.tsx": { lines: 90, branches: 80 },
        "**/SystemPasswordPrompt.tsx": { lines: 90, branches: 85 },
        "**/LoginPromptModal.tsx": { lines: 90, branches: 80 },
        "**/SignOutButton.tsx": { lines: 90, branches: 85 },
        "**/UnauthenticatedState.tsx": { lines: 85 },
        "**/GoogleSignInButton.tsx": { lines: 90, branches: 80 },
      },
    },
  },
});
