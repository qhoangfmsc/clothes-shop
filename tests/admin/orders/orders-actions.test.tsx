import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { adminOrder } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderOrders } from "./orders-kit";

const payment = vi.hoisted(() => ({ props: null as null | { orderId: string; onChanged: () => void }, banner: null as null | { orderId: string; onCreated?: () => void } }));

vi.mock("@/src/app/[locale]/(admin)/admin/payments/_components/OrderPaymentTab", () => ({
  default: (props: { orderId: string; onChanged: () => void }) => {
    payment.props = props;
    return <p>payment tab of {props.orderId}</p>;
  },
}));
vi.mock("@/src/app/[locale]/(admin)/admin/refunds/_components/OrderRefundBanner", () => ({
  default: (props: { orderId: string; onCreated?: () => void }) => {
    payment.banner = props;
    return <p>refund banner of {props.orderId}</p>;
  },
}));

/* Changing the status of orders, one at a time and many at once, and the order panel (specs/admin/orders.md, flows AOR-4 to AOR-9E). */

const O = (key: string) => msg(`admin.orders.${key}`);
const status = (value: string) => msg(`common.orderStatus.${value}`);
const rowOf = (id: string) => screen.getByText(`#${id}`).closest("tr") as HTMLElement;
const statusSelect = (id: string) => within(rowOf(id)).getByRole("combobox") as HTMLSelectElement;
const optionTexts = (select: HTMLElement) => within(select).getAllByRole("option").map((o) => o.textContent);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PENDING = adminOrder({ id: "o-1", status: "pending" });
const CONFIRMED = adminOrder({ id: "o-2", status: "confirmed" });
const PAID_CONFIRMED = adminOrder({ id: "o-3", status: "confirmed", paymentStatus: "paid" });
const DONE = adminOrder({ id: "o-4", status: "completed" });

