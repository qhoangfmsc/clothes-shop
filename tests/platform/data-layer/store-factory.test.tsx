import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addItem } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { toggleWishlistItem } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import { attachPersistence, makeStore, store } from "@/src/store";
import { useAppSelector } from "@/src/store/hooks";
import { StoreProvider } from "@/src/store/StoreProvider";

/* makeStore, attachPersistence and the store given to StoreProvider (specs/platform/data-layer.md, flows STO-2 and STO-2E). */

const LINE = { productId: "p1", name: "Dress", priceVnd: 350_000, priceUsd: 13.46, image: "/a.jpg", size: "M", color: "Red", colorHex: "#f00", category: "tops", subcategory: "shirts" };
const WISH = { productId: "p1", name: "Dress", priceVnd: 350_000, priceUsd: 13.46, image: "/a.jpg", category: "tops", subcategory: "shirts" };
const saved = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null");

afterEach(() => vi.restoreAllMocks());

describe("STO-2 makeStore", () => {
  it("builds a store with the 13 reducers each time", () => {
    const keys = Object.keys(makeStore().getState()).sort();

    expect(keys).toHaveLength(13);
    expect(keys).toEqual(Object.keys(store.getState()).sort());
  });

  it("starts from the state it is given, and from the slices' own state for the rest", () => {
    const first = { ...LINE, quantity: 3, lineTotalVnd: null, lineTotalUsd: null };

    const made = makeStore({ cart: { items: [first], deselectedKeys: [], pendingAddKeys: [], pendingSync: 0, isOpen: false, isSyncing: false } });

    expect(made.getState().cart.items).toEqual([first]);
    expect(made.getState().wishlist.items).toEqual([]);
  });

  it("is a new store every time: a change in one is not seen in the other", () => {
    const a = makeStore();
    const b = makeStore();

    a.dispatch(addItem(LINE, 1));

    expect(a.getState().cart.items).toHaveLength(1);
    expect(b.getState().cart.items).toHaveLength(0);
    expect(store.getState().cart.items).toHaveLength(0);
  });
});

describe("STO-2 attachPersistence", () => {
  it("saves the cart, the unticked lines and the wishlist of the store it is attached to", () => {
    const made = makeStore();
    attachPersistence(made);

    made.dispatch(addItem(LINE, 2));
    made.dispatch(toggleWishlistItem(WISH));

    expect(saved("doovan-cart").state.items[0]).toMatchObject({ productId: "p1", quantity: 2 });
    expect(saved("doovan-wishlist").state.items).toHaveLength(1);
  });

  it("returns a function that stops the saving", () => {
    const made = makeStore();
    const detach = attachPersistence(made);
    made.dispatch(addItem(LINE, 1));
    localStorage.clear();

    detach();
    made.dispatch(addItem(LINE, 1));

    expect(localStorage.getItem("doovan-cart")).toBeNull();
  });
});

describe("STO-2 StoreProvider with a store of its own", () => {
  function Count() {
    const count = useAppSelector((state) => state.cart.items.length);
    return <p>{`lines ${count}`}</p>;
  }

  it("shows the state of the store it was given, not the app's", () => {
    const own = makeStore();
    own.dispatch(addItem(LINE, 1));

    render(
      <StoreProvider store={own}>
        <Count />
      </StoreProvider>
    );

    expect(screen.getByText("lines 1")).toBeInTheDocument();
    expect(store.getState().cart.items).toHaveLength(0);
  });
});

describe("STO-2E what a store without persistence does", () => {
  it("does not touch localStorage until persistence is attached", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const made = makeStore();

    made.dispatch(addItem(LINE, 1));
    made.dispatch(toggleWishlistItem(WISH));

    expect(setItem).not.toHaveBeenCalled();
  });

  it("two attached stores save into the same keys, the last change wins", () => {
    const a = makeStore();
    const b = makeStore();
    attachPersistence(a);
    attachPersistence(b);

    a.dispatch(addItem(LINE, 1));
    b.dispatch(addItem({ ...LINE, productId: "p2" }, 1));

    expect(saved("doovan-cart").state.items.map((i: { productId: string }) => i.productId)).toEqual(["p2"]);
  });
});
