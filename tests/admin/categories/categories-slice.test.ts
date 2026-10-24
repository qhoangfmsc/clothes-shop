import { describe, expect, it } from "vitest";
import { CATEGORY_PAGE_SIZE, CATEGORY_PRIORITY_SORT, CATEGORY_SORT_OPTIONS, EMPTY_CATEGORY_FORM } from "@/src/app/[locale]/(admin)/admin/categories/_common/constants";
import { clearError, createCategory, deleteCategory, fetchCategoryList, fetchNextCategoryPriority, reorderCategories, updateCategory } from "@/src/app/[locale]/(admin)/admin/categories/_common/moduleSlice";
import { makeStore } from "@/src/store";
import { categoriesApi, category } from "./categories-kit";

/* The categories store and its constants (specs/admin/categories.md, flow ACT-9). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().categories;

describe("ACT-9 the categories store", () => {
  it("asks with the search, sort and page it was given and keeps the list and the total", async () => {
    const calls = categoriesApi({ pages: [{ data: [category()], total: 4 }] });
    const store = makeStore();

    await store.dispatch(fetchCategoryList({ search: "top", sort: "title", page: 1, limit: 200 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "top", sort: "title", limit: "200" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "c-1" })], total: 4, page: 1, limit: 200, isListLoading: false });
  });

  it("is loading while it waits and remembers the error when the BE refuses", async () => {
    categoriesApi({ failListFrom: 1 });
    const store = makeStore();

    const pending = store.dispatch(fetchCategoryList({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("works out the next rank as the highest one plus one, and one when there is none", async () => {
    categoriesApi({ last: category({ priority: 9 }) });
    expect((await makeStore().dispatch(fetchNextCategoryPriority())).payload).toBe(10);

    categoriesApi({ last: null });
    expect((await makeStore().dispatch(fetchNextCategoryPriority())).payload).toBe(1);
  });

  it("sends every id in order to reorder, the body to create, and the body and id to update and delete", async () => {
    const calls = categoriesApi();
    const store = makeStore();

    await store.dispatch(reorderCategories(["b", "a"]));
    const created = await store.dispatch(createCategory({ title: "New" }));
    const updated = await store.dispatch(updateCategory({ id: "c-7", body: { title: "Changed" } }));
    const removed = await store.dispatch(deleteCategory("c-8"));

    expect(calls.reorders).toEqual([["b", "a"]]);
    expect(calls.creates).toEqual([{ title: "New" }]);
    expect(calls.updates).toEqual([{ id: "c-7", body: { title: "Changed" } }]);
    expect(calls.deletes).toEqual(["c-8"]);
    expect(created.payload).toMatchObject({ id: "c-new", title: "New" });
    expect(updated.payload).toMatchObject({ id: "c-7", title: "Changed" });
    expect(removed.payload).toBe("c-8");
  });

  it.each([
    ["reorder", () => reorderCategories(["a"]), "isUpdating", { reorder: { status: 400, body: { message: "refused" } } }],
    ["create", () => createCategory({}), "isCreating", { create: { status: 400, body: { message: "refused" } } }],
    ["update", () => updateCategory({ id: "c-1", body: {} }), "isUpdating", { update: { status: 400, body: { message: "refused" } } }],
    ["delete", () => deleteCategory("c-1"), "isDeleting", { delete: { status: 400, body: { message: "refused" } } }],
  ] as const)("is busy only while a %s waits, keeps the error when refused and forgets it on the next try", async (_label, action, flag, refuse) => {
    categoriesApi({ refuse });
    const store = makeStore();

    const pending = store.dispatch(action() as never);
    expect(state(store)[flag]).toBe(true);
    await pending;
    expect(state(store)[flag]).toBe(false);
    expect(state(store).error).toBe("refused");

    categoriesApi();
    const again = store.dispatch(action() as never);
    expect(state(store).error).toBeNull();
    await again;
    expect(state(store)[flag]).toBe(false);
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false, isCreating: false, isUpdating: false, isDeleting: false });
  });
});

describe("ACT-9 the constants", () => {
  it("sorts by priority first (and drags only then), then by date or title", () => {
    expect(CATEGORY_SORT_OPTIONS.map((o) => o.value)).toEqual(["priority", "-createdAt", "createdAt", "title", "-title"]);
    expect(CATEGORY_PRIORITY_SORT).toBe("priority");
  });

  it("loads every category on one page, and a new form is empty", () => {
    expect(CATEGORY_PAGE_SIZE).toBe(200);
    expect(EMPTY_CATEGORY_FORM).toEqual({ slug: "", title: "", description: "", heroImage: "", priority: null, subcategories: [] });
  });
});
