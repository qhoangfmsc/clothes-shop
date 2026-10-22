import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWishlist, syncAddToWishlist, syncRemoveFromWishlist } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import { makeStore } from "@/src/store";
import { API, seedSession } from "@/tests/_support/api";
import { serverWishlist, wishlistItem, wishlistState } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";

/* Wishlist thunks against a fake BE (specs/storefront/wishlist.md, flows WL-3 to WL-4E). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().wishlist;

beforeEach(() => seedSession({ access: "test-access" }));
afterEach(() => vi.useRealTimers());

describe("WL-3 fetchWishlist", () => {
  it("replaces the list with the BE's, mapped to the local shape", async () => {
    const saved = [wishlistItem({ productId: "a", addedAt: "2026-02-01T00:00:00.000Z" }), wishlistItem({ productId: "b", name: "Skirt", badge: "custom_order", addedAt: "2026-02-02T00:00:00.000Z" })];
    server.use(http.get(`${API}/api/wishlist`, () => HttpResponse.json(serverWishlist(saved))));
    const store = makeStore({ wishlist: wishlistState([wishlistItem({ productId: "stale" })]) });

    await store.dispatch(fetchWishlist());

    expect(state(store).items).toEqual(saved);
  });

  it("sends the stored token", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${API}/api/wishlist`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json(serverWishlist([]));
      })
    );

    await makeStore().dispatch(fetchWishlist());

    expect(auth).toBe("Bearer test-access");
  });

  it("is syncing while the request runs and not after", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.get(`${API}/api/wishlist`, async () => {
        await open;
        return HttpResponse.json(serverWishlist([]));
      })
    );
    const store = makeStore();

    const done = store.dispatch(fetchWishlist());
    await Promise.resolve();
    expect(state(store).isSyncing).toBe(true);
    release();
    await done;

    expect(state(store).isSyncing).toBe(false);
  });

  it("empties the local list when the BE has none", async () => {
    server.use(http.get(`${API}/api/wishlist`, () => HttpResponse.json(serverWishlist([]))));
    const store = makeStore({ wishlist: wishlistState([wishlistItem()]) });

    await store.dispatch(fetchWishlist());

    expect(state(store).items).toEqual([]);
  });
});

describe("WL-3E fetchWishlist that fails or gets thin data", () => {
  const refreshCalls: string[] = [];
  beforeEach(() => {
    refreshCalls.length = 0;
    server.use(
      http.post(`${API}/api/auth/refresh`, () => {
        refreshCalls.push("refresh");
        return HttpResponse.json({ message: "no" }, { status: 401 });
      })
    );
  });

  it.each([
    ["an expired token (401)", () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })],
    ["a server error (500)", () => HttpResponse.json({ message: "boom" }, { status: 500 })],
    ["no network", () => HttpResponse.error()],
  ])("keeps the local list and stops syncing on %s", async (_what, respond) => {
    server.use(http.get(`${API}/api/wishlist`, respond));
    const store = makeStore({ wishlist: wishlistState([wishlistItem()]) });

    const result = await store.dispatch(fetchWishlist());

    expect(result.type).toBe("wishlist/fetch/rejected");
    expect(state(store).items).toEqual([wishlistItem()]);
    expect(state(store).isSyncing).toBe(false);
  });

  it("asks again with the new token when a 401 is answered by a working refresh", async () => {
    seedSession({ access: "stale", refresh: "test-refresh" });
    server.use(
      http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({ accessToken: "fresh" })),
      http.get(`${API}/api/wishlist`, ({ request }) => (request.headers.get("authorization") === "Bearer fresh" ? HttpResponse.json(serverWishlist([wishlistItem({ productId: "z" })])) : HttpResponse.json({ message: "no" }, { status: 401 })))
    );
    const store = makeStore();

    await store.dispatch(fetchWishlist());

    expect(state(store).items.map((i) => i.productId)).toEqual(["z"]);
    expect(refreshCalls).toEqual([]);
  });

  it("fills in what the BE left out: empty name and link parts, price 0, no badge, the time it was received", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-01T08:00:00.000Z"));
    server.use(http.get(`${API}/api/wishlist`, () => HttpResponse.json({ data: [{ productId: "x", product: { id: "x", images: [] } }, { productId: "y" }] })));
    const store = makeStore();

    await store.dispatch(fetchWishlist());

    expect(state(store).items).toEqual([
      { productId: "x", name: "", priceVnd: 0, priceUsd: 0, image: "", badge: null, category: "", subcategory: "", addedAt: "2026-04-01T08:00:00.000Z" },
      { productId: "y", name: "", priceVnd: 0, priceUsd: 0, image: "", badge: null, category: "", subcategory: "", addedAt: "2026-04-01T08:00:00.000Z" },
    ]);
  });

  it("treats an answer with no list as an empty list", async () => {
    server.use(http.get(`${API}/api/wishlist`, () => HttpResponse.json({})));
    const store = makeStore({ wishlist: wishlistState([wishlistItem()]) });

    await store.dispatch(fetchWishlist());

    expect(state(store).items).toEqual([]);
  });
});

describe("WL-4 telling the BE about a heart", () => {
  it("saving posts the product id, with the token, and changes nothing on screen", async () => {
    let seen: { method: string; id: string; auth: string | null } | null = null;
    server.use(
      http.post(`${API}/api/wishlist/:id`, ({ request, params }) => {
        seen = { method: request.method, id: String(params.id), auth: request.headers.get("authorization") };
        return HttpResponse.json({});
      })
    );
    const store = makeStore({ wishlist: wishlistState([wishlistItem()]) });

    const result = await store.dispatch(syncAddToWishlist("p9"));

    expect(seen).toEqual({ method: "POST", id: "p9", auth: "Bearer test-access" });
    expect(result.type).toBe("wishlist/syncAdd/fulfilled");
    expect(state(store).items).toEqual([wishlistItem()]);
  });

  it("removing sends DELETE for the product id and changes nothing on screen", async () => {
    let seen: { method: string; id: string } | null = null;
    server.use(
      http.delete(`${API}/api/wishlist/:id`, ({ request, params }) => {
        seen = { method: request.method, id: String(params.id) };
        return HttpResponse.json({});
      })
    );
    const store = makeStore({ wishlist: wishlistState([wishlistItem()]) });

    const result = await store.dispatch(syncRemoveFromWishlist("p1"));

    expect(seen).toEqual({ method: "DELETE", id: "p1" });
    expect(result.type).toBe("wishlist/syncRemove/fulfilled");
    expect(state(store).items).toHaveLength(1);
  });
});

describe("WL-4E a heart the BE does not accept", () => {
  it.each([
    ["saving, token expired (401)", () => syncAddToWishlist("p1"), "post", 401],
    ["saving, server error (500)", () => syncAddToWishlist("p1"), "post", 500],
    ["removing, server error (500)", () => syncRemoveFromWishlist("p1"), "delete", 500],
  ] as const)("%s: rejected, and the list on screen stays as it is", async (_what, thunk, verb, status) => {
    server.use(http[verb](`${API}/api/wishlist/:id`, () => HttpResponse.json({ message: "no" }, { status })));
    const store = makeStore({ wishlist: wishlistState([wishlistItem()]) });

    const result = await store.dispatch(thunk());

    expect(result.type.endsWith("/rejected")).toBe(true);
    expect(state(store).items).toEqual([wishlistItem()]);
  });

  it("without a stored token the request goes out with no Authorization header", async () => {
    localStorage.clear();
    let auth: string | null = "unset";
    server.use(
      http.post(`${API}/api/wishlist/:id`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
      })
    );

    const result = await makeStore().dispatch(syncAddToWishlist("p1"));

    expect(auth).toBeNull();
    expect(result.type).toBe("wishlist/syncAdd/rejected");
  });
});
