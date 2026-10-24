import { describe, expect, it } from "vitest";
import { clearError, completeRefund, createRefund, fetchOrderOpenRefunds, fetchRefunds, rejectRefund } from "@/src/app/[locale]/(admin)/admin/refunds/_common/moduleSlice";
import { REFUND_NOTE_MAX, REFUND_REFERENCE_MAX, REFUND_SORT_OPTIONS } from "@/src/app/[locale]/(admin)/admin/refunds/_common/constants";
import { REFUND_REASONS, REFUND_STATUSES } from "@/src/app/[locale]/(admin)/admin/refunds/_common/types";
import { makeStore } from "@/src/store";
import { refund, refundsApi } from "./refunds-kit";

/* The refunds store and its constants (specs/admin/refunds.md, flow ARF-9). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().refunds;

describe("ARF-9 the refunds store", () => {
  it("asks with the filters it was given and keeps the list and the total", async () => {
    const calls = refundsApi({ pages: [{ data: [refund()], total: 6 }] });
    const store = makeStore();

    await store.dispatch(fetchRefunds({ search: "mai", status: "COMPLETED", orderId: "o-1", sort: "-amount", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "mai", status: "COMPLETED", orderId: "o-1", sort: "-amount", limit: "25" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "rf-1" })], total: 6, page: 1, limit: 25, isListLoading: false });
  });

  it("leaves out the filters that are not set", async () => {
    const calls = refundsApi();

    await makeStore().dispatch(fetchRefunds({ page: 1, limit: 25 }));

    for (const key of ["status", "orderId", "search"]) expect(calls.lists[0].has(key), key).toBe(false);
  });

  it("is loading while it waits and remembers the error when the BE refuses", async () => {
    refundsApi({ failListFrom: 1 });
    const store = makeStore();

    const pending = store.dispatch(fetchRefunds({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("counts the waiting refunds of one order with a question of one row", async () => {
    const calls = refundsApi({ openCount: 3 });

    const result = await makeStore().dispatch(fetchOrderOpenRefunds("o-1"));

    expect(result.payload).toBe(3);
    expect(Object.fromEntries(calls.lists[0])).toEqual({ limit: "1", status: "REQUESTED", orderId: "o-1" });
  });

  it("completes and rejects with the refund in the address (made safe) and the rest in the body", async () => {
    const calls = refundsApi();
    const store = makeStore();

    await store.dispatch(completeRefund({ refundId: "r/1", reference: "FT-1", note: "ok" }));
    await store.dispatch(rejectRefund({ refundId: "r/2", note: "no" }));

    expect(calls.completes).toEqual([{ id: "r/1", body: { reference: "FT-1", note: "ok" } }]);
    expect(calls.rejects).toEqual([{ id: "r/2", body: { note: "no" } }]);
  });

  it("opens a refund request for an order", async () => {
    const calls = refundsApi();

    const result = await makeStore().dispatch(createRefund("o-7"));

    expect(calls.creates).toEqual([{ orderId: "o-7" }]);
    expect(result.payload).toMatchObject({ id: "rf-1" });
  });

  it.each([
    ["complete", () => completeRefund({ refundId: "rf-1", reference: "x", note: "y" })],
    ["reject", () => rejectRefund({ refundId: "rf-1", note: "y" })],
    ["create", () => createRefund("o-1")],
  ] as const)("is busy only while a %s waits, and keeps the error when refused", async (_label, action) => {
    refundsApi({ refuse: { status: 400, body: { message: "refused" } } });
    const store = makeStore();

    const pending = store.dispatch(action() as never);
    expect(state(store).isUpdating).toBe(true);
    await pending;

    expect(state(store).isUpdating).toBe(false);
    expect(state(store).error).toBe("refused");
  });

  it("is not busy after a good write", async () => {
    refundsApi();
    const store = makeStore();

    await store.dispatch(completeRefund({ refundId: "rf-1", reference: "x", note: "y" }));

    expect(state(store).isUpdating).toBe(false);
    expect(state(store).error).toBeNull();
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false, isUpdating: false });
  });
});

describe("ARF-9 the constants", () => {
  it("names three states and two reasons", () => {
    expect([...REFUND_STATUSES]).toEqual(["REQUESTED", "COMPLETED", "REJECTED"]);
    expect([...REFUND_REASONS]).toEqual(["ADMIN_CANCELLED", "RETURN"]);
  });

  it("sorts by creation, handling time or amount only", () => {
    expect(REFUND_SORT_OPTIONS.map((o) => o.value)).toEqual(["-createdAt", "createdAt", "-processedAt", "processedAt", "-amount", "amount"]);
  });

  it("knows the BE's length limits", () => {
    expect([REFUND_REFERENCE_MAX, REFUND_NOTE_MAX]).toEqual([64, 500]);
  });
});
