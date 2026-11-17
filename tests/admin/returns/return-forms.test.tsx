import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ApproveReturnModal from "@/src/app/[locale]/(admin)/admin/returns/_components/ApproveReturnModal";
import ReceiveReturnModal from "@/src/app/[locale]/(admin)/admin/returns/_components/ReceiveReturnModal";
import RejectReturnModal from "@/src/app/[locale]/(admin)/admin/returns/_components/RejectReturnModal";
import ReturnDetailPanel from "@/src/app/[locale]/(admin)/admin/returns/_components/ReturnDetailPanel";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { adminReturn, returnItem, returnsApi, type ReturnsApiOptions } from "./returns-kit";

/* The three forms that move a request along (specs/admin/returns.md, flows ARR-7 to ARR-9E). */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const form = () => screen.getByRole("heading", { level: 2 }).closest(".fixed") as HTMLElement;
const noteBox = () => form().querySelector("textarea") as HTMLTextAreaElement;
const cancel = () => within(form()).getByRole("button", { name: msg("admin.components.formKit.cancel") });

async function openModal(kind: "approve" | "reject" | "receive", api: ReturnsApiOptions = {}, request = adminReturn()) {
  const calls = returnsApi(api);
  const onClose = vi.fn();
  const onDone = vi.fn();
  const Modal = { approve: ApproveReturnModal, reject: RejectReturnModal, receive: ReceiveReturnModal }[kind];
  const view = await renderApp(<Modal request={request} onClose={onClose} onDone={onDone} />, { as: "adminFull" });
  return { calls, onClose, onDone, ...view };
}

