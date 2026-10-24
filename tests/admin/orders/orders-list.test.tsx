import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { adminOrder, orderItem } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderOrders } from "./orders-kit";

vi.mock("@/src/app/[locale]/(admin)/admin/payments/_components/OrderPaymentTab", () => ({ default: () => null }));
vi.mock("@/src/app/[locale]/(admin)/admin/refunds/_components/OrderRefundBanner", () => ({ default: () => null }));

/* The orders table: what it asks, shows and filters (specs/admin/orders.md, flows AOR-1 to AOR-3E). */

const O = (key: string, locale: "vi" | "en" = "vi") => msg(`admin.orders.${key}`, locale);
const rowOf = (id: string) => screen.getByText(`#${id}`).closest("tr") as HTMLElement;
const last = <T,>(items: T[]) => items[items.length - 1];

describe("AOR-1 the list", () => {
  it("asks for the newest first, 25 to a page, and shows one row per order with its facts", async () => {
    const { calls } = await renderOrders({
      pages: [{ data: [adminOrder({ id: "o-1", userId: "u-9", shippingAddress: { fullName: "Mai Tran" }, items: [orderItem(), orderItem({ id: "oi-2" })], totalVnd: 380_000 })], total: 1 }],
    });

    await screen.findByText("#o-1");
    const row = rowOf("o-1");

    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(within(row).getByText("Mai Tran")).toBeInTheDocument();
    expect(within(row).getByText("2 sản phẩm")).toBeInTheDocument();
    expect(within(row).getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(within(row).getByText(msg("common.orderPaymentStatus.unpaid"))).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: O("table.view") })).toBeInTheDocument();
  });

  it("names the customer by the account when the address has no name, and counts no items when there are none", async () => {
    await renderOrders({ pages: [{ data: [adminOrder({ id: "o-2", userId: "u-77", shippingAddress: {}, items: [] })], total: 1 }] });

    await screen.findByText("#o-2");
    const row = rowOf("o-2");

    expect(within(row).getByText("u-77")).toBeInTheDocument();
    expect(within(row).getByText("0 sản phẩm")).toBeInTheDocument();
  });

  it("states the number of orders in the header", async () => {
    await renderOrders({ pages: [{ data: [adminOrder()], total: 41 }] });
    await screen.findByText("#o-1");

    expect(screen.getByText("Tổng 41 đơn hàng")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: O("page.title") })).toBeInTheDocument();
  });

  it("shows the money in dollars in English, and hides the payment column on phones", async () => {
    await renderOrders({ locale: "en", pages: [{ data: [adminOrder({ totalUsd: 14.61 })], total: 1 }] });

    await screen.findByText("#o-1");
    const row = rowOf("o-1");

    expect(within(row).getByText("$14.61")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: O("table.columns.payment", "en"), hidden: true }).className).toContain("hidden sm:table-cell");
  });

  it("filters by status and by payment, searches, and sorts by total", async () => {
    const { calls } = await renderOrders({ pages: [{ data: [adminOrder()], total: 1 }] });
    await screen.findByText("#o-1");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: O("table.filters.status") }), "shipping");
    await waitFor(() => expect(last(calls.lists).get("status")).toBe("shipping"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: O("table.filters.paymentStatus") }), "paid");
    await waitFor(() => expect(last(calls.lists).get("paymentStatus")).toBe("paid"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") }), "-total");
    await waitFor(() => expect(last(calls.lists).get("sort")).toBe("-total"));
    await userEvent.type(screen.getByPlaceholderText(O("table.searchPlaceholder")), "0901");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("0901"));

    expect(last(calls.lists).get("status")).toBe("shipping");
    expect(last(calls.lists).get("paymentStatus")).toBe("paid");
  });

  it("offers every order status and payment status to filter by", async () => {
    await renderOrders({ pages: [{ data: [adminOrder()], total: 1 }] });
    await screen.findByText("#o-1");

    const statuses = within(screen.getByRole("combobox", { name: O("table.filters.status") })).getAllByRole("option").map((o) => o.getAttribute("value"));
    const payments = within(screen.getByRole("combobox", { name: O("table.filters.paymentStatus") })).getAllByRole("option").map((o) => o.getAttribute("value"));

    expect(statuses).toEqual(["", "pending", "confirmed", "shipping", "delivered", "completed", "cancelled"]);
    expect(payments).toEqual(["", "unpaid", "paid", "refunded"]);
  });

  it("offers the four sort orders", async () => {
    await renderOrders({ pages: [{ data: [adminOrder()], total: 1 }] });
    await screen.findByText("#o-1");

    const options = within(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") })).getAllByRole("option").map((o) => o.getAttribute("value"));

    expect(options).toEqual(["-createdAt", "createdAt", "-total", "total"]);
  });
});

