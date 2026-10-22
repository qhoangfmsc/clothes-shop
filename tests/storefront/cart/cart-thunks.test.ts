import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  addItem,
  clearCartOnServer,
  fetchCart,
  syncAddToCartItem,
  syncRemoveCartItem,
  syncUpdateCartItemQuantity,
  removeItem,
  updateQuantity,
} from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { makeStore } from "@/src/store";
import { API, seedSession } from "@/tests/_support/api";
import { cartLine, cartState, serverCart } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";

/* Cart thunks against a fake BE (specs/storefront/cart.md, flows CART-5 to CART-7E). */

const ADD = { productId: "p1", size: "M", color: "Red", quantity: 1 };
const NEW_LINE = () => {
  const { quantity: _q, serverItemId: _s, lineTotalVnd: _v, lineTotalUsd: _u, ...rest } = cartLine();
  return rest;
};
const state = (store: ReturnType<typeof makeStore>) => store.getState().cart;

/** A response the test releases when it wants, to look at the state while a request is in flight. */
function gate() {
  let release!: () => void;
  const open = new Promise<void>((resolve) => (release = resolve));
  return { open, release };
}

beforeEach(() => seedSession({ access: "test-access" }));

describe("CART-5 fetchCart", () => {
  it("replaces the cart with the BE's lines, mapped to the local shape", async () => {
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json(serverCart([cartLine({ quantity: 2, serverItemId: "srv-1" })]))));
    const store = makeStore({ cart: cartState([cartLine({ productId: "stale" })]) });

    await store.dispatch(fetchCart());

    expect(state(store).items).toEqual([cartLine({ quantity: 2, serverItemId: "srv-1" })]);
  });

  it("sends the stored token", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${API}/api/cart`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json(serverCart([]));
      })
    );

    await makeStore().dispatch(fetchCart());

    expect(auth).toBe("Bearer test-access");
  });

  it("takes the colour code from the product's colour list by name, and the slugs from the relations", async () => {
    const body = serverCart([cartLine({ color: "Blue", colorHex: "#00f", category: "dresses", subcategory: "midi" })]);
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json(body)));
    const store = makeStore();

    await store.dispatch(fetchCart());

    expect(state(store).items[0]).toMatchObject({ colorHex: "#00f", category: "dresses", subcategory: "midi" });
  });

  it("falls back to the colour name when the product has no such colour, and to empty text when it has no slugs", async () => {
    const body = serverCart([cartLine({ color: "Teal" })]);
    body.data.items[0].product.colors = [{ name: "Red", hex: "#f00" }];
    (body.data.items[0].product as { category: unknown }).category = null;
    (body.data.items[0].product as { subcategory: unknown }).subcategory = null;
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json(body)));
    const store = makeStore();

    await store.dispatch(fetchCart());

    expect(state(store).items[0]).toMatchObject({ colorHex: "Teal", category: "", subcategory: "" });
  });

  it("copes with a line whose product the BE did not send, and with a cart with no lines", async () => {
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json({ data: { items: [{ id: "x", productId: "p9", size: "S", color: "Red", quantity: 2 }] } })));
    const store = makeStore();

    await store.dispatch(fetchCart());
    expect(state(store).items[0]).toMatchObject({ serverItemId: "x", name: "", priceVnd: 0, priceUsd: 0, image: "", lineTotalVnd: null, lineTotalUsd: null, badge: null });

    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json({})));
    await store.dispatch(fetchCart());
    expect(state(store).items).toEqual([]);
  });

  it("is syncing while the request runs and not after", async () => {
    const g = gate();
    server.use(
      http.get(`${API}/api/cart`, async () => {
        await g.open;
        return HttpResponse.json(serverCart([]));
      })
    );
    const store = makeStore();

    const done = store.dispatch(fetchCart());
    await Promise.resolve();
    expect(state(store).isSyncing).toBe(true);
    g.release();
    await done;

    expect(state(store).isSyncing).toBe(false);
  });

  it("keeps a line that is still being added and the BE does not have yet", async () => {
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json(serverCart([cartLine({ productId: "p1" })]))));
    const inFlight = cartLine({ productId: "p9", lineTotalVnd: null, lineTotalUsd: null });
    const store = makeStore({ cart: cartState([inFlight], { pendingAddKeys: ["p9|M|Red"] }) });

    await store.dispatch(fetchCart());

    expect(state(store).items.map((l) => l.productId)).toEqual(["p1", "p9"]);
  });

  it("does not keep that line twice once the BE has it", async () => {
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json(serverCart([cartLine({ productId: "p9", quantity: 2 })]))));
    const store = makeStore({ cart: cartState([cartLine({ productId: "p9" })], { pendingAddKeys: ["p9|M|Red"] }) });

    await store.dispatch(fetchCart());

    expect(state(store).items).toHaveLength(1);
    expect(state(store).items[0].quantity).toBe(2);
  });

  it("drops a line that is not in the BE cart and is not being added", async () => {
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json(serverCart([]))));
    const store = makeStore({ cart: cartState([cartLine()]) });

    await store.dispatch(fetchCart());

    expect(state(store).items).toEqual([]);
  });

  it("forgets unticked keys of lines that are gone", async () => {
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json(serverCart([cartLine({ productId: "p1" })]))));
    const store = makeStore({ cart: cartState([cartLine({ productId: "p1" }), cartLine({ productId: "p2" })], { deselectedKeys: ["p1|M|Red", "p2|M|Red"] }) });

    await store.dispatch(fetchCart());

    expect(state(store).deselectedKeys).toEqual(["p1|M|Red"]);
  });
});

describe("CART-5E fetchCart that fails", () => {
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
  ])("keeps the local cart and stops syncing on %s", async (_what, respond) => {
    server.use(http.get(`${API}/api/cart`, respond));
    const store = makeStore({ cart: cartState([cartLine({ quantity: 3 })]) });

    const result = await store.dispatch(fetchCart());

    expect(result.type).toBe("cart/fetch/rejected");
    expect(state(store).items).toEqual([cartLine({ quantity: 3 })]);
    expect(state(store).isSyncing).toBe(false);
  });

  it("tries to refresh the token on a 401, once, and gives up when the BE refuses the refresh", async () => {
    seedSession({ access: "test-access", refresh: "test-refresh" });
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })));

    const result = await makeStore().dispatch(fetchCart());

    expect(refreshCalls).toEqual(["refresh"]);
    expect(result.type).toBe("cart/fetch/rejected");
  });

  it("asks again with the new token when the refresh works, so an expired access token does not lose the cart", async () => {
    seedSession({ access: "stale", refresh: "test-refresh" });
    server.use(
      http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({ accessToken: "fresh" })),
      http.get(`${API}/api/cart`, ({ request }) => (request.headers.get("authorization") === "Bearer fresh" ? HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-1" })])) : HttpResponse.json({ message: "no" }, { status: 401 })))
    );
    const store = makeStore();

    await store.dispatch(fetchCart());

    expect(state(store).items.map((l) => l.serverItemId)).toEqual(["srv-1"]);
  });
});

describe("CART-6 syncAddToCartItem", () => {
  it("posts the line and gives the local line the id the BE gave it (found by key, not by the cart's id)", async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/api/cart/items`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(serverCart([cartLine({ productId: "other", serverItemId: "srv-other" }), cartLine({ serverItemId: "srv-new" })]));
      })
    );
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));

    await store.dispatch(syncAddToCartItem(ADD));

    expect(body).toEqual(ADD);
    expect(state(store).items[0].serverItemId).toBe("srv-new");
  });

  it("takes the BE's price and line total once nothing else is waiting", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-new", priceVnd: 400_000, priceUsd: 15.38, lineTotalVnd: 400_000, lineTotalUsd: 15.38 })]))));
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));
    expect(state(store).items[0].lineTotalVnd).toBeNull();

    await store.dispatch(syncAddToCartItem(ADD));

    expect(state(store).items[0]).toMatchObject({ priceVnd: 400_000, priceUsd: 15.38, lineTotalVnd: 400_000, lineTotalUsd: 15.38 });
  });

  it("counts the request while it runs and marks the line as being added", async () => {
    const g = gate();
    server.use(
      http.post(`${API}/api/cart/items`, async () => {
        await g.open;
        return HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-new" })]));
      })
    );
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));

    const done = store.dispatch(syncAddToCartItem(ADD));
    await Promise.resolve();
    expect(state(store)).toMatchObject({ pendingSync: 1, pendingAddKeys: ["p1|M|Red"] });
    g.release();
    await done;

    expect(state(store)).toMatchObject({ pendingSync: 0, pendingAddKeys: [] });
  });
});

