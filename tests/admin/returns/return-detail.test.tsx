import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ReturnBadge from "@/src/app/[locale]/(admin)/admin/returns/_components/ReturnBadge";
import ReturnDetailPanel from "@/src/app/[locale]/(admin)/admin/returns/_components/ReturnDetailPanel";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { adminReturn, returnItem, returnsApi } from "./returns-kit";

/* One return request: what the panel shows and which actions its state allows (specs/admin/returns.md, flows ARR-5 to ARR-6P). */

const D = (key: string) => msg(`admin.returns.detail.${key}`);
type Identity = Parameters<typeof renderApp>[1] extends infer O ? (O extends { as?: infer A } ? A : never) : never;

async function open(request = adminReturn(), as: Identity = "adminFull", locale: "vi" | "en" = "vi") {
  returnsApi();
  const onClose = vi.fn();
  const onChanged = vi.fn();
  const view = await renderApp(<ReturnDetailPanel request={request} onClose={onClose} onChanged={onChanged} />, { as, locale });
  return { onClose, onChanged, ...view };
}
const section = (title: string) => screen.getByText(title).closest("fieldset") as HTMLElement;

describe("ARR-5 what the panel shows", () => {
  it("shows the request: state, time, reason, and the customer's note and the shop's reply when there are some", async () => {
    await open(adminReturn({ note: "Too small", adminNote: "Send it to the shop", approvedAt: "2026-03-06T05:00:00.000Z", receivedAt: "2026-03-08T05:00:00.000Z", status: "RECEIVED" }));
    const request = within(section(D("request.section")));

    expect(screen.getByRole("heading", { level: 2, name: "Yêu cầu trả hàng #r-1" })).toBeInTheDocument();
    expect(request.getByText(msg("admin.returns.status.RECEIVED"))).toBeInTheDocument();
    expect(request.getByText(msg("admin.returns.reason.WRONG_SIZE"))).toBeInTheDocument();
    expect(request.getByText("Too small")).toBeInTheDocument();
    expect(request.getByText("Send it to the shop")).toBeInTheDocument();
    expect(request.getByText(D("request.approvedAt"))).toBeInTheDocument();
    expect(request.getByText(D("request.receivedAt"))).toBeInTheDocument();
  });

  it("leaves out the rows it has nothing for", async () => {
    await open(adminReturn());
    const request = within(section(D("request.section")));

    for (const key of ["note", "adminNote", "approvedAt", "receivedAt"]) expect(request.queryByText(D(`request.${key}`))).not.toBeInTheDocument();
  });

  it("shows the order: link, customer, total, shipping fee, delivery time and payment", async () => {
    await open();
    const order = within(section(D("order.section")));

    expect(order.getByRole("link", { name: "#o-1" })).toHaveAttribute("href", "/admin/orders?orderId=o-1");
    expect(order.getByText("Mai Tran · 0901234567")).toBeInTheDocument();
    expect(order.getByText("730.000 VNĐ")).toBeInTheDocument();
    expect(order.getByText("30.000 VNĐ")).toBeInTheDocument();
    expect(order.getByText(msg("common.orderPaymentStatus.paid"))).toBeInTheDocument();
  });

  it("shows a dash for a customer with no name or phone and for an order not yet delivered; makes the order id safe in the link", async () => {
    await open(adminReturn({ orderId: "o 1", order: { ...adminReturn().order!, id: "o 1", customer: { fullName: null, phone: null }, deliveredAt: null } }));
    const order = within(section(D("order.section")));

    expect(order.getByRole("link", { name: "#o 1" })).toHaveAttribute("href", "/admin/orders?orderId=o%201");
    expect(order.getAllByText("—")).toHaveLength(2);
  });

  it("leaves out the order section when the order is gone", async () => {
    await open(adminReturn({ order: null }));

    expect(screen.queryByText(D("order.section"))).not.toBeInTheDocument();
  });

  it("lists the lines: name, size and colour, unit price, how many the customer returns and how many the shop took", async () => {
    await open(adminReturn({ status: "RECEIVED", items: [returnItem({ acceptedQuantity: 1 }), returnItem({ id: "ri-2", productName: "Old shirt", size: null, color: null, priceVnd: null, priceUsd: null, quantity: 1, acceptedQuantity: null })] }));
    const items = within(section(D("items.section")));

    expect(items.getByText("Silk dress")).toBeInTheDocument();
    expect(items.getByText(/M · Red · 350\.000 VNĐ/)).toBeInTheDocument();
    expect(items.getByText("Khách trả 2")).toBeInTheDocument();
    expect(items.getByText("Nhận 1")).toBeInTheDocument();
    expect(items.getByText("Old shirt")).toBeInTheDocument();
    expect(items.getAllByText(/^Khách trả/)).toHaveLength(2);
    expect(items.getAllByText(/^Nhận/)).toHaveLength(1);
    expect(items.getByText("Old shirt").nextElementSibling).toHaveTextContent(/^$/);
  });

  it("shows the refund box with the amount, its state, the bank reference with a copy button, and a note when shipping went back too", async () => {
    await open(adminReturn({ status: "REFUNDED", shippingRefunded: true, refund: { id: "rf-1", amountVnd: 380_000, amountUsd: 14.61, status: "COMPLETED", bankReference: "FT-9", processedAt: "2026-03-09T05:00:00.000Z" } }));

    expect(screen.getByText(D("refund.expected"))).toBeInTheDocument();
    expect(screen.getByText("380.000 VNĐ", { selector: "span.text-xl" })).toBeInTheDocument();
    expect(screen.getByText(msg("admin.refunds.status.COMPLETED"))).toBeInTheDocument();
    expect(screen.getByText("Mã giao dịch hoàn: FT-9")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Sao chép ${D("refund.referenceLabel")}` })).toBeInTheDocument();
    expect(screen.getByText(D("refund.withShipping"))).toBeInTheDocument();
  });

  it("shows no refund box before a refund exists, and no reference or shipping note when there is none", async () => {
    await open(adminReturn({ refund: null }));
    expect(screen.queryByText(D("refund.expected"))).not.toBeInTheDocument();
  });

  it("leaves out the reference and the shipping note of a refund that has neither", async () => {
    await open(adminReturn({ status: "RECEIVED", refund: { id: "rf-1", amountVnd: 100_000, amountUsd: 3.85, status: "REQUESTED", bankReference: null, processedAt: null } }));

    expect(screen.getByText(D("refund.expected"))).toBeInTheDocument();
    expect(screen.queryByText(/Mã giao dịch hoàn/)).not.toBeInTheDocument();
    expect(screen.queryByText(D("refund.withShipping"))).not.toBeInTheDocument();
  });

  it("links to the refunds screen for this order only for an admin who may view payments, the id made safe", async () => {
    const refundBox = { id: "rf-1", amountVnd: 1, amountUsd: 1, status: "REQUESTED" as const, bankReference: null, processedAt: null };
    const view = await open(adminReturn({ orderId: "o 1", status: "RECEIVED", refund: refundBox }));
    expect(screen.getByRole("link", { name: D("refund.open") })).toHaveAttribute("href", "/admin/refunds?orderId=o%201");
    view.unmount();

    await open(adminReturn({ status: "RECEIVED", refund: refundBox }), "adminLimited");
    expect(screen.queryByRole("link", { name: D("refund.open") })).not.toBeInTheDocument();
  });

  it("does not take viewing returns for viewing payments, nor the other way round", async () => {
    const refundBox = { id: "rf-1", amountVnd: 1, amountUsd: 1, status: "REQUESTED" as const, bankReference: null, processedAt: null };
    const viewReturns = await open(adminReturn({ status: "RECEIVED", refund: refundBox }), adminWith(PERMISSIONS.RETURN_ADMIN_VIEW));
    expect(screen.queryByRole("link", { name: D("refund.open") })).not.toBeInTheDocument();
    viewReturns.unmount();

    await open(adminReturn({ status: "RECEIVED", refund: refundBox }), adminWith(PERMISSIONS.PAYMENT_ADMIN_VIEW));
    expect(screen.getByRole("link", { name: D("refund.open") })).toBeInTheDocument();
  });

  it("closes with the X button", async () => {
    const { onClose } = await open();

    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.formKit.close") }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reads in English in English", async () => {
    await open(adminReturn(), "adminFull", "en");

    expect(screen.getByText("$28.08")).toBeInTheDocument();
  });
});

describe("ARR-6 the actions a state allows", () => {
  const buttons = () => ({ approve: screen.queryByRole("button", { name: D("actions.approve") }), reject: screen.queryByRole("button", { name: D("actions.reject") }), receive: screen.queryByRole("button", { name: D("actions.receive") }) });

  it("a request waiting for a decision can be approved or rejected", async () => {
    await open(adminReturn({ status: "REQUESTED" }));

    const b = buttons();
    expect(b.approve).toBeInTheDocument();
    expect(b.reject).toBeInTheDocument();
    expect(b.receive).not.toBeInTheDocument();
  });

  it("an approved request can be received or rejected, not approved again", async () => {
    await open(adminReturn({ status: "APPROVED" }));

    const b = buttons();
    expect(b.receive).toBeInTheDocument();
    expect(b.reject).toBeInTheDocument();
    expect(b.approve).not.toBeInTheDocument();
  });

  it.each(["RECEIVED", "REFUNDED", "REJECTED", "CANCELLED"] as const)("a %s request has no action", async (status) => {
    await open(adminReturn({ status }));

    expect(buttons()).toEqual({ approve: null, reject: null, receive: null });
    expect(document.querySelector(".flex-wrap.justify-end")).toBeNull();
  });

  it("opens the matching form for each button, and closes it with Cancel", async () => {
    await open(adminReturn({ status: "REQUESTED" }));

    await userEvent.click(buttons().approve!);
    expect(await screen.findByRole("heading", { level: 2, name: msg("admin.returns.approve.title") })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await userEvent.click(buttons().reject!);

    expect(await screen.findByRole("heading", { level: 2, name: msg("admin.returns.reject.title") })).toBeInTheDocument();
  });

  it("opens the receiving form for an approved request", async () => {
    await open(adminReturn({ status: "APPROVED" }));

    await userEvent.click(buttons().receive!);

    expect(await screen.findByRole("heading", { level: 2, name: msg("admin.returns.receive.title") })).toBeInTheDocument();
  });

  it("gives the actions only to an admin who may process returns", async () => {
    await open(adminReturn({ status: "REQUESTED" }), adminWith(PERMISSIONS.RETURN_ADMIN_VIEW));

    expect(buttons()).toEqual({ approve: null, reject: null, receive: null });
  });

  it("gives the actions to an admin who may process returns", async () => {
    await open(adminReturn({ status: "REQUESTED" }), adminWith(PERMISSIONS.RETURN_ADMIN_VIEW, PERMISSIONS.RETURN_ADMIN_PROCESS));

    expect(buttons().approve).toBeInTheDocument();
  });

  it("gives an admin who may only view orders no action", async () => {
    await open(adminReturn({ status: "REQUESTED" }), "adminLimited");

    expect(buttons()).toEqual({ approve: null, reject: null, receive: null });
  });
});

describe("ARR-6B the badge", () => {
  it.each(["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED", "CANCELLED"])("names a %s request in words", async (status) => {
    await renderApp(<ReturnBadge status={status} />);

    expect(screen.getByText(msg(`admin.returns.status.${status}`))).toBeInTheDocument();
  });

  it("shows a state it does not know as it is, in the quiet colour; rejected is rose and refunded green", async () => {
    const unknown = await renderApp(<ReturnBadge status="MYSTERY" />);
    expect(screen.getByText("MYSTERY").className).toContain("bg-[rgba(107,101,96,0.08)]");
    unknown.unmount();
    const rejected = await renderApp(<ReturnBadge status="REJECTED" />);
    expect(screen.getByText(msg("admin.returns.status.REJECTED")).className).toContain("accent-rose");
    rejected.unmount();
    await renderApp(<ReturnBadge status="REFUNDED" />);
    expect(screen.getByText(msg("admin.returns.status.REFUNDED")).className).toContain("accent-sage");
  });

  it("gives a received request its own colour", async () => {
    await renderApp(<ReturnBadge status="RECEIVED" />);

    expect(screen.getByText(msg("admin.returns.status.RECEIVED")).className).toContain("accent-lavender");
  });
});