describe("AOR-1E the list cannot be loaded", () => {
  it("says so, instead of saying there are no orders", async () => {
    await renderOrders({ failListFrom: 1 });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText(msg("admin.components.dataTable.empty.none"))).not.toBeInTheDocument();
  });

  it("shows an empty table with no orders yet", async () => {
    await renderOrders({ pages: [{ data: [], total: 0 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.empty.none"))).toBeInTheDocument();
    expect(screen.getByText("Tổng 0 đơn hàng")).toBeInTheDocument();
  });
});

describe("AOR-2 the orders that need action", () => {
  const counts = { orders: 3 };

  it("shows the notice with the number, explanations and a button that turns the filter on", async () => {
    await renderOrders({ counts, pages: [{ data: [adminOrder()], total: 1 }] });

    const box = await screen.findByRole("region", { name: "3 đơn cần xử lý" });

    expect(box).toHaveTextContent(O("pending.includes"));
    expect(box).toHaveTextContent(O("pending.excludes"));
    expect(box).toHaveTextContent(O("pending.how"));
    await userEvent.click(within(box).getByRole("button", { name: O("pending.view") }));
    expect(navigation.router.replace).toHaveBeenCalledWith("/admin/orders?needsAction=true", { scroll: false });
  });

  it("shows no notice when nothing needs action, or the account may not see the number", async () => {
    const calm = await renderOrders({ counts: { orders: 0 }, pages: [{ data: [adminOrder()], total: 1 }] });
    await screen.findByText("#o-1");
    expect(screen.queryByRole("region", { name: /đơn cần xử lý/ })).not.toBeInTheDocument();
    calm.unmount();

    await renderOrders({ counts: { payments: 1 }, pages: [{ data: [adminOrder()], total: 1 }] });
    await screen.findByText("#o-1");
    expect(screen.queryByRole("region", { name: /đơn cần xử lý/ })).not.toBeInTheDocument();
  });

  it("asks only for those orders when the filter is on, and the button then turns it off, keeping the other filters", async () => {
    const { calls } = await renderOrders({ counts, query: { needsAction: "true", status: "pending" }, pages: [{ data: [adminOrder()], total: 1 }] });
    await screen.findByText("#o-1");
    expect(calls.lists[0].get("needsAction")).toBe("true");

    await userEvent.click(await screen.findByRole("button", { name: msg("admin.components.pendingNotice.viewAll") }));

    expect(navigation.router.replace).toHaveBeenCalledWith("/admin/orders?status=pending", { scroll: false });
  });

  it("starts the table fresh with the new question when the filter is turned on or off", async () => {
    const { calls, rerender } = await renderOrders({ pages: [{ data: [adminOrder()], total: 1 }] });
    await screen.findByText("#o-1");
    expect(calls.lists).toHaveLength(1);

    navigation.searchParams = new URLSearchParams({ needsAction: "true" });
    const { default: OrdersContent } = await import("@/src/app/[locale]/(admin)/admin/orders/OrdersContent");
    rerender(<OrdersContent />);

    await waitFor(() => expect(calls.lists).toHaveLength(2));
    expect(calls.lists[1].get("needsAction")).toBe("true");
  });

  it("does not send the filter when it is off", async () => {
    const { calls } = await renderOrders({ pages: [{ data: [adminOrder()], total: 1 }] });
    await screen.findByText("#o-1");

    expect(calls.lists[0].has("needsAction")).toBe(false);
  });

  it("says everything is done when the filter is on and nothing is left", async () => {
    await renderOrders({ counts: { orders: 0 }, query: { needsAction: "true" }, pages: [{ data: [], total: 0 }] });

    expect(await screen.findByRole("status")).toHaveTextContent(msg("admin.components.pendingNotice.allDone"));
  });
});

describe("AOR-3E people the BE does not let in", () => {
  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s no orders, only that the data could not be loaded (the shell keeps them out before this)", async (_label, as, deny) => {
    await renderOrders({ as, deny, pages: [{ data: [adminOrder()], total: 1 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("#o-1")).not.toBeInTheDocument();
  });

  it("lets an admin who may only view orders read the table", async () => {
    await renderOrders({ as: "adminLimited", pages: [{ data: [adminOrder()], total: 1 }] });

    expect(await screen.findByText("#o-1")).toBeInTheDocument();
  });
});