describe("CART-6E syncAddToCartItem that goes wrong", () => {
  it("takes the line back out of the bag when the BE refuses, and gives the counters back", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json({ message: "Out of stock", errorCode: "OUT_OF_STOCK" }, { status: 409 })));
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 2));

    const result = await store.dispatch(syncAddToCartItem({ ...ADD, quantity: 2 }));

    expect(result.type).toBe("cart/syncAdd/rejected");
    expect(state(store).items).toEqual([]);
    expect(state(store)).toMatchObject({ pendingSync: 0, pendingAddKeys: [] });
  });

  it("takes back only the quantity that was refused, so an earlier add of the same line stays", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json({ message: "no" }, { status: 409 })));
    const store = makeStore({ cart: cartState([cartLine({ quantity: 3, serverItemId: "srv-1" })]) });
    store.dispatch(addItem(NEW_LINE(), 2));

    await store.dispatch(syncAddToCartItem({ ...ADD, quantity: 2 }));

    expect(state(store).items).toHaveLength(1);
    expect(state(store).items[0]).toMatchObject({ quantity: 3, lineTotalVnd: null });
  });

  it("does not keep a line total that no longer matches the quantity left after the refusal", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json({ message: "no" }, { status: 409 })));
    const store = makeStore({ cart: cartState([cartLine({ quantity: 3, serverItemId: "srv-1", lineTotalVnd: 1_050_000, lineTotalUsd: 40 })]) });

    await store.dispatch(syncAddToCartItem({ ...ADD, quantity: 2 }));

    expect(state(store).items[0]).toMatchObject({ quantity: 1, lineTotalVnd: null, lineTotalUsd: null });
  });

  it("also forgets that the refused line was unticked, so adding it again starts ticked", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json({ message: "no" }, { status: 409 })));
    const store = makeStore({ cart: cartState([], { deselectedKeys: ["p1|M|Red"] }) });
    store.dispatch(addItem(NEW_LINE(), 1));

    await store.dispatch(syncAddToCartItem(ADD));

    expect(state(store).deselectedKeys).toEqual([]);
  });

  it("leaves the cart alone when the refused line is no longer there (the cart was reloaded meanwhile)", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json({ message: "no" }, { status: 409 })));
    const store = makeStore({ cart: cartState([cartLine({ productId: "other", serverItemId: "srv-o" })]) });

    await store.dispatch(syncAddToCartItem(ADD));

    expect(state(store).items.map((l) => l.productId)).toEqual(["other"]);
  });

  it("does not take prices while another write is still waiting, and takes them when the last one is answered", async () => {
    const first = gate();
    const second = gate();
    server.use(
      http.post(`${API}/api/cart/items`, async ({ request }) => {
        const { productId } = (await request.json()) as { productId: string };
        await (productId === "p1" ? first.open : second.open);
        return HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-1", priceVnd: 111_000, lineTotalVnd: 111_000 }), cartLine({ productId: "p2", serverItemId: "srv-2", priceVnd: 222_000, lineTotalVnd: 222_000 })]));
      })
    );
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));
    store.dispatch(addItem({ ...NEW_LINE(), productId: "p2" }, 1));

    const a = store.dispatch(syncAddToCartItem(ADD));
    const b = store.dispatch(syncAddToCartItem({ ...ADD, productId: "p2" }));
    await Promise.resolve();
    expect(state(store).pendingSync).toBe(2);

    first.release();
    await a;
    expect(state(store).pendingSync).toBe(1);
    expect(state(store).items.map((l) => l.priceVnd)).toEqual([350_000, 350_000]);
    expect(state(store).items[0].serverItemId).toBe("srv-1");

    second.release();
    await b;
    expect(state(store).items.map((l) => l.priceVnd)).toEqual([111_000, 222_000]);
  });

  it("drops the line total when the BE priced another quantity than the one on screen", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-1", quantity: 1, lineTotalVnd: 350_000 })]))));
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 3));

    await store.dispatch(syncAddToCartItem({ ...ADD, quantity: 3 }));

    expect(state(store).items[0]).toMatchObject({ quantity: 3, lineTotalVnd: null, lineTotalUsd: null, priceVnd: 350_000 });
  });

  it("leaves a line the BE answer does not mention without an id and without a price", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json(serverCart([]))));
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));

    await store.dispatch(syncAddToCartItem(ADD));

    expect(state(store).items[0]).toMatchObject({ lineTotalVnd: null });
    expect(state(store).items[0].serverItemId).toBeUndefined();
  });
});