describe("AOR-4 who may change a status", () => {
  it("gives an admin with every permission a status menu in each row", async () => {
    await renderOrders({ pages: [{ data: [PENDING, DONE], total: 2 }] });
    await screen.findByText("#o-1");

    expect(within(rowOf("o-1")).getByRole("combobox")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
  });

  it("shows only the status, and no tick boxes, to an admin who may only view orders", async () => {
    await renderOrders({ as: "adminLimited", pages: [{ data: [PENDING], total: 1 }] });
    await screen.findByText("#o-1");

    expect(within(rowOf("o-1")).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(rowOf("o-1")).getByText(status("pending"))).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("offers each order the current status and the steps after it, none for a finished order", async () => {
    await renderOrders({ pages: [{ data: [PENDING, CONFIRMED, adminOrder({ id: "o-5", status: "shipping" }), adminOrder({ id: "o-6", status: "delivered" }), DONE, adminOrder({ id: "o-7", status: "cancelled" })], total: 6 }] });
    await screen.findByText("#o-1");

    expect(optionTexts(statusSelect("o-1"))).toEqual([status("pending"), status("confirmed"), status("cancelled")]);
    expect(optionTexts(statusSelect("o-2"))).toEqual([status("confirmed"), status("shipping"), status("cancelled")]);
    expect(optionTexts(statusSelect("o-5"))).toEqual([status("shipping"), status("delivered")]);
    expect(optionTexts(statusSelect("o-6"))).toEqual([status("delivered"), status("completed")]);
    expect(optionTexts(statusSelect("o-4"))).toEqual([status("completed")]);
    expect(optionTexts(statusSelect("o-7"))).toEqual([status("cancelled")]);
  });
});

describe("AOR-5 changing one status", () => {
  it("sends the new status, says so, and asks for the table again", async () => {
    const { calls } = await renderOrders({ pages: [{ data: [PENDING], total: 1 }] });
    await screen.findByText("#o-1");

    await userEvent.selectOptions(statusSelect("o-1"), "confirmed");

    await waitFor(() => expect(calls.patches).toEqual([{ id: "o-1", status: "confirmed" }]));
    expect(await screen.findByText(`Đơn hàng #o-1 → ${status("confirmed")}`)).toBeInTheDocument();
    await waitFor(() => expect(calls.lists).toHaveLength(2));
  });

  it("tells the BE's reason when the change is refused, and does not refresh the table", async () => {
    const { calls } = await renderOrders({
      pages: [{ data: [PENDING], total: 1 }],
      refuse: { "o-1": { status: 400, body: { message: "Order is locked", errorCode: 99999 } } },
    });
    await screen.findByText("#o-1");

    await userEvent.selectOptions(statusSelect("o-1"), "confirmed");

    expect(await screen.findByText("Order is locked")).toBeInTheDocument();
    await wait(100);
    expect(calls.lists).toHaveLength(1);
  });

  it("uses its own words when the BE says nothing", async () => {
    await renderOrders({ pages: [{ data: [PENDING], total: 1 }], refuse: { "o-1": { status: 500, body: {} } } });
    await screen.findByText("#o-1");

    await userEvent.selectOptions(statusSelect("o-1"), "confirmed");

    expect(await screen.findByText(O("toast.statusFailed"))).toBeInTheDocument();
  });

  it("locks the status menus while a change is on its way", async () => {
    let release!: () => void;
    const { server } = await import("@/tests/_support/msw-server");
    const { http, HttpResponse } = await import("msw");
    const { API } = await import("@/tests/_support/api");
    await renderOrders({ pages: [{ data: [PENDING, CONFIRMED], total: 2 }] });
    server.use(
      http.patch(`${API}/api/admin/orders/:id/status`, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json({ data: {} });
      })
    );
    await screen.findByText("#o-1");

    await userEvent.selectOptions(statusSelect("o-1"), "confirmed");

    await waitFor(() => expect(statusSelect("o-2")).toBeDisabled());
    release();
    await waitFor(() => expect(statusSelect("o-2")).toBeEnabled());
  });
});

describe("AOR-6 cancelling an order that is paid", () => {
  const cancelPaid = async () => {
    const view = await renderOrders({ pages: [{ data: [PAID_CONFIRMED, CONFIRMED], total: 2 }] });
    await screen.findByText("#o-3");
    await userEvent.selectOptions(statusSelect("o-3"), "cancelled");
    return view;
  };

  it("asks first, warning that a refund will be opened, and cancels on 'cancel anyway'", async () => {
    const { calls } = await cancelPaid();

    const box = await screen.findByRole("alertdialog");
    expect(box).toHaveTextContent(O("confirmCancelPaid.title"));
    expect(box).toHaveTextContent("Đơn #o-3 đã được thanh toán");
    expect(within(box).getByRole("button", { name: O("confirmCancelPaid.confirm") }).className).toContain("bg-[var(--accent-rose)]");
    expect(calls.patches).toEqual([]);
    await userEvent.click(within(box).getByRole("button", { name: O("confirmCancelPaid.confirm") }));

    await waitFor(() => expect(calls.patches).toEqual([{ id: "o-3", status: "cancelled" }]));
  });

  it("sends nothing when the admin backs out", async () => {
    const { calls } = await cancelPaid();

    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await wait(150);
    expect(calls.patches).toEqual([]);
  });

  it("does not ask for an order that is not paid, nor for another change of a paid order", async () => {
    const { calls } = await renderOrders({ pages: [{ data: [PAID_CONFIRMED, CONFIRMED], total: 2 }] });
    await screen.findByText("#o-2");

    await userEvent.selectOptions(statusSelect("o-2"), "cancelled");
    await waitFor(() => expect(calls.patches).toEqual([{ id: "o-2", status: "cancelled" }]));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await userEvent.selectOptions(statusSelect("o-3"), "shipping");

    await waitFor(() => expect(calls.patches).toHaveLength(2));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("AOR-7 changing many statuses at once", () => {
  const tick = (id: string) => within(rowOf(id)).getByRole("checkbox");
  const bulk = () => screen.getByRole("combobox", { name: O("bulk.statusAria") }) as HTMLSelectElement;
  const bulkOptions = () => optionTexts(bulk()).filter((text) => text !== O("bulk.statusPlaceholder"));

  async function open(extra: Parameters<typeof renderOrders>[0] = {}) {
    const view = await renderOrders({ pages: [{ data: [PENDING, CONFIRMED, PAID_CONFIRMED, DONE], total: 4 }], ...extra });
    await screen.findByText("#o-1");
    return view;
  }

  it("shows the bar once something is ticked, with the steps any ticked order can take", async () => {
    await open();
    expect(screen.queryByRole("combobox", { name: O("bulk.statusAria") })).not.toBeInTheDocument();

    await userEvent.click(tick("o-1"));
    expect(bulkOptions()).toEqual([status("confirmed"), status("cancelled")]);
    await userEvent.click(tick("o-2"));

    expect(bulkOptions()).toEqual([status("confirmed"), status("shipping"), status("cancelled")]);
    expect(bulk()).toHaveValue("");
  });

  it("is locked when no ticked order can move on", async () => {
    await open();

    await userEvent.click(tick("o-4"));

    expect(bulk()).toBeDisabled();
  });

  it("asks first, counting the orders that move, and moves each with its own request", async () => {
    const { calls } = await open();
    await userEvent.click(tick("o-1"));
    await userEvent.click(tick("o-2"));

    await userEvent.selectOptions(bulk(), "confirmed");

    const box = await screen.findByRole("alertdialog");
    expect(box).toHaveTextContent("Đổi trạng thái 1 đơn hàng");
    expect(box).toHaveTextContent(`1 đơn hàng sẽ chuyển sang "${status("confirmed")}".`);
    expect(box).toHaveTextContent("1 đơn đã chọn không thể chuyển sang trạng thái này nên sẽ được bỏ qua.");
    await userEvent.click(within(box).getByRole("button", { name: O("bulk.confirm.confirm") }));

    await waitFor(() => expect(calls.patches).toEqual([{ id: "o-1", status: "confirmed" }]));
    expect(await screen.findByText(`1 đơn hàng đã chuyển sang "${status("confirmed")}"`)).toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(1));
  });

  it("warns that paid orders being cancelled open refunds, in rose", async () => {
    await open();
    await userEvent.click(tick("o-3"));
    await userEvent.click(tick("o-2"));

    await userEvent.selectOptions(bulk(), "cancelled");

    const box = await screen.findByRole("alertdialog");
    expect(box).toHaveTextContent("1 đơn đã thanh toán sẽ tạo yêu cầu hoàn tiền");
    expect(within(box).getByRole("button", { name: O("bulk.confirm.confirm") }).className).toContain("bg-[var(--accent-rose)]");
  });

  it("does not mention refunds or skipped orders when there are none, and is not rose for a harmless change", async () => {
    await open();
    await userEvent.click(tick("o-1"));

    await userEvent.selectOptions(bulk(), "confirmed");

    const box = await screen.findByRole("alertdialog");
    expect(box).not.toHaveTextContent("hoàn tiền");
    expect(box).not.toHaveTextContent("bỏ qua");
    expect(within(box).getByRole("button", { name: O("bulk.confirm.confirm") }).className).not.toContain("bg-[var(--accent-rose)]");
  });

  it("does not mention refunds for a paid order that is not being cancelled", async () => {
    await open();
    await userEvent.click(tick("o-3"));

    await userEvent.selectOptions(bulk(), "shipping");

    expect(await screen.findByRole("alertdialog")).not.toHaveTextContent("hoàn tiền");
  });

  it("sends nothing when the admin declines, and keeps the ticks", async () => {
    const { calls } = await open();
    await userEvent.click(tick("o-1"));
    await userEvent.selectOptions(bulk(), "confirmed");

    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await wait(150);
    expect(calls.patches).toEqual([]);
    expect(tick("o-1")).toBeChecked();
  });

  it("reports the orders that went through and those that did not, and clears the ticks", async () => {
    const { calls } = await open({
      pages: [{ data: [PENDING, adminOrder({ id: "o-8", status: "pending" })], total: 2 }],
      refuse: { "o-8": { status: 409, body: { message: "no" } } },
    });
    await userEvent.click(tick("o-1"));
    await userEvent.click(tick("o-8"));
    await userEvent.selectOptions(bulk(), "confirmed");

    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: O("bulk.confirm.confirm") }));

    expect(await screen.findByText(`1 đơn hàng đã chuyển sang "${status("confirmed")}"`)).toBeInTheDocument();
    expect(await screen.findByText("1 đơn hàng cập nhật thất bại")).toBeInTheDocument();
    expect(calls.patches.map((p) => p.id).sort()).toEqual(["o-1", "o-8"]);
    await waitFor(() => expect(screen.queryByRole("combobox", { name: O("bulk.statusAria") })).not.toBeInTheDocument());
  });

  it("reports only the failure when every change is refused", async () => {
    await open({ refuse: { "o-1": { status: 409, body: { message: "no" } } } });
    await userEvent.click(tick("o-1"));
    await userEvent.selectOptions(bulk(), "confirmed");

    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: O("bulk.confirm.confirm") }));

    expect(await screen.findByText("1 đơn hàng cập nhật thất bại")).toBeInTheDocument();
    expect(screen.queryByText(/đã chuyển sang/)).not.toBeInTheDocument();
  });
});

