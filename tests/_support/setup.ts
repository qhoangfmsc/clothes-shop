import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { google } from "./google";
import { installBrowserApis, resetBrowserApis } from "./browser-apis";
import { intlServer } from "./intl-server";
import { installMatchMedia, media } from "./media-query";
import { installPointerEvent } from "./pointer-event";
import { server } from "./msw-server";
import { navigation } from "./navigation";

/* Modules that cannot run in a unit test are replaced for every test (details in each stand-in):
   the locale-aware router, the `next/navigation` hooks and Google's sign-in popup. Real ones are exercised by the browser tests. */
vi.mock("@/src/i18n/navigation", async () => (await import("./navigation")).navigationModule);
vi.mock("next/navigation", async () => (await import("./navigation")).nextNavigationModule);
vi.mock("next-intl/server", async () => (await import("./intl-server")).intlServerModule);
vi.mock("@react-oauth/google", async () => (await import("./google")).googleModule);

/* GSAP's ScrollTrigger reads `matchMedia` when it is imported, which is before `beforeAll` runs */
installMatchMedia();

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
  installMatchMedia();
  installPointerEvent();
  installBrowserApis();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
  navigation.reset();
  intlServer.reset();
  google.reset();
  media.reset();
  resetBrowserApis();
});

afterAll(() => server.close());
