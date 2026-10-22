import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addItem,
  cartItemKey,
  cartReducer,
  clearCart,
  closeDrawer,
  openDrawer,
  removeItem,
  removeItems,
  selectCartPendingSync,
  selectPurchasableCartItems,
  selectSelectedCartItems,
  selectSelectedTotalItems,
  selectTotalItems,
  setAllSelected,
  toggleDrawer,
  toggleItemSelected,
  updateQuantity,
} from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import type { NewCartItem } from "@/src/app/[locale]/(private)/cart/_common/types";
import { makeStore } from "@/src/store";
import { cartLine, cartState } from "@/tests/_support/fixtures";

/* Cart reducers, selectors and the first state read from localStorage (specs/storefront/cart.md, flows CART-1 to CART-4E). */

const NEW_LINE = (over: Partial<NewCartItem> = {}): NewCartItem => {
  const { quantity: _q, serverItemId: _s, lineTotalVnd: _v, lineTotalUsd: _u, ...rest } = cartLine();
  return { ...rest, ...over };
};
const storeWith = (...lines: ReturnType<typeof cartLine>[]) => makeStore({ cart: cartState(lines) });
const lines = (store: ReturnType<typeof makeStore>) => store.getState().cart.items;

describe("CART-1 adding lines", () => {
  it("adds a new line with the quantity asked and no line total yet", () => {
    const store = makeStore();

    store.dispatch(addItem(NEW_LINE(), 2));

    expect(lines(store)).toEqual([{ ...NEW_LINE(), quantity: 2, lineTotalVnd: null, lineTotalUsd: null }]);
  });

  it("defaults the quantity to 1", () => {
    const store = makeStore();

    store.dispatch(addItem(NEW_LINE()));

    expect(lines(store)[0].quantity).toBe(1);
  });

  it("adds the quantity to the line with the same product, size and colour, and clears its line total", () => {
    const store = storeWith(cartLine({ quantity: 2 }));

    store.dispatch(addItem(NEW_LINE(), 3));

    expect(lines(store)).toHaveLength(1);
    expect(lines(store)[0]).toMatchObject({ quantity: 5, lineTotalVnd: null, lineTotalUsd: null });
  });

  it.each([
    ["size", { size: "L" }],
    ["colour", { color: "Blue" }],
    ["product", { productId: "p2" }],
  ])("makes a new line when the %s differs", (_what, change) => {
    const store = storeWith(cartLine());

    store.dispatch(addItem(NEW_LINE(change), 1));

    expect(lines(store)).toHaveLength(2);
  });

  it("builds the line key from product, size and colour", () => {
    expect(cartItemKey({ productId: "p1", size: "M", color: "Red" })).toBe("p1|M|Red");
  });
});

describe("CART-2 changing and removing lines", () => {
  it("sets a new quantity and clears the line total the BE priced for the old one", () => {
    const store = storeWith(cartLine({ quantity: 1 }));

    store.dispatch(updateQuantity({ productId: "p1", size: "M", color: "Red", quantity: 4 }));

    expect(lines(store)[0]).toMatchObject({ quantity: 4, lineTotalVnd: null, lineTotalUsd: null });
  });

  it.each([0, -1])("removes the line when the quantity becomes %i", (quantity) => {
    const store = storeWith(cartLine(), cartLine({ productId: "p2" }));

    store.dispatch(updateQuantity({ productId: "p1", size: "M", color: "Red", quantity }));

    expect(lines(store).map((l) => l.productId)).toEqual(["p2"]);
  });

  it("changes only the line with the same size and colour", () => {
    const store = storeWith(cartLine(), cartLine({ size: "L" }));

    store.dispatch(updateQuantity({ productId: "p1", size: "L", color: "Red", quantity: 3 }));

    expect(lines(store).map((l) => l.quantity)).toEqual([1, 3]);
  });

  it("ignores a quantity change for a line that is not there", () => {
    const store = storeWith(cartLine());

    store.dispatch(updateQuantity({ productId: "nope", size: "M", color: "Red", quantity: 3 }));

    expect(lines(store)).toEqual([cartLine()]);
  });

  it("removes one line, and forgets that it was unticked so that adding it again starts ticked", () => {
    const store = makeStore({ cart: cartState([cartLine(), cartLine({ productId: "p2" })], { deselectedKeys: ["p1|M|Red", "p2|M|Red"] }) });

    store.dispatch(removeItem({ productId: "p1", size: "M", color: "Red" }));

    expect(lines(store).map((l) => l.productId)).toEqual(["p2"]);
    expect(store.getState().cart.deselectedKeys).toEqual(["p2|M|Red"]);
  });

  it("removes several lines by key and prunes the unticked keys too", () => {
    const store = makeStore({ cart: cartState([cartLine(), cartLine({ productId: "p2" }), cartLine({ productId: "p3" })], { deselectedKeys: ["p1|M|Red", "p3|M|Red"] }) });

    store.dispatch(removeItems(["p1|M|Red", "p2|M|Red"]));

    expect(lines(store).map((l) => l.productId)).toEqual(["p3"]);
    expect(store.getState().cart.deselectedKeys).toEqual(["p3|M|Red"]);
  });

  it("prunes the unticked key when a quantity of 0 removes the line", () => {
    const store = makeStore({ cart: cartState([cartLine()], { deselectedKeys: ["p1|M|Red"] }) });

    store.dispatch(updateQuantity({ productId: "p1", size: "M", color: "Red", quantity: 0 }));

    expect(store.getState().cart.deselectedKeys).toEqual([]);
  });

  it("clears the cart and the unticked keys", () => {
    const store = makeStore({ cart: cartState([cartLine()], { deselectedKeys: ["p1|M|Red"] }) });

    store.dispatch(clearCart());

    expect(lines(store)).toEqual([]);
    expect(store.getState().cart.deselectedKeys).toEqual([]);
  });

  it("opens, closes and toggles the drawer flag", () => {
    const store = makeStore();

    store.dispatch(openDrawer());
    expect(store.getState().cart.isOpen).toBe(true);
    store.dispatch(closeDrawer());
    expect(store.getState().cart.isOpen).toBe(false);
    store.dispatch(toggleDrawer());
    expect(store.getState().cart.isOpen).toBe(true);
    store.dispatch(toggleDrawer());
    expect(store.getState().cart.isOpen).toBe(false);
  });
});