describe("CART-6R catching up with what the shopper did while the add was on its way", () => {
  /** A fake BE that answers the add after the test lets it, and records what it is told afterwards. */
  function slowAdd(serverQuantity = 1) {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    const told = { patches: [] as { id: string; quantity: number }[], deletes: [] as string[] };
    server.use(
      http.post(`${API}/api/cart/items`, async () => {
        await open;
        return HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-new", quantity: serverQuantity })]));
      }),
      http.patch(`${API}/api/cart/items/:id`, async ({ request, params }) => {
        const { quantity } = (await request.json()) as { quantity: number };
        told.patches.push({ id: String(params.id), quantity });
        return HttpResponse.json(serverCart([cartLine({ serverItemId: String(params.id), quantity })]));
      }),
      http.delete(`${API}/api/cart/items/:id`, ({ params }) => {
        told.deletes.push(String(params.id));
        return HttpResponse.json(serverCart([]));
      })
    );
    return { release, told };
  }
  const change = (store: ReturnType<typeof makeStore>, quantity: number) => store.dispatch(updateQuantity({ productId: "p1", size: "M", color: "Red", quantity }));

  it("tells the BE the new quantity when it changed here before the add was answered", async () => {
    const { release, told } = slowAdd();
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));
    const done = store.dispatch(syncAddToCartItem(ADD));
    change(store, 4);

    release();
    await done;

    expect(told.patches).toEqual([{ id: "srv-new", quantity: 4 }]);
    expect(state(store).items[0]).toMatchObject({ quantity: 4, serverItemId: "srv-new", lineTotalVnd: 350_000 });
  });

  it("removes the line on the BE when it was removed here before the add was answered", async () => {
    const { release, told } = slowAdd();
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));
    const done = store.dispatch(syncAddToCartItem(ADD));
    store.dispatch(removeItem({ productId: "p1", size: "M", color: "Red" }));

    release();
    await done;

    expect(told.deletes).toEqual(["srv-new"]);
    expect(told.patches).toEqual([]);
    expect(state(store).items).toEqual([]);
  });

  it("sends nothing more when the bag still matches what the BE has", async () => {
    const { release, told } = slowAdd();
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));
    const done = store.dispatch(syncAddToCartItem(ADD));

    release();
    await done;

    expect(told).toEqual({ patches: [], deletes: [] });
  });

  it("waits for the last of two adds of the same line before comparing, so the two do not race", async () => {
    let calls = 0;
    const releases: (() => void)[] = [];
    const told = { patches: 0 };
    server.use(
      http.post(`${API}/api/cart/items`, async () => {
        const mine = ++calls;
        await new Promise<void>((resolve) => releases.push(resolve));
        return HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-new", quantity: mine })]));
      }),
      http.patch(`${API}/api/cart/items/:id`, () => {
        told.patches += 1;
        return HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-new", quantity: 2 })]));
      })
    );
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));
    const first = store.dispatch(syncAddToCartItem(ADD));
    store.dispatch(addItem(NEW_LINE(), 1));
    const second = store.dispatch(syncAddToCartItem(ADD));
    await waitFor(() => expect(releases).toHaveLength(2));

    releases[0]();
    await new Promise((resolve) => setTimeout(resolve, 50));
    releases[1]();
    await Promise.all([first, second]);

    expect(told.patches).toBe(0);
    expect(state(store).items[0].quantity).toBe(2);
  });

  it("keeps the line, with the BE's answer, when the catch-up request itself fails", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(`${API}/api/cart/items`, async () => {
        await open;
        return HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-new", quantity: 1 })]));
      }),
      http.patch(`${API}/api/cart/items/:id`, () => HttpResponse.json({ message: "boom" }, { status: 500 }))
    );
    const store = makeStore();
    store.dispatch(addItem(NEW_LINE(), 1));
    const done = store.dispatch(syncAddToCartItem(ADD));
    change(store, 3);

    release();
    const result = await done;

    expect(result.type).toBe("cart/syncAdd/fulfilled");
    expect(state(store).items[0]).toMatchObject({ quantity: 3, serverItemId: "srv-new", lineTotalVnd: null });
  });
});

