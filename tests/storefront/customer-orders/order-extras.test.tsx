import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import OrderDetailContent from "@/src/app/[locale]/(private)/orders/[orderId]/OrderDetailContent";
import type { Order, OrderRefund } from "@/src/app/[locale]/(private)/orders/_common/types";
import { eligibility, order, orderItem, pendingReview, returnRequest } from "@/tests/_support/fixtures";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import { ordersBackend, type OrdersBackend } from "./orders-kit";

/* The refund, return and review parts of an order's page (specs/storefront/customer-orders.md, flows ORD-11 to ORD-13E). */

const D = (key: string, locale: "vi" | "en" = "vi") => msg(`private.orders.detail.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  navigation.params = { orderId: "o-1" };
});

async function open(shown: Order, options: OrdersBackend = {}, locale: "vi" | "en" = "vi") {
  const calls = ordersBackend({ order: shown, ...options });
  const view = await renderApp(<OrderDetailContent />, { as: "user", locale });
  return { calls, ...view };
}

const refund = (over: Partial<OrderRefund> = {}): OrderRefund => ({
  amountVnd: 380_000,
  amountUsd: 14.61,
  status: "REQUESTED",
  reason: "ADMIN_CANCELLED",
  createdAt: "2026-03-06T05:00:00.000Z",
  processedAt: null,
  bankReference: null,
  returnId: null,
  ...over,
});
const refundCard = async (locale: "vi" | "en" = "vi") => within((await screen.findByRole("heading", { level: 2, name: new RegExp(D("refund.title", locale)) })).closest("section") as HTMLElement);

describe("ORD-11 money going back to the shopper", () => {
  it("shows a refund the shop has recorded but not paid yet: reason, wording, amount and when it was asked", async () => {
    await open(order({ status: "cancelled", paymentStatus: "paid", refunds: [refund()] }));

    const card = await refundCard();
    expect(card.getByText(D("refund.reasonAdminCancelled"))).toBeInTheDocument();
    expect(card.getByText(D("refund.REQUESTED"))).toBeInTheDocument();
    expect(card.getByText(`380.000 VNĐ · ${msgf("private.orders.detail.refund.requestedAt", { date: dateText("2026-03-06T05:00:00.000Z", "dateTime") })}`)).toBeInTheDocument();
  });

  it("shows a refund that was paid: the amount, the bank's reference to copy, and when it was processed", async () => {
    await open(order({ status: "cancelled", refunds: [refund({ status: "COMPLETED", bankReference: "BANK-77", processedAt: "2026-03-08T05:00:00.000Z" })] }));

    const card = await refundCard();
    expect(card.getByText(msgf("private.orders.detail.refund.COMPLETED", { amount: "380.000 VNĐ" }))).toBeInTheDocument();
    expect(card.getByText(msgf("private.orders.detail.refund.reference", { ref: "BANK-77" }))).toBeInTheDocument();
    expect(card.getByRole("button", { name: msgf("shared.feedback.copy.aria", { field: D("refund.referenceLabel") }) })).toBeInTheDocument();
    expect(card.getByText(msgf("private.orders.detail.refund.processedAt", { date: dateText("2026-03-08T05:00:00.000Z", "dateTime") }))).toBeInTheDocument();
    expect(card.queryByText(/ · /)).not.toBeInTheDocument();
  });

  it("links a refund that came from a return to that return request", async () => {
    await open(order({ refunds: [refund({ reason: "RETURN", returnId: "r 9", status: "COMPLETED", bankReference: "B" })] }));

    const card = await refundCard();
    expect(card.getByRole("link", { name: D("refund.reasonReturn") })).toHaveAttribute("href", "/returns/r%209");
  });

  it("shows the reason as plain text when a return refund has no return id", async () => {
    await open(order({ refunds: [refund({ reason: "RETURN", returnId: null })] }));

    const card = await refundCard();
    expect(card.getByText(D("refund.reasonReturn"))).toBeInTheDocument();
    expect(card.queryByRole("link")).not.toBeInTheDocument();
  });

  it("lists several refunds, each with its own state", async () => {
    await open(order({ refunds: [refund({ status: "REJECTED", createdAt: "2026-03-09T05:00:00.000Z" }), refund({ status: "COMPLETED", bankReference: "B1", processedAt: "2026-03-08T05:00:00.000Z" })] }));

    const card = await refundCard();
    expect(card.getAllByRole("listitem")).toHaveLength(2);
    expect(card.getByText(D("refund.REJECTED"))).toBeInTheDocument();
    expect(card.getByText(msgf("private.orders.detail.refund.COMPLETED", { amount: "380.000 VNĐ" }))).toBeInTheDocument();
  });

  it("shows the amounts in dollars in English", async () => {
    await open(order({ refunds: [refund({ status: "COMPLETED", bankReference: "B", processedAt: "2026-03-08T05:00:00.000Z" })] }), {}, "en");

    const card = await refundCard("en");
    expect(card.getByText(msgf("private.orders.detail.refund.COMPLETED", { amount: "$14.61" }, "en"))).toBeInTheDocument();
  });
});

describe("ORD-11E refunds that say little", () => {
  it("has no refund card when there are none", async () => {
    await open(order({ refunds: [] }));

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("heading", { level: 2, name: new RegExp(D("refund.title")) })).not.toBeInTheDocument();
  });

  it("has no refund card when the BE sends no list at all", async () => {
    await open(order({ refunds: undefined }));

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("heading", { level: 2, name: new RegExp(D("refund.title")) })).not.toBeInTheDocument();
  });

  it("says the shop will not refund when it refused, with no amount and no bank reference", async () => {
    await open(order({ refunds: [refund({ status: "REJECTED", bankReference: "SHOULD-NOT-SHOW", processedAt: "2026-03-08T05:00:00.000Z" })] }));

    const card = await refundCard();
    expect(card.getByText(D("refund.REJECTED"))).toBeInTheDocument();
    expect(card.queryByText(/SHOULD-NOT-SHOW/)).not.toBeInTheDocument();
    expect(card.queryByText(/380\.000/)).not.toBeInTheDocument();
  });

  it("leaves out the reason label for a reason it does not know", async () => {
    await open(order({ refunds: [refund({ reason: "GOODWILL" })] }));

    const card = await refundCard();
    expect(card.queryByText(D("refund.reasonAdminCancelled"))).not.toBeInTheDocument();
    expect(card.queryByText(D("refund.reasonReturn"))).not.toBeInTheDocument();
    expect(card.getByText(D("refund.REQUESTED"))).toBeInTheDocument();
  });

  it("shows no bank reference for a completed refund that has none", async () => {
    await open(order({ refunds: [refund({ status: "COMPLETED", bankReference: null, processedAt: "2026-03-08T05:00:00.000Z" })] }));

    const card = await refundCard();
    expect(card.queryByText(/Mã giao dịch/)).not.toBeInTheDocument();
  });
});

describe("ORD-12 returning what was delivered", () => {
  it.each(["delivered", "completed"])("a %s order has the return card, with the deadline and a button to ask", async (status) => {
    const { calls } = await open(order({ status, paymentStatus: "paid" }), { eligibility: eligibility({ deadline: "2026-04-01T05:00:00.000Z" }) });

    const card = within((await screen.findByRole("heading", { level: 2, name: msg("private.returns.orderCard.title") })).closest("section") as HTMLElement);
    expect(card.getByText(msgf("private.returns.orderCard.eligible", { date: dateText("2026-04-01T05:00:00.000Z", "dateTime") }))).toBeInTheDocument();
    expect(card.getByRole("link", { name: msg("private.returns.orderCard.request") })).toHaveAttribute("href", "/returns/new?orderId=o-1");
    expect(calls.eligibility).toEqual(["o-1"]);
  });

  it("lists the return requests already sent for the order", async () => {
    await open(order({ status: "delivered", paymentStatus: "paid" }), { eligibility: eligibility(), returns: [returnRequest({ id: "r-5" })] });

    const card = within((await screen.findByRole("heading", { level: 2, name: msg("private.returns.orderCard.title") })).closest("section") as HTMLElement);
    expect(await card.findByRole("link", { name: new RegExp(msg("private.returns.status.REQUESTED")) })).toHaveAttribute("href", "/returns/r-5");
  });

  it("says why the order cannot be returned any more, without a button", async () => {
    await open(order({ status: "completed", paymentStatus: "paid" }), { eligibility: eligibility({ eligible: false, reason: "RETURN_WINDOW_EXPIRED", deadline: null }) });

    const card = within((await screen.findByRole("heading", { level: 2, name: msg("private.returns.orderCard.title") })).closest("section") as HTMLElement);
    expect(card.getByText(msg("private.returns.ineligible.RETURN_WINDOW_EXPIRED"))).toBeInTheDocument();
    expect(card.queryByRole("link", { name: msg("private.returns.orderCard.request") })).not.toBeInTheDocument();
  });
});

describe("ORD-12E orders that are not at the shopper yet", () => {
  it.each(["pending", "confirmed", "shipping", "cancelled"])("a %s order has no return card, and nothing is asked about returns", async (status) => {
    const { calls } = await open(order({ status }), { eligibility: eligibility() });

    await screen.findByRole("heading", { level: 1, name: msg(`common.orderStatus.${status}`) });
    await wait(150);
    expect(screen.queryByRole("heading", { level: 2, name: msg("private.returns.orderCard.title") })).not.toBeInTheDocument();
    expect(calls.eligibility).toEqual([]);
    expect(calls.returnLists).toEqual([]);
  });

  it("has no return card for a delivered order the BE has no answer about", async () => {
    await open(order({ status: "delivered", paymentStatus: "paid" }), { eligibility: "error" });

    await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.delivered") });
    await wait(200);
    expect(screen.queryByRole("heading", { level: 2, name: msg("private.returns.orderCard.title") })).not.toBeInTheDocument();
  });
});

describe("ORD-13 writing a review from the order", () => {
  const two = [orderItem({ id: "i1", productName: "Dress" }), orderItem({ id: "i2", productName: "Skirt" })];
  const rowOf = async (name: string) => within((await screen.findAllByText(name))[0].closest("li") as HTMLElement);

  it("puts the button on the lines that can be reviewed, with the days left, and nowhere else", async () => {
    await open(order({ status: "delivered", paymentStatus: "paid", items: two }), { pending: [pendingReview({ orderItemId: "i1", reviewDeadline: new Date(Date.now() + 5 * 86_400_000).toISOString() })] });

    const dress = await rowOf("Dress");
    expect(await dress.findByRole("button", { name: D("review.cta") })).toBeInTheDocument();
    expect(dress.getByText(/Còn \d+ ngày để đánh giá/)).toBeInTheDocument();
    expect((await rowOf("Skirt")).queryByRole("button", { name: D("review.cta") })).not.toBeInTheDocument();
  });

  it("says it is the last day when less than a day is left", async () => {
    await open(order({ status: "completed", paymentStatus: "paid", items: two }), { pending: [pendingReview({ orderItemId: "i1", reviewDeadline: new Date(Date.now() - 1000).toISOString() })] });

    expect(await screen.findByText(msg("shared.reviews.deadline.lastDay"))).toBeInTheDocument();
  });

  it("opens the review form for that line when the button is pressed", async () => {
    await open(order({ status: "delivered", paymentStatus: "paid", items: two }), { pending: [pendingReview({ orderItemId: "i2", productName: "Skirt" })] });

    await userEvent.click(await (await rowOf("Skirt")).findByRole("button", { name: D("review.cta") }));

    const form = await screen.findByRole("dialog");
    expect(within(form).getByText("Skirt")).toBeInTheDocument();
  });
});

describe("ORD-13E when there is nothing to review", () => {
  const dressOnly = [orderItem({ id: "i1", productName: "Dress" })];

  it.each(["pending", "confirmed", "shipping"])("a %s order has no review button even if the BE lists the line", async (status) => {
    const { calls } = await open(order({ status, items: dressOnly }), { pending: [pendingReview({ orderItemId: "i1" })] });

    await screen.findByRole("heading", { level: 1, name: msg(`common.orderStatus.${status}`) });
    await waitFor(() => expect(calls.pending).toBeGreaterThan(0));
    await wait(100);
    expect(screen.queryByRole("button", { name: D("review.cta") })).not.toBeInTheDocument();
  });

  it("has no button when the line is not in the BE's list (already reviewed)", async () => {
    const { calls } = await open(order({ status: "delivered", paymentStatus: "paid", items: dressOnly }), { pending: [] });

    await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.delivered") });
    await waitFor(() => expect(calls.pending).toBeGreaterThan(0));
    await wait(100);
    expect(screen.queryByRole("button", { name: D("review.cta") })).not.toBeInTheDocument();
  });

  it("has no button, and no error, when the list cannot be loaded (no permission)", async () => {
    const { calls } = await open(order({ status: "delivered", paymentStatus: "paid", items: dressOnly }), { pending: "error" });

    await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.delivered") });
    await waitFor(() => expect(calls.pending).toBeGreaterThan(0));
    await wait(100);
    expect(screen.queryByRole("button", { name: D("review.cta") })).not.toBeInTheDocument();
    expect(screen.queryByText("no permission")).not.toBeInTheDocument();
  });
});
