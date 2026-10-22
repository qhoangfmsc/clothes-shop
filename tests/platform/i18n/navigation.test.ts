import { describe, expect, it, vi } from "vitest";

/* The real locale-aware navigation helpers (the tests elsewhere use a stand-in; flow I18-8). next-intl calls the real `next/navigation`. */

vi.unmock("next/navigation");

describe("I18-8 navigation", () => {
  it("exports the five helpers the app must use instead of next/link and next/navigation", async () => {
    const navigation = await vi.importActual<typeof import("@/src/i18n/navigation")>("@/src/i18n/navigation");

    expect(Object.keys(navigation).sort()).toEqual(["Link", "getPathname", "redirect", "useRouter", "usePathname"].sort());
  });

  it.each([
    ["vi", "/shop", "/vi/shop"],
    ["en", "/shop", "/en/shop"],
    ["en", "/", "/en"],
    ["vi", "/shop/tops/shirts/p1", "/vi/shop/tops/shirts/p1"],
  ])("getPathname puts %s in front of %s: %s", async (locale, href, url) => {
    const { getPathname } = await vi.importActual<typeof import("@/src/i18n/navigation")>("@/src/i18n/navigation");

    expect(getPathname({ href, locale: locale as "vi" | "en" })).toBe(url);
  });
});
