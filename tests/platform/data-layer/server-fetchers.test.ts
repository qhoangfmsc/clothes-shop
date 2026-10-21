import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { RELATED_PRODUCTS_LIMIT } from "@/src/app/[locale]/(public)/shop/_common/constants";
import {
  getAllProducts,
  getBannerConfig,
  getCategories,
  getCategoryBySlug,
  getCollectionBySlug,
  getCollectionProducts,
  getCollections,
  getProductById,
  getProducts,
  getProductsWithParams,
  getProductWithRelated,
  getShippingInfo,
  getSubcategory,
} from "@/src/app/[locale]/(public)/shop/_lib/server-fetchers";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* What the Server Components read (specs/platform/data-layer.md, flows SRV-1 and SRV-1E). */

const STORAGE = "https://abc.supabase.co/storage/v1/object/public/media";
type Json = Parameters<typeof HttpResponse.json>[0];
const ok = (body: Json) => HttpResponse.json(body);
const fail = (status = 500) => HttpResponse.json({ message: "no" }, { status });

/** Answers GET `path` and remembers the full URLs asked, in order. */
function route(path: string, answer: (url: URL) => Response) {
  const urls: string[] = [];
  server.use(
    http.get(`${API}${path}`, ({ request }) => {
      const url = new URL(request.url);
      urls.push(`${url.pathname}${url.search}`);
      return answer(url);
    })
  );
  return urls;
}

describe("SRV-1 reading data for the server", () => {
  it("asks for the products of a category with the list contract and caches for 60 s", async () => {
    const urls = route("/api/products", () => ok({ data: [{ id: "p1", images: [`${STORAGE}/a.jpg`] }], total: 1, page: 1, limit: 25 }));
    const spy = vi.spyOn(globalThis, "fetch");

    const products = await getProducts("tops", "shirts");

    expect(urls).toEqual(["/api/products?category=tops&subcategory=shirts"]);
    expect(products).toEqual([{ id: "p1", images: ["/media/a.jpg"] }]);
    expect(spy.mock.calls[0][1]).toMatchObject({ next: { revalidate: 60 } });
  });

  it("without a category it asks for the plain list", async () => {
    const urls = route("/api/products", () => ok({ data: [], total: 0, page: 1, limit: 25 }));

    await getProducts();
    await getAllProducts();

    expect(urls).toEqual(["/api/products", "/api/products"]);
  });

  it("getProductsWithParams sends every filter and returns the whole page object", async () => {
    const urls = route("/api/products", () => ok({ data: [], total: 0, page: 2, limit: 24 }));

    const page = await getProductsWithParams({ search: "dress", category: "tops", badge: "sale", sort: "-price", minPrice: 0, maxPrice: 500000, minRating: 4, sizes: "S,M", colors: "Red", page: 2, limit: 24 });

    expect(urls).toEqual(["/api/products?search=dress&category=tops&badge=sale&minPrice=0&maxPrice=500000&minRating=4&sizes=S%2CM&colors=Red&sort=-price&page=2&limit=24"]);
    expect(page).toEqual({ data: [], total: 0, page: 2, limit: 24 });
  });

  it("getProductById returns the product", async () => {
    route("/api/products/p1", () => ok({ data: { id: "p1", name: "Dress" }, related: [] }));

    await expect(getProductById("p1")).resolves.toEqual({ id: "p1", name: "Dress" });
  });

  it("getProductWithRelated asks for the related limit and returns product and related", async () => {
    const urls = route("/api/products/p1", () => ok({ data: { id: "p1" }, related: [{ id: "p2" }] }));

    await expect(getProductWithRelated("p1")).resolves.toEqual({ product: { id: "p1" }, related: [{ id: "p2" }] });
    expect(urls).toEqual([`/api/products/p1?relatedLimit=${RELATED_PRODUCTS_LIMIT}`]);
  });

  it("getProductWithRelated asks again without the related limit when the BE refuses it", async () => {
    const urls = route("/api/products/p1", (url) => (url.searchParams.has("relatedLimit") ? fail(400) : ok({ data: { id: "p1" }, related: [] })));

    await expect(getProductWithRelated("p1")).resolves.toEqual({ product: { id: "p1" }, related: [] });
    expect(urls).toEqual([`/api/products/p1?relatedLimit=${RELATED_PRODUCTS_LIMIT}`, "/api/products/p1"]);
  });

  it("categories: every category in one page, in priority order", async () => {
    const urls = route("/api/categories", () => ok({ data: [{ slug: "tops" }], total: 1, page: 1, limit: 200 }));

    await expect(getCategories()).resolves.toEqual([{ slug: "tops" }]);
    expect(urls).toEqual(["/api/categories?sort=priority&limit=200"]);
  });

  it("getCategoryBySlug and getSubcategory find a category and its sub-category", async () => {
    const category = { slug: "tops", subcategories: [{ slug: "shirts" }, { slug: "tees" }] };
    route("/api/categories", () => ok({ data: category }));

    await expect(getCategoryBySlug("tops")).resolves.toEqual(category);
    await expect(getSubcategory("tops", "tees")).resolves.toEqual({ category, subcategory: { slug: "tees" } });
  });

  it("collections: every collection in one page; one by slug with its products", async () => {
    const list = route("/api/collections", (url) =>
      url.searchParams.has("slug") ? ok({ data: { slug: "summer" }, products: [{ id: "p1" }] }) : ok({ data: [{ slug: "summer" }], total: 1, page: 1, limit: 200 })
    );

    await expect(getCollections()).resolves.toEqual([{ slug: "summer" }]);
    await expect(getCollectionBySlug("summer")).resolves.toEqual({ slug: "summer" });
    await expect(getCollectionProducts("summer")).resolves.toEqual([{ id: "p1" }]);
    expect(list[0]).toBe("/api/collections?limit=200");
  });

  it("getBannerConfig parses the stored JSON array and maps media URLs", async () => {
    route("/api/site-config", () => ok({ data: { key: "HOME", value: JSON.stringify([{ image: `${STORAGE}/b.jpg` }]) } }));

    await expect(getBannerConfig("HOME")).resolves.toEqual([{ image: "/media/b.jpg" }]);
  });

  it("getShippingInfo returns the configuration", async () => {
    route("/api/shipping", () => ok({ data: { methods: [{ id: "standard" }] } }));

    await expect(getShippingInfo()).resolves.toEqual({ methods: [{ id: "standard" }] });
  });
});

