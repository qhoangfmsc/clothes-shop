import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import OrderPaymentTab from "@/src/app/[locale]/(admin)/admin/payments/_components/OrderPaymentTab";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { attempt, overview, paymentsApi, qrSession, transaction, type PaymentsApiOptions } from "./payments-kit";

/* The payment tab of an order: state, codes, transactions, making a QR and waiting for the money (specs/admin/payments.md, flows APY-10 to APY-13E). */

const T = (key: string) => msg(`admin.payments.orderTab.${key}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
afterEach(() => vi.useRealTimers());

async function openTab(api: PaymentsApiOptions = {}, as: Parameters<typeof renderApp>[1] extends infer O ? (O extends { as?: infer A } ? A : never) : never = "adminFull") {
  const calls = paymentsApi(api);
  const onChanged = vi.fn();
  const view = await renderApp(<OrderPaymentTab orderId="o-1" onChanged={onChanged} />, { as });
  return { calls, onChanged, ...view };
}
const row = (label: string) => screen.getByText(label).closest("div") as HTMLElement;

describe("APY-10 what the tab shows", () => {
  it("shows a spinner first, then the state of the order, its total and its customer", async () => {
    const { container } = await openTab({ overview: overview({ paymentStatus: "unpaid" }) });
    expect(container.querySelector(".animate-spin")).not.toBeNull();

    expect(await screen.findByText(T("paymentStatus"))).toBeInTheDocument();
    expect(within(row(T("paymentStatus"))).getByText(msg("common.orderPaymentStatus.unpaid"))).toBeInTheDocument();
    expect(within(row(T("total"))).getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(within(row(T("customer"))).getByText("Mai Tran · 0901234567")).toBeInTheDocument();
    expect(screen.queryByText(T("paidAt"))).not.toBeInTheDocument();
  });

  it("shows when the order was paid, and a dash for a customer without name or phone", async () => {
    await openTab({ overview: overview({ paymentStatus: "paid", paidAt: "2026-03-06T05:00:00.000Z", customer: null }) });

    expect(await screen.findByText(T("paidAt"))).toBeInTheDocument();
    expect(within(row(T("customer"))).getByText("—")).toBeInTheDocument();
  });

  it("shows only the name when the phone is missing", async () => {
    await openTab({ overview: overview({ customer: { fullName: "Mai", phone: null } }) });

    expect(await screen.findByText("Mai")).toBeInTheDocument();
  });

  it("lists the codes with their state, amount, times and a copy button, and says when there are none", async () => {
    const view = await openTab({ overview: overview({}, { attempts: [attempt({ id: "a1", transferCode: "CODE1", status: "EXPIRED", paidAt: null }), attempt({ id: "a2", transferCode: "CODE2", status: "PAID", paidAt: "2026-03-05T06:00:00.000Z" })] }) });

    expect(await screen.findByText("CODE1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Phiên thanh toán (2)" })).toBeInTheDocument();
    expect(screen.getByText(msg("admin.payments.attempt.EXPIRED"))).toBeInTheDocument();
    expect(screen.getAllByText(/^Hết hạn:/)).toHaveLength(2);
    expect(screen.getAllByText(/^Tạo:/)).toHaveLength(2);
    expect(screen.getAllByText(/^Trả:/)).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Sao chép Nội dung chuyển khoản/ })).toHaveLength(2);
    view.unmount();

    await openTab({ overview: overview() });
    expect(await screen.findByText(T("noAttempts"))).toBeInTheDocument();
    expect(screen.getByText(T("noTransactions"))).toBeInTheDocument();
  });

  it("lists the bank transactions with amount, result, content, reference and note", async () => {
    await openTab({ overview: overview({}, { transactions: [transaction({ id: "t1", confirmNote: "Seen on statement", verificationStatus: "MANUALLY_CONFIRMED" }), transaction({ id: "t2", providerTransactionId: "SP-2", transferContent: "" })] }) });

    expect(await screen.findByRole("heading", { level: 3, name: "Giao dịch (2)" })).toBeInTheDocument();
    expect(screen.getByText("Ghi chú: Seen on statement")).toBeInTheDocument();
    expect(screen.getByText("SP-1001")).toBeInTheDocument();
    expect(screen.getByText(msg("admin.payments.verification.MANUALLY_CONFIRMED"))).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Sao chép Mã giao dịch/ })).toHaveLength(2);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("APY-10E the tab cannot load", () => {
  it("says the BE's reason, or its own words", async () => {
    const first = await openTab({ overview: 404 });
    expect(await screen.findByText("no")).toBeInTheDocument();
    first.unmount();

    const { server } = await import("@/tests/_support/msw-server");
    const { http, HttpResponse } = await import("msw");
    const { API } = await import("@/tests/_support/api");
    server.use(http.get(`${API}/api/admin/payments/orders/:id`, () => HttpResponse.json({}, { status: 500 })));
    await renderApp(<OrderPaymentTab orderId="o-1" onChanged={() => {}} />, { as: "adminFull" });
    expect(await screen.findByText(T("loadFailed"))).toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s nothing of the order", async (_label, as, deny) => {
    const { server } = await import("@/tests/_support/msw-server");
    const { http, HttpResponse } = await import("msw");
    const { API } = await import("@/tests/_support/api");
    server.use(http.get(`${API}/api/admin/payments/orders/:id`, () => HttpResponse.json({ message: "denied" }, { status: deny })));
    const { container } = await renderApp(<OrderPaymentTab orderId="o-1" onChanged={() => {}} />, { as });

    await waitFor(() => expect(container.querySelector(".animate-spin")).toBeNull());
    expect(container.querySelector("p.text-\\[var\\(--accent-rose\\)\\]")).not.toBeNull();
    expect(screen.queryByText(T("paymentStatus"))).not.toBeInTheDocument();
  });
});

describe("APY-11 who may do what to an unpaid order", () => {
  it("gives an admin with every permission both buttons", async () => {
    await openTab({ overview: overview() });

    expect(await screen.findByRole("button", { name: T("qr.create") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: T("confirmPaid") })).toBeInTheDocument();
  });

  it("gives an admin who may only view payments no buttons at all", async () => {
    await openTab({ overview: overview({}, { attempts: [attempt()], transactions: [transaction()] }) }, adminWith(PERMISSIONS.PAYMENT_ADMIN_VIEW));
    await screen.findByText(T("paymentStatus"));

    expect(screen.queryByRole("button", { name: T("qr.create") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: T("confirmPaid") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: T("confirmCode") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: T("attachHere") })).not.toBeInTheDocument();
  });

  it.each([
    ["create the QR", PERMISSIONS.PAYMENT_ADMIN_CREATE_QR, { qr: true, confirm: false }],
    ["confirm payments", PERMISSIONS.PAYMENT_ADMIN_CONFIRM, { qr: false, confirm: true }],
  ] as const)("shows only what the permission to %s allows", async (_label, permission, expected) => {
    await openTab({ overview: overview() }, adminWith(PERMISSIONS.PAYMENT_ADMIN_VIEW, permission));
    await screen.findByText(T("paymentStatus"));

    expect(screen.queryByRole("button", { name: T("qr.create") }) !== null).toBe(expected.qr);
    expect(screen.queryByRole("button", { name: T("confirmPaid") }) !== null).toBe(expected.confirm);
  });

  it.each([
    ["paid", { paymentStatus: "paid" as const }],
    ["refunded", { paymentStatus: "refunded" as const }],
  ])("offers nothing for an order that is %s", async (_label, over) => {
    await openTab({ overview: overview(over, { attempts: [attempt({ status: "EXPIRED" })], transactions: [transaction()] }) });
    await screen.findByText(T("paymentStatus"));

    for (const name of [T("qr.create"), T("confirmPaid"), T("confirmCode"), T("attachHere")]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("offers no QR for a cancelled order, but still lets the money be matched", async () => {
    await openTab({ overview: overview({ status: "cancelled" }, { attempts: [attempt({ status: "EXPIRED" })] }) });
    await screen.findByText(T("paymentStatus"));

    expect(screen.queryByRole("button", { name: T("qr.create") })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: T("confirmPaid") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: T("confirmCode") })).not.toBeInTheDocument();
  });

  it("offers to confirm a code, but not a code that is already paid", async () => {
    await openTab({ overview: overview({}, { attempts: [attempt({ id: "a1", transferCode: "OPEN1", status: "PENDING" }), attempt({ id: "a2", transferCode: "DONE2", status: "PAID" })] }) });
    await screen.findByText("OPEN1");

    expect(screen.getAllByRole("button", { name: T("confirmCode") })).toHaveLength(1);
  });

  it.each(["UNMATCHED", "AMOUNT_MISMATCH", "LATE", "NOT_PAYABLE"])("offers to attach a %s transaction, and nothing else", async (status) => {
    await openTab({ overview: overview({}, { transactions: [transaction({ verificationStatus: status as never })] }) });
    await screen.findByText("SP-1001");

    expect(screen.getByRole("button", { name: T("attachHere") })).toBeInTheDocument();
  });

  it("does not offer to attach a matched transaction", async () => {
    await openTab({ overview: overview({}, { transactions: [transaction({ verificationStatus: "MATCHED" })] }) });
    await screen.findByText("SP-1001");

    expect(screen.queryByRole("button", { name: T("attachHere") })).not.toBeInTheDocument();
  });
});

describe("APY-11C confirming from the tab", () => {
  it("opens the form for this order, with a code's text and amount when it comes from a code", async () => {
    await openTab({ overview: overview({}, { attempts: [attempt({ transferCode: "OPEN1", amountVnd: 380_000 })] }) });
    await screen.findByText("OPEN1");

    await userEvent.click(screen.getByRole("button", { name: T("confirmCode") }));

    const form = (await screen.findByRole("heading", { level: 2 })).closest(".fixed") as HTMLElement;
    expect(within(form).getByText("#o-1")).toBeInTheDocument();
    expect(within(form).getByDisplayValue("OPEN1")).toHaveAttribute("readonly");
    expect(within(form).getByDisplayValue("380.000")).toBeInTheDocument();
  });

  it("reloads the order and tells the parent once the payment is confirmed", async () => {
    const { calls, onChanged } = await openTab({ overview: overview({}, { transactions: [transaction()] }) });
    await userEvent.click(await screen.findByRole("button", { name: T("attachHere") }));
    const form = (await screen.findByRole("heading", { level: 2 })).closest(".fixed") as HTMLElement;
    await userEvent.type(form.querySelector("textarea") as HTMLElement, "Seen");

    await userEvent.click(within(form).getByRole("button", { name: msg("admin.payments.confirm.submit") }));

    await waitFor(() => expect(calls.confirms).toEqual([{ orderId: "o-1", body: { transactionId: "tx-1", note: "Seen" } }]));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(calls.overviews.length).toBe(2));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument());
  });

  it("opens the form for a manual record when 'confirm paid' is pressed", async () => {
    await openTab({ overview: overview() });

    await userEvent.click(await screen.findByRole("button", { name: T("confirmPaid") }));

    expect(await screen.findByRole("heading", { level: 2, name: msg("admin.payments.confirm.titleManual") })).toBeInTheDocument();
  });
});

describe("APY-12 making a QR for the customer at the shop", () => {
  it("makes it at once when no code is pending, shows it and says so", async () => {
    const { calls } = await openTab({ overview: overview({}, { attempts: [attempt({ status: "EXPIRED" })] }), qr: qrSession({ transferContent: "DHGNEWCODE" }) });

    await userEvent.click(await screen.findByRole("button", { name: T("qr.create") }));

    await waitFor(() => expect(calls.qrs).toEqual(["o-1"]));
    expect(await screen.findByText("DHGNEWCODE")).toBeInTheDocument();
    expect(await screen.findByText(T("qr.toast.created"))).toBeInTheDocument();
    await waitFor(() => expect(calls.overviews.length).toBe(2));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("warns first that a pending code dies the moment the new one is made, and goes on only if the admin agrees", async () => {
    const { calls } = await openTab({ overview: overview({}, { attempts: [attempt({ status: "PENDING" })] }) });
    await userEvent.click(await screen.findByRole("button", { name: T("qr.create") }));

    const box = await screen.findByRole("alertdialog");
    expect(box).toHaveTextContent(T("qr.confirm.title"));
    expect(box).toHaveTextContent(T("qr.confirm.message"));
    expect(within(box).getByRole("button", { name: T("qr.confirm.confirm") }).className).toContain("bg-[var(--accent-rose)]");
    await userEvent.click(within(box).getByRole("button", { name: msg("common.actions.cancel") }));
    await wait(200);
    expect(calls.qrs).toEqual([]);

    await userEvent.click(screen.getByRole("button", { name: T("qr.create") }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: T("qr.confirm.confirm") }));

    await waitFor(() => expect(calls.qrs).toEqual(["o-1"]));
  });

  it("locks the button and says 'creating' while the code is made", async () => {
    const { server } = await import("@/tests/_support/msw-server");
    const { http, HttpResponse } = await import("msw");
    const { API } = await import("@/tests/_support/api");
    await openTab({ overview: overview() });
    let release!: () => void;
    server.use(http.post(`${API}/api/admin/payments/orders/:id/qr`, async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return HttpResponse.json({ data: qrSession() });
    }));
    await userEvent.click(await screen.findByRole("button", { name: T("qr.create") }));

    expect(await screen.findByRole("button", { name: T("qr.creating") })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByRole("button", { name: T("qr.create") })).toBeEnabled());
  });

  it("says why when the BE refuses, translating a known code, and shows no QR", async () => {
    await openTab({ overview: overview(), qr: { status: 400, body: { message: "server", errorCode: 1702 } } });

    await userEvent.click(await screen.findByRole("button", { name: T("qr.create") }));

    expect(await screen.findByText(msg("shared.errors.byCode.1702"))).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: T("qr.alt") })).not.toBeInTheDocument();
  });

  it("uses its own words when the BE says nothing", async () => {
    await openTab({ overview: overview(), qr: { status: 500, body: {} } });

    await userEvent.click(await screen.findByRole("button", { name: T("qr.create") }));

    expect(await screen.findByText(T("qr.toast.failed"))).toBeInTheDocument();
  });
});

describe("APY-13 waiting for the customer's money", () => {
  async function waitForMoney(answers: (n: number) => ReturnType<typeof overview> | number, qr = qrSession()) {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const view = await openTab({ overview: (n) => (n === 1 ? overview() : answers(n)), qr });
    await userEvent.click(await screen.findByRole("button", { name: T("qr.create") }), { advanceTimers: vi.advanceTimersByTime });
    await screen.findByText(qr.transferContent);
    await waitFor(() => expect(view.calls.overviews.length).toBe(2));
    return view;
  }
  const tick = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

  it("asks again every four seconds, and when the order reads paid it tells the parent and shows 'money received'", async () => {
    const { calls, onChanged } = await waitForMoney((n) => (n >= 4 ? overview({ paymentStatus: "paid", paidAt: "2026-03-05T06:00:00.000Z" }) : overview()));
    const before = calls.overviews.length;

    await tick(4100);
    await waitFor(() => expect(calls.overviews.length).toBe(before + 1));
    expect(onChanged).not.toHaveBeenCalled();
    await tick(4100);
    await waitFor(() => expect(calls.overviews.length).toBe(before + 2));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status")).toHaveTextContent(T("qr.paid"));
    await tick(20_000);
    expect(calls.overviews.length).toBe(before + 2);
  });

  it("keeps asking after a missed round", async () => {
    const { calls } = await waitForMoney((n) => (n === 3 ? 500 : overview()));
    const before = calls.overviews.length;

    await tick(4100);
    await waitFor(() => expect(calls.overviews.length).toBe(before + 1));
    await tick(4100);

    await waitFor(() => expect(calls.overviews.length).toBe(before + 2));
  });

  it("stops asking once the code has expired, and says so", async () => {
    const { calls } = await waitForMoney(() => overview(), qrSession({ expiresAt: new Date(Date.now() + 5000).toISOString() }));
    const before = calls.overviews.length;

    await tick(12_000);
    await tick(12_000);

    expect(calls.overviews.length).toBeLessThanOrEqual(before + 1);
    expect(await screen.findByText(T("qr.expired"))).toBeInTheDocument();
  });

  it("stops asking when the tab goes away", async () => {
    const { calls, unmount } = await waitForMoney(() => overview());
    const before = calls.overviews.length;

    unmount();
    await tick(20_000);

    expect(calls.overviews.length).toBe(before);
  });
});