describe("CART-3 ticking lines and the totals", () => {
  const trio = () => [cartLine({ quantity: 2 }), cartLine({ productId: "p2", quantity: 3 }), cartLine({ productId: "p3", quantity: 1 })];

  it("every line is ticked by default, including a line added later", () => {
    const store = storeWith(...trio());
    expect(selectSelectedCartItems(store.getState())).toHaveLength(3);

    store.dispatch(addItem(NEW_LINE({ productId: "p4" }), 1));

    expect(selectSelectedCartItems(store.getState())).toHaveLength(4);
  });

  it("unticks and re-ticks one line", () => {
    const store = storeWith(...trio());

    store.dispatch(toggleItemSelected("p2|M|Red"));
    expect(selectSelectedCartItems(store.getState()).map((l) => l.productId)).toEqual(["p1", "p3"]);
    expect(store.getState().cart.deselectedKeys).toEqual(["p2|M|Red"]);

    store.dispatch(toggleItemSelected("p2|M|Red"));
    expect(selectSelectedCartItems(store.getState())).toHaveLength(3);
  });

  it("unticks every line, then ticks every line", () => {
    const store = storeWith(...trio());

    store.dispatch(setAllSelected(false));
    expect(selectSelectedCartItems(store.getState())).toEqual([]);
    expect(store.getState().cart.deselectedKeys).toHaveLength(3);

    store.dispatch(setAllSelected(true));
    expect(store.getState().cart.deselectedKeys).toEqual([]);
    expect(selectSelectedCartItems(store.getState())).toHaveLength(3);
  });

  it("adds up the quantity of all lines and of the ticked lines", () => {
    const store = storeWith(...trio());
    expect(selectTotalItems(store.getState())).toBe(6);
    expect(selectSelectedTotalItems(store.getState())).toBe(6);

    store.dispatch(toggleItemSelected("p2|M|Red"));

    expect(selectTotalItems(store.getState())).toBe(6);
    expect(selectSelectedTotalItems(store.getState())).toBe(3);
  });

  it("is 0 for an empty cart", () => {
    const store = makeStore();

    expect(selectTotalItems(store.getState())).toBe(0);
    expect(selectSelectedTotalItems(store.getState())).toBe(0);
    expect(selectCartPendingSync(store.getState())).toBe(0);
  });

  it("returns the same list again while the cart has not changed (memoised selectors)", () => {
    const store = storeWith(...trio());

    expect(selectPurchasableCartItems(store.getState())).toBe(selectPurchasableCartItems(store.getState()));
    expect(selectSelectedCartItems(store.getState())).toBe(selectSelectedCartItems(store.getState()));
  });
});

