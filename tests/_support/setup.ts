import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { google } from "./google";
import { server } from "./msw-server";
import { navigation } from "./navigation";

/* Two modules that cannot run in a unit test are replaced for every test (details in each stand-in):
   the locale-aware router and Google's sign-in popup. Real ones are exercised by the browser tests. */
vi.mock("@/src/i18n/navigation", async () => (await import("./navigation")).navigationModule);
vi.mock("@react-oauth/google", async () => (await import("./google")).googleModule);

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
  navigation.reset();
  google.reset();
});

afterAll(() => server.close());
