import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import sitemap, { revalidate } from "@/src/app/sitemap";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* sitemap.xml (specs/platform/seo.md, flows SEO-7, SEO-7P and SEO-7E). The API is a fake; the shop is small on purpose. */

const ORIGIN = "http://localhost:3000";
const STATIC = ["", "/shop", "/collections", "/new-in", "/about", "/contact", "/terms", "/privacy", "/shipping-returns"];

const product = (id: string, cat: string | null, sub: string | null, updatedAt: string, images = [`/media/${id}.jpg`]) => ({
  id,
  images,
  updatedAt,
  category: cat ? { slug: cat } : null,
  subcategory: sub ? { slug: sub } : null,
});
const category = (slug: string, subs: string[]) => ({ slug, subcategories: subs.map((s) => ({ slug: s })) });
const collection = (slug: string, updatedAt: string, image = `/media/${slug}.jpg`) => ({ slug, updatedAt, image });

/** Fake API. `products` is served 200 per page, like the real list. */
function shop(options: { categories?: unknown[] | "fail"; collections?: unknown[] | "fail"; products?: unknown[] | "fail" }) {
  const productPages: number[] = [];
  const { categories = [], collections = [], products = [] } = options;
  server.use(
    http.get(`${API}/api/categories`, () => (categories === "fail" ? new HttpResponse(null, { status: 500 }) : HttpResponse.json({ data: categories }))),
    http.get(`${API}/api/collections`, () => (collections === "fail" ? new HttpResponse(null, { status: 500 }) : HttpResponse.json({ data: collections }))),
    http.get(`${API}/api/products`, ({ request }) => {
      if (products === "fail") return new HttpResponse(null, { status: 500 });
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      productPages.push(page);
      return HttpResponse.json({ data: products.slice((page - 1) * 200, page * 200), total: products.length, page, limit: 200 });
    })
  );
  return { productPages };
}

const urls = (entries: Awaited<ReturnType<typeof sitemap>>) => entries.map((e) => e.url);
const entryFor = (entries: Awaited<ReturnType<typeof sitemap>>, url: string) => entries.find((e) => e.url === url)!;

describe("SEO-7 a sitemap with data", () => {
  const data = () =>
    shop({
      categories: [category("tops", ["shirts", "empty-sub"]), category("empty-cat", [])],
      collections: [collection("summer", "2026-03-01T00:00:00Z")],
      products: [
        product("p1", "tops", "shirts", "2026-01-10T00:00:00Z"),
        product("p2", "tops", "shirts", "2026-02-20T00:00:00Z", ["/media/p2.jpg", "https://cdn.example.com/p2b.jpg"]),
      ],
    });

  it("revalidates every hour", () => {
    expect(revalidate).toBe(3600);
  });

  it("lists every static page once per language and leaves out the /legal overview", async () => {
    data();
    const list = urls(await sitemap());

    for (const path of STATIC) for (const locale of ["vi", "en"]) expect(list).toContain(`${ORIGIN}/${locale}${path}`);
    expect(list.some((u) => u.endsWith("/legal"))).toBe(false);
  });

  it("lists every page's other languages, and x-default as the Vietnamese one", async () => {
    data();
    const entry = entryFor(await sitemap(), `${ORIGIN}/en/shop`);

    expect(entry.alternates?.languages).toEqual({ vi: `${ORIGIN}/vi/shop`, en: `${ORIGIN}/en/shop`, "x-default": `${ORIGIN}/vi/shop` });
  });

  it("gives each kind of page its priority", async () => {
    data();
    const entries = await sitemap();

    expect(entryFor(entries, `${ORIGIN}/vi`).priority).toBe(1);
    expect(entryFor(entries, `${ORIGIN}/vi/about`).priority).toBe(0.8);
    expect(entryFor(entries, `${ORIGIN}/vi/shop/tops`).priority).toBe(0.7);
    expect(entryFor(entries, `${ORIGIN}/vi/shop/tops/shirts`).priority).toBe(0.6);
    expect(entryFor(entries, `${ORIGIN}/vi/collections/summer`).priority).toBe(0.7);
    expect(entryFor(entries, `${ORIGIN}/vi/shop/tops/shirts/p1`).priority).toBe(0.9);
  });

  it("dates pages by what is inside them", async () => {
    data();
    const entries = await sitemap();

    expect(entryFor(entries, `${ORIGIN}/vi`).lastModified).toBe("2026-02-20T00:00:00Z");
    expect(entryFor(entries, `${ORIGIN}/vi/shop`).lastModified).toBe("2026-02-20T00:00:00Z");
    expect(entryFor(entries, `${ORIGIN}/vi/new-in`).lastModified).toBe("2026-02-20T00:00:00Z");
    expect(entryFor(entries, `${ORIGIN}/vi/collections`).lastModified).toBe("2026-03-01T00:00:00Z");
    expect(entryFor(entries, `${ORIGIN}/vi/about`).lastModified).toBeUndefined();
    expect(entryFor(entries, `${ORIGIN}/vi/shop/tops`).lastModified).toBe("2026-02-20T00:00:00Z");
    expect(entryFor(entries, `${ORIGIN}/vi/shop/tops/shirts`).lastModified).toBe("2026-02-20T00:00:00Z");
    expect(entryFor(entries, `${ORIGIN}/vi/shop/tops/shirts/p1`).lastModified).toBe("2026-01-10T00:00:00Z");
    expect(entryFor(entries, `${ORIGIN}/vi/collections/summer`).lastModified).toBe("2026-03-01T00:00:00Z");
  });

  it("attaches absolute images to products and collections only", async () => {
    data();
    const entries = await sitemap();

    expect(entryFor(entries, `${ORIGIN}/en/shop/tops/shirts/p2`).images).toEqual([`${ORIGIN}/media/p2.jpg`, "https://cdn.example.com/p2b.jpg"]);
    expect(entryFor(entries, `${ORIGIN}/en/collections/summer`).images).toEqual([`${ORIGIN}/media/summer.jpg`]);
    expect(entryFor(entries, `${ORIGIN}/en/shop`)).not.toHaveProperty("images");
  });

  it("has two entries per page, one per language", async () => {
    data();
    const list = urls(await sitemap());

    expect(list.filter((u) => u.endsWith("/shop/tops/shirts/p1"))).toHaveLength(2);
    expect(new Set(list).size).toBe(list.length);
  });
});

