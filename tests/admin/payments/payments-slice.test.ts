import { describe, expect, it } from "vitest";
import { clearError, confirmOrderPayment, createAdminQr, fetchOrderPayment, fetchPaymentAttempts, fetchPaymentTransactions, searchUnpaidOrders } from "@/src/app/[locale]/(admin)/admin/payments/_common/moduleSlice";
import { AMOUNT_MISMATCH_CODE, ATTEMPT_SORT_OPTIONS, CONFIRM_NOTE_MAX, CONFIRM_REFERENCE_MAX, CONFIRM_TRANSFER_CONTENT_MAX, ORDER_PICKER_LIMIT, PAYMENT_SORT_OPTIONS, QR_POLL_INTERVAL_MS } from "@/src/app/[locale]/(admin)/admin/payments/_common/constants";
import { CONFIRMABLE_VERIFICATION_STATUSES, MANUAL_CONFIRM_PROVIDERS, PAYMENT_ATTEMPT_STATUSES, PAYMENT_VERIFICATION_STATUSES } from "@/src/app/[locale]/(admin)/admin/payments/_common/types";
import { makeStore } from "@/src/store";
import { attemptRow, overview, paymentsApi, transaction, unpaidOrder } from "./payments-kit";

/* The payments store and its constants (specs/admin/payments.md, flow APY-16). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().payments;

describe("APY-16 the payments store", () => {
  it("asks for transactions with the filters it was given and keeps the list and the total", async () => {
    const calls = paymentsApi({ transactions: [{ data: [transaction()], total: 8 }] });
    const store = makeStore();

    await store.dispatch(fetchPaymentTransactions({ search: "SP", verificationStatus: "LATE", orderId: "o-1", needsReview: true, sort: "-amount", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.transactions[0])).toEqual({ search: "SP", verificationStatus: "LATE", orderId: "o-1", needsReview: "true", sort: "-amount", limit: "25" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "tx-1" })], total: 8, page: 1, limit: 25, isListLoading: false });
  });

  it("sends the review filter only when it is on", async () => {
    const calls = paymentsApi();

    await makeStore().dispatch(fetchPaymentTransactions({ needsReview: false, page: 1, limit: 25 }));

    expect(calls.transactions[0].has("needsReview")).toBe(false);
  });

  it("is loading while it waits and remembers the error when the BE refuses", async () => {
    paymentsApi({ failTransactions: true });
    const store = makeStore();

    const pending = store.dispatch(fetchPaymentTransactions({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("asks for transfer codes with their filters and keeps only their total", async () => {
    const calls = paymentsApi({ attempts: [{ data: [attemptRow()], total: 13 }] });
    const store = makeStore();

    await store.dispatch(fetchPaymentAttempts({ search: "DHG", status: "PAID", orderId: "o-1", sort: "-expiresAt", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.attempts[0])).toEqual({ search: "DHG", status: "PAID", orderId: "o-1", sort: "-expiresAt", limit: "25" });
    expect(state(store)).toMatchObject({ attemptsTotal: 13, total: 0, items: [] });
  });

  it("reads the payment overview of an order, the order id made safe for the address", async () => {
    const calls = paymentsApi({ overview: overview({ id: "o/1" }) });
    const store = makeStore();

    const result = await store.dispatch(fetchOrderPayment("o/1"));

    expect(calls.overviews).toEqual(["o/1"]);
    expect(result.payload).toMatchObject({ order: { id: "o/1" } });
  });

  it("confirms a payment with the order in the address and everything else in the body, and is busy only while it waits", async () => {
    const calls = paymentsApi();
    const store = makeStore();

    const pending = store.dispatch(confirmOrderPayment({ orderId: "o/1", note: "ok", transactionId: "tx-1" }));
    expect(state(store).isUpdating).toBe(true);
    const result = await pending;

    expect(calls.confirms).toEqual([{ orderId: "o/1", body: { note: "ok", transactionId: "tx-1" } }]);
    expect(result.payload).toMatchObject({ paymentStatus: "paid" });
    expect(state(store).isUpdating).toBe(false);
  });

  it("is not busy and keeps the error after a refused confirmation", async () => {
    paymentsApi({ confirm: [{ status: 400, body: { message: "refused" } }] });
    const store = makeStore();

    const result = await store.dispatch(confirmOrderPayment({ orderId: "o-1", note: "ok", transactionId: "tx-1" }));

    expect(result.type).toBe("payments/confirmOrderPayment/rejected");
    expect(state(store).isUpdating).toBe(false);
    expect(state(store).error).toBe("refused");
  });

  it("makes a QR for an order", async () => {
    const calls = paymentsApi();

    const result = await makeStore().dispatch(createAdminQr("o-1"));

    expect(calls.qrs).toEqual(["o-1"]);
    expect(result.payload).toMatchObject({ orderId: "o-1", transferContent: "DHGNEWCODE" });
  });

  it("searches the unpaid orders, newest first, ten at most, with the words typed", async () => {
    const calls = paymentsApi({ orders: [unpaidOrder()] });

    const result = await makeStore().dispatch(searchUnpaidOrders("mai"));

    expect(Object.fromEntries(calls.orders[0])).toEqual({ search: "mai", sort: "-createdAt", limit: "10", paymentStatus: "unpaid" });
    expect(result.payload).toEqual([expect.objectContaining({ id: "o-1" })]);
  });

  it("leaves the search words out when there are none", async () => {
    const calls = paymentsApi();

    await makeStore().dispatch(searchUnpaidOrders(""));

    expect(calls.orders[0].has("search")).toBe(false);
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, attemptsTotal: 0, page: 1, limit: 25, isListLoading: false, isUpdating: false });
  });
});

describe("APY-16 the constants", () => {
  it("sorts transactions by arrival or amount only, and codes by creation, expiry or amount", () => {
    expect(PAYMENT_SORT_OPTIONS.map((o) => o.value)).toEqual(["-receivedAt", "receivedAt", "-amount", "amount"]);
    expect(ATTEMPT_SORT_OPTIONS.map((o) => o.value)).toEqual(["-createdAt", "createdAt", "-expiresAt", "expiresAt", "-amount", "amount"]);
  });

  it("names the nine results of matching and the four states of a code", () => {
    expect(PAYMENT_VERIFICATION_STATUSES).toHaveLength(9);
    expect([...PAYMENT_ATTEMPT_STATUSES]).toEqual(["PENDING", "PAID", "EXPIRED", "CANCELLED"]);
  });

  it("lets an admin attach only the transactions whose money may have arrived unrecognised", () => {
    expect([...CONFIRMABLE_VERIFICATION_STATUSES]).toEqual(["UNMATCHED", "AMOUNT_MISMATCH", "LATE", "NOT_PAYABLE"]);
  });

  it("knows the limits of the BE and its amount error code", () => {
    expect([CONFIRM_NOTE_MAX, CONFIRM_REFERENCE_MAX, CONFIRM_TRANSFER_CONTENT_MAX]).toEqual([500, 64, 500]);
    expect(AMOUNT_MISMATCH_CODE).toBe(1710);
    expect([...MANUAL_CONFIRM_PROVIDERS]).toEqual(["sepay", "manual"]);
    expect([QR_POLL_INTERVAL_MS, ORDER_PICKER_LIMIT]).toEqual([4000, 10]);
  });
});
