import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  fetchProductPage,
  getProductUrl,
  useBannerConfig,
  useCategories,
  useCategory,
  useCollection,
  useCollections,
  useNewInProducts,
  useProduct,
  useProductLink,
  useProducts,
  useRefreshShipping,
  useShipping,
  useShippingMethodName,
  useSizeGuide,
} from "@/src/hooks/use-api";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { SwrIsolated } from "./swr-wrapper";

/* The public SWR hooks (specs/platform/data-layer.md, flows API-1, API-1E and API-3). Public data needs no sign-in. */

const STORAGE = "https://abc.supabase.co/storage/v1/object/public/media";
const wrapper = SwrIsolated;
type Json = Parameters<typeof HttpResponse.json>[0];
const ok = (body: Json) => HttpResponse.json(body);
const down = () => HttpResponse.json({ message: "down" }, { status: 500 });

/** Answers GET `path` and remembers the URLs asked. */
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

describe("API-1 hooks return data, with sensible values before it arrives", () => {
  it("useProducts builds the URL from the list contract and maps media URLs", async () => {
    const urls = route("/api/products", () => ok({ data: [{ id: "p1", images: [`${STORAGE}/a.jpg`] }], total: 41, page: 2, limit: 12 }));

    const { result } = renderHook(() => useProducts({ category: "tops", sort: "-price", page: 2, limit: 12 }), { wrapper });

    expect(result.current).toMatchObject({ products: [], total: 0, page: 1, limit: 24, isLoading: true, isError: false });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(urls).toEqual(["/api/products?category=tops&sort=-price&page=2&limit=12"]);
    expect(result.current).toMatchObject({ products: [{ id: "p1", images: ["/media/a.jpg"] }], total: 41, page: 2, limit: 12 });
  });

  it("useProducts with no parameters asks for the plain list", async () => {
    const urls = route("/api/products", () => ok({ data: [], total: 0, page: 1, limit: 25 }));

    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(urls).toEqual(["/api/products"]);
  });

  it("fetchProductPage returns one page for lists that append pages themselves", async () => {
    const urls = route("/api/products", () => ok({ data: [{ id: "p1" }], total: 1, page: 3, limit: 5 }));

    await expect(fetchProductPage({ page: 3, limit: 5 })).resolves.toEqual({ data: [{ id: "p1" }], total: 1, page: 3, limit: 5 });
    expect(urls).toEqual(["/api/products?page=3&limit=5"]);
  });

  it("useProduct returns the product and its related products, and does nothing without an id", async () => {
    route("/api/products/p1", () => ok({ data: { id: "p1" }, related: [{ id: "p2" }] }));

    const none = renderHook(() => useProduct(null), { wrapper });
    const one = renderHook(() => useProduct("p1"), { wrapper });

    expect(none.result.current).toMatchObject({ product: null, related: [], isLoading: false });
    await waitFor(() => expect(one.result.current.product).toEqual({ id: "p1" }));
    expect(one.result.current.related).toEqual([{ id: "p2" }]);
  });

  it("useNewInProducts asks for the 'new' badge", async () => {
    const urls = route("/api/products", () => ok({ data: [{ id: "n1" }], total: 1, page: 1, limit: 25 }));

    const { result } = renderHook(() => useNewInProducts(), { wrapper });

    await waitFor(() => expect(result.current.products).toHaveLength(1));
    expect(urls).toEqual(["/api/products?badge=new"]);
    expect(result.current.total).toBe(1);
  });

  it("useCategories asks for every category in priority order; useCategory reads one by slug", async () => {
    const urls = route("/api/categories", (url) => (url.searchParams.has("slug") ? ok({ data: { slug: "tops" } }) : ok({ data: [{ slug: "tops" }], total: 1 })));

    const all = renderHook(() => useCategories(), { wrapper });
    const one = renderHook(() => useCategory("tops"), { wrapper });
    const none = renderHook(() => useCategory(null), { wrapper });

    await waitFor(() => expect(all.result.current.categories).toEqual([{ slug: "tops" }]));
    await waitFor(() => expect(one.result.current.category).toEqual({ slug: "tops" }));
    expect(urls).toEqual(expect.arrayContaining(["/api/categories?sort=priority&limit=200", "/api/categories?slug=tops"]));
    expect(none.result.current).toMatchObject({ category: null, isLoading: false });
  });

  it("useCollections asks for 200 collections; useCollection returns one with its products", async () => {
    const urls = route("/api/collections", (url) => (url.searchParams.has("slug") ? ok({ data: { slug: "summer" }, products: [{ id: "p1" }] }) : ok({ data: [{ slug: "summer" }], total: 1 })));

    const all = renderHook(() => useCollections(), { wrapper });
    const one = renderHook(() => useCollection("summer"), { wrapper });

    await waitFor(() => expect(all.result.current.collections).toEqual([{ slug: "summer" }]));
    await waitFor(() => expect(one.result.current.collection).toEqual({ slug: "summer" }));
    expect(one.result.current.products).toEqual([{ id: "p1" }]);
    expect(urls).toEqual(expect.arrayContaining(["/api/collections?limit=200", "/api/collections?slug=summer"]));
  });

  it("useSizeGuide reads the guide of a category and waits for a category", async () => {
    route("/api/size-guides/tops", () => ok({ data: { category: "tops", rows: [] } }));

    const guide = renderHook(() => useSizeGuide("tops"), { wrapper });
    const none = renderHook(() => useSizeGuide(null), { wrapper });

    await waitFor(() => expect(guide.result.current.sizeGuide).toEqual({ category: "tops", rows: [] }));
    expect(none.result.current.sizeGuide).toBeNull();
  });
});

