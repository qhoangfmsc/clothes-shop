import { describe, expect, it } from "vitest";
import { COLLECTION_SORT_OPTIONS, EMPTY_COLLECTION_FORM, SEASONS } from "@/src/app/[locale]/(admin)/admin/collections/_common/constants";
import { clearError, createCollection, deleteCollection, fetchCollectionList, updateCollection } from "@/src/app/[locale]/(admin)/admin/collections/_common/moduleSlice";
import { makeStore } from "@/src/store";
import { collection, collectionsApi } from "./collections-kit";

/* The collections store and its constants (specs/admin/collections.md, flow ACL-8). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().collections;

describe("ACL-8 the collections store", () => {
  it("asks with the filters it was given, turns the nested products into ids, and keeps the list and the total", async () => {
    const calls = collectionsApi({ pages: [{ data: [collection({ products: [{ id: "p1" }, { id: "p2" }] }), collection({ id: "col-2", products: undefined })], total: 4 }] });
    const store = makeStore();

    await store.dispatch(fetchCollectionList({ search: "spr", season: "Limited Edition", sort: "name", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "spr", season: "Limited Edition", sort: "name", limit: "25" });
    expect(state(store).items.map((c) => c.productIds)).toEqual([["p1", "p2"], []]);
    expect(state(store)).toMatchObject({ total: 4, page: 1, limit: 25, isListLoading: false });
  });

  it("leaves out the season when it is not set", async () => {
    const calls = collectionsApi();

    await makeStore().dispatch(fetchCollectionList({ page: 1, limit: 25 }));

    expect(calls.lists[0].has("season")).toBe(false);
  });

  it("is loading while it waits and remembers the error when the BE refuses", async () => {
    collectionsApi({ failListFrom: 1 });
    const store = makeStore();

    const pending = store.dispatch(fetchCollectionList({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("sends the body to create, and the body and id to update and delete", async () => {
    const calls = collectionsApi();
    const store = makeStore();

    const created = await store.dispatch(createCollection({ name: "New" }));
    const updated = await store.dispatch(updateCollection({ id: "col-7", body: { name: "Changed" } }));
    const removed = await store.dispatch(deleteCollection("col-8"));

    expect(calls.creates).toEqual([{ name: "New" }]);
    expect(calls.updates).toEqual([{ id: "col-7", body: { name: "Changed" } }]);
    expect(calls.deletes).toEqual(["col-8"]);
    expect(created.payload).toMatchObject({ id: "col-new", name: "New" });
    expect(updated.payload).toMatchObject({ id: "col-7", name: "Changed" });
    expect(removed.payload).toBe("col-8");
  });

  it.each([
    ["create", () => createCollection({}), "isCreating", { create: { status: 400, body: { message: "refused" } } }],
    ["update", () => updateCollection({ id: "col-1", body: {} }), "isUpdating", { update: { status: 400, body: { message: "refused" } } }],
    ["delete", () => deleteCollection("col-1"), "isDeleting", { delete: { status: 400, body: { message: "refused" } } }],
  ] as const)("is busy only while a %s waits, keeps the error when refused and forgets it on the next try", async (_label, action, flag, refuse) => {
    collectionsApi({ refuse });
    const store = makeStore();

    const pending = store.dispatch(action() as never);
    expect(state(store)[flag]).toBe(true);
    await pending;
    expect(state(store)[flag]).toBe(false);
    expect(state(store).error).toBe("refused");

    collectionsApi();
    const again = store.dispatch(action() as never);
    expect(state(store).error).toBeNull();
    await again;
    expect(state(store)[flag]).toBe(false);
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false, isCreating: false, isUpdating: false, isDeleting: false });
  });
});

describe("ACL-8 the constants", () => {
  it("sorts by date or name, newest first by default, and knows one season", () => {
    expect(COLLECTION_SORT_OPTIONS.map((o) => o.value)).toEqual(["-createdAt", "createdAt", "name", "-name"]);
    expect([...SEASONS]).toEqual(["Limited Edition"]);
  });

  it("starts a new form empty", () => {
    expect(EMPTY_COLLECTION_FORM).toEqual({ slug: "", name: "", subtitle: "", description: "", image: "", productIds: [], season: "" });
  });
});
