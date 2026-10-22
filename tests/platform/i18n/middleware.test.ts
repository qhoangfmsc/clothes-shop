import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import middleware, { config } from "@/src/middleware";

/* The language prefix in every URL (specs/platform/i18n.md, flows I18-2 and I18-2E). */

const ask = (path: string) => middleware(new NextRequest(`http://localhost:3000${path}`));
const location = (res: Response) => new URL(res.headers.get("location") ?? "", "http://localhost:3000");
const matchesMatcher = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe("I18-2 a URL that already has a language", () => {
  it.each(["/vi", "/en", "/vi/shop", "/en/shop/tops?sort=-price", "/vi/"])("%s goes on without a redirect", (path) => {
    const res = ask(path);

    expect(res.status).not.toBe(308);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("I18-2E a URL without a language", () => {
  it("sends the bare domain to /vi, permanently", () => {
    const res = ask("/");

    expect(res.status).toBe(308);
    expect(location(res).pathname).toBe("/vi");
  });

  it.each([
    ["/shop", "/vi/shop"],
    ["/shop/tops/shirts/p1", "/vi/shop/tops/shirts/p1"],
    ["/cart", "/vi/cart"],
  ])("%s becomes %s", (path, target) => {
    const res = ask(path);

    expect(res.status).toBe(308);
    expect(location(res).pathname).toBe(target);
  });

  it("keeps the query string", () => {
    expect(location(ask("/shop?sort=-price&page=2")).search).toBe("?sort=-price&page=2");
  });

  it("never picks the language from the browser or a cookie", () => {
    const request = new NextRequest("http://localhost:3000/shop", { headers: { "accept-language": "en-US,en;q=0.9", cookie: "NEXT_LOCALE=en" } });

    expect(location(middleware(request)).pathname).toBe("/vi/shop");
  });

  it.each(["/VI/shop", "/vi-VN/shop", "/english", "/vietnam"])("%s has no valid prefix (case matters, whole segment) and gets /vi in front", (path) => {
    const res = ask(path);

    expect(res.status).toBe(308);
    expect(location(res).pathname).toBe(`/vi${path}`);
  });
});

describe("I18-2E which requests the middleware sees", () => {
  it.each(["/", "/shop", "/vi/shop", "/en", "/some/deep/path"])("%s is handled", (path) => {
    expect(matchesMatcher(path)).toBe(true);
  });

  it.each(["/api/products", "/media/a.jpg", "/_next/static/chunk.js", "/_vercel/insights", "/favicon.ico", "/robots.txt", "/brand/brand_og.png"])("%s is skipped", (path) => {
    expect(matchesMatcher(path)).toBe(false);
  });

  it("skips any path that merely starts with api, media, _next or _vercel (known: /apiary is skipped too)", () => {
    expect(matchesMatcher("/apiary")).toBe(false);
    expect(matchesMatcher("/media-kit")).toBe(false);
  });
});