describe("API-1 shipping", () => {
  const shipping = { methods: [{ id: "standard", name: "Giao tiêu chuẩn" }, { id: "express", name: "Giao nhanh" }] };

  it("useShipping returns the configuration; useShippingMethodName names a method by id", async () => {
    route("/api/shipping", () => ok({ data: shipping }));

    const { result } = renderHook(() => ({ info: useShipping(), name: useShippingMethodName() }), { wrapper });

    expect(result.current.name("standard")).toBeUndefined(); // not loaded yet
    await waitFor(() => expect(result.current.info.shipping).toEqual(shipping));
    expect(result.current.name("standard")).toBe("Giao tiêu chuẩn");
    expect(result.current.name("express")).toBe("Giao nhanh");
    expect(result.current.name("teleport")).toBeUndefined();
  });

  it("useRefreshShipping makes pages read the configuration again after the admin changed it", async () => {
    let current = shipping;
    route("/api/shipping", () => ok({ data: current }));
    const { result } = renderHook(() => ({ info: useShipping(), refresh: useRefreshShipping() }), { wrapper });
    await waitFor(() => expect(result.current.info.shipping).toEqual(shipping));

    current = { methods: [{ id: "standard", name: "Đổi tên" }] };
    await act(() => result.current.refresh());

    await waitFor(() => expect(result.current.info.shipping?.methods[0].name).toBe("Đổi tên"));
  });
});

describe("API-1 banners", () => {
  it("useBannerConfig parses the stored array and maps media URLs", async () => {
    const urls = route("/api/site-config", () => ok({ data: { value: JSON.stringify([{ image: `${STORAGE}/b.jpg`, title: "Sale" }]) } }));

    const { result } = renderHook(() => useBannerConfig("HOME_HERO"), { wrapper });

    await waitFor(() => expect(result.current.banners).toHaveLength(1));
    expect(result.current.banners[0]).toEqual({ image: "/media/b.jpg", title: "Sale" });
    expect(urls).toEqual(["/api/site-config?key=HOME_HERO"]);
  });
});

