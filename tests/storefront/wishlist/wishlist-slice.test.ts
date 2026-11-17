import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearWishlist,
  removeWishlistItem,
  selectIsWishlisted,
  selectWishlistIsSyncing,
  selectWishlistItems,
  selectWishlistTotal,
  toggleWishlistItem,
  wishlistReducer,
} from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import { makeStore } from "@/src/store";
import { wishlistItem, wishlistState } from "@/tests/_support/fixtures";

/* Wishlist reducers, selectors and the first state read from localStorage (specs/storefront/wishlist.md, flows WL-1 to WL-2E). */

const { addedAt: _addedAt, ...NEW_ITEM } = wishlistItem();
const storeWith = (...items: ReturnType<typeof wishlistItem>[]) => makeStore({ wishlist: wishlistState(items) });
const ids = (store: ReturnType<typeof makeStore>) => store.getState().wishlist.items.map((i) => i.productId);

afterEach(() => vi.useRealTimers());

describe("WL-1 saving and removing products", () => {
  it("saves a product with the time it was saved", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T10:00:00.000Z"));
    const store = makeStore();

    store.dispatch(toggleWishlistItem(NEW_ITEM));

    expect(store.getState().wishlist.items).toEqual([{ ...NEW_ITEM, addedAt: "2026-03-05T10:00:00.000Z" }]);
  });

  it("removes the product when it is toggled again", () => {
    const store = storeWith(wishlistItem());

    store.dispatch(toggleWishlistItem(NEW_ITEM));

    expect(ids(store)).toEqual([]);
  });

  it("keeps the order products were saved in, newest last", () => {
    const store = makeStore();

    store.dispatch(toggleWishlistItem({ ...NEW_ITEM, productId: "a" }));
    store.dispatch(toggleWishlistItem({ ...NEW_ITEM, productId: "b" }));
    store.dispatch(toggleWishlistItem({ ...NEW_ITEM, productId: "c" }));
    store.dispatch(toggleWishlistItem({ ...NEW_ITEM, productId: "b" }));

    expect(ids(store)).toEqual(["a", "c"]);
  });

  it("removes one product by id and leaves the others", () => {
    const store = storeWith(wishlistItem({ productId: "a" }), wishlistItem({ productId: "b" }));

    store.dispatch(removeWishlistItem("a"));

    expect(ids(store)).toEqual(["b"]);
  });

  it("empties the list", () => {
    const store = storeWith(wishlistItem({ productId: "a" }), wishlistItem({ productId: "b" }));

    store.dispatch(clearWishlist());

    expect(ids(store)).toEqual([]);
  });

  it("says whether a product is saved, how many are saved, and whether a sync is running", () => {
    const store = storeWith(wishlistItem({ productId: "a" }), wishlistItem({ productId: "b" }));
    const state = store.getState();

    expect(selectIsWishlisted("a")(state)).toBe(true);
    expect(selectIsWishlisted("zzz")(state)).toBe(false);
    expect(selectWishlistTotal(state)).toBe(2);
    expect(selectWishlistItems(state)).toHaveLength(2);
    expect(selectWishlistIsSyncing(state)).toBe(false);
  });
});

describe("WL-1E nothing to remove", () => {
  it("removing a product that is not there changes nothing", () => {
    const store = storeWith(wishlistItem());

    store.dispatch(removeWishlistItem("ghost"));

    expect(ids(store)).toEqual(["p1"]);
  });

  it("emptying an empty list is fine, and the reducer alone starts empty", () => {
    const store = makeStore();

    store.dispatch(clearWishlist());

    expect(store.getState().wishlist).toEqual({ items: [], isSyncing: false });
    expect(wishlistReducer(undefined, { type: "@@init" })).toEqual({ items: [], isSyncing: false });
  });
});

/* The first state is read from localStorage when the module loads, so each case loads a fresh copy of it. */
async function firstState(saved: Record<string, string>) {
  localStorage.clear();
  for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value);
  vi.resetModules();
  const { wishlistReducer: fresh } = await import("@/src/app/[locale]/(private)/wishlist/_common/moduleSlice");
  return fresh(undefined, { type: "@@init" });
}

describe("WL-2 reading the saved list", () => {
  it("reads the wrapped format the store writes", async () => {
    const state = await firstState({ "doovan-wishlist": JSON.stringify({ state: { items: [wishlistItem()] }, version: 0 }) });

    expect(state.items).toEqual([wishlistItem()]);
  });

  it("reads the plain { items } format of older sessions", async () => {
    const state = await firstState({ "doovan-wishlist": JSON.stringify({ items: [wishlistItem()] }) });

    expect(state.items).toEqual([wishlistItem()]);
  });

  it("starts with no sync running", async () => {
    const state = await firstState({ "doovan-wishlist": JSON.stringify({ items: [wishlistItem()], isSyncing: true }) });

    expect(state.isSyncing).toBe(false);
  });
});

describe("WL-2E saved data that is old or damaged", () => {
  it("drops products saved before prices became a VND/USD pair, and keeps the rest", async () => {
    const { priceVnd: _p, ...old } = wishlistItem({ productId: "old" });
    const state = await firstState({ "doovan-wishlist": JSON.stringify({ state: { items: [old, wishlistItem({ productId: "new" })] } }) });

    expect(state.items.map((i) => i.productId)).toEqual(["new"]);
  });

  it("drops a product whose price is not a number", async () => {
    const state = await firstState({ "doovan-wishlist": JSON.stringify({ items: [{ ...wishlistItem(), priceVnd: "350000" }] }) });

    expect(state.items).toEqual([]);
  });

  it.each([
    ["nothing saved", {}],
    ["invalid JSON", { "doovan-wishlist": "{not json" }],
    ["items that are not a list", { "doovan-wishlist": JSON.stringify({ state: { items: "oops" } }) }],
    ["a saved null", { "doovan-wishlist": "null" }],
  ])("starts empty for %s", async (_what, saved) => {
    const state = await firstState(saved);

    expect(state.items).toEqual([]);
  });
});
