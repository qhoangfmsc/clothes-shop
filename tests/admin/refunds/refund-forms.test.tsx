import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CompleteRefundModal from "@/src/app/[locale]/(admin)/admin/refunds/_components/CompleteRefundModal";
import OrderRefundBanner from "@/src/app/[locale]/(admin)/admin/refunds/_components/OrderRefundBanner";
import RefundBadge from "@/src/app/[locale]/(admin)/admin/refunds/_components/RefundBadge";
import RefundPaymentSource from "@/src/app/[locale]/(admin)/admin/refunds/_components/RefundPaymentSource";
import RejectRefundModal from "@/src/app/[locale]/(admin)/admin/refunds/_components/RejectRefundModal";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { refund, refundsApi, type RefundsApiOptions } from "./refunds-kit";

/* The forms that close a refund, the warning on a cancelled order, and the small parts (specs/admin/refunds.md, flows ARF-5 to ARF-9). */

const R = (key: string) => msg(`admin.refunds.${key}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const form = () => screen.getByRole("heading", { level: 2 }).closest(".fixed") as HTMLElement;
const noteBox = () => form().querySelector("textarea") as HTMLTextAreaElement;

async function openComplete(api: RefundsApiOptions = {}, item = refund()) {
  const calls = refundsApi(api);
  const onClose = vi.fn();
  const onDone = vi.fn();
  const view = await renderApp(<CompleteRefundModal refund={item} onClose={onClose} onDone={onDone} />, { as: "adminFull" });
  return { calls, onClose, onDone, ...view };
}
async function openReject(api: RefundsApiOptions = {}, item = refund()) {
  const calls = refundsApi(api);
  const onClose = vi.fn();
  const onDone = vi.fn();
  const view = await renderApp(<RejectRefundModal refund={item} onClose={onClose} onDone={onDone} />, { as: "adminFull" });
  return { calls, onClose, onDone, ...view };
}

describe("ARF-5 saying the money was sent back", () => {
  const submit = () => within(form()).getByRole("button", { name: R("complete.submit") });
  const referenceBox = () => form().querySelector("input.font-mono") as HTMLInputElement;

  it("warns to transfer first, and shows the amount, the order, the customer and where the money came from", async () => {
    await openComplete();

    expect(screen.getByRole("heading", { level: 2, name: R("complete.title") })).toBeInTheDocument();
    expect(within(form()).getByText(R("complete.warning"))).toBeInTheDocument();
    expect(within(form()).getByText("380.000 VNĐ", { selector: "span.text-lg" })).toBeInTheDocument();
    expect(within(form()).getByText("#o-1")).toBeInTheDocument();
    expect(within(form()).getByText("Mai Tran · 0901234567")).toBeInTheDocument();
    expect(within(form()).getByText("DHG29JR5A8")).toBeInTheDocument();
  });

  it("shows a dash for a customer without name or phone", async () => {
    await openComplete({}, refund({ order: { ...refund().order, customer: null } }));

    expect(within(form()).getByText("—")).toBeInTheDocument();
  });

  it("asks for the bank reference and a note, and sends nothing without them", async () => {
    const { calls } = await openComplete();

    await userEvent.click(submit());

    expect(within(form()).getByText(R("complete.errors.reference"))).toBeInTheDocument();
    expect(within(form()).getByText(R("complete.errors.note"))).toBeInTheDocument();
    expect(calls.completes).toEqual([]);
  });

  it("does not take a reference or a note made only of spaces", async () => {
    const { calls } = await openComplete();
    await userEvent.type(referenceBox(), "   ");
    await userEvent.type(noteBox(), "   ");

    await userEvent.click(submit());

    expect(within(form()).getByText(R("complete.errors.reference"))).toBeInTheDocument();
    expect(calls.completes).toEqual([]);
  });

  it("does not take a note of only spaces even when the reference is given", async () => {
    const { calls } = await openComplete();
    await userEvent.type(referenceBox(), "FT-9");
    await userEvent.type(noteBox(), "    ");

    await userEvent.click(submit());

    expect(within(form()).getByText(R("complete.errors.note"))).toBeInTheDocument();
    expect(within(form()).queryByText(R("complete.errors.reference"))).not.toBeInTheDocument();
    expect(calls.completes).toEqual([]);
  });

  it("sends the reference and the note without their spaces to that refund, says so and tells the caller", async () => {
    const { calls, onDone } = await openComplete();
    await userEvent.type(referenceBox(), " FT-9 ");
    await userEvent.type(noteBox(), "  Sent back  ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.completes).toEqual([{ id: "rf-1", body: { reference: "FT-9", note: "Sent back" } }]));
    expect(await screen.findByText("Đã ghi nhận hoàn tiền cho đơn #o-1")).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("limits the lengths the BE accepts", async () => {
    await openComplete();

    expect(referenceBox()).toHaveAttribute("maxlength", "64");
    expect(noteBox()).toHaveAttribute("maxlength", "500");
  });

  it.each([
    [1713, "shared.errors.byCode.1713"],
    [1714, "shared.errors.byCode.1714"],
  ])("explains error %s in the admin's words and keeps the form", async (errorCode, key) => {
    const { onDone } = await openComplete({ refuse: { status: 409, body: { message: "server", errorCode } } });
    await userEvent.type(referenceBox(), "FT-9");
    await userEvent.type(noteBox(), "ok");

    await userEvent.click(submit());

    expect(await screen.findByText(msg(key))).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 2, name: R("complete.title") })).toBeInTheDocument();
  });

  it("uses its own words when the BE says nothing", async () => {
    await openComplete({ refuse: { status: 500, body: {} } });
    await userEvent.type(referenceBox(), "FT-9");
    await userEvent.type(noteBox(), "ok");

    await userEvent.click(submit());

    expect(await screen.findByText(R("complete.toast.failed"))).toBeInTheDocument();
  });

  it("locks the button while the request is on its way, and closes with Cancel", async () => {
    const { server } = await import("@/tests/_support/msw-server");
    const { http, HttpResponse } = await import("msw");
    const { API } = await import("@/tests/_support/api");
    const { onClose } = await openComplete();
    let release!: () => void;
    server.use(http.post(`${API}/api/admin/refunds/:id/complete`, async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return HttpResponse.json({ data: refund() });
    }));
    await userEvent.type(referenceBox(), "FT-9");
    await userEvent.type(noteBox(), "ok");

    await userEvent.click(submit());
    expect(await within(form()).findByRole("button", { name: msg("admin.components.formKit.saving") })).toBeDisabled();
    release();
    await waitFor(() => expect(within(form()).getByRole("button", { name: R("complete.submit") })).toBeEnabled());
    await userEvent.click(within(form()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ARF-6 refusing to refund", () => {
  const submit = () => within(form()).getByRole("button", { name: R("reject.submit") });

  it("says what the refusal means for the order, with the amount", async () => {
    await openReject();

    expect(screen.getByRole("heading", { level: 2, name: R("reject.title") })).toBeInTheDocument();
    expect(within(form()).getByText(/Đơn #o-1 sẽ không được hoàn 380\.000 VNĐ\./)).toBeInTheDocument();
  });

  it("asks for a reason, and sends nothing without one or with only spaces", async () => {
    const { calls } = await openReject();

    await userEvent.click(submit());
    await userEvent.type(noteBox(), "   ");
    await userEvent.click(submit());

    expect(within(form()).getByText(R("reject.errors.note"))).toBeInTheDocument();
    expect(calls.rejects).toEqual([]);
  });

  it("sends the reason without its spaces to that refund, says so, and tells the caller", async () => {
    const { calls, onDone } = await openReject();
    await userEvent.type(noteBox(), "  Item was used  ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.rejects).toEqual([{ id: "rf-1", body: { note: "Item was used" } }]));
    expect(await screen.findByText("Đã từ chối hoàn tiền cho đơn #o-1")).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("takes the error away once a reason is given", async () => {
    await openReject();
    await userEvent.click(submit());
    expect(within(form()).getByText(R("reject.errors.note"))).toBeInTheDocument();

    await userEvent.type(noteBox(), "Because");
    await userEvent.click(submit());

    await waitFor(() => expect(within(form()).queryByText(R("reject.errors.note"))).not.toBeInTheDocument());
  });

  it("says the BE's reason when it refuses, or its own words, and keeps the form", async () => {
    const first = await openReject({ refuse: { status: 409, body: { message: "server", errorCode: 1713 } } });
    await userEvent.type(noteBox(), "x");
    await userEvent.click(submit());
    expect(await screen.findByText(msg("shared.errors.byCode.1713"))).toBeInTheDocument();
    expect(first.onDone).not.toHaveBeenCalled();
    first.unmount();

    await openReject({ refuse: { status: 500, body: {} } });
    await userEvent.type(noteBox(), "x");
    await userEvent.click(submit());
    expect(await screen.findByText(R("reject.toast.failed"))).toBeInTheDocument();
  });

  it("limits the note to what the BE accepts, and closes with Cancel", async () => {
    const { onClose } = await openReject();

    expect(noteBox()).toHaveAttribute("maxlength", "500");
    await userEvent.click(within(form()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("writes the amount in dollars in English", async () => {
    refundsApi();
    await renderApp(<RejectRefundModal refund={refund()} onClose={() => {}} onDone={() => {}} />, { as: "adminFull", locale: "en" });

    expect(within(form()).getByText(/\$14\.61/)).toBeInTheDocument();
  });
});

describe("ARF-7 the warning on a cancelled order", () => {
  const banner = (api: RefundsApiOptions = {}, as: Parameters<typeof renderApp>[1] extends infer O ? (O extends { as?: infer A } ? A : never) : never = "adminFull", orderId = "o-1") => {
    const calls = refundsApi(api);
    const onCreated = vi.fn();
    return renderApp(<OrderRefundBanner orderId={orderId} onCreated={onCreated} />, { as }).then((view) => ({ calls, onCreated, ...view }));
  };

  it("says no refund is waiting and offers to open one, when the BE counts none", async () => {
    const { calls } = await banner({ openCount: 0 });

    expect(await screen.findByRole("button", { name: R("banner.create") })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(R("banner.title"));
    expect(screen.getByText(R("banner.missing"))).toBeInTheDocument();
    expect(Object.fromEntries(calls.lists[0])).toEqual({ limit: "1", status: "REQUESTED", orderId: "o-1" });
  });

  it("says a refund is waiting, and offers no new one, when the BE counts some", async () => {
    await banner({ openCount: 2 });

    expect(await screen.findByText(R("banner.waiting"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: R("banner.create") })).not.toBeInTheDocument();
  });

  it("links to the refunds page for this order, the id made safe", async () => {
    await banner({ openCount: 1 }, "adminFull", "o 1");

    expect(await screen.findByRole("link", { name: R("banner.open") })).toHaveAttribute("href", "/admin/refunds?orderId=o%201");
  });

  it("offers no new request while it is still counting, or when it cannot count", async () => {
    const view = await banner({ openCount: "fail" });
    expect(await screen.findByText(R("banner.missing"))).toBeInTheDocument();
    await wait(100);
    expect(screen.queryByRole("button", { name: R("banner.create") })).not.toBeInTheDocument();
    view.unmount();
  });

  it("offers a new request only to an admin who may refund", async () => {
    await banner({ openCount: 0 }, adminWith(PERMISSIONS.PAYMENT_ADMIN_VIEW));

    expect(await screen.findByText(R("banner.missing"))).toBeInTheDocument();
    await wait(100);
    expect(screen.queryByRole("button", { name: R("banner.create") })).not.toBeInTheDocument();
  });

  it("opens the request for this order, says so, counts again and tells the caller", async () => {
    const { calls, onCreated } = await banner({ openCount: 0 });

    await userEvent.click(await screen.findByRole("button", { name: R("banner.create") }));

    await waitFor(() => expect(calls.creates).toEqual([{ orderId: "o-1" }]));
    expect(await screen.findByText("Đã tạo yêu cầu hoàn tiền cho đơn #o-1")).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(calls.lists.filter((p) => p.get("limit") === "1")).toHaveLength(2));
  });

  it("says why when the BE refuses, or its own words, and does not tell the caller", async () => {
    const first = await banner({ openCount: 0, refuse: { status: 409, body: { message: "Already open" } } });
    await userEvent.click(await screen.findByRole("button", { name: R("banner.create") }));
    expect(await screen.findByText("Already open")).toBeInTheDocument();
    expect(first.onCreated).not.toHaveBeenCalled();
    first.unmount();

    await banner({ openCount: 0, refuse: { status: 500, body: {} } });
    await userEvent.click(await screen.findByRole("button", { name: R("banner.create") }));
    expect(await screen.findByText(R("banner.createFailed"))).toBeInTheDocument();
  });

  it("works without a caller to tell", async () => {
    refundsApi({ openCount: 0 });
    await renderApp(<OrderRefundBanner orderId="o-1" />, { as: "adminFull" });

    await userEvent.click(await screen.findByRole("button", { name: R("banner.create") }));

    expect(await screen.findByText("Đã tạo yêu cầu hoàn tiền cho đơn #o-1")).toBeInTheDocument();
  });
});

describe("ARF-8 the small parts", () => {
  it.each(["REQUESTED", "COMPLETED", "REJECTED"])("names a %s refund in words", async (status) => {
    await renderApp(<RefundBadge status={status} />);

    expect(screen.getByText(R(`status.${status}`))).toBeInTheDocument();
  });

  it("shows a state it does not know as it is, in the quiet colour; waiting is honey, done is green", async () => {
    const unknown = await renderApp(<RefundBadge status="MYSTERY" />);
    expect(screen.getByText("MYSTERY").className).toContain("bg-[rgba(107,101,96,0.08)]");
    unknown.unmount();
    const waiting = await renderApp(<RefundBadge status="REQUESTED" />);
    expect(screen.getByText(R("status.REQUESTED")).className).toContain("honey");
    waiting.unmount();
    await renderApp(<RefundBadge status="COMPLETED" />);
    expect(screen.getByText(R("status.COMPLETED")).className).toContain("accent-sage");
  });

  it("shows where the money came from: code, reference, content, provider, amount paid and when", async () => {
    await renderApp(<RefundPaymentSource payment={refund().payment} />);

    expect(screen.getByText("DHG29JR5A8")).toBeInTheDocument();
    expect(screen.getByText("SP-1001")).toBeInTheDocument();
    expect(screen.getByText("DHG29JR5A8 thanh toan")).toBeInTheDocument();
    expect(screen.getByText(/^sepay · 380\.000 VNĐ · /)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Sao chép/ })).toHaveLength(2);
  });

  it("leaves out what is missing, with no stray dots", async () => {
    await renderApp(<RefundPaymentSource payment={{ ...refund().payment, provider: null, paidAt: null, transactionRef: null, transferContent: null }} />);

    expect(screen.getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Sao chép/ })).toHaveLength(1);
    expect(document.querySelector(".break-words")).toBeNull();
  });
});
