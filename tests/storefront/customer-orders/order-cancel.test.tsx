import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import OrderDetailContent from "@/src/app/[locale]/(private)/orders/[orderId]/OrderDetailContent";
import type { Order } from "@/src/app/[locale]/(private)/orders/_common/types";
import { API } from "@/tests/_support/api";
import { order } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import { ordersBackend, type OrdersBackend } from "./orders-kit";

/* Cancelling an order from its page (specs/storefront/customer-orders.md, flows ORD-9 to ORD-10). */

const D = (key: string) => msg(`private.orders.detail.${key}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  navigation.params = { orderId: "o-1" };
});

async function open(shown: Order, options: OrdersBackend = {}) {
  const calls = ordersBackend({ order: shown, ...options });
  const view = await renderApp(<OrderDetailContent />, { as: "user" });
  return { calls, ...view };
}

const cancelButton = () => screen.findByRole("button", { name: D("cancel.action") });
const dialog = () => screen.findByRole("alertdialog");
const confirmCancel = async () => userEvent.click(within(await dialog()).getByRole("button", { name: D("cancel.confirm.confirm") }));
const declineCancel = async () => userEvent.click(within(await dialog()).getByRole("button", { name: msg("common.actions.cancel") }));

describe("ORD-9 cancelling an order that is not paid and still waiting", () => {
  it("explains that it can be cancelled here, asks to be sure, sends the cancel, shows the order as cancelled and says so", async () => {
    const cancelled = order({ status: "cancelled" });
    const { calls } = await open(order(), { cancel: cancelled });
    expect(await screen.findByText(D("cancel.hint"))).toBeInTheDocument();

    await userEvent.click(await cancelButton());
    expect(await dialog()).toHaveTextContent(D("cancel.confirm.message"));
    expect(within(await dialog()).getByText(D("cancel.confirm.title"))).toBeInTheDocument();
    await confirmCancel();

    expect(await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.cancelled") })).toBeInTheDocument();
    expect(calls.cancels).toEqual(["o-1"]);
    expect(await screen.findByText(D("cancel.done"))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: D("cancel.action") })).not.toBeInTheDocument());
    expect(screen.queryByText(D("cancel.hint"))).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: D("payment.pay") })).not.toBeInTheDocument();
  });

  it("puts the order id safely into the cancel address", async () => {
    navigation.params = { orderId: "a b" };
    const { calls } = await open(order({ id: "a b" }), { cancel: order({ id: "a b", status: "cancelled" }) });

    await userEvent.click(await cancelButton());
    await confirmCancel();

    await waitFor(() => expect(calls.cancels).toEqual(["a b"]));
  });

  it("takes the order from the answer as it is, so codes the BE cancelled along with it show their new state", async () => {
    const attempt = { transferCode: "CODE-1", amountVnd: 1, amountUsd: 1, status: "PENDING" as const, createdAt: "2026-03-05T05:00:00.000Z", expiresAt: "2026-03-05T05:15:00.000Z", paidAt: null, transactionRef: null };
    await open(order({ paymentAttempts: [attempt] }), { cancel: order({ status: "cancelled", paymentAttempts: [{ ...attempt, status: "CANCELLED" }] }) });

    await userEvent.click(await cancelButton());
    await confirmCancel();

    const row = within((await screen.findByText("CODE-1")).closest("li") as HTMLElement);
    expect(row.getByText(D("payment.attempt.CANCELLED"))).toBeInTheDocument();
    expect(screen.queryByText(D("payment.attempt.PENDING"))).not.toBeInTheDocument();
  });
});

describe("ORD-9E a cancel that is refused, declined or slow", () => {
  it("does nothing when the shopper says no", async () => {
    const { calls } = await open(order(), { cancel: order({ status: "cancelled" }) });

    await userEvent.click(await cancelButton());
    await declineCancel();

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await wait(100);
    expect(calls.cancels).toEqual([]);
    expect(screen.getByRole("heading", { level: 1, name: msg("common.orderStatus.pending") })).toBeInTheDocument();
  });

  it("shows the BE's own words when it refuses (an order already paid or handed over), and the order stays as it was", async () => {
    const { calls } = await open(order(), { cancel: { status: 409, body: { message: "Order already handed to the carrier", errorCode: 1307 } } });

    await userEvent.click(await cancelButton());
    await confirmCancel();

    expect(await screen.findByText("Order already handed to the carrier")).toBeInTheDocument();
    expect(calls.cancels).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: msg("common.orderStatus.pending") })).toBeInTheDocument();
    expect(screen.queryByText(D("cancel.done"))).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: D("cancel.action") })).toBeEnabled());
  });

  it("shows the plain 'API error: 500' when the BE gives no words (see the spec, section 7)", async () => {
    await open(order(), { cancel: { status: 500, body: {} } });

    await userEvent.click(await cancelButton());
    await confirmCancel();

    expect(await screen.findByText("API error: 500")).toBeInTheDocument();
    expect(screen.queryByText(D("cancel.failed"))).not.toBeInTheDocument();
  });

  it("locks the button and says it is cancelling while the BE works, and a second press sends nothing", async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    const { calls } = await open(order());
    server.use(
      http.patch(`${API}/api/orders/:id/cancel`, async ({ params }) => {
        calls.cancels.push(String(params.id));
        await slow;
        return HttpResponse.json({ data: order({ status: "cancelled" }) });
      })
    );

    await userEvent.click(await cancelButton());
    await confirmCancel();

    const busy = await screen.findByRole("button", { name: D("cancel.cancelling") });
    expect(busy).toBeDisabled();
    await userEvent.click(busy);
    release();
    expect(await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.cancelled") })).toBeInTheDocument();
    expect(calls.cancels).toHaveLength(1);
  });

  it("keeps the order and still says done when the BE answers without an order", async () => {
    await open(order(), { cancel: undefined });

    await userEvent.click(await cancelButton());
    await confirmCancel();

    expect(await screen.findByText(D("cancel.done"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: msg("common.orderStatus.pending") })).toBeInTheDocument();
  });
});

describe("ORD-10 orders that cannot be cancelled here", () => {
  it.each([
    ["pending", "paid"],
    ["confirmed", "unpaid"],
    ["confirmed", "paid"],
    ["shipping", "unpaid"],
    ["shipping", "paid"],
  ])("a %s order that is %s has no cancel button and tells the shopper to contact the shop", async (status, paymentStatus) => {
    await open(order({ status, paymentStatus: paymentStatus as Order["paymentStatus"] }));

    expect(await screen.findByText(D("cancel.contactShop"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: D("cancel.action") })).not.toBeInTheDocument();
    expect(screen.queryByText(D("cancel.hint"))).not.toBeInTheDocument();
  });

  it.each(["delivered", "completed", "cancelled"])("a %s order has neither the button nor the advice", async (status) => {
    await open(order({ status, paymentStatus: "paid" }));

    await screen.findByRole("heading", { level: 1, name: msg(`common.orderStatus.${status}`) });
    expect(screen.queryByRole("button", { name: D("cancel.action") })).not.toBeInTheDocument();
    expect(screen.queryByText(D("cancel.contactShop"))).not.toBeInTheDocument();
    expect(screen.queryByText(D("cancel.hint"))).not.toBeInTheDocument();
  });

  it("an unpaid and waiting order is the only one with the button", async () => {
    await open(order({ status: "pending", paymentStatus: "unpaid" }));

    expect(await cancelButton()).toBeInTheDocument();
    expect(screen.queryByText(D("cancel.contactShop"))).not.toBeInTheDocument();
  });
});