describe("CART-7 the other writes", () => {
  it("updates a quantity with PATCH and takes the BE's line total", async () => {
    let seen: { url: string; body: unknown; auth: string | null } | null = null;
    server.use(
      http.patch(`${API}/api/cart/items/:id`, async ({ request, params }) => {
        seen = { url: String(params.id), body: await request.json(), auth: request.headers.get("authorization") };
        return HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-1", quantity: 4, lineTotalVnd: 1_400_000, lineTotalUsd: 53.84 })]));
      })
    );
    const store = makeStore({ cart: cartState([cartLine({ serverItemId: "srv-1", quantity: 4, lineTotalVnd: null, lineTotalUsd: null })]) });

    await store.dispatch(syncUpdateCartItemQuantity({ serverItemId: "srv-1", quantity: 4 }));

    expect(seen).toEqual({ url: "srv-1", body: { quantity: 4 }, auth: "Bearer test-access" });
    expect(state(store).items[0]).toMatchObject({ lineTotalVnd: 1_400_000, lineTotalUsd: 53.84 });
    expect(state(store).pendingSync).toBe(0);
  });

  it("removes a line with DELETE", async () => {
    let seen: { method: string; id: string } | null = null;
    server.use(
      http.delete(`${API}/api/cart/items/:id`, ({ request, params }) => {
        seen = { method: request.method, id: String(params.id) };
        return HttpResponse.json(serverCart([]));
      })
    );
    const store = makeStore({ cart: cartState([cartLine({ serverItemId: "srv-1" })]) });

    const result = await store.dispatch(syncRemoveCartItem("srv-1"));

    expect(seen).toEqual({ method: "DELETE", id: "srv-1" });
    expect(result.type).toBe("cart/syncRemove/fulfilled");
    expect(state(store).pendingSync).toBe(0);
  });

  it("counts the write while it runs", async () => {
    const g = gate();
    server.use(
      http.delete(`${API}/api/cart/items/:id`, async () => {
        await g.open;
        return HttpResponse.json(serverCart([]));
      })
    );
    const store = makeStore({ cart: cartState([cartLine({ serverItemId: "srv-1" })]) });

    const done = store.dispatch(syncRemoveCartItem("srv-1"));
    await Promise.resolve();
    expect(state(store).pendingSync).toBe(1);
    g.release();
    await done;

    expect(state(store).pendingSync).toBe(0);
  });

  it("empties the cart on the server with DELETE /api/cart/clear and changes nothing on screen", async () => {
    let called = false;
    server.use(
      http.delete(`${API}/api/cart/clear`, () => {
        called = true;
        return HttpResponse.json({});
      })
    );
    const store = makeStore({ cart: cartState([cartLine()]) });

    const result = await store.dispatch(clearCartOnServer());

    expect(called).toBe(true);
    expect(result.type).toBe("cart/clearOnServer/fulfilled");
    expect(state(store).items).toHaveLength(1);
  });
});

