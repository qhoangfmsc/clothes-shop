import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import OrderDetailPanel from "@/src/app/[locale]/_components/OrderDetailPanel";
import type { AdminOrder } from "@/src/hooks/use-admin-api";
import { API } from "@/tests/_support/api";
import { order, orderItem, productSummary, shippingInfo } from "@/tests/_support/fixtures";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* The order panel the admin pages share (specs/platform/ui-kit.md, flows UI-41 to UI-42E). */

const P = (key: string, locale: "vi" | "en" = "vi") => msg(`admin.components.orderDetailPanel.${key}`, locale);
const adminOrder = (over: Partial<AdminOrder> = {}): AdminOrder => ({ ...order(), userId: "u-1", ...over }) as unknown as AdminOrder;

function shipping(failing = false) {
  server.use(http.get(`${API}/api/shipping`, () => (failing ? HttpResponse.json({ message: "no" }, { status: 500 }) : HttpResponse.json({ data: shippingInfo() }))));
}

async function panel(over: Partial<AdminOrder> = {}, props: Partial<React.ComponentProps<typeof OrderDetailPanel>> = {}, view: { locale?: "vi" | "en" } = {}) {
  shipping();
  return renderApp(<OrderDetailPanel order={adminOrder(over)} onClose={() => {}} {...props} />, { as: "adminFull", locale: view.locale });
}

describe("UI-41 the order at a glance", () => {
  it("has the order number as its title and a close button", async () => {
    const onClose = vi.fn();
    await panel({ id: "o-77" }, { onClose });

    expect(screen.getByRole("heading", { level: 2, name: msgf("admin.components.orderDetailPanel.title", { id: "o-77" }) })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: P("close") }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"])("names a %s order's status in its own colour", async (status) => {
    await panel({ status: status as AdminOrder["status"] });

    const pill = screen.getByText(msg(`common.orderStatus.${status}`));
    expect(pill.className).toContain("rounded-full");
  });

  it("shows a status it does not know as it came, in a neutral colour", async () => {
    await panel({ status: "mystery" as AdminOrder["status"] });

    expect(screen.getByText("mystery").className).toContain("bg-[rgba(107,101,96,0.05)]");
  });

  it("shows whether it is paid, and the day and hour it was placed", async () => {
    await panel({ paymentStatus: "paid" });

    const row = screen.getByText(msg("common.orderPaymentStatus.paid")).closest("div") as HTMLElement;
    expect(row).toHaveTextContent(P("paymentStatus"));
    expect(screen.getByText(dateText("2026-03-05T05:00:00.000Z", "dateTime"))).toBeInTheDocument();
  });

  it("leaves out the payment line when the order has no payment status", async () => {
    const { container } = await panel({ paymentStatus: undefined as unknown as AdminOrder["paymentStatus"] });

    expect(container.querySelectorAll(".rounded-full")).toHaveLength(1);
    for (const status of ["unpaid", "paid", "refunded"]) expect(screen.queryByText(msg(`common.orderPaymentStatus.${status}`))).not.toBeInTheDocument();
  });

  it("shows only a spinner while the order is loading", async () => {
    const { container } = await panel({}, { loading: true });

    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByText(P("status"))).not.toBeInTheDocument();
    expect(screen.queryByText(P("shipping.title"))).not.toBeInTheDocument();
  });
});

