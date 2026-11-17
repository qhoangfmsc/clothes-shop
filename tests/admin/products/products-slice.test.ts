import { describe, expect, it } from "vitest";
import { clearError, createProduct, deleteProduct, fetchProductList, updateProduct } from "@/src/app/[locale]/(admin)/admin/products/_common/moduleSlice";
import { EMPTY_FORM, MAX_PRICE_VND, MIN_PRICE_VND, PRODUCT_MIN_RATINGS, PRODUCT_SORT_OPTIONS, SIZE_GROUPS } from "@/src/app/[locale]/(admin)/admin/products/_common/constants";
import { makeStore } from "@/src/store";
import { product } from "@/tests/_support/fixtures";
import { productsApi } from "./products-kit";

/* The products store and its constants (specs/admin/products.md, flow APR-10). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().products;

describe("APR-10 the products store", () => {
  it("asks with the filters it was given and keeps what came back", async () => {
    const calls = productsApi({ pages: [{ data: [product()], total: 9 }] });
    const store = makeStore();

    await store.dispatch(fetchProductList({ search: "silk", category: "tops", badge: "sale", status: "active", minRating: 4, sort: "-price", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "silk", category: "tops", badge: "sale", status: "active", minRating: "4", sort: "-price", limit: "25" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "p1" })], total: 9, page: 1, limit: 25, isListLoading: false });
  });

  it("is loading while it waits and remembers the error when the BE refuses", async () => {
    productsApi({ failListFrom: 1 });
    const store = makeStore();

    const pending = store.dispatch(fetchProductList({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("creates, updates and deletes with the right request and is busy only while it waits", async () => {
    const calls = productsApi();
    const store = makeStore();

    const creating = store.dispatch(createProduct({ name: "A" }));
    expect(state(store).isCreating).toBe(true);
    expect((await creating).payload).toMatchObject({ id: "new-1", name: "A" });
    const updating = store.dispatch(updateProduct({ id: "p1", body: { name: "B" } }));
    expect(state(store).isUpdating).toBe(true);
    await updating;
    const deleting = store.dispatch(deleteProduct("p1"));
    expect(state(store).isDeleting).toBe(true);
    expect((await deleting).payload).toBe("p1");

    expect(calls.creates).toEqual([{ name: "A" }]);
    expect(calls.updates).toEqual([{ id: "p1", body: { name: "B" } }]);
    expect(calls.deletes).toEqual(["p1"]);
    expect(state(store)).toMatchObject({ isCreating: false, isUpdating: false, isDeleting: false });
  });

  it.each([
    ["create", () => createProduct({ name: "A" }), "isCreating"],
    ["update", () => updateProduct({ id: "p1", body: {} }), "isUpdating"],
    ["delete", () => deleteProduct("p1"), "isDeleting"],
  ] as const)("is not busy and keeps the error after a refused %s", async (_label, action, flag) => {
    productsApi({ refuse: { status: 400, body: { message: "refused" } } });
    const store = makeStore();

    await store.dispatch(action() as never);

    expect(state(store)[flag]).toBe(false);
    expect(state(store).error).toBe("refused");
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false });
  });
});

describe("APR-10 the constants", () => {
  it("allows prices from one dong to a billion", () => {
    expect([MIN_PRICE_VND, MAX_PRICE_VND]).toEqual([1, 1_000_000_000]);
  });

  it("offers the rating choices from five down to one, and nine sorts", () => {
    expect([...PRODUCT_MIN_RATINGS]).toEqual([5, 4, 3, 2, 1]);
    expect(PRODUCT_SORT_OPTIONS.map((o) => o.value)).toEqual(["-createdAt", "createdAt", "-price", "price", "name", "-name", "-ratingAverage", "ratingAverage", "-ratingCount"]);
  });

  it("groups sizes into letters, numbers and one-size", () => {
    expect(SIZE_GROUPS.map((g) => [g.key, g.sizes.length])).toEqual([["letter", 6], ["number", 11], ["special", 1]]);
  });

  it("starts a new product active, with no badge and nothing filled in", () => {
    expect(EMPTY_FORM).toMatchObject({ name: "", priceVnd: "", status: "active", badge: null, sizes: [], colors: [], tags: [], images: [] });
  });
});
