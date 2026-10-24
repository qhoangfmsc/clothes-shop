import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmPaymentModal from "@/src/app/[locale]/(admin)/admin/payments/_components/ConfirmPaymentModal";
import AttemptBadge from "@/src/app/[locale]/(admin)/admin/payments/_components/AttemptBadge";
import OrderPicker from "@/src/app/[locale]/(admin)/admin/payments/_components/OrderPicker";
import VerificationBadge from "@/src/app/[locale]/(admin)/admin/payments/_components/VerificationBadge";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { paymentsApi, transaction, unpaidOrder, type PaymentsApiOptions } from "./payments-kit";

/* The form that marks an order as paid, the order picker and the two badges (specs/admin/payments.md, flows APY-6 to APY-9E). */

const Y = (key: string) => msg(`admin.payments.confirm.${key}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MISMATCH = { status: 400, body: { message: "Received 300.000 VND, the code asks for 380.000 VND", errorCode: 1710 } };
const form = () => screen.getByRole("heading", { level: 2 }).closest(".fixed") as HTMLElement;
const noteBox = () => form().querySelector("textarea") as HTMLTextAreaElement;
const submit = () => within(form()).getByRole("button", { name: Y("submit") });
const codeBox = () => within(form()).getAllByRole("textbox").find((el) => el.className.includes("font-mono")) as HTMLInputElement;
const amountBox = () => form().querySelector('input[inputmode="numeric"]') as HTMLInputElement;

async function openForm(props: Partial<React.ComponentProps<typeof ConfirmPaymentModal>> = {}, api: PaymentsApiOptions = {}, as: "adminFull" | "adminLimited" = "adminFull") {
  const calls = paymentsApi(api);
  const onClose = vi.fn();
  const onConfirmed = vi.fn();
  const view = await renderApp(<ConfirmPaymentModal onClose={onClose} onConfirmed={onConfirmed} {...props} />, { as });
  return { calls, onClose, onConfirmed, ...view };
}

describe("APY-6 attaching a bank transaction to an order", () => {
  const tx = transaction({ id: "tx-5", providerTransactionId: "SP-77", transferContent: "chuyen khoan DHG", amountVnd: 380_000 });

  it("shows the transaction, offers the unpaid orders and asks for the reason", async () => {
    await openForm({ transaction: tx }, { orders: [unpaidOrder({ id: "o-5" })] });

    expect(screen.getByRole("heading", { level: 2, name: Y("titleAttach") })).toBeInTheDocument();
    expect(within(form()).getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(within(form()).getByText(msg("admin.payments.verification.UNMATCHED"))).toBeInTheDocument();
    expect(within(form()).getByText("chuyen khoan DHG")).toBeInTheDocument();
    expect(within(form()).getByText(/SP-77/)).toBeInTheDocument();
    expect(await within(form()).findByRole("radio", { name: /#o-5/ })).toBeInTheDocument();
    expect(within(form()).queryByText(Y("manual.section"))).not.toBeInTheDocument();
  });

  it("sends the transaction and the reason for the order that was picked, says so and tells the caller", async () => {
    const { calls, onConfirmed } = await openForm({ transaction: tx }, { orders: [unpaidOrder({ id: "o-5" })] });
    await userEvent.click(await within(form()).findByRole("radio", { name: /#o-5/ }));
    await userEvent.type(noteBox(), "  Checked the statement  ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.confirms).toEqual([{ orderId: "o-5", body: { transactionId: "tx-5", note: "Checked the statement" } }]));
    expect(await screen.findByText("Đơn #o-5 đã được xác nhận thanh toán")).toBeInTheDocument();
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("asks for an order and a reason, and sends nothing without them", async () => {
    const { calls } = await openForm({ transaction: tx }, { orders: [unpaidOrder({ id: "o-5" })] });
    await within(form()).findByRole("radio", { name: /#o-5/ });

    await userEvent.click(submit());

    expect(within(form()).getByText(Y("errors.order"))).toBeInTheDocument();
    expect(within(form()).getByText(Y("errors.note"))).toBeInTheDocument();
    expect(calls.confirms).toEqual([]);
  });

  it("does not take a reason made only of spaces", async () => {
    const { calls } = await openForm({ transaction: tx, fixedOrderId: "o-1" });
    await userEvent.type(noteBox(), "    ");

    await userEvent.click(submit());

    expect(within(form()).getByText(Y("errors.note"))).toBeInTheDocument();
    expect(calls.confirms).toEqual([]);
  });

  it("takes the errors away once the form is sent right", async () => {
    const { calls } = await openForm({ transaction: tx, fixedOrderId: "o-1" });
    await userEvent.click(submit());
    expect(within(form()).getByText(Y("errors.note"))).toBeInTheDocument();

    await userEvent.type(noteBox(), "ok");
    await userEvent.click(submit());

    await waitFor(() => expect(calls.confirms).toHaveLength(1));
    await waitFor(() => expect(within(form()).queryByText(Y("errors.note"))).not.toBeInTheDocument());
  });
});

describe("APY-7 recording a transaction by hand", () => {
  it("asks for the order, the transfer code, the amount and a reason", async () => {
    const { calls } = await openForm({}, { orders: [unpaidOrder()] });
    await within(form()).findByRole("radio", { name: /#o-1/ });

    await userEvent.click(submit());

    expect(screen.getByRole("heading", { level: 2, name: Y("titleManual") })).toBeInTheDocument();
    for (const key of ["order", "transferCode", "amount", "note"]) expect(within(form()).getByText(Y(`errors.${key}`))).toBeInTheDocument();
    expect(calls.confirms).toEqual([]);
  });

  it("sends the code in capitals and the whole-dong amount, and only the optional facts that were filled in", async () => {
    const { calls } = await openForm({}, { orders: [unpaidOrder({ id: "o-9" })] });
    await userEvent.click(await within(form()).findByRole("radio", { name: /#o-9/ }));
    await userEvent.type(codeBox(), " dhg11abc ");
    await userEvent.type(amountBox(), "380000");
    await userEvent.type(noteBox(), "Seen on the statement");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.confirms).toEqual([{ orderId: "o-9", body: { note: "Seen on the statement", transferCode: "DHG11ABC", amountVnd: 380_000 } }]));
  });

  it("sends the reference, the source and the statement text when they are given", async () => {
    const { calls } = await openForm({ fixedOrderId: "o-1" });
    await userEvent.type(codeBox(), "DHG11");
    await userEvent.type(amountBox(), "100000");
    await userEvent.type(noteBox(), "Because");
    await userEvent.click(within(form()).getByRole("button", { name: Y("manual.more") }));
    const [reference, content] = within(form()).getAllByRole("textbox").filter((el) => !el.className.includes("font-mono") && el.tagName === "INPUT" && (el as HTMLInputElement).inputMode !== "numeric");
    await userEvent.type(reference, " REF-1 ");
    await userEvent.selectOptions(within(form()).getByRole("combobox"), "manual");
    await userEvent.type(content, " statement text ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.confirms[0].body).toEqual({ note: "Because", transferCode: "DHG11", amountVnd: 100_000, reference: "REF-1", provider: "manual", transferContent: "statement text" }));
  });

  it("keeps the extra fields folded until asked, and the source offers default, SePay and manual", async () => {
    await openForm({ fixedOrderId: "o-1" });
    const more = within(form()).getByRole("button", { name: Y("manual.more") });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(within(form()).queryByRole("combobox")).not.toBeInTheDocument();

    await userEvent.click(more);

    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(within(within(form()).getByRole("combobox")).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "sepay", "manual"]);
    await userEvent.click(more);
    expect(within(form()).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("limits the lengths the BE accepts", async () => {
    await openForm({ fixedOrderId: "o-1" });
    await userEvent.click(within(form()).getByRole("button", { name: Y("manual.more") }));

    expect(noteBox()).toHaveAttribute("maxlength", "500");
    const inputs = within(form()).getAllByRole("textbox").filter((el) => el.tagName === "INPUT");
    expect(inputs.map((el) => el.getAttribute("maxlength")).filter(Boolean).sort()).toEqual(["500", "64"]);
  });

  it("refuses a zero amount", async () => {
    const { calls } = await openForm({ fixedOrderId: "o-1" });
    await userEvent.type(codeBox(), "DHG11");
    await userEvent.type(amountBox(), "0");
    await userEvent.type(noteBox(), "x");

    await userEvent.click(submit());

    expect(within(form()).getByText(Y("errors.amount"))).toBeInTheDocument();
    expect(calls.confirms).toEqual([]);
  });
});

describe("APY-7F opened from an order or from a code", () => {
  it("names the order and offers no picker when the order is known", async () => {
    const { calls } = await openForm({ fixedOrderId: "o-3" });

    expect(within(form()).getByText("#o-3")).toBeInTheDocument();
    expect(within(form()).queryByRole("radiogroup")).not.toBeInTheDocument();
    await wait(100);
    expect(calls.orders).toEqual([]);
  });

  it("fills in the code and the amount of a code, and locks the code", async () => {
    const { calls } = await openForm({ fixedOrderId: "o-3", lockedTransferCode: "DHG77", defaultAmountVnd: 380_000 });
    expect(codeBox()).toHaveValue("DHG77");
    expect(codeBox()).toHaveAttribute("readonly");
    expect(amountBox()).toHaveValue("380.000");
    await userEvent.type(noteBox(), "Seen");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.confirms[0]).toEqual({ orderId: "o-3", body: { note: "Seen", transferCode: "DHG77", amountVnd: 380_000 } }));
  });

  it("leaves the amount empty when no amount was suggested", async () => {
    await openForm({ fixedOrderId: "o-3" });

    expect(amountBox()).toHaveValue("");
  });
});

describe("APY-8E a payment that does not go through", () => {
  const filled = async (api: PaymentsApiOptions) => {
    const view = await openForm({ fixedOrderId: "o-1", lockedTransferCode: "DHG1", defaultAmountVnd: 300_000 }, api);
    await userEvent.type(noteBox(), "Seen");
    return view;
  };

  it("shows the BE's own message about the amounts and asks again; 'still confirm' sends it with the mismatch accepted", async () => {
    const { calls, onConfirmed } = await filled({ confirm: [MISMATCH, "ok"] });

    await userEvent.click(submit());

    const box = await screen.findByRole("alertdialog");
    expect(box).toHaveTextContent(Y("mismatch.title"));
    expect(box).toHaveTextContent("Received 300.000 VND, the code asks for 380.000 VND");
    expect(within(box).getByRole("button", { name: Y("mismatch.confirm") }).className).toContain("bg-[var(--accent-rose)]");
    await userEvent.click(within(box).getByRole("button", { name: Y("mismatch.confirm") }));

    await waitFor(() => expect(calls.confirms).toHaveLength(2));
    expect(calls.confirms[0].body).not.toHaveProperty("acceptAmountMismatch");
    expect(calls.confirms[1].body).toMatchObject({ acceptAmountMismatch: true, note: "Seen" });
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1));
  });

  it("sends nothing more when the admin does not accept the mismatch, and the form stays", async () => {
    const { calls, onConfirmed } = await filled({ confirm: [MISMATCH] });
    await userEvent.click(submit());

    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await wait(150);
    expect(calls.confirms).toHaveLength(1);
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 2, name: Y("titleManual") })).toBeInTheDocument();
  });

  it("does not ask twice: a mismatch refused again after being accepted is reported", async () => {
    const { calls } = await filled({ confirm: [MISMATCH, MISMATCH] });
    await userEvent.click(submit());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: Y("mismatch.confirm") }));

    await wait(400);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Received 300.000 VND, the code asks for 380.000 VND")).toBeInTheDocument();
    expect(calls.confirms).toHaveLength(2);
  });

  it("says the BE's reason for any other refusal, translating known codes, and keeps the form", async () => {
    const { onConfirmed } = await filled({ confirm: [{ status: 400, body: { message: "server words", errorCode: 1702 } }] });

    await userEvent.click(submit());

    expect(await screen.findByText(msg("shared.errors.byCode.1702"))).toBeInTheDocument();
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 2, name: Y("titleManual") })).toBeInTheDocument();
  });

  it("uses its own words when the BE says nothing", async () => {
    await filled({ confirm: [{ status: 500, body: {} }] });

    await userEvent.click(submit());

    expect(await screen.findByText(Y("toast.failed"))).toBeInTheDocument();
  });

  it("closes with Cancel and the X button", async () => {
    const { onClose } = await openForm({ fixedOrderId: "o-1" });

    await userEvent.click(within(form()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await userEvent.click(within(form()).getByRole("button", { name: msg("admin.components.formKit.close") }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("APY-9 picking the order", () => {
  const pick = (onChange = vi.fn(), value: string | null = null) => renderApp(<OrderPicker value={value} onChange={onChange} />, { as: "adminFull" });
  const P = (key: string) => msg(`admin.payments.picker.${key}`);

  it("asks for the ten newest unpaid orders and lists each with its number, customer, date and total", async () => {
    const calls = paymentsApi({ orders: [unpaidOrder({ id: "o-1", shippingAddress: { fullName: "Mai" }, totalVnd: 380_000 }), unpaidOrder({ id: "o-2", shippingAddress: {}, totalVnd: 100_000 })] });
    await pick();

    expect(await screen.findByRole("radio", { name: /#o-1/ })).toHaveTextContent("Mai");
    expect(screen.getByRole("radio", { name: /#o-2/ })).toHaveTextContent("—");
    expect(screen.getByRole("radio", { name: /#o-1/ })).toHaveTextContent("380.000 VNĐ");
    expect(Object.fromEntries(calls.orders[0])).toEqual({ sort: "-createdAt", limit: "10", paymentStatus: "unpaid" });
    expect(screen.getByRole("radiogroup", { name: P("title") })).toBeInTheDocument();
  });

  it("leaves out a cancelled order, since it cannot be paid", async () => {
    paymentsApi({ orders: [unpaidOrder({ id: "o-1" }), unpaidOrder({ id: "o-2", status: "cancelled" })] });
    await pick();

    await screen.findByRole("radio", { name: /#o-1/ });

    expect(screen.queryByRole("radio", { name: /#o-2/ })).not.toBeInTheDocument();
  });

  it("marks the chosen order and reports the order clicked", async () => {
    paymentsApi({ orders: [unpaidOrder({ id: "o-1" }), unpaidOrder({ id: "o-2" })] });
    const onChange = vi.fn();
    await pick(onChange, "o-2");

    expect(await screen.findByRole("radio", { name: /#o-2/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /#o-1/ })).toHaveAttribute("aria-checked", "false");
    await userEvent.click(screen.getByRole("radio", { name: /#o-1/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "o-1" }));
  });

  it("searches after the typing pauses, trimmed, and keeps only the newest answer", async () => {
    const calls = paymentsApi({ orders: [unpaidOrder()] });
    await pick();
    await screen.findByRole("radio", { name: /#o-1/ });

    await userEvent.type(screen.getByPlaceholderText(P("searchPlaceholder")), "  mai ");

    await waitFor(() => expect(calls.orders[calls.orders.length - 1].get("search")).toBe("mai"));
    expect(calls.orders[0].has("search")).toBe(false);
  });

  it("says there is nothing to pick, or that it could not load", async () => {
    paymentsApi({ orders: [] });
    const view = await pick();
    expect(await screen.findByText(P("empty"))).toBeInTheDocument();
    view.unmount();

    paymentsApi({ orders: "fail" });
    await pick();
    expect(await screen.findByText("no orders")).toBeInTheDocument();
  });

  it("uses its own words when the BE says nothing", async () => {
    const { server } = await import("@/tests/_support/msw-server");
    const { http, HttpResponse } = await import("msw");
    const { API } = await import("@/tests/_support/api");
    server.use(http.get(`${API}/api/admin/orders`, () => HttpResponse.json({}, { status: 500 })));
    await pick();

    expect(await screen.findByText(P("loadFailed"))).toBeInTheDocument();
  });

  it("shows 'searching' while the first answer is awaited", async () => {
    const { server } = await import("@/tests/_support/msw-server");
    const { http, HttpResponse } = await import("msw");
    const { API } = await import("@/tests/_support/api");
    let release!: () => void;
    server.use(http.get(`${API}/api/admin/orders`, async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return HttpResponse.json({ data: [] });
    }));
    await pick();

    expect(screen.getByText(P("loading"))).toBeInTheDocument();
    release();
    expect(await screen.findByText(P("empty"))).toBeInTheDocument();
  });
});

describe("APY-9B the badges", () => {
  it.each(["PENDING", "PAID", "EXPIRED", "CANCELLED"])("names a %s code in words", async (status) => {
    await renderApp(<AttemptBadge status={status} />);

    expect(screen.getByText(msg(`admin.payments.attempt.${status}`))).toBeInTheDocument();
  });

  it("shows a state it does not know as it is, in the quiet colour", async () => {
    await renderApp(<AttemptBadge status="MYSTERY" />);

    expect(screen.getByText("MYSTERY").className).toContain("bg-[rgba(107,101,96,0.08)]");
  });

  it("marks an expired code in rose, since a shopper may still have paid it", async () => {
    await renderApp(<AttemptBadge status="EXPIRED" />);

    expect(screen.getByText(msg("admin.payments.attempt.EXPIRED")).className).toContain("accent-rose");
  });

  it.each(["MATCHED", "MANUALLY_CONFIRMED", "UNMATCHED", "ACCOUNT_MISMATCH", "AMOUNT_MISMATCH", "LATE", "NOT_PAYABLE", "DUPLICATE_PAYMENT", "IGNORED"])("names a %s transaction in words", async (status) => {
    await renderApp(<VerificationBadge status={status} />);

    expect(screen.getByText(msg(`admin.payments.verification.${status}`))).toBeInTheDocument();
  });

  it("shows a result it does not know as it is, in the quiet colour", async () => {
    await renderApp(<VerificationBadge status="MYSTERY" />);

    expect(screen.getByText("MYSTERY").className).toContain("bg-[rgba(107,101,96,0.08)]");
  });

  it("a matched transaction is green and an unmatched one rose", async () => {
    const view = await renderApp(<VerificationBadge status="MATCHED" />);
    expect(screen.getByText(msg("admin.payments.verification.MATCHED")).className).toContain("accent-sage");
    view.unmount();
    await renderApp(<VerificationBadge status="UNMATCHED" />);
    expect(screen.getByText(msg("admin.payments.verification.UNMATCHED")).className).toContain("accent-rose");
  });
});
