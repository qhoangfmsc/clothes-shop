import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { clearError, fetchOrderDetail, fetchOrderList, updateOrderStatus, updateOrderStatuses } from "@/src/app/[locale]/(admin)/admin/orders/_common/moduleSlice";
import { ORDER_SORT_OPTIONS } from "@/src/app/[locale]/(admin)/admin/orders/_common/constants";
import { makeStore } from "@/src/store";
import { ACCESS_KEY, API } from "@/tests/_support/api";
import { adminOrder } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";
import { ordersApi } from "./orders-kit";

/* The orders slice: the requests it makes and the state they leave (specs/admin/orders.md, flow AOR-10). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().orders;

describe("AOR-10 the orders store", () => {
  it("asks with the filters it was given and keeps what came back", async () => {
    const calls = ordersApi({ pages: [{ data: [adminOrder()], total: 7 }] });
    const store = makeStore();

    await store.dispatch(fetchOrderList({ search: "mai", status: "pending", paymentStatus: "paid", needsAction: true, sort: "-total", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "mai", status: "pending", paymentStatus: "paid", needsAction: "true", sort: "-total", limit: "25" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "o-1" })], total: 7, page: 1, limit: 25, isListLoading: false });
  });

  it("leaves out filters that are not set, and sends the filter for 'needs action' only when it is on", async () => {
    const calls = ordersApi();
    const store = makeStore();

    await store.dispatch(fetchOrderList({ needsAction: false, page: 1, limit: 25 }));

    expect(calls.lists[0].has("needsAction")).toBe(false);
    expect(calls.lists[0].has("status")).toBe(false);
    expect(calls.lists[0].has("paymentStatus")).toBe(false);
    expect(calls.lists[0].has("search")).toBe(false);
  });

  it("is loading while it waits, and remembers the error when the BE refuses", async () => {
    ordersApi({ failListFrom: 1 });
    const store = makeStore();

    const pending = store.dispatch(fetchOrderList({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    const result = await pending;

    expect(result.type).toBe("orders/fetchList/rejected");
    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("changes one status with a PATCH and is busy only while it waits", async () => {
    const calls = ordersApi();
    const store = makeStore();

    const pending = store.dispatch(updateOrderStatus({ id: "o-1", status: "confirmed" }));
    expect(state(store).isUpdating).toBe(true);
    await pending;

    expect(calls.patches).toEqual([{ id: "o-1", status: "confirmed" }]);
    expect(state(store).isUpdating).toBe(false);
  });

  it("is not busy and keeps the error after a refused change", async () => {
    ordersApi({ refuse: { "o-1": { status: 400, body: { message: "locked" } } } });
    const store = makeStore();

    const result = await store.dispatch(updateOrderStatus({ id: "o-1", status: "confirmed" }));

    expect(result.type).toBe("orders/updateStatus/rejected");
    expect(state(store).isUpdating).toBe(false);
    expect(state(store).error).toBe("locked");
  });

  it("changes many statuses, one request each, and says which went through", async () => {
    const calls = ordersApi({ refuse: { "o-2": { status: 409, body: { message: "no" } } } });
    const store = makeStore();

    const result = await store.dispatch(updateOrderStatuses({ ids: ["o-1", "o-2", "o-3"], status: "cancelled" }));

    expect(result.payload).toEqual({ succeededIds: ["o-1", "o-3"], failed: 1 });
    expect(calls.patches.map((p) => p.id).sort()).toEqual(["o-1", "o-2", "o-3"]);
    expect(state(store).isUpdating).toBe(false);
  });

  it("reads one order", async () => {
    ordersApi({ detail: adminOrder({ id: "o-5" }) });
    const store = makeStore();

    const result = await store.dispatch(fetchOrderDetail("o-5"));

    expect(result.payload).toMatchObject({ id: "o-5" });
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false, isUpdating: false });
  });

  it("offers four sorts with the labels' keys", () => {
    expect(ORDER_SORT_OPTIONS.map((o) => [o.value, o.key])).toEqual([["-createdAt", "newest"], ["createdAt", "oldest"], ["-total", "totalDesc"], ["total", "totalAsc"]]);
  });

  it("sends the session token", async () => {
    localStorage.setItem(ACCESS_KEY, "tok");
    let header: string | null = null;
    server.use(http.get(`${API}/api/admin/orders`, ({ request }) => {
      header = request.headers.get("authorization");
      return HttpResponse.json({ data: [], total: 0, page: 1, limit: 25 });
    }));

    await makeStore().dispatch(fetchOrderList({ page: 1, limit: 25 }));

    expect(header).toBe("Bearer tok");
  });
});
