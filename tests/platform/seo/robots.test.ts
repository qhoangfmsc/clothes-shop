import { afterEach, describe, expect, it, vi } from "vitest";

/* What crawlers may visit (specs/platform/seo.md, flows SEO-2 and SEO-2E). The deployment kind is read when the module loads. */

afterEach(() => vi.unstubAllEnvs());

async function robots(vercelEnv: string | undefined) {
  vi.resetModules();
  vi.stubEnv("VERCEL_ENV", vercelEnv as string);
  return (await import("@/src/app/robots")).default();
}

const PRIVATE = ["/admin", "/login", "/cart", "/checkout", "/account", "/orders", "/returns", "/reviews", "/wishlist", "/unauthorized"];

describe("SEO-2 the production site", () => {
  it.each(["production", ""])("with VERCEL_ENV %j lets crawlers in and lists the sitemap", async (env) => {
    const result = await robots(env);

    expect(result.sitemap).toBe("http://localhost:3000/sitemap.xml");
    expect(result.rules).toEqual([{ userAgent: "*", allow: "/", disallow: expect.any(Array) }]);
  });

  it("keeps crawlers out of the API and of every private page in every language", async () => {
    const result = await robots("production");
    const { disallow } = (result.rules as { disallow: string[] }[])[0];

    expect(disallow).toContain("/api/");
    for (const locale of ["vi", "en"]) for (const path of PRIVATE) expect(disallow).toContain(`/${locale}${path}`);
    expect(disallow).toHaveLength(1 + 2 * PRIVATE.length);
  });

  it("does not block the public pages", async () => {
    const { disallow } = ((await robots("production")).rules as { disallow: string[] }[])[0];

    for (const path of ["/vi", "/vi/shop", "/en/collections", "/vi/about", "/vi/terms"]) expect(disallow).not.toContain(path);
  });
});

describe("SEO-2E deployments that must not be indexed", () => {
  it.each(["preview", "development"])("%s blocks everything and does not list a sitemap", async (env) => {
    const result = await robots(env);

    expect(result.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(result.sitemap).toBeUndefined();
  });
});