describe("AOR-8 one order in detail", () => {
  const detail = adminOrder({ id: "o-1", status: "confirmed", note: "Fresh note" });

  it("opens the panel at once with the row's data, puts the order in the address, and shows the newest data when it arrives", async () => {
    const { calls } = await renderOrders({ pages: [{ data: [adminOrder({ id: "o-1", status: "confirmed", note: "" })], total: 1 }], detail });
    await screen.findByText("#o-1");

    await userEvent.click(within(rowOf("o-1")).getByRole("button", { name: O("table.view") }));

    expect(navigation.router.push).toHaveBeenCalledWith("/admin/orders?orderId=o-1", { scroll: false });
    expect(await screen.findByText("Fresh note")).toBeInTheDocument();
    expect(calls.details).toEqual(["o-1"]);
    expect(screen.getByRole("heading", { level: 2, name: "Đơn hàng #o-1" })).toBeInTheDocument();
  });

  it("keeps the row's data when the newest cannot be loaded", async () => {
    await renderOrders({ pages: [{ data: [adminOrder({ id: "o-1", note: "Old note" })], total: 1 }], detail: 500 });
    await screen.findByText("#o-1");

    await userEvent.click(within(rowOf("o-1")).getByRole("button", { name: O("table.view") }));

    expect(await screen.findByText("Old note")).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(".animate-spin")).toBeNull());
  });

  it("closes by taking the order out of the address, keeping the other filters", async () => {
    await renderOrders({ query: { status: "pending" }, pages: [{ data: [adminOrder({ id: "o-1", note: "n" })], total: 1 }], detail });
    await screen.findByText("#o-1");
    await userEvent.click(within(rowOf("o-1")).getByRole("button", { name: O("table.view") }));
    await screen.findByRole("heading", { level: 2, name: "Đơn hàng #o-1" });

    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.orderDetailPanel.close") }));

    expect(navigation.router.push).toHaveBeenLastCalledWith("/admin/orders?status=pending", { scroll: false });
  });

  it("closes when the dark area is clicked, but not the panel itself", async () => {
    await renderOrders({ pages: [{ data: [adminOrder({ id: "o-1" })], total: 1 }], detail });
    await screen.findByText("#o-1");
    await userEvent.click(within(rowOf("o-1")).getByRole("button", { name: O("table.view") }));
    const title = await screen.findByRole("heading", { level: 2, name: "Đơn hàng #o-1" });
    navigation.router.push.mockClear();

    await userEvent.click(title);
    expect(navigation.router.push).not.toHaveBeenCalled();
    await userEvent.click(title.closest(".fixed") as HTMLElement);

    expect(navigation.router.push).toHaveBeenCalledWith("/admin/orders", { scroll: false });
  });

  it("opens an order named in the address on arrival, once", async () => {
    const { calls } = await renderOrders({ query: { orderId: "o-9" }, pages: [{ data: [], total: 0 }], detail: adminOrder({ id: "o-9", note: "From the link" }) });

    expect(await screen.findByText("From the link")).toBeInTheDocument();
    await wait(100);
    expect(calls.details).toEqual(["o-9"]);
  });

  it("says no such order exists when the address names one the BE does not have, and can be closed", async () => {
    await renderOrders({ query: { orderId: "zzz" }, pages: [{ data: [], total: 0 }], detail: 404 });

    expect(await screen.findByRole("heading", { level: 2, name: O("detail.notFoundTitle") })).toBeInTheDocument();
    expect(screen.getByText("Không tìm thấy đơn hàng #zzz")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: O("detail.close") })[1]);
    expect(navigation.router.push).toHaveBeenCalledWith("/admin/orders", { scroll: false });
  });

  it("closes the panel when the address no longer names an order", async () => {
    const view = await renderOrders({ query: { orderId: "o-9" }, pages: [{ data: [], total: 0 }], detail: adminOrder({ id: "o-9", note: "From the link" }) });
    await screen.findByText("From the link");

    navigation.searchParams = new URLSearchParams();
    const { default: OrdersContent } = await import("@/src/app/[locale]/(admin)/admin/orders/OrdersContent");
    view.rerender(<OrdersContent />);

    await waitFor(() => expect(screen.queryByText("From the link")).not.toBeInTheDocument());
  });

  it("changing another order's status leaves the open panel as it is", async () => {
    await renderOrders({ pages: [{ data: [adminOrder({ id: "o-1", status: "pending" }), CONFIRMED], total: 2 }], detail: adminOrder({ id: "o-1", status: "pending" }) });
    await screen.findByText("#o-1");
    await userEvent.click(within(rowOf("o-1")).getByRole("button", { name: O("table.view") }));
    const panel = (await screen.findByRole("heading", { level: 2, name: "Đơn hàng #o-1" })).closest(".shadow-xl") as HTMLElement;

    await userEvent.selectOptions(statusSelect("o-2"), "shipping");

    await screen.findByText(`Đơn hàng #o-2 → ${status("shipping")}`);
    expect(within(panel).getByText(status("pending"))).toBeInTheDocument();
    expect(within(panel).queryByText(status("shipping"))).not.toBeInTheDocument();
  });

  it("changing the status in the row also changes it in the open panel", async () => {
    await renderOrders({ pages: [{ data: [adminOrder({ id: "o-1", status: "pending" })], total: 1 }], detail: adminOrder({ id: "o-1", status: "pending" }) });
    await screen.findByText("#o-1");
    await userEvent.click(within(rowOf("o-1")).getByRole("button", { name: O("table.view") }));
    await screen.findByRole("heading", { level: 2, name: "Đơn hàng #o-1" });

    await userEvent.selectOptions(statusSelect("o-1"), "confirmed");

    await waitFor(() => expect(within(screen.getByRole("heading", { level: 2, name: "Đơn hàng #o-1" }).closest(".shadow-xl") as HTMLElement).getByText(status("confirmed"))).toBeInTheDocument());
  });
});