describe("CART-7E writes that fail", () => {
  it.each([
    ["update", (store: ReturnType<typeof makeStore>) => store.dispatch(syncUpdateCartItemQuantity({ serverItemId: "srv-1", quantity: 2 })), "patch"],
    ["remove", (store: ReturnType<typeof makeStore>) => store.dispatch(syncRemoveCartItem("srv-1")), "delete"],
  ] as const)("a failed %s gives the counter back and leaves the lines as they are", async (_what, send, verb) => {
    server.use(http[verb](`${API}/api/cart/items/:id`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    const store = makeStore({ cart: cartState([cartLine({ serverItemId: "srv-1", quantity: 2 })]) });

    const result = await send(store);

    expect(result.type.endsWith("/rejected")).toBe(true);
    expect(state(store).pendingSync).toBe(0);
    expect(state(store).items).toEqual([cartLine({ serverItemId: "srv-1", quantity: 2 })]);
  });

  it("clearing on the server can fail without touching the cart", async () => {
    server.use(http.delete(`${API}/api/cart/clear`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    const store = makeStore({ cart: cartState([cartLine()]) });

    const result = await store.dispatch(clearCartOnServer());

    expect(result.type).toBe("cart/clearOnServer/rejected");
    expect(state(store).items).toHaveLength(1);
  });

  it("without a stored token the request goes out with no Authorization header and the BE's 401 is the answer", async () => {
    localStorage.clear();
    let auth: string | null = "unset";
    server.use(
      http.get(`${API}/api/cart`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
      })
    );

    const result = await makeStore().dispatch(fetchCart());

    expect(auth).toBeNull();
    expect(result.type).toBe("cart/fetch/rejected");
  });
});
