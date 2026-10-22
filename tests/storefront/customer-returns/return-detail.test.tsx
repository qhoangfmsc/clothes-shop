import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import ReturnDetailContent from "@/src/app/[locale]/(private)/returns/[returnId]/ReturnDetailContent";
import type { ReturnRequest } from "@/src/app/[locale]/(private)/returns/_common/types";
import { API } from "@/tests/_support/api";
import { returnRequest } from "@/tests/_support/fixtures";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import { returnsBackend, type ReturnsBackend } from "./returns-kit";

/* One return request's page (specs/storefront/customer-returns.md, flows RET-4 to RET-6E). */

const D = (key: string, locale: "vi" | "en" = "vi") => msg(`private.returns.detail.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  navigation.params = { returnId: "r-1" };
});

async function open(shown: ReturnRequest | null | number, options: ReturnsBackend = {}, view: { as?: "guest" | "user"; locale?: "vi" | "en"; waitForAuth?: boolean } = {}) {
  const calls = returnsBackend({ one: shown, ...options });
  const result = await renderApp(<ReturnDetailContent />, { as: view.as ?? "user", locale: view.locale, waitForAuth: view.waitForAuth });
  return { calls, ...result };
}

const card = async (title: string) => within((await screen.findByRole("heading", { level: 2, name: new RegExp(title) })).closest("section") as HTMLElement);
/** Each step of the progress bar as done (ticked), active (current) or todo. */
const steps = async () => {
  const list = await screen.findByRole("list", { name: msg("private.returns.status.progress") });
  return within(list)
    .getAllByRole("listitem")
    .map((li) => (li.getAttribute("aria-current") === "step" ? "active" : li.querySelector("svg") ? "done" : "todo"));
};

describe("RET-4 a visitor, and the wait before the request shows", () => {
  it("shows the sign-in wall to a visitor and asks the BE for nothing", async () => {
    const { calls } = await open(returnRequest(), {}, { as: "guest" });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    await wait(150);
    expect(calls.ones).toEqual([]);
  });

  it("shows only a placeholder until the request is there", async () => {
    await open(returnRequest(), {}, { waitForAuth: false });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: D("title") })).toBeInTheDocument();
  });

  it("asks for the request named in the address", async () => {
    navigation.params = { returnId: "r-9" };
    const { calls } = await open(returnRequest({ id: "r-9" }));

    await screen.findByRole("heading", { level: 1, name: D("title") });
    expect(calls.ones).toEqual(["r-9"]);
  });
});

describe("RET-4E a request that cannot be shown", () => {
  it("says it was not found, with a way back to the list, when the BE has none", async () => {
    await open(null);

    expect(await screen.findByText(D("notFound"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: D("back") })).toHaveAttribute("href", "/returns");
    expect(screen.queryByText(D("toast.loadFailed"))).not.toBeInTheDocument();
  });

  it("says it was not found and shows the BE's error when the request cannot be loaded (see the spec, section 7)", async () => {
    await open(500);

    expect(await screen.findByText(D("notFound"))).toBeInTheDocument();
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});

describe("RET-5 following a request", () => {
  it.each(["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED", "CANCELLED"] as const)("for a %s request shows the title, the state and its own explanation", async (status) => {
    await open(returnRequest({ status }));

    const title = await screen.findByRole("heading", { level: 1, name: D("title") });
    expect(within(title.parentElement as HTMLElement).getByText(msg(`private.returns.status.${status}`))).toBeInTheDocument();
    expect(screen.getByText(D(`hint.${status}`))).toBeInTheDocument();
  });

  it.each([
    ["REQUESTED", ["active", "todo", "todo", "todo"]],
    ["APPROVED", ["done", "active", "todo", "todo"]],
    ["RECEIVED", ["done", "done", "active", "todo"]],
    ["REFUNDED", ["done", "done", "done", "done"]],
  ])("a %s request has its progress bar at %j", async (status, expected) => {
    await open(returnRequest({ status: status as ReturnRequest["status"] }));

    expect(await steps()).toEqual(expected);
  });

  it("shows the day it was sent, its number and a link to the order", async () => {
    await open(returnRequest({ orderId: "o 3" }));

    await screen.findByRole("heading", { level: 1, name: D("title") });
    expect(screen.getByText(new RegExp(dateText("2026-03-10T05:00:00.000Z", "dateTime")))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(msgf("private.returns.detail.returnNumber", { id: "r-1" })))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: msgf("private.returns.detail.orderNumber", { id: "o 3" }) })).toHaveAttribute("href", "/orders/o%203");
  });

  it.each([
    ["APPROVED", "approved"],
    ["REJECTED", "rejected"],
    ["REQUESTED", "other"],
  ] as const)("titles the shop's reply for a %s request as %s, and shows its words", async (status, key) => {
    await open(returnRequest({ status, adminNote: "Post it to 12 Tran Hung Dao" }));

    const reply = await card(D(`adminNote.${key}`));
    expect(reply.getByText("Post it to 12 Tran Hung Dao")).toBeInTheDocument();
  });

  it("lists the lines with name, size and colour and the quantity to return, the reason and the shopper's own note", async () => {
    const items = [{ ...returnRequest().items[0], quantity: 2 }];
    await open(returnRequest({ items, note: "Zip is broken", reason: "DEFECTIVE" }));

    const lines = await card(D("items"));
    expect(lines.getByText("Dress")).toBeInTheDocument();
    expect(lines.getByText("M · Red")).toBeInTheDocument();
    expect(lines.getByText(msgf("private.returns.detail.quantity", { quantity: 2 }))).toBeInTheDocument();
    const reason = lines.getByText(D("reason")).nextElementSibling;
    expect(reason).toHaveTextContent(msg("private.returns.reason.DEFECTIVE"));
    expect(lines.getByText(D("note")).nextElementSibling).toHaveTextContent("Zip is broken");
  });

  it.each(["RECEIVED", "REFUNDED"] as const)("shows how many the shop accepted once a %s request has been checked", async (status) => {
    const items = [{ ...returnRequest().items[0], quantity: 2, acceptedQuantity: 1 }];
    await open(returnRequest({ status, items }));

    const lines = await card(D("items"));
    expect(lines.getByText(msgf("private.returns.detail.accepted", { quantity: 1 }))).toBeInTheDocument();
  });

  it("says a refund is expected, with the amount", async () => {
    await open(returnRequest({ status: "RECEIVED", refund: { amountVnd: 350_000, amountUsd: 13.46, status: "REQUESTED", bankReference: null, processedAt: null } }));

    const refund = await card(D("refund.title"));
    expect(refund.getByText(msgf("private.returns.detail.refund.REQUESTED", { amount: "350.000 VNĐ" }))).toBeInTheDocument();
  });

  it("says a refund was paid, with the amount, the bank's reference to copy, and when", async () => {
    await open(returnRequest({ status: "REFUNDED", refund: { amountVnd: 350_000, amountUsd: 13.46, status: "COMPLETED", bankReference: "BANK-9", processedAt: "2026-03-14T05:00:00.000Z" } }));

    const refund = await card(D("refund.title"));
    expect(refund.getByText(msgf("private.returns.detail.refund.COMPLETED", { amount: "350.000 VNĐ" }))).toBeInTheDocument();
    expect(refund.getByText(msgf("private.returns.detail.refund.reference", { ref: "BANK-9" }))).toBeInTheDocument();
    expect(refund.getByRole("button", { name: msgf("shared.feedback.copy.aria", { field: D("refund.referenceLabel") }) })).toBeInTheDocument();
    expect(refund.getByText(msgf("private.returns.detail.refund.processedAt", { date: dateText("2026-03-14T05:00:00.000Z", "dateTime") }))).toBeInTheDocument();
  });

  it("shows the refund in dollars in English", async () => {
    await open(returnRequest({ status: "REFUNDED", refund: { amountVnd: 350_000, amountUsd: 13.46, status: "COMPLETED", bankReference: null, processedAt: null } }), {}, { locale: "en" });

    const refund = await card(D("refund.title", "en"));
    expect(refund.getByText(msgf("private.returns.detail.refund.COMPLETED", { amount: "$13.46" }, "en"))).toBeInTheDocument();
  });
});

describe("RET-5E requests that say little", () => {
  it.each(["REJECTED", "CANCELLED"] as const)("a %s request has no progress bar", async (status) => {
    await open(returnRequest({ status }));

    await screen.findByRole("heading", { level: 1, name: D("title") });
    expect(screen.queryByRole("list", { name: msg("private.returns.status.progress") })).not.toBeInTheDocument();
  });

  it("has no card for the shop's reply when it wrote nothing", async () => {
    await open(returnRequest({ status: "APPROVED", adminNote: null }));

    await screen.findByRole("heading", { level: 1, name: D("title") });
    for (const key of ["approved", "rejected", "other"]) expect(screen.queryByRole("heading", { level: 2, name: D(`adminNote.${key}`) })).not.toBeInTheDocument();
  });

  it("shows no 'accepted' count before the parcel was checked, even if the BE sends one", async () => {
    const items = [{ ...returnRequest().items[0], acceptedQuantity: 1 }];
    await open(returnRequest({ status: "APPROVED", items }));

    await screen.findByRole("heading", { level: 1, name: D("title") });
    expect(screen.queryByText(/^Nhận/)).not.toBeInTheDocument();
  });

  it("shows no 'accepted' count when the shop has not given one yet", async () => {
    await open(returnRequest({ status: "RECEIVED" }));

    await screen.findByRole("heading", { level: 1, name: D("title") });
    expect(screen.queryByText(/^Nhận/)).not.toBeInTheDocument();
  });

  it("leaves out the shopper's note row when there is none", async () => {
    await open(returnRequest({ note: null }));

    const lines = await card(D("items"));
    expect(lines.queryByText(D("note"))).not.toBeInTheDocument();
  });

  it("says the shop will not refund when it refused, with no amount", async () => {
    await open(returnRequest({ status: "RECEIVED", refund: { amountVnd: 350_000, amountUsd: 13.46, status: "REJECTED", bankReference: "SHOULD-NOT-SHOW", processedAt: null } }));

    const refund = await card(D("refund.title"));
    expect(refund.getByText(D("refund.REJECTED"))).toBeInTheDocument();
    expect(refund.queryByText(/350\.000/)).not.toBeInTheDocument();
    expect(refund.queryByText(/SHOULD-NOT-SHOW/)).not.toBeInTheDocument();
  });

  it("shows no bank reference for a paid refund that has none", async () => {
    await open(returnRequest({ status: "REFUNDED", refund: { amountVnd: 350_000, amountUsd: 13.46, status: "COMPLETED", bankReference: null, processedAt: null } }));

    const refund = await card(D("refund.title"));
    expect(refund.queryByText(/Mã giao dịch/)).not.toBeInTheDocument();
    expect(refund.queryByText(/Xử lý lúc/)).not.toBeInTheDocument();
  });

  it("has no refund card when there is no refund", async () => {
    await open(returnRequest({ refund: null }));

    await screen.findByRole("heading", { level: 1, name: D("title") });
    expect(screen.queryByRole("heading", { level: 2, name: new RegExp(D("refund.title")) })).not.toBeInTheDocument();
  });
});

describe("RET-6 withdrawing a request", () => {
  it.each(["REQUESTED", "APPROVED"] as const)("a %s request can be cancelled: the shopper is asked, the BE is told, the request shows as cancelled", async (status) => {
    const { calls } = await open(returnRequest({ status }), { cancel: returnRequest({ status: "CANCELLED" }) });
    expect(await screen.findByText(D("cancel.hint"))).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: D("cancel.action") }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(D("cancel.confirm.message"));
    await userEvent.click(within(dialog).getByRole("button", { name: D("cancel.confirm.confirm") }));

    expect(await screen.findByText(D("cancel.done"))).toBeInTheDocument();
    expect(calls.cancels).toEqual(["r-1"]);
    expect(screen.getByText(D("hint.CANCELLED"))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: D("cancel.action") })).not.toBeInTheDocument());
    expect(screen.queryByRole("list", { name: msg("private.returns.status.progress") })).not.toBeInTheDocument();
  });
});

describe("RET-6E a cancel that is declined, refused or slow, and requests that cannot be cancelled", () => {
  const confirm = async () => userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: D("cancel.confirm.confirm") }));

  it("does nothing when the shopper says no", async () => {
    const { calls } = await open(returnRequest(), { cancel: returnRequest({ status: "CANCELLED" }) });

    await userEvent.click(await screen.findByRole("button", { name: D("cancel.action") }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await wait(100);
    expect(calls.cancels).toEqual([]);
  });

  it("says why when the BE refuses (the state changed meanwhile), and shows the request as it now is", async () => {
    const { calls } = await open(returnRequest({ status: "REQUESTED" }), { cancel: { status: 409, body: { message: "State changed", errorCode: 1804 } } });
    await userEvent.click(await screen.findByRole("button", { name: D("cancel.action") }));
    server.use(http.get(`${API}/api/returns/:id`, () => HttpResponse.json({ data: returnRequest({ status: "RECEIVED" }) })));

    await confirm();

    expect(await screen.findByText(msg("shared.errors.byCode.1804"))).toBeInTheDocument();
    expect(await screen.findByText(D("hint.RECEIVED"))).toBeInTheDocument();
    expect(calls.cancels).toHaveLength(1);
    await waitFor(() => expect(screen.queryByRole("button", { name: D("cancel.action") })).not.toBeInTheDocument());
  });

  it("shows the translated 'could not cancel' when the BE gives no words, and reads the request again", async () => {
    const { calls } = await open(returnRequest(), { cancel: { status: 500, body: {} } });
    await userEvent.click(await screen.findByRole("button", { name: D("cancel.action") }));

    await confirm();

    expect(await screen.findByText(D("cancel.failed"))).toBeInTheDocument();
    await waitFor(() => expect(calls.ones.length).toBe(2));
  });

  it("locks the button and says it is cancelling while the BE works", async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    const { calls } = await open(returnRequest());
    server.use(
      http.patch(`${API}/api/returns/:id/cancel`, async ({ params }) => {
        calls.cancels.push(String(params.id));
        await slow;
        return HttpResponse.json({ data: returnRequest({ status: "CANCELLED" }) });
      })
    );
    await userEvent.click(await screen.findByRole("button", { name: D("cancel.action") }));

    await confirm();

    const busy = await screen.findByRole("button", { name: D("cancel.cancelling") });
    expect(busy).toBeDisabled();
    await userEvent.click(busy);
    release();
    expect(await screen.findByText(D("cancel.done"))).toBeInTheDocument();
    expect(calls.cancels).toHaveLength(1);
  });

  it.each(["RECEIVED", "REFUNDED", "REJECTED", "CANCELLED"] as const)("a %s request has no cancel button", async (status) => {
    await open(returnRequest({ status }));

    await screen.findByRole("heading", { level: 1, name: D("title") });
    expect(screen.queryByRole("button", { name: D("cancel.action") })).not.toBeInTheDocument();
    expect(screen.queryByText(D("cancel.hint"))).not.toBeInTheDocument();
  });
});