describe("AOR-9 payment, and refund for a cancelled order, in the panel", () => {
  const open = async (order: ReturnType<typeof adminOrder>, as: "adminFull" | "adminLimited" = "adminFull") => {
    const view = await renderOrders({ as, query: { orderId: order.id }, pages: [{ data: [order], total: 1 }], detail: order });
    await screen.findByRole("heading", { level: 2, name: `Đơn hàng #${order.id}` });
    return view;
  };

  it("gives an admin who may see payments a payment tab with the order in it", async () => {
    await open(adminOrder({ id: "o-1" }));

    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.orderDetailPanel.tabs.payment") }));

    expect(screen.getByText("payment tab of o-1")).toBeInTheDocument();
  });

  it("gives an admin who may not see payments no payment tab", async () => {
    await open(adminOrder({ id: "o-1" }), "adminLimited");

    expect(screen.queryByRole("button", { name: msg("admin.components.orderDetailPanel.tabs.payment") })).not.toBeInTheDocument();
  });

  it("reloads the open order and the table when the payment tab says something changed", async () => {
    const { calls } = await open(adminOrder({ id: "o-1" }));
    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.orderDetailPanel.tabs.payment") }));
    const before = { details: calls.details.length, lists: calls.lists.length };

    await act(async () => payment.props?.onChanged());

    await waitFor(() => expect(calls.details.length).toBe(before.details + 1));
    await waitFor(() => expect(calls.lists.length).toBe(before.lists + 1));
  });

  it("warns that a cancelled paid order has not been refunded, for an admin who may see payments", async () => {
    await open(adminOrder({ id: "o-1", status: "cancelled", paymentStatus: "paid" }));

    expect(screen.getByText("refund banner of o-1")).toBeInTheDocument();
  });

  it.each([
    ["a paid order that is not cancelled", { status: "confirmed", paymentStatus: "paid" }],
    ["a cancelled order that was never paid", { status: "cancelled", paymentStatus: "unpaid" }],
  ] as const)("shows no refund warning for %s", async (_label, over) => {
    await open(adminOrder({ id: "o-1", ...over }));

    expect(screen.queryByText(/refund banner/)).not.toBeInTheDocument();
  });

  it("shows no refund warning to an admin who may not see payments", async () => {
    await open(adminOrder({ id: "o-1", status: "cancelled", paymentStatus: "paid" }), "adminLimited");

    expect(screen.queryByText(/refund banner/)).not.toBeInTheDocument();
  });

  it("refreshes the table when a refund request is opened from the warning", async () => {
    const { calls } = await open(adminOrder({ id: "o-1", status: "cancelled", paymentStatus: "paid" }));
    const before = calls.lists.length;

    await act(async () => payment.banner?.onCreated?.());

    await waitFor(() => expect(calls.lists.length).toBe(before + 1));
  });
});