describe("CART-3E lines that can never be bought", () => {
  const mixed = () => [cartLine(), cartLine({ productId: "p2", badge: "sold_out" }), cartLine({ productId: "p3", badge: "custom_order" }), cartLine({ productId: "p4", badge: "new" })];

  it("keeps sold-out and custom-order lines in the bag but out of the buyable and ticked lists", () => {
    const store = storeWith(...mixed());

    expect(lines(store)).toHaveLength(4);
    expect(selectPurchasableCartItems(store.getState()).map((l) => l.productId)).toEqual(["p1", "p4"]);
    expect(selectSelectedCartItems(store.getState()).map((l) => l.productId)).toEqual(["p1", "p4"]);
  });

  it("does not count them in the ticked quantity even after 'tick all'", () => {
    const store = storeWith(...mixed().map((l) => ({ ...l, quantity: 2 })));

    store.dispatch(setAllSelected(true));

    expect(selectSelectedTotalItems(store.getState())).toBe(4);
    expect(selectTotalItems(store.getState())).toBe(8);
  });

  it("does not break on a key that is not in the cart", () => {
    const store = storeWith(cartLine());

    store.dispatch(toggleItemSelected("ghost|M|Red"));
    store.dispatch(removeItems(["ghost|M|Red"]));
    store.dispatch(removeItem({ productId: "ghost", size: "M", color: "Red" }));

    expect(lines(store)).toEqual([cartLine()]);
    expect(selectSelectedCartItems(store.getState())).toHaveLength(1);
  });

  it("the reducer alone starts from empty state when there is nothing saved", () => {
    expect(cartReducer(undefined, { type: "@@init" })).toMatchObject({ items: [], deselectedKeys: [], pendingAddKeys: [], pendingSync: 0, isOpen: false, isSyncing: false });
  });
});

/* The first state is read from localStorage when the module loads, so each case loads a fresh copy of it. */
async function loadSliceWith(saved: Record<string, string>) {
  localStorage.clear();
  for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value);
  vi.resetModules();
  return import("@/src/app/[locale]/(private)/cart/_common/moduleSlice");
}
const firstState = async (saved: Record<string, string>) => (await loadSliceWith(saved)).cartReducer(undefined, { type: "@@init" });

describe("CART-4 reading the saved cart", () => {
  beforeEach(() => vi.resetModules());

  it("reads the lines saved in the wrapped format the store writes", async () => {
    const state = await firstState({ "doovan-cart": JSON.stringify({ state: { items: [cartLine({ quantity: 2 })] }, version: 0 }) });

    expect(state.items).toEqual([cartLine({ quantity: 2 })]);
  });

  it("reads the plain { items } format of older sessions", async () => {
    const state = await firstState({ "doovan-cart": JSON.stringify({ items: [cartLine()] }) });

    expect(state.items).toEqual([cartLine()]);
  });

  it("reads which lines were unticked", async () => {
    const state = await firstState({ "doovan-cart-selection": JSON.stringify({ deselectedKeys: ["p1|M|Red"] }) });

    expect(state.deselectedKeys).toEqual(["p1|M|Red"]);
  });

  it("never starts with a request in flight or the drawer open, whatever was saved", async () => {
    const state = await firstState({ "doovan-cart": JSON.stringify({ state: { items: [cartLine()] }, isOpen: true, pendingSync: 4 }) });

    expect(state).toMatchObject({ pendingAddKeys: [], pendingSync: 0, isOpen: false, isSyncing: false });
  });
});

describe("CART-4E saved data that is old or damaged", () => {
  it("drops lines saved before prices became a VND/USD pair", async () => {
    const { priceVnd: _p, ...old } = cartLine();
    const state = await firstState({ "doovan-cart": JSON.stringify({ state: { items: [old, cartLine({ productId: "p2" })] } }) });

    expect(state.items.map((l) => l.productId)).toEqual(["p2"]);
  });

  it("drops a line whose price is not a number", async () => {
    const state = await firstState({ "doovan-cart": JSON.stringify({ items: [{ ...cartLine(), priceVnd: "350000" }] }) });

    expect(state.items).toEqual([]);
  });

  it.each([
    ["nothing saved", {}],
    ["invalid JSON", { "doovan-cart": "{not json", "doovan-cart-selection": "also not json" }],
    ["items that are not a list", { "doovan-cart": JSON.stringify({ state: { items: "oops" } }) }],
    ["a saved null", { "doovan-cart": "null", "doovan-cart-selection": "null" }],
    ["unticked keys that are not a list", { "doovan-cart-selection": JSON.stringify({ deselectedKeys: "p1" }) }],
  ])("starts empty for %s", async (_what, saved) => {
    const state = await firstState(saved);

    expect(state.items).toEqual([]);
    expect(state.deselectedKeys).toEqual([]);
  });

  it("keeps only the text keys of a mixed unticked list", async () => {
    const state = await firstState({ "doovan-cart-selection": JSON.stringify({ deselectedKeys: ["p1|M|Red", 7, null, "p2|M|Red"] }) });

    expect(state.deselectedKeys).toEqual(["p1|M|Red", "p2|M|Red"]);
  });
});
