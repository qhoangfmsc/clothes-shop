import { describe, expect, it } from "vitest";
import { approveReturn, clearError, fetchReturnDetail, fetchReturns, receiveReturn, rejectReturn } from "@/src/app/[locale]/(admin)/admin/returns/_common/moduleSlice";
import { RETURN_NOTE_MAX, RETURN_SORT_OPTIONS } from "@/src/app/[locale]/(admin)/admin/returns/_common/constants";
import { REJECTABLE_STATUSES, RETURN_REASONS, RETURN_STATUSES } from "@/src/app/[locale]/(admin)/admin/returns/_common/types";
import { makeStore } from "@/src/store";
import { adminReturn, returnsApi } from "./returns-kit";

/* The returns store and its constants (specs/admin/returns.md, flow ARR-10). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().returns;

describe("ARR-10 the returns store", () => {
  it("asks with the filters it was given and keeps the list and the total", async () => {
    const calls = returnsApi({ pages: [{ data: [adminReturn()], total: 4 }] });
    const store = makeStore();

    await store.dispatch(fetchReturns({ search: "mai", status: "APPROVED", orderId: "o-1", sort: "-updatedAt", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "mai", status: "APPROVED", orderId: "o-1", sort: "-updatedAt", limit: "25" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "r-1" })], total: 4, page: 1, limit: 25, isListLoading: false });
  });

  it("leaves out the filters that are not set", async () => {
    const calls = returnsApi();

    await makeStore().dispatch(fetchReturns({ page: 1, limit: 25 }));

    for (const key of ["status", "orderId", "search"]) expect(calls.lists[0].has(key), key).toBe(false);
  });

  it("is loading while it waits and remembers the error when the BE refuses", async () => {
    returnsApi({ failListFrom: 1 });
    const store = makeStore();

    const pending = store.dispatch(fetchReturns({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("reads one request, the id made safe for the address", async () => {
    const calls = returnsApi();

    const result = await makeStore().dispatch(fetchReturnDetail("r/1"));

    expect(calls.details).toEqual(["r/1"]);
    expect(result.payload).toMatchObject({ id: "r/1" });
  });

  it("approves with no note as an empty body, and with a note as that note", async () => {
    const calls = returnsApi();
    const store = makeStore();

    await store.dispatch(approveReturn({ returnId: "r/1" }));
    await store.dispatch(approveReturn({ returnId: "r-2", note: "Ship it" }));

    expect(calls.approves).toEqual([{ id: "r/1", body: {} }, { id: "r-2", body: { note: "Ship it" } }]);
  });

  it("rejects with the reason, and receives with the lines and the flags", async () => {
    const calls = returnsApi();
    const store = makeStore();

    await store.dispatch(rejectReturn({ returnId: "r/2", note: "No" }));
    await store.dispatch(receiveReturn({ returnId: "r/3", items: [{ returnItemId: "ri-1", acceptedQuantity: 1 }], refundShipping: true, note: "ok" }));

    expect(calls.rejects).toEqual([{ id: "r/2", body: { note: "No" } }]);
    expect(calls.receives).toEqual([{ id: "r/3", body: { items: [{ returnItemId: "ri-1", acceptedQuantity: 1 }], refundShipping: true, note: "ok" } }]);
  });

  it.each([
    ["approve", () => approveReturn({ returnId: "r-1" })],
    ["reject", () => rejectReturn({ returnId: "r-1", note: "x" })],
    ["receive", () => receiveReturn({ returnId: "r-1", items: [] })],
  ] as const)("is busy only while a %s waits, and keeps the error when refused", async (_label, action) => {
    returnsApi({ action: { status: 400, body: { message: "refused" } } });
    const store = makeStore();

    const pending = store.dispatch(action() as never);
    expect(state(store).isUpdating).toBe(true);
    await pending;

    expect(state(store).isUpdating).toBe(false);
    expect(state(store).error).toBe("refused");
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false, isUpdating: false });
  });
});

describe("ARR-10 the constants", () => {
  it("names six states and five reasons, and only the first two can still be rejected", () => {
    expect([...RETURN_STATUSES]).toEqual(["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED", "CANCELLED"]);
    expect([...RETURN_REASONS]).toEqual(["WRONG_SIZE", "CHANGED_MIND", "DEFECTIVE", "WRONG_ITEM", "OTHER"]);
    expect([...REJECTABLE_STATUSES]).toEqual(["REQUESTED", "APPROVED"]);
  });

  it("sorts by creation or update only, and knows the note limit", () => {
    expect(RETURN_SORT_OPTIONS.map((o) => o.value)).toEqual(["-createdAt", "createdAt", "-updatedAt", "updatedAt"]);
    expect(RETURN_NOTE_MAX).toBe(500);
  });
});
