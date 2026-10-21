import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addItem, clearCart, toggleDrawer, toggleItemSelected } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { clearWishlist, toggleWishlistItem } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import { store } from "@/src/store";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { StoreProvider } from "@/src/store/StoreProvider";

/* The Redux store and what it writes to localStorage (specs/platform/data-layer.md, flows STO-1 and STO-1E). */

const ITEM = { productId: "p1", name: "Dress", priceVnd: 350_000, priceUsd: 13.46, image: "/a.jpg", size: "M", color: "Red", colorHex: "#f00", category: "tops", subcategory: "shirts" };
const WISH = { productId: "p1", name: "Dress", priceVnd: 350_000, priceUsd: 13.46, image: "/a.jpg", category: "tops", subcategory: "shirts" };
const read = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null");

afterEach(() => {
  store.dispatch(clearCart());
  store.dispatch(clearWishlist());
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("STO-1 the store", () => {
  it("has a reducer for every admin module and for the cart and wishlist (13)", () => {
    expect(Object.keys(store.getState()).sort()).toEqual(
      ["cart", "categories", "collections", "media", "orders", "payments", "products", "refunds", "returns", "reviews", "siteConfig", "users", "wishlist"].sort()
    );
  });

  it("saves the cart items in localStorage in the shape older sessions used", () => {
    store.dispatch(addItem(ITEM, 2));

    const saved = read("doovan-cart");
    expect(saved.version).toBe(0);
    expect(saved.state.items).toHaveLength(1);
    expect(saved.state.items[0]).toMatchObject({ productId: "p1", size: "M", color: "Red", quantity: 2 });
  });

  it("saves which cart lines are unticked", () => {
    store.dispatch(addItem(ITEM, 1));

    store.dispatch(toggleItemSelected("p1|M|Red"));

    expect(read("doovan-cart-selection")).toEqual({ deselectedKeys: ["p1|M|Red"] });
  });

  it("saves the wishlist, with the time each item was added", () => {
    store.dispatch(toggleWishlistItem(WISH));

    const saved = read("doovan-wishlist");
    expect(saved.version).toBe(0);
    expect(saved.state.items).toEqual([{ ...WISH, addedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) }]);
  });

  it("keeps saving as the cart changes, down to an empty cart", () => {
    store.dispatch(addItem(ITEM, 1));
    store.dispatch(clearCart());

    expect(read("doovan-cart").state.items).toEqual([]);
  });

  it("the typed hooks and StoreProvider connect a component to the same store", async () => {
    function Heart() {
      const count = useAppSelector((state) => state.wishlist.items.length);
      const dispatch = useAppDispatch();
      return <button onClick={() => dispatch(toggleWishlistItem(WISH))}>{`wishlist ${count}`}</button>;
    }
    render(
      <StoreProvider>
        <Heart />
      </StoreProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "wishlist 0" }));

    expect(screen.getByRole("button", { name: "wishlist 1" })).toBeInTheDocument();
    expect(store.getState().wishlist.items).toHaveLength(1);
  });
});

describe("STO-1E what the store does not write, and what fails", () => {
  it("does not write when the changed state is not a persisted part (opening the cart drawer)", () => {
    store.dispatch(addItem(ITEM, 1));
    localStorage.clear();

    store.dispatch(toggleDrawer());

    expect(localStorage.getItem("doovan-cart")).toBeNull();
    expect(localStorage.getItem("doovan-wishlist")).toBeNull();
    store.dispatch(toggleDrawer());
  });

  it("does not write the wishlist when only the cart changed, and the other way round", () => {
    store.dispatch(addItem(ITEM, 1));
    expect(localStorage.getItem("doovan-wishlist")).toBeNull();

    localStorage.clear();
    store.dispatch(toggleWishlistItem(WISH));
    expect(localStorage.getItem("doovan-cart")).toBeNull();
  });

  it("swallows a full or blocked localStorage: the state still changes", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    expect(() => store.dispatch(toggleWishlistItem(WISH))).not.toThrow();
    expect(() => store.dispatch(addItem(ITEM, 1))).not.toThrow();
    expect(store.getState().wishlist.items).toHaveLength(1);
    expect(store.getState().cart.items).toHaveLength(1);
  });
});

describe("STO-1E baseCrudReducers (exported, but no slice dispatches them: see the spec)", () => {
  const fresh = (): BaseCrudState => ({ ...baseCrudInitialState });
  const failure = (message: string) => ({ type: "x", payload: message });

  it("starts with nothing in flight and no error", () => {
    expect(baseCrudInitialState).toEqual({ isCreating: false, isUpdating: false, isDeleting: false, error: null });
  });

  it.each([
    ["create", "isCreating", baseCrudReducers.createStart, baseCrudReducers.createSuccess, baseCrudReducers.createError],
    ["update", "isUpdating", baseCrudReducers.updateStart, baseCrudReducers.updateSuccess, baseCrudReducers.updateError],
    ["delete", "isDeleting", baseCrudReducers.deleteStart, baseCrudReducers.deleteSuccess, baseCrudReducers.deleteError],
  ] as const)("%s: start sets the flag and clears the error; success clears the flag; error clears it and keeps the message", (_name, flag, start, success, error) => {
    const state = { ...fresh(), error: "old" };

    start(state);
    expect(state[flag]).toBe(true);
    expect(state.error).toBeNull();

    success(state);
    expect(state[flag]).toBe(false);

    start(state);
    error(state, failure("boom"));
    expect(state[flag]).toBe(false);
    expect(state.error).toBe("boom");
  });

  it("clearError empties the error and touches nothing else", () => {
    const state: BaseCrudState = { isCreating: true, isUpdating: false, isDeleting: false, error: "boom" };

    baseCrudReducers.clearError(state);

    expect(state).toEqual({ isCreating: true, isUpdating: false, isDeleting: false, error: null });
  });
});