describe("API-1E hooks when the API fails", () => {
  it("useProducts reports the error and keeps empty data", async () => {
    route("/api/products", down);

    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toMatchObject({ products: [], total: 0, isLoading: false });
  });

  it.each<[string, () => { isError: boolean }, string]>([
    ["useProduct", () => useProduct("p1"), "/api/products/p1"],
    ["useCategories", () => useCategories(), "/api/categories"],
    ["useCollections", () => useCollections(), "/api/collections"],
    ["useShipping", () => useShipping(), "/api/shipping"],
    ["useNewInProducts", () => useNewInProducts(), "/api/products"],
  ])("%s reports isError on a 500", async (_name, hook, path) => {
    route(path, down);

    const { result } = renderHook(hook, { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it.each([
    ["the API fails", () => down()],
    ["there is no config", () => ok({ data: null })],
    ["the value is not JSON", () => ok({ data: { value: "{oops" } })],
    ["the value is not an array", () => ok({ data: { value: '{"a":1}' } })],
  ])("useBannerConfig is an empty list, never an error, when %s", async (_when, answer) => {
    route("/api/site-config", answer);

    const { result } = renderHook(() => useBannerConfig("HOME_HERO"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.banners).toEqual([]);
    expect(result.current).not.toHaveProperty("isError");
  });

  it("fetchProductPage rejects with a plain Error carrying only the status (known gap, see the spec)", async () => {
    route("/api/products", down);

    const error = await fetchProductPage({}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ message: "API error: 500" });
    expect(error).not.toHaveProperty("status");
  });
});

describe("API-1 looking a product's URL up", () => {
  it("getProductUrl builds the detail URL from the product's slugs", async () => {
    route("/api/products/p1", () => ok({ data: { id: "p1", category: { slug: "tops" }, subcategory: { slug: "shirts" } } }));

    await expect(getProductUrl("p1")).resolves.toBe("/shop/tops/shirts/p1");
  });

  it.each([
    ["the product has no sub-category", () => ok({ data: { id: "p1", category: { slug: "tops" }, subcategory: null } })],
    ["the product has no category", () => ok({ data: { id: "p1", category: null, subcategory: { slug: "x" } } })],
    ["the API answers 404", () => HttpResponse.json({}, { status: 404 })],
    ["the network fails", () => HttpResponse.error()],
  ])("getProductUrl is null when %s", async (_when, answer) => {
    route("/api/products/p1", answer);

    await expect(getProductUrl("p1")).resolves.toBeNull();
  });
});

describe("API-3 links to a product kept as an id and slugs", () => {
  const link = () => renderHook(() => useProductLink()).result.current;

  it("with both slugs the href is the product page and a click needs no help", () => {
    expect(link()({ productId: "p1", category: "tops", subcategory: "shirts" })).toEqual({ href: "/shop/tops/shirts/p1", onClick: undefined });
  });

  it("without slugs the href is /shop and a click looks the real URL up, then navigates", async () => {
    route("/api/products/p1", () => ok({ data: { id: "p1", category: { slug: "tops" }, subcategory: { slug: "shirts" } } }));
    const props = link()({ productId: "p1" });
    const event = { preventDefault: () => {} } as React.MouseEvent;
    let prevented = false;
    event.preventDefault = () => void (prevented = true);

    expect(props.href).toBe("/shop");
    await props.onClick?.(event);

    expect(prevented).toBe(true);
    expect(navigation.router.push).toHaveBeenCalledWith("/shop/tops/shirts/p1");
  });

  it("goes to /shop when the lookup finds nothing", async () => {
    route("/api/products/p1", () => HttpResponse.json({}, { status: 404 }));
    const props = link()({ productId: "p1", category: "tops" });

    await props.onClick?.({ preventDefault: () => {} } as React.MouseEvent);

    expect(navigation.router.push).toHaveBeenCalledWith("/shop");
  });
});