describe("SRV-1E when the API fails", () => {
  it.each([
    ["getProducts", () => getProducts("tops"), "/api/products"],
    ["getAllProducts", () => getAllProducts(), "/api/products"],
    ["getProductsWithParams", () => getProductsWithParams({}), "/api/products"],
    ["getCategories", () => getCategories(), "/api/categories"],
    ["getCollections", () => getCollections(), "/api/collections"],
    ["getCollectionProducts", () => getCollectionProducts("x"), "/api/collections"],
  ])("%s throws, so the page shows its error page", async (_name, call, path) => {
    route(path, () => fail(500));

    await expect(call()).rejects.toThrow(/API \/api\/[a-z]+.* failed: 500/);
  });

  it("names the failing path and status in the error", async () => {
    route("/api/products", () => fail(503));

    await expect(getAllProducts()).rejects.toThrow("API /api/products failed: 503");
  });

  it("the 'get one' functions return undefined so the page can show 404", async () => {
    route("/api/products/missing", () => fail(404));
    route("/api/categories", () => fail(404));
    route("/api/collections", () => fail(404));

    await expect(getProductById("missing")).resolves.toBeUndefined();
    await expect(getProductWithRelated("missing")).resolves.toBeUndefined();
    await expect(getCategoryBySlug("x")).resolves.toBeUndefined();
    await expect(getSubcategory("x", "y")).resolves.toBeUndefined();
    await expect(getCollectionBySlug("x")).resolves.toBeUndefined();
  });

  it("getSubcategory is undefined when the category exists but the sub-category does not", async () => {
    route("/api/categories", () => ok({ data: { slug: "tops", subcategories: [{ slug: "shirts" }] } }));

    await expect(getSubcategory("tops", "nope")).resolves.toBeUndefined();
  });

  it.each([
    ["the API fails", () => fail(500)],
    ["there is no config", () => ok({ data: null })],
    ["the value is empty", () => ok({ data: { value: "" } })],
    ["the value is not JSON", () => ok({ data: { value: "{oops" } })],
    ["the value is not an array", () => ok({ data: { value: '{"a":1}' } })],
  ])("getBannerConfig is an empty list when %s: a banner must never break the page", async (_when, answer) => {
    route("/api/site-config", answer);

    await expect(getBannerConfig("HOME")).resolves.toEqual([]);
  });

  it("getShippingInfo is null when the API is down or sends nothing", async () => {
    route("/api/shipping", () => fail(500));
    await expect(getShippingInfo()).resolves.toBeNull();

    server.resetHandlers();
    route("/api/shipping", () => ok({}));
    await expect(getShippingInfo()).resolves.toBeNull();
  });
});