describe("ARR-7 approving", () => {
  const A = (key: string) => msg(`admin.returns.approve.${key}`);
  const submit = () => within(form()).getByRole("button", { name: A("submit") });

  it("warns what approving allows, and sends no note when none is given", async () => {
    const { calls, onDone } = await openModal("approve", { action: adminReturn({ status: "APPROVED" }) });
    expect(within(form()).getByText(A("warning"))).toBeInTheDocument();

    await userEvent.click(submit());

    await waitFor(() => expect(calls.approves).toEqual([{ id: "r-1", body: {} }]));
    expect(await screen.findByText("Đã duyệt yêu cầu #r-1")).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ status: "APPROVED" }));
  });

  it("sends the shipping instructions without their spaces", async () => {
    const { calls } = await openModal("approve");
    await userEvent.type(noteBox(), "  Send to 1 Le Loi  ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.approves[0].body).toEqual({ note: "Send to 1 Le Loi" }));
  });

  it("treats a note of only spaces as none", async () => {
    const { calls } = await openModal("approve");
    await userEvent.type(noteBox(), "    ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.approves[0].body).toEqual({}));
  });

  it("limits the note and closes with Cancel", async () => {
    const { onClose } = await openModal("approve");

    expect(noteBox()).toHaveAttribute("maxlength", "500");
    await userEvent.click(cancel());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("explains a refusal in the BE's words (a changed request, code 1804) or its own, and keeps the form", async () => {
    const first = await openModal("approve", { action: { status: 409, body: { message: "server", errorCode: 1804 } } });
    await userEvent.click(submit());
    expect(await screen.findByText(msg("shared.errors.byCode.1804"))).toBeInTheDocument();
    expect(first.onDone).not.toHaveBeenCalled();
    first.unmount();

    await openModal("approve", { action: { status: 500, body: {} } });
    await userEvent.click(submit());
    expect(await screen.findByText(A("toast.failed"))).toBeInTheDocument();
  });
});

describe("ARR-8 rejecting", () => {
  const J = (key: string) => msg(`admin.returns.reject.${key}`);
  const submit = () => within(form()).getByRole("button", { name: J("submit") });

  it("asks for a reason, none or only spaces is refused, and nothing is sent", async () => {
    const { calls } = await openModal("reject");

    await userEvent.click(submit());
    await userEvent.type(noteBox(), "   ");
    await userEvent.click(submit());

    expect(within(form()).getByText(J("errors.note"))).toBeInTheDocument();
    expect(calls.rejects).toEqual([]);
  });

  it("sends the reason without its spaces, says so, and hands the updated request on", async () => {
    const { calls, onDone } = await openModal("reject", { action: adminReturn({ status: "REJECTED" }) });
    await userEvent.type(noteBox(), "  Worn item  ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.rejects).toEqual([{ id: "r-1", body: { note: "Worn item" } }]));
    expect(await screen.findByText("Đã từ chối yêu cầu #r-1")).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ status: "REJECTED" }));
  });

  it("takes the error away once a reason is given", async () => {
    await openModal("reject");
    await userEvent.click(submit());
    await userEvent.type(noteBox(), "Because");

    await userEvent.click(submit());

    await waitFor(() => expect(within(form()).queryByText(J("errors.note"))).not.toBeInTheDocument());
  });

  it("says why when refused, or its own words, and keeps the form", async () => {
    const first = await openModal("reject", { action: { status: 409, body: { message: "Already received" } } });
    await userEvent.type(noteBox(), "x");
    await userEvent.click(submit());
    expect(await screen.findByText("Already received")).toBeInTheDocument();
    expect(first.onDone).not.toHaveBeenCalled();
    first.unmount();

    await openModal("reject", { action: { status: 500, body: {} } });
    await userEvent.type(noteBox(), "x");
    await userEvent.click(submit());
    expect(await screen.findByText(J("toast.failed"))).toBeInTheDocument();
  });

  it("limits the reason, and closes with Cancel", async () => {
    const { onClose } = await openModal("reject");

    expect(noteBox()).toHaveAttribute("maxlength", "500");
    await userEvent.click(cancel());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ARR-9 receiving the parcel", () => {
  const V = (key: string) => msg(`admin.returns.receive.${key}`);
  const submit = () => within(form()).getByRole("button", { name: V("submit") });
  const request = adminReturn({ status: "APPROVED", items: [returnItem({ id: "ri-1", productName: "Silk dress", quantity: 2 }), returnItem({ id: "ri-2", productName: "Linen shirt", quantity: 1 })] });
  const box = (name: string) => within(form()).getByRole("textbox", { name: `Số lượng chấp nhận của ${name}` }) as HTMLInputElement;

  it("lists each line with how many the customer returns, each starting at everything asked for, and warns", async () => {
    await openModal("receive", {}, request);

    expect(within(form()).getByText(V("warning"))).toBeInTheDocument();
    expect(box("Silk dress")).toHaveValue("2");
    expect(box("Linen shirt")).toHaveValue("1");
    expect(within(form()).getByText(/khách trả 2/)).toBeInTheDocument();
    expect(within(form()).getByText(/khách trả 1/)).toBeInTheDocument();
  });

  it("sends the accepted quantity of each line and nothing about shipping or a note when left alone", async () => {
    const { calls } = await openModal("receive", {}, request);
    await userEvent.clear(box("Silk dress"));
    await userEvent.type(box("Silk dress"), "1");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.receives).toEqual([{ id: "r-1", body: { items: [{ returnItemId: "ri-1", acceptedQuantity: 1 }, { returnItemId: "ri-2", acceptedQuantity: 1 }] } }]));
  });

  it("sends the shipping refund flag only when ticked, and the note without its spaces", async () => {
    const { calls } = await openModal("receive", {}, request);
    await userEvent.click(within(form()).getByRole("checkbox"));
    await userEvent.type(noteBox(), "  Checked  ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.receives[0].body).toMatchObject({ refundShipping: true, note: "Checked" }));
  });

  it("shows the shipping fee beside the choice, and nothing when the order is gone", async () => {
    const view = await openModal("receive", {}, request);
    expect(within(form()).getByText("(30.000 VNĐ)")).toBeInTheDocument();
    view.unmount();

    await openModal("receive", {}, adminReturn({ status: "APPROVED", order: null }));
    expect(within(form()).queryByText(/\(30\.000/)).not.toBeInTheDocument();
  });

  it.each([
    ["a letter", "x"],
    ["a negative number", "-1"],
    ["a decimal", "1.5"],
    ["more than the customer returns", "3"],
    ["nothing", ""],
  ])("refuses %s as a quantity, marks the box and sends nothing", async (_label, text) => {
    const { calls } = await openModal("receive", {}, request);
    await userEvent.clear(box("Silk dress"));
    if (text) await userEvent.type(box("Silk dress"), text);

    await userEvent.click(submit());

    expect(within(form()).getByText(V("errors.invalid"))).toBeInTheDocument();
    expect(box("Silk dress").className).toContain("accent-rose");
    expect(calls.receives).toEqual([]);
  });

  it("refuses to accept nothing at all and points to 'reject'", async () => {
    const { calls } = await openModal("receive", {}, request);
    await userEvent.clear(box("Silk dress"));
    await userEvent.type(box("Silk dress"), "0");
    await userEvent.clear(box("Linen shirt"));
    await userEvent.type(box("Linen shirt"), "0");

    await userEvent.click(submit());

    expect(within(form()).getByText(V("errors.allZero"))).toBeInTheDocument();
    expect(calls.receives).toEqual([]);
  });

  it("accepts nothing for one line when another is accepted", async () => {
    const { calls } = await openModal("receive", {}, request);
    await userEvent.clear(box("Linen shirt"));
    await userEvent.type(box("Linen shirt"), "0");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.receives[0].body.items).toEqual([{ returnItemId: "ri-1", acceptedQuantity: 2 }, { returnItemId: "ri-2", acceptedQuantity: 0 }]));
  });

  it("takes the error away once the quantities are right", async () => {
    await openModal("receive", {}, request);
    await userEvent.clear(box("Silk dress"));
    await userEvent.click(submit());
    expect(within(form()).getByText(V("errors.invalid"))).toBeInTheDocument();

    await userEvent.type(box("Silk dress"), "1");
    await userEvent.click(submit());

    await waitFor(() => expect(within(form()).queryByText(V("errors.invalid"))).not.toBeInTheDocument());
  });

  it("says the refund amount when the BE opened one, and hands the updated request on", async () => {
    const updated = adminReturn({ status: "RECEIVED", refund: { id: "rf-1", amountVnd: 700_000, amountUsd: 26.92, status: "REQUESTED", bankReference: null, processedAt: null } });
    const { onDone } = await openModal("receive", { action: updated }, request);

    await userEvent.click(submit());

    expect(await screen.findByText("Đã nhận hàng của yêu cầu #r-1. Số tiền hoàn: 700.000 VNĐ")).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ status: "RECEIVED" }));
  });

  it("says only that the parcel was received when no refund came back", async () => {
    await openModal("receive", { action: adminReturn({ status: "RECEIVED", refund: null }) }, request);

    await userEvent.click(submit());

    expect(await screen.findByText("Đã nhận hàng của yêu cầu #r-1")).toBeInTheDocument();
  });

  it("explains a refusal in the BE's words, or its own, and keeps the form", async () => {
    const first = await openModal("receive", { action: { status: 400, body: { message: "Shipping already refunded", errorCode: 1805 } } }, request);
    await userEvent.click(submit());
    expect(await screen.findByText("Shipping already refunded")).toBeInTheDocument();
    expect(first.onDone).not.toHaveBeenCalled();
    first.unmount();

    await openModal("receive", { action: { status: 500, body: {} } }, request);
    await userEvent.click(submit());
    expect(await screen.findByText(V("toast.failed"))).toBeInTheDocument();
  });

  it("limits the note, and closes with Cancel", async () => {
    const { onClose } = await openModal("receive", {}, request);

    expect(noteBox()).toHaveAttribute("maxlength", "500");
    await userEvent.click(cancel());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ARR-9P the panel after an action", () => {
  it("closes the form and hands the updated request to the list", async () => {
    returnsApi({ action: adminReturn({ status: "APPROVED" }) });
    const onChanged = vi.fn();
    await renderApp(<ReturnDetailPanel request={adminReturn()} onClose={() => {}} onChanged={onChanged} />, { as: "adminFull" });
    await userEvent.click(screen.getByRole("button", { name: msg("admin.returns.detail.actions.approve") }));
    const modal = (await screen.findByRole("heading", { level: 2, name: msg("admin.returns.approve.title") })).closest(".fixed") as HTMLElement;

    await userEvent.click(within(modal).getByRole("button", { name: msg("admin.returns.approve.submit") }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "APPROVED" })));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: msg("admin.returns.approve.title") })).not.toBeInTheDocument());
    await wait(0);
  });
});