describe("UI-41 the lines, delivery, totals and note", () => {
  it("counts the lines and shows each one's name (a link to the shop page in a new tab), size, colour, quantity and unit price", async () => {
    await panel({
      items: [
        orderItem({ productName: "Silk dress", size: "M", color: "Red", quantity: 2, priceVnd: 350_000, product: productSummary({ id: "p9", category: { slug: "women" }, subcategory: { slug: "dresses" } } as never) }),
        orderItem({ id: "oi-2", productName: "Old shirt", size: "", color: "", quantity: 1, priceVnd: 100_000, productImage: "", product: null }),
      ],
    });

    expect(screen.getByRole("heading", { level: 3, name: msgf("admin.components.orderDetailPanel.items", { count: 2 }) })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Silk dress" });
    expect(link).toHaveAttribute("href", "/shop/women/dresses/p9");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/Kích cỡ: M \/ Màu: Red — SL: 2/)).toBeInTheDocument();
    const line = link.closest(".flex.items-center.gap-3") as HTMLElement;
    expect(within(line).getByText("350.000 VNĐ")).toBeInTheDocument();
    expect(within(line).getByText("× 2")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Old shirt" })).not.toBeInTheDocument();
    expect(screen.getByText("Old shirt")).toBeInTheDocument();
    expect(screen.getByText(/SL: 1/)).toBeInTheDocument();
  });

  it("shows a size without a colour, and a colour without a size, without a stray slash", async () => {
    await panel({ items: [orderItem({ size: "L", color: "" }), orderItem({ id: "oi-2", size: "", color: "Blue" })] });

    expect(screen.getByText(/Kích cỡ: L — SL/)).toBeInTheDocument();
    expect(screen.getByText(/Màu: Blue — SL/)).toBeInTheDocument();
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });

  it("shows a picture only for lines that have one", async () => {
    const { container } = await panel({ items: [orderItem({ productImage: "/a.jpg" }), orderItem({ id: "oi-2", productImage: "" })] });

    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("names the delivery method the admin configured, or the raw value, or a dash", async () => {
    const configured = await panel({ shippingMethod: "express" });
    expect(await screen.findByText("Giao nhanh")).toBeInTheDocument();
    configured.unmount();

    const unknown = await panel({ shippingMethod: "drone" });
    expect(await screen.findByText("drone")).toBeInTheDocument();
    unknown.unmount();

    await panel({ shippingMethod: "" });
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows the raw method while the shipping list cannot be loaded", async () => {
    shipping(true);
    await renderApp(<OrderDetailPanel order={adminOrder({ shippingMethod: "standard" })} onClose={() => {}} />, { as: "adminFull" });

    expect(screen.getByText("standard")).toBeInTheDocument();
  });

  it("shows the address line by line with labels, and a field the app has no label for under its own name", async () => {
    await panel({ shippingAddress: { fullName: "Mai Tran", city: "Hue", landmark: "Next to the bank" } });

    expect(screen.getByText(`${msg("common.addressField.fullName")}:`)).toBeInTheDocument();
    expect(screen.getByText("Mai Tran")).toBeInTheDocument();
    expect(screen.getByText(`${msg("common.addressField.city")}:`)).toBeInTheDocument();
    expect(screen.getByText("landmark:")).toBeInTheDocument();
    expect(screen.getByText("Next to the bank")).toBeInTheDocument();
  });

  it("shows no address box when the order has none", async () => {
    await panel({ shippingAddress: undefined as unknown as AdminOrder["shippingAddress"] });

    expect(screen.queryByText(`${msg("common.addressField.fullName")}:`)).not.toBeInTheDocument();
    expect(screen.getByText(P("shipping.title"))).toBeInTheDocument();
  });

  it("adds up in the currency of the page: subtotal, shipping and total as the BE gave them", async () => {
    await panel({ subtotalVnd: 700_000, shippingFeeVnd: 0, totalVnd: 700_000 });

    const money = screen.getByRole("heading", { name: P("payment.title") }).parentElement as HTMLElement;
    expect(within(money).getByText(P("payment.subtotal")).nextElementSibling).toHaveTextContent("700.000 VNĐ");
    expect(within(money).getByText(P("payment.total")).nextElementSibling).toHaveTextContent("700.000 VNĐ");
  });

  it("uses dollars in English", async () => {
    await panel({}, {}, { locale: "en" });

    const money = screen.getByRole("heading", { name: P("payment.title", "en") }).parentElement as HTMLElement;
    expect(within(money).getByText(P("payment.total", "en")).nextElementSibling).toHaveTextContent("$14.61");
  });

  it("shows the customer's note, and leaves the space out when there is none", async () => {
    const view = await panel({ note: "Leave with the guard" });
    expect(screen.getByText(P("note"))).toBeInTheDocument();
    expect(screen.getByText("Leave with the guard")).toBeInTheDocument();
    view.unmount();

    await panel({ note: "" });
    expect(screen.queryByText(P("note"))).not.toBeInTheDocument();
  });
});

describe("UI-42 tabs, and the notice above", () => {
  it("has no tabs without a payment tab", async () => {
    await panel();

    expect(screen.queryByRole("button", { name: P("tabs.details") })).not.toBeInTheDocument();
  });

  it("with a payment tab, opens on the details and switches to the payment content and back", async () => {
    await panel({}, { paymentTab: <p>payment content</p> });
    expect(screen.queryByText("payment content")).not.toBeInTheDocument();
    expect(screen.getByText(P("shipping.title"))).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: P("tabs.payment") }));
    expect(screen.getByText("payment content")).toBeInTheDocument();
    expect(screen.queryByText(P("shipping.title"))).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: P("tabs.details") }));
    expect(screen.queryByText("payment content")).not.toBeInTheDocument();
    expect(screen.getByText(P("shipping.title"))).toBeInTheDocument();
  });

  it("shows the payment tab even while the order details are still loading", async () => {
    const { container } = await panel({}, { paymentTab: <p>payment content</p>, loading: true });
    expect(container.querySelector(".animate-spin")).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: P("tabs.payment") }));

    expect(screen.getByText("payment content")).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  it("shows the notice above the details, and above the payment tab as well", async () => {
    await panel({}, { notice: <p>cancelled but not refunded</p>, paymentTab: <p>payment content</p> });
    expect(screen.getByText("cancelled but not refunded")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: P("tabs.payment") }));

    expect(screen.getByText("cancelled but not refunded")).toBeInTheDocument();
  });
});
