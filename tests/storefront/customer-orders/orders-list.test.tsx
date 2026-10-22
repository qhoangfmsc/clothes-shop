import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import OrdersContent from "@/src/app/[locale]/(private)/orders/OrdersContent";
import { API } from "@/tests/_support/api";
import { order, orderItem, pendingReview } from "@/tests/_support/fixtures";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";
import { ordersBackend, type OrdersBackend } from "./orders-kit";

/* The list of my orders (specs/storefront/customer-orders.md, flows ORD-1 to ORD-3E). */

const L = (key: string, locale: "vi" | "en" = "vi") => msg(`private.orders.list.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function open(options: OrdersBackend = {}, view: { as?: "guest" | "user"; locale?: "vi" | "en"; waitForAuth?: boolean } = {}) {
  const calls = ordersBackend(options);
  const result = await renderApp(<OrdersContent />, { as: view.as ?? "user", locale: view.locale, waitForAuth: view.waitForAuth });
  return { calls, ...result };
}

const cardOf = (id: string) => screen.getByRole("link", { name: new RegExp(`#${id}`) });

describe("ORD-1 a visitor who is not signed in", () => {
  it("sees the sign-in wall, not the orders, and nothing is asked of the BE", async () => {
    const { calls } = await open({ pages: [{ data: [order()], total: 1 }] }, { as: "guest" });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: L("title") })).not.toBeInTheDocument();
    await wait(150);
    expect(calls.lists).toEqual([]);
  });
});

