import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND_ALTERNATE_NAME, BRAND_FOUNDING_YEAR, BRAND_NAME } from "@/src/lib/brand";

/* The origin and the brand (specs/platform/seo.md, flows SEO-1 and SEO-1E). The origin is read once when the module loads. */

afterEach(() => vi.unstubAllEnvs());

async function siteUrl(env: string | undefined) {
  vi.resetModules();
  if (env === undefined) vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined as unknown as string);
  else vi.stubEnv("NEXT_PUBLIC_SITE_URL", env);
  return (await import("@/src/lib/site-url")).SITE_URL;
}

describe("SEO-1 brand and origin", () => {
  it("spells the brand one way, and keeps the alternate spelling for search engines only", () => {
    expect(BRAND_NAME).toBe("DOOVAN");
    expect(BRAND_ALTERNATE_NAME).toBe("Doovan");
    expect(BRAND_FOUNDING_YEAR).toBe("2026");
  });

  it("uses the configured origin", async () => {
    expect(await siteUrl("https://doovan.vn")).toBe("https://doovan.vn");
  });

  it.each(["https://doovan.vn/", "https://doovan.vn///"])("drops trailing slashes from %s", async (value) => {
    expect(await siteUrl(value)).toBe("https://doovan.vn");
  });
});

describe("SEO-1E when the origin is not configured", () => {
  it("falls back to the local address", async () => {
    expect(await siteUrl(undefined)).toBe("http://localhost:3000");
  });

  it("keeps a path in the value, only trailing slashes go", async () => {
    expect(await siteUrl("https://example.com/base/")).toBe("https://example.com/base");
  });
});