describe("SEO-7P many products", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => product(`p${i}`, "tops", "shirts", "2026-01-01T00:00:00Z"));

  it("walks every page of 200 until it has all of them", async () => {
    const { productPages } = shop({ products: many(450) });

    const list = urls(await sitemap());

    expect(productPages).toEqual([1, 2, 3]);
    expect(list.filter((u) => u.includes("/vi/shop/tops/shirts/p"))).toHaveLength(450);
  });

  it("stops after the first page when it already holds the total", async () => {
    const { productPages } = shop({ products: many(10) });

    await sitemap();

    expect(productPages).toEqual([1]);
  });

  it("stops at an empty page even if the total says more", async () => {
    const pages: number[] = [];
    server.use(
      http.get(`${API}/api/categories`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/api/collections`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/api/products`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
        pages.push(page);
        return HttpResponse.json({ data: page === 1 ? many(200) : [], total: 5000, page, limit: 200 });
      })
    );

    await sitemap();

    expect(pages).toEqual([1, 2]);
  });
});

describe("SEO-7E when a source fails or data is incomplete", () => {
  it("with every source down, still lists the static pages", async () => {
    shop({ categories: "fail", collections: "fail", products: "fail" });

    const list = urls(await sitemap());

    expect(list).toHaveLength(STATIC.length * 2);
  });

  it("without products, keeps categories and sub-categories (it cannot tell which are empty)", async () => {
    shop({ categories: [category("tops", ["shirts"])], products: "fail" });

    const list = urls(await sitemap());

    expect(list).toContain(`${ORIGIN}/vi/shop/tops`);
    expect(list).toContain(`${ORIGIN}/vi/shop/tops/shirts`);
  });

  it("without categories, still lists collections and products", async () => {
    shop({ categories: "fail", collections: [collection("summer", "2026-03-01T00:00:00Z")], products: [product("p1", "tops", "shirts", "2026-01-01T00:00:00Z")] });

    const list = urls(await sitemap());

    expect(list).toContain(`${ORIGIN}/vi/collections/summer`);
    expect(list).toContain(`${ORIGIN}/vi/shop/tops/shirts/p1`);
    expect(list).not.toContain(`${ORIGIN}/vi/shop/tops`);
  });

  it("without collections, still lists products", async () => {
    shop({ collections: "fail", products: [product("p1", "tops", "shirts", "2026-01-01T00:00:00Z")] });

    expect(urls(await sitemap())).toContain(`${ORIGIN}/vi/shop/tops/shirts/p1`);
  });

  it("leaves out a sub-category without products, and a category whose products have no sub-category", async () => {
    shop({ categories: [category("tops", ["shirts", "empty-sub"])], products: [product("p1", "tops", "shirts", "2026-01-01T00:00:00Z")] });

    const list = urls(await sitemap());

    expect(list).toContain(`${ORIGIN}/vi/shop/tops/shirts`);
    expect(list).not.toContain(`${ORIGIN}/vi/shop/tops/empty-sub`);
  });

  it("skips a product that lacks its category or sub-category: it has no URL", async () => {
    shop({ products: [product("lost1", null, "shirts", "2026-01-01T00:00:00Z"), product("lost2", "tops", null, "2026-01-01T00:00:00Z"), product("ok", "tops", "shirts", "2026-01-01T00:00:00Z")] });

    const list = urls(await sitemap());

    expect(list.filter((u) => u.includes("lost"))).toEqual([]);
    expect(list).toContain(`${ORIGIN}/vi/shop/tops/shirts/ok`);
  });

  it("has no dates and no images when there is no data to take them from", async () => {
    shop({});

    const entries = await sitemap();

    expect(entries.every((e) => e.lastModified === undefined)).toBe(true);
    expect(entries.every((e) => !("images" in e))).toBe(true);
  });
});