describe("ORD-1E while the session is being worked out", () => {
  it("shows only a placeholder, then the list", async () => {
    const { calls } = await open({ pages: [{ data: [order()], total: 1 }] }, { waitForAuth: false });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(calls.lists).toEqual([]);

    expect(await screen.findByRole("heading", { level: 1, name: L("title") })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /#o-1/ })).toBeInTheDocument();
  });
});

describe("ORD-2 my orders", () => {
  it("asks for the newest first, 25 at a time, and shows the title, the way back and the two side links", async () => {
    const { calls } = await open({ pages: [{ data: [order()], total: 1 }] });

    await screen.findByRole("link", { name: /#o-1/ });
    expect(calls.lists).toHaveLength(1);
    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(calls.lists[0].has("page")).toBe(false);
    expect(screen.getByRole("heading", { level: 1, name: L("title") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: L("back") })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: L("returnsLink") })).toHaveAttribute("href", "/returns");
    expect(screen.getByRole("link", { name: new RegExp(L("reviewsLink")) })).toHaveAttribute("href", "/reviews");
  });

  it("shows each order as one link to its page with status, payment, day, lines, number and total", async () => {
    await open({
      pages: [
        {
          data: [
            order({ id: "o-9", status: "delivered", paymentStatus: "paid", totalVnd: 530_000, createdAt: "2026-03-07T05:00:00.000Z", items: [orderItem({ quantity: 2 })] }),
            order({ id: "o-8", status: "pending", paymentStatus: "unpaid" }),
          ],
          total: 2,
        },
      ],
    });

    const card = await screen.findByRole("link", { name: /#o-9/ });
    expect(card).toHaveAttribute("href", "/orders/o-9");
    const inside = within(card);
    expect(inside.getByText(msg("common.orderStatus.delivered"))).toBeInTheDocument();
    expect(inside.getByText(msg("common.orderPaymentStatus.paid"))).toBeInTheDocument();
    expect(inside.getByText("Dress")).toBeInTheDocument();
    expect(inside.getByText("M · Red · SL 2")).toBeInTheDocument();
    expect(inside.getByText(msgf("private.orders.list.card.orderNumber", { id: "o-9" }))).toBeInTheDocument();
    expect(inside.getByText("530.000 VNĐ")).toBeInTheDocument();
    expect(inside.getByText(L("card.total"))).toBeInTheDocument();
    expect(inside.getByText(dateText("2026-03-07T05:00:00.000Z", "short"))).toBeInTheDocument();
    expect(cardOf("o-8")).toHaveAttribute("href", "/orders/o-8");
    expect(within(cardOf("o-8")).getByText(msg("common.orderStatus.pending"))).toBeInTheDocument();
    expect(within(cardOf("o-8")).getByText(msg("common.orderPaymentStatus.unpaid"))).toBeInTheDocument();
  });

  it("shows only the first two lines of an order and counts the rest", async () => {
    const lines = [orderItem({ id: "i1", productName: "Dress" }), orderItem({ id: "i2", productName: "Skirt" }), orderItem({ id: "i3", productName: "Coat" }), orderItem({ id: "i4", productName: "Scarf" })];
    await open({ pages: [{ data: [order({ items: lines })], total: 1 }] });

    const card = within(await screen.findByRole("link", { name: /#o-1/ }));
    expect(card.getByText("Dress")).toBeInTheDocument();
    expect(card.getByText("Skirt")).toBeInTheDocument();
    expect(card.queryByText("Coat")).not.toBeInTheDocument();
    expect(card.getByText(msgf("private.orders.list.card.more", { count: 2 }))).toBeInTheDocument();
  });

  it("shows no 'more' note and no quantity for an order of two single lines", async () => {
    await open({ pages: [{ data: [order({ items: [orderItem({ id: "i1" }), orderItem({ id: "i2", productName: "Skirt" })] })], total: 1 }] });

    const card = within(await screen.findByRole("link", { name: /#o-1/ }));
    expect(card.queryByText(/\+\d+ sản phẩm khác/)).not.toBeInTheDocument();
    expect(card.queryByText(/SL/)).not.toBeInTheDocument();
  });

  it("shows dollars and English words in English", async () => {
    await open({ pages: [{ data: [order({ totalUsd: 14.61, status: "shipping" })], total: 1 }] }, { locale: "en" });

    const card = within(await screen.findByRole("link", { name: /#o-1/ }));
    expect(card.getByText("$14.61")).toBeInTheDocument();
    expect(card.getByText(msg("common.orderStatus.shipping", "en"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: L("title", "en") })).toBeInTheDocument();
  });

  it("colours the status badge by status and shows a status it does not know as written, like one that is waiting", async () => {
    await open({ pages: [{ data: [order({ id: "o-1", status: "cancelled" }), order({ id: "o-2", status: "on_hold" })], total: 2 }] });

    const cancelled = within(await screen.findByRole("link", { name: /#o-1/ })).getByText(msg("common.orderStatus.cancelled"));
    expect(cancelled.getAttribute("style")).toContain("var(--color-deep-rose)");
    const unknown = within(cardOf("o-2")).getByText("on_hold");
    expect(unknown.getAttribute("style")).toContain("var(--accent-primary)");
  });

  it("draws a placeholder instead of a picture for a line that has no image", async () => {
    await open({ pages: [{ data: [order({ items: [orderItem({ productImage: "" })] })], total: 1 }] });

    const card = within(await screen.findByRole("link", { name: /#o-1/ }));
    expect(card.queryByRole("img")).not.toBeInTheDocument();
    expect(card.getByText("Dress")).toBeInTheDocument();
  });

  it("puts the number of lines waiting for a review on the review link", async () => {
    await open({ pages: [{ data: [order()], total: 1 }], pending: [pendingReview({ orderItemId: "a" }), pendingReview({ orderItemId: "b" })] });

    const link = await screen.findByRole("link", { name: new RegExp(L("reviewsLink")) });
    await waitFor(() => expect(within(link).getByText("2")).toBeInTheDocument());
  });

  it("shows no number on the review link when nothing waits for a review, or when that list cannot be loaded", async () => {
    await open({ pages: [{ data: [order()], total: 1 }], pending: "error" });

    const link = await screen.findByRole("link", { name: new RegExp(L("reviewsLink")) });
    await wait(150);
    expect(within(link).queryByText(/\d/)).not.toBeInTheDocument();
  });
});

describe("ORD-2E nothing to show, or a list that cannot be loaded", () => {
  it("says there are no orders yet and points to the shop", async () => {
    await open({ pages: [{ data: [], total: 0 }] });

    expect(await screen.findByRole("heading", { level: 2, name: L("empty.title") })).toBeInTheDocument();
    expect(screen.getByText(L("empty.description"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: L("empty.cta") })).toHaveAttribute("href", "/shop");
    expect(screen.queryByRole("button", { name: L("loadMore") })).not.toBeInTheDocument();
  });

  it("tells the shopper the list could not be loaded, and then shows the 'no orders' page (see the spec, section 7)", async () => {
    await open({ pages: [], failPage: 1 });

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: L("empty.title") })).toBeInTheDocument();
  });
});

describe("ORD-3 more orders", () => {
  const first = Array.from({ length: 2 }, (_, i) => order({ id: `o-${i + 1}` }));
  const second = [order({ id: "o-3" })];

  it("offers 'more' while there are orders left, adds the next page at the end, and hides it when all are shown", async () => {
    const { calls } = await open({ pages: [{ data: first, total: 3 }, { data: second, total: 3 }] });
    await screen.findByRole("link", { name: /#o-1/ });
    const more = screen.getByRole("button", { name: L("loadMore") });

    await userEvent.click(more);

    expect(await screen.findByRole("link", { name: /#o-3/ })).toBeInTheDocument();
    expect(calls.lists[1].get("page")).toBe("2");
    expect(screen.getAllByRole("link", { name: /#o-\d/ }).map((a) => a.getAttribute("href"))).toEqual(["/orders/o-1", "/orders/o-2", "/orders/o-3"]);
    expect(screen.queryByRole("button", { name: L("loadMore") })).not.toBeInTheDocument();
  });

  it("is not offered when everything fits in the first page", async () => {
    await open({ pages: [{ data: first, total: 2 }] });
    await screen.findByRole("link", { name: /#o-1/ });

    expect(screen.queryByRole("button", { name: L("loadMore") })).not.toBeInTheDocument();
  });

  it("locks the button and says it is loading while the next page comes", async () => {
    let release!: () => void;
    const open_ = new Promise<void>((resolve) => (release = resolve));
    await open({ pages: [{ data: first, total: 3 }] });
    await screen.findByRole("link", { name: /#o-1/ });
    server.use(
      http.get(`${API}/api/orders`, async () => {
        await open_;
        return HttpResponse.json({ data: second, total: 3 });
      })
    );

    await userEvent.click(screen.getByRole("button", { name: L("loadMore") }));

    expect(await screen.findByRole("button", { name: L("loadingMore") })).toBeDisabled();
    release();
    expect(await screen.findByRole("link", { name: /#o-3/ })).toBeInTheDocument();
  });
});

describe("ORD-3E the next page cannot be loaded", () => {
  it("says so and keeps the orders already shown, with the button still there to try again", async () => {
    await open({ pages: [{ data: [order({ id: "o-1" }), order({ id: "o-2" })], total: 3 }], failPage: 2 });
    await screen.findByRole("link", { name: /#o-1/ });

    await userEvent.click(screen.getByRole("button", { name: L("loadMore") }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /#o-\d/ })).toHaveLength(2);
    await waitFor(() => expect(screen.getByRole("button", { name: L("loadMore") })).toBeEnabled());
  });
});
