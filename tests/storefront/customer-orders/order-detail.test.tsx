import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import OrderDetailContent from "@/src/app/[locale]/(private)/orders/[orderId]/OrderDetailContent";
import type { Order } from "@/src/app/[locale]/(private)/orders/_common/types";
import { CONTACT_ADDRESS, CONTACT_MAPS_URL } from "@/src/lib/contact";
import { order, orderItem, productSummary } from "@/tests/_support/fixtures";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import { ordersBackend, type OrdersBackend } from "./orders-kit";

/* One order's page: status, payment, delivery, lines and totals (specs/storefront/customer-orders.md, flows ORD-4 to ORD-8E). */

const D = (key: string, locale: "vi" | "en" = "vi") => msg(`private.orders.detail.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  navigation.params = { orderId: "o-1" };
});

async function open(shown: Order | null | number, options: OrdersBackend = {}, view: { as?: "guest" | "user"; locale?: "vi" | "en"; waitForAuth?: boolean } = {}) {
  const calls = ordersBackend({ order: shown, ...options });
  const result = await renderApp(<OrderDetailContent />, { as: view.as ?? "user", locale: view.locale, waitForAuth: view.waitForAuth });
  return { calls, ...result };
}

/** The card whose title matches, e.g. the payment card, once the page has loaded. */
const card = async (title: string | RegExp) => within((await screen.findByRole("heading", { level: 2, name: title })).closest("section") as HTMLElement);
const paymentCard = () => card(new RegExp(D("payment.title")));

describe("ORD-4 a visitor, and the wait before the order shows", () => {
  it("shows the sign-in wall to a visitor and asks the BE for nothing", async () => {
    const { calls } = await open(order(), {}, { as: "guest" });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    await wait(150);
    expect(calls.details).toEqual([]);
  });

  it("shows only a placeholder until the order is there", async () => {
    await open(order(), {}, { waitForAuth: false });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.pending") })).toBeInTheDocument();
  });

  it("asks for the order named in the address", async () => {
    navigation.params = { orderId: "o-77" };
    const { calls } = await open(order({ id: "o-77" }));

    await screen.findByRole("heading", { level: 1 });
    expect(calls.details).toEqual(["o-77"]);
  });
});

describe("ORD-4E an order that cannot be shown", () => {
  it("says it was not found when the BE has no such order, without an error toast", async () => {
    await open(null);

    expect(await screen.findByText(D("notFound"))).toBeInTheDocument();
    expect(screen.queryByText(D("toast.loadFailed"))).not.toBeInTheDocument();
  });

  it("says it was not found and shows the BE's error when the order cannot be loaded (see the spec, section 7)", async () => {
    await open(500);

    expect(await screen.findByText(D("notFound"))).toBeInTheDocument();
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});

describe("ORD-5 the status card", () => {
  it.each(["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"])("for a %s order shows its name and its own explanation", async (status) => {
    await open(order({ status }));

    expect(await screen.findByRole("heading", { level: 1, name: msg(`common.orderStatus.${status}`) })).toBeInTheDocument();
    expect(screen.getByText(D(`statusHint.${status}`))).toBeInTheDocument();
  });

  it("shows the payment state next to the order state, the day it was placed and the order number", async () => {
    await open(order({ paymentStatus: "paid", status: "confirmed" }));

    const title = await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.confirmed") });
    expect(within(title.parentElement as HTMLElement).getByText(msg("common.orderPaymentStatus.paid"))).toBeInTheDocument();
    expect(screen.getByText(`${dateText("2026-03-05T05:00:00.000Z", "dateTime")} · ${msgf("private.orders.detail.orderNumber", { id: "o-1" })}`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: D("back") })).toHaveAttribute("href", "/orders");
  });

  it("speaks English in English", async () => {
    await open(order({ status: "shipping" }), {}, { locale: "en" });

    expect(await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.shipping", "en") })).toBeInTheDocument();
    expect(screen.getByText(D("statusHint.shipping", "en"))).toBeInTheDocument();
  });
});

describe("ORD-5E a status the shop has not told the page about", () => {
  it("shows the status as the BE wrote it and explains it like an order that is waiting", async () => {
    await open(order({ status: "on_hold" }));

    expect(await screen.findByRole("heading", { level: 1, name: "on_hold" })).toBeInTheDocument();
    expect(screen.getByText(D("statusHint.pending"))).toBeInTheDocument();
  });
});

describe("ORD-6 paying for the order", () => {
  const attempts = [
    { transferCode: "CODE-NEW", amountVnd: 380_000, amountUsd: 14.61, status: "PENDING" as const, createdAt: "2026-03-05T06:00:00.000Z", expiresAt: "2026-03-05T06:15:00.000Z", paidAt: null, transactionRef: null },
    { transferCode: "CODE-OLD", amountVnd: 380_000, amountUsd: 14.61, status: "EXPIRED" as const, createdAt: "2026-03-05T05:00:00.000Z", expiresAt: "2026-03-05T05:15:00.000Z", paidAt: null, transactionRef: null },
  ];

  it("offers to pay an order that is not paid yet, going to its payment page", async () => {
    await open(order());

    const payment = await paymentCard();
    expect(payment.getByText(D("payment.awaiting"))).toBeInTheDocument();
    expect(payment.getByRole("link", { name: D("payment.pay") })).toHaveAttribute("href", "/checkout/payment/o-1");
  });

  it("puts a strange order id safely into the payment address", async () => {
    navigation.params = { orderId: "a b" };
    await open(order({ id: "a b" }));

    expect(await screen.findByRole("link", { name: D("payment.pay") })).toHaveAttribute("href", "/checkout/payment/a%20b");
  });

  it("says an order is paid, with no button to pay", async () => {
    await open(order({ paymentStatus: "paid", status: "confirmed" }));

    const payment = await paymentCard();
    expect(payment.getByText(D("payment.paid"))).toBeInTheDocument();
    expect(payment.queryByRole("link", { name: D("payment.pay") })).not.toBeInTheDocument();
  });

  it("lists every transfer code ever given, newest first, with its state, amount and deadline, and a copy button", async () => {
    await open(order({ paymentAttempts: attempts }));

    const payment = await paymentCard();
    const rows = payment.getAllByRole("listitem");
    expect(within(rows[0]).getByText("CODE-NEW")).toBeInTheDocument();
    expect(within(rows[0]).getByText(D("payment.attempt.PENDING"))).toBeInTheDocument();
    expect(within(rows[0]).getByText(`380.000 VNĐ · ${msgf("private.orders.detail.payment.expiresAt", { date: dateText("2026-03-05T06:15:00.000Z", "dateTime") })}`)).toBeInTheDocument();
    expect(within(rows[1]).getByText("CODE-OLD")).toBeInTheDocument();
    expect(within(rows[1]).getByText(D("payment.attempt.EXPIRED"))).toBeInTheDocument();
    expect(within(rows[0]).getByRole("button", { name: msgf("shared.feedback.copy.aria", { field: D("payment.code") }) })).toBeInTheDocument();
    expect(payment.getByText(D("payment.codesHint"))).toBeInTheDocument();
    expect(payment.queryByText(/Mã giao dịch/)).not.toBeInTheDocument();
  });

  it("for a paid code shows the day it was paid and the bank's reference, which can be copied, and no reminder to call the shop", async () => {
    const paid = { ...attempts[0], status: "PAID" as const, paidAt: "2026-03-05T06:05:00.000Z", transactionRef: "FT123456" };
    await open(order({ paymentStatus: "paid", status: "confirmed", paymentAttempts: [paid] }));

    const payment = await paymentCard();
    const row = within(payment.getAllByRole("listitem")[0]);
    expect(row.getByText(D("payment.attempt.PAID"))).toBeInTheDocument();
    expect(payment.getByText(`380.000 VNĐ · ${msgf("private.orders.detail.payment.paidAt", { date: dateText("2026-03-05T06:05:00.000Z", "dateTime") })}`)).toBeInTheDocument();
    expect(payment.getByText(msgf("private.orders.detail.payment.transactionRef", { ref: "FT123456" }))).toBeInTheDocument();
    expect(payment.getByRole("button", { name: msgf("shared.feedback.copy.aria", { field: D("payment.transactionRefLabel") }) })).toBeInTheDocument();
    expect(payment.queryByText(D("payment.codesHint"))).not.toBeInTheDocument();
  });

  it("shows amounts in dollars in English", async () => {
    await open(order({ paymentAttempts: attempts }), {}, { locale: "en" });

    const payment = await card(new RegExp(D("payment.title", "en")));
    expect(payment.getAllByText(/\$14\.61/).length).toBeGreaterThan(0);
  });
});

describe("ORD-6E when there is nothing to pay", () => {
  it("has no payment card for a cancelled order that was never paid and has no codes", async () => {
    await open(order({ status: "cancelled" }));

    await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.cancelled") });
    expect(screen.queryByRole("heading", { level: 2, name: new RegExp(D("payment.title")) })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: D("payment.pay") })).not.toBeInTheDocument();
  });

  it("keeps the codes of a cancelled order but offers no payment", async () => {
    const attempt = { transferCode: "CODE-X", amountVnd: 1, amountUsd: 1, status: "CANCELLED" as const, createdAt: "2026-03-05T05:00:00.000Z", expiresAt: "2026-03-05T05:15:00.000Z", paidAt: null, transactionRef: null };
    await open(order({ status: "cancelled", paymentAttempts: [attempt] }));

    const payment = await paymentCard();
    expect(payment.getByText("CODE-X")).toBeInTheDocument();
    expect(payment.getByText(D("payment.attempt.CANCELLED"))).toBeInTheDocument();
    expect(payment.queryByText(D("payment.awaiting"))).not.toBeInTheDocument();
    expect(payment.queryByRole("link", { name: D("payment.pay") })).not.toBeInTheDocument();
  });

  it("has no payment card for a refunded order with no codes (it is neither open nor paid)", async () => {
    await open(order({ status: "cancelled", paymentStatus: "refunded" }));

    await screen.findByRole("heading", { level: 1, name: msg("common.orderStatus.cancelled") });
    expect(screen.queryByRole("heading", { level: 2, name: new RegExp(D("payment.title")) })).not.toBeInTheDocument();
  });
});

describe("ORD-7 where the order goes", () => {
  it("shows the name, the phone and the address, line by line, with the city, province and postal code", async () => {
    await open(order({ shippingAddress: { fullName: "Mai", phone: "0901234567", addressLine1: "1 Le Loi", addressLine2: "Apt 5", city: "Ho Chi Minh", province: "HCM", postalCode: "700000", country: "Vietnam" } }));

    const delivery = await card(new RegExp(D("shippingAddress")));
    expect(delivery.getByText("Mai")).toBeInTheDocument();
    expect(delivery.getByText(/· 0901234567/)).toBeInTheDocument();
    expect(delivery.getByText("1 Le Loi")).toBeInTheDocument();
    expect(delivery.getByText("Apt 5")).toBeInTheDocument();
    expect(delivery.getByText("Ho Chi Minh, HCM 700000")).toBeInTheDocument();
    expect(delivery.queryByText("Vietnam")).not.toBeInTheDocument();
    expect(delivery.queryByText(new RegExp(D("notes")))).not.toBeInTheDocument();
  });

  it("names the country when it is not Vietnam, and shows the note of the order", async () => {
    await open(order({ note: "Gate code 1234", shippingAddress: { fullName: "Mai", phone: "1", addressLine1: "1 Rue", city: "Paris", country: "France" } }));

    const delivery = await card(new RegExp(D("shippingAddress")));
    expect(delivery.getByText("France")).toBeInTheDocument();
    expect(delivery.getByText(`${D("notes")} Gate code 1234`)).toBeInTheDocument();
  });

  it("for collection at the shop says who collects and where, with the map link", async () => {
    await open(order({ shippingMethod: "store-pickup", shippingFeeVnd: 0, shippingAddress: { fullName: "Lan", phone: "0909" } }));

    const pickup = await card(new RegExp(D("pickupContact")));
    expect(pickup.getByText("Lan")).toBeInTheDocument();
    expect(pickup.getByText(D("pickupAtStore"))).toBeInTheDocument();
    expect(pickup.getByRole("link", { name: CONTACT_ADDRESS })).toHaveAttribute("href", CONTACT_MAPS_URL);
    expect(screen.queryByRole("heading", { level: 2, name: new RegExp(D("shippingAddress")) })).not.toBeInTheDocument();
  });
});

describe("ORD-7E an address with parts missing", () => {
  it("has no delivery card when the order carries no address", async () => {
    await open(order({ shippingAddress: {} }));

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("heading", { level: 2, name: new RegExp(D("shippingAddress")) })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: new RegExp(D("pickupContact")) })).not.toBeInTheDocument();
  });

  it("shows only the lines that have a value", async () => {
    await open(order({ shippingAddress: { fullName: "Mai", city: "Hue" } }));

    const delivery = await card(new RegExp(D("shippingAddress")));
    expect(delivery.getByText("Hue")).toBeInTheDocument();
    expect(delivery.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("shows a city with only a postal code in the right shape", async () => {
    await open(order({ shippingAddress: { fullName: "Mai", city: "Hue", postalCode: "530000" } }));

    expect(await screen.findByText("Hue 530000")).toBeInTheDocument();
  });
});

describe("ORD-8 the lines and the money", () => {
  const lines = [
    orderItem({ id: "i1", productName: "Dress", quantity: 2, priceVnd: 350_000 }),
    orderItem({ id: "i2", productName: "Skirt", size: "L", color: "Blue", priceVnd: 500_000, product: productSummary({ id: "p2", category: { id: "c", slug: "bottoms", title: "B" }, subcategory: { id: "s", slug: "skirts", label: "S" } }) }),
  ];
  const itemsCard = () => card(/sản phẩm/);

  it("lists each line with its name (a link to the product), size, colour, quantity and unit price × quantity", async () => {
    await open(order({ items: lines, subtotalVnd: 1_200_000, totalVnd: 1_230_000 }));

    const summary = await itemsCard();
    expect(summary.getByRole("heading", { level: 2, name: "3 sản phẩm" })).toBeInTheDocument();
    const dress = summary.getAllByRole("link", { name: "Dress" });
    expect(dress.length).toBeGreaterThan(0);
    expect(dress[0]).toHaveAttribute("href", "/shop/tops/shirts/p1");
    for (const link of summary.getAllByRole("link", { name: "Skirt" })) expect(link).toHaveAttribute("href", "/shop/bottoms/skirts/p2");
    expect(summary.getByText("L · Blue · SL 1")).toBeInTheDocument();
    expect(summary.getByText("350.000 VNĐ × 2")).toBeInTheDocument();
    expect(summary.getByText("500.000 VNĐ × 1")).toBeInTheDocument();
  });

  it("shows the subtotal, the shipping fee with the name the shop gave the method, and the total", async () => {
    await open(order({ items: lines, subtotalVnd: 1_200_000, shippingFeeVnd: 30_000, totalVnd: 1_230_000 }));

    const summary = await itemsCard();
    expect(summary.getByText(D("subtotal")).nextElementSibling).toHaveTextContent("1.200.000 VNĐ");
    await waitFor(() => expect(summary.getByText(D("shipping")).closest("dt")).toHaveTextContent("(Giao tiêu chuẩn)"));
    expect(summary.getByText(D("shipping")).closest("dt")?.nextElementSibling).toHaveTextContent("30.000 VNĐ");
    expect(summary.getByText(D("total")).nextElementSibling).toHaveTextContent("1.230.000 VNĐ");
    expect(summary.getByRole("link", { name: D("continue") })).toHaveAttribute("href", "/shop");
  });

  it("shows dollars in English", async () => {
    await open(order({ items: lines, totalUsd: 47.31 }), {}, { locale: "en" });

    const summary = within((await screen.findByText("$13.46 × 2")).closest("section") as HTMLElement);
    expect(summary.getByText("$47.31")).toBeInTheDocument();
  });
});

describe("ORD-8E shipping and products that are not what they seem", () => {
  const shippingCell = async () => (await screen.findByText(D("shipping"))).closest("dt") as HTMLElement;

  it("says Free when the fee is 0", async () => {
    await open(order({ shippingFeeVnd: 0, totalVnd: 350_000 }));

    expect((await shippingCell()).nextElementSibling).toHaveTextContent(D("free"));
  });

  it("uses the translated name of the method until the shop's own names are loaded", async () => {
    await open(order({ shippingMethod: "express" }), { shipping: "error" });

    expect(await shippingCell()).toHaveTextContent(`(${D("shippingMethod.express")})`);
  });

  it("shows a method it does not know as the BE wrote it", async () => {
    await open(order({ shippingMethod: "drone" }));

    expect(await shippingCell()).toHaveTextContent("(drone)");
  });

  it("shows no method when the order has none", async () => {
    await open(order({ shippingMethod: "" }));

    expect((await shippingCell()).textContent).toBe(D("shipping"));
  });

  it("shows a line whose product was deleted as plain text, not a link", async () => {
    await open(order({ items: [orderItem({ product: null, productName: "Gone dress" })] }));

    expect((await screen.findByText("Gone dress")).closest("a")).toBeNull();
  });

  it("shows a line whose product has no category as plain text", async () => {
    await open(order({ items: [orderItem({ product: productSummary({ category: null }), productName: "Loose item" })] }));

    expect((await screen.findByText("Loose item")).closest("a")).toBeNull();
  });
});
