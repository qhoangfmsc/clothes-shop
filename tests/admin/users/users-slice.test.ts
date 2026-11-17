import { describe, expect, it } from "vitest";
import { USER_SORT_OPTIONS } from "@/src/app/[locale]/(admin)/admin/users/_common/constants";
import { clearError, fetchUserList, updateUser } from "@/src/app/[locale]/(admin)/admin/users/_common/moduleSlice";
import { makeStore } from "@/src/store";
import { USER_ROLES, USER_STATUSES } from "@/src/types/enums";
import { adminUser, usersApi } from "./users-kit";

/* The users store and its constants (specs/admin/users.md, flow AUS-9). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().users;

describe("AUS-9 the users store", () => {
  it("asks with the filters it was given and keeps the list and the total", async () => {
    const calls = usersApi({ pages: [{ data: [adminUser()], total: 4 }] });
    const store = makeStore();

    await store.dispatch(fetchUserList({ search: "mai", role: "admin", status: "active", sort: "name", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "mai", role: "admin", status: "active", sort: "name", limit: "25" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "u-1" })], total: 4, page: 1, limit: 25, isListLoading: false });
  });

  it("leaves out the filters that are not set", async () => {
    const calls = usersApi();

    await makeStore().dispatch(fetchUserList({ page: 1, limit: 25 }));

    for (const key of ["role", "status", "search"]) expect(calls.lists[0].has(key), key).toBe(false);
  });

  it("is loading while it waits and remembers the error when the BE refuses", async () => {
    usersApi({ failListFrom: 1 });
    const store = makeStore();

    const pending = store.dispatch(fetchUserList({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("sends the change to that user and gives back the user", async () => {
    const calls = usersApi();

    const result = await makeStore().dispatch(updateUser({ id: "u-3", body: { role: "admin" } }));

    expect(calls.patches).toEqual([{ id: "u-3", body: { role: "admin" } }]);
    expect(result.payload).toMatchObject({ id: "u-3", role: "admin" });
  });

  it("is busy only while a change waits, keeps the error when refused and forgets it on the next try", async () => {
    usersApi({ refuse: { status: 400, body: { message: "refused" } } });
    const store = makeStore();

    const pending = store.dispatch(updateUser({ id: "u-1", body: { role: "admin" } }));
    expect(state(store).isUpdating).toBe(true);
    await pending;
    expect(state(store).isUpdating).toBe(false);
    expect(state(store).error).toBe("refused");

    usersApi();
    const again = store.dispatch(updateUser({ id: "u-1", body: { role: "admin" } }));
    expect(state(store).error).toBeNull();
    await again;
    expect(state(store).isUpdating).toBe(false);
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false, isUpdating: false });
  });
});

describe("AUS-9 the constants", () => {
  it("sorts by date, name or email, newest first by default", () => {
    expect(USER_SORT_OPTIONS.map((o) => o.value)).toEqual(["-createdAt", "createdAt", "name", "-name", "email", "-email"]);
  });

  it("knows two roles and two states", () => {
    expect([...USER_ROLES]).toEqual(["user", "admin"]);
    expect([...USER_STATUSES]).toEqual(["active", "disabled"]);
  });
});
