import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { attempt, attemptRow, renderPayments, transaction } from "./payments-kit";

/* The payments page: transfer codes, bank transactions, the work-waiting notice (specs/admin/payments.md, flows APY-1 to APY-5E). */

const Y = (key: string) => msg(`admin.payments.${key}`);
const rowOf = (text: string | RegExp) => screen.getByText(text).closest("tr") as HTMLElement;
const last = <T,>(items: T[]) => items[items.length - 1];
const options = (select: HTMLElement) => within(select).getAllByRole("option").map((o) => o.getAttribute("value"));
const tabButton = (name: string) => screen.getByRole("button", { name });
const openTransactions = () => userEvent.click(tabButton(Y("lookup.transactionsTab")));

const CODE_ROW = attemptRow({ transferCode: "DHG11AAA", transactions: [{ id: "tx-9", provider: "sepay", providerTransactionId: "SP-9", amountVnd: 380_000, amountUsd: 14.61, verificationStatus: "MATCHED", transferContent: "DHG11AAA", receivedAt: "2026-03-05T06:00:00.000Z" }] });

describe("APY-1 the transfer codes", () => {
  it("opens on the codes tab, asking for the newest first, with the number of codes in the header", async () => {
    const { calls } = await renderPayments({ attempts: [{ data: [attemptRow()], total: 12 }] });

    await screen.findByText("DHG29JR5A8");

    expect(calls.attempts[0].get("sort")).toBe("-createdAt");
    expect(calls.transactions).toHaveLength(0);
    expect(screen.getByText("12 mã")).toBeInTheDocument();
    expect(tabButton(Y("lookup.tab")).className).toContain("border-[var(--accent-primary)]");
  });

  it("shows each code with its date, amount, who made it, state, order and customer", async () => {
    await renderPayments({
      attempts: [{ data: [attemptRow({ createdBy: "a-1", status: "PENDING", order: { ...attemptRow().order, customer: { fullName: "Mai Tran", phone: "0901234567" } } })], total: 1 }],
    });
    await screen.findByText("DHG29JR5A8");
    const row = rowOf("DHG29JR5A8");

    expect(within(row).getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(within(row).getByText(Y("lookup.createdBy.admin"))).toBeInTheDocument();
    expect(within(row).getByText(Y("attempt.PENDING"))).toBeInTheDocument();
    expect(within(row).getByText(/^Hạn:/)).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "#o-1" })).toHaveAttribute("href", "/admin/orders?orderId=o-1");
    expect(within(row).getByText(msg("common.orderPaymentStatus.unpaid"))).toBeInTheDocument();
    expect(within(row).getByText("Mai Tran · 0901234567")).toBeInTheDocument();
    expect(within(row).getByText(Y("lookup.noTransactions"))).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Sao chép/ })).toBeInTheDocument();
  });

  it("says who paid and when for a paid code, a customer-made code, and lists the bank transactions on it", async () => {
    await renderPayments({ attempts: [{ data: [{ ...CODE_ROW, status: "PAID", paidAt: "2026-03-05T06:00:00.000Z", createdBy: null }], total: 1 }] });
    await screen.findByText("DHG11AAA");
    const row = rowOf("DHG11AAA");

    expect(within(row).getByText(Y("attempt.PAID"))).toBeInTheDocument();
    expect(within(row).getByText(/^Trả:/)).toBeInTheDocument();
    expect(within(row).queryByText(/^Hạn:/)).not.toBeInTheDocument();
    expect(within(row).getByText(Y("lookup.createdBy.customer"))).toBeInTheDocument();
    expect(within(row).getByText(Y("verification.MATCHED"))).toBeInTheDocument();
    expect(within(row).getByText(/SP-9/)).toBeInTheDocument();
  });

  it("shows a dash for a customer who left no name or phone", async () => {
    await renderPayments({ attempts: [{ data: [attemptRow({ order: { ...attemptRow().order, customer: null } })], total: 1 }] });
    await screen.findByText("DHG29JR5A8");

    expect(within(rowOf("DHG29JR5A8")).getByText("—")).toBeInTheDocument();
  });

  it("filters by the state of the code, searches, and sorts in six ways", async () => {
    const { calls } = await renderPayments({ attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");

    expect(options(screen.getByRole("combobox", { name: Y("lookup.status") }))).toEqual(["", "PENDING", "PAID", "EXPIRED", "CANCELLED"]);
    expect(options(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") }))).toEqual(["-createdAt", "createdAt", "-expiresAt", "expiresAt", "-amount", "amount"]);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: Y("lookup.status") }), "EXPIRED");
    await waitFor(() => expect(last(calls.attempts).get("status")).toBe("EXPIRED"));
    await userEvent.type(screen.getByPlaceholderText(Y("lookup.searchPlaceholder")), "DHG");
    await waitFor(() => expect(last(calls.attempts).get("search")).toBe("DHG"));
  });

  it("offers 'confirm paid' only for an unpaid, not cancelled order, and only with the permission", async () => {
    const unpaid = attemptRow({ id: "a1", transferCode: "UNPAID1" });
    const paid = attemptRow({ id: "a2", transferCode: "PAID2", order: { ...attemptRow().order, id: "o-2", paymentStatus: "paid" } });
    const cancelled = attemptRow({ id: "a3", transferCode: "CANCELLED3", order: { ...attemptRow().order, id: "o-3", status: "cancelled" } });
    const view = await renderPayments({ attempts: [{ data: [unpaid, paid, cancelled], total: 3 }] });
    await screen.findByText("UNPAID1");

    expect(within(rowOf("UNPAID1")).getByRole("button", { name: Y("lookup.confirmPaid") })).toBeInTheDocument();
    expect(within(rowOf("PAID2")).queryByRole("button", { name: Y("lookup.confirmPaid") })).not.toBeInTheDocument();
    expect(within(rowOf("CANCELLED3")).queryByRole("button", { name: Y("lookup.confirmPaid") })).not.toBeInTheDocument();
    view.unmount();

    await renderPayments({ as: "adminLimited", attempts: [{ data: [unpaid], total: 1 }] });
    await screen.findByText("UNPAID1");
    expect(within(rowOf("UNPAID1")).queryByRole("button", { name: Y("lookup.confirmPaid") })).not.toBeInTheDocument();
  });

  it("opens the confirm form for that code with the order, the code and the amount filled in and locked", async () => {
    await renderPayments({ attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");

    await userEvent.click(within(rowOf("DHG29JR5A8")).getByRole("button", { name: Y("lookup.confirmPaid") }));

    const form = (await screen.findByRole("heading", { level: 2, name: Y("confirm.titleManual") })).closest(".fixed") as HTMLElement;
    expect(within(form).getByText("#o-1")).toBeInTheDocument();
    expect(within(form).getByDisplayValue("DHG29JR5A8")).toHaveAttribute("readonly");
    expect(within(form).getByDisplayValue("380.000")).toBeInTheDocument();
  });

  it("hides the creator and order columns on narrow screens", async () => {
    await renderPayments({ attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");

    expect(screen.getByRole("columnheader", { name: Y("lookup.columns.createdBy"), hidden: true }).className).toContain("hidden md:table-cell");
    expect(screen.getByRole("columnheader", { name: Y("lookup.columns.order"), hidden: true }).className).toContain("hidden sm:table-cell");
    expect(screen.getByRole("columnheader", { name: Y("lookup.columns.transactions"), hidden: true }).className).toContain("hidden lg:table-cell");
  });
});

describe("APY-1E the codes cannot be loaded", () => {
  it("says it could not load instead of saying there are no codes", async () => {
    await renderPayments({ failAttempts: true });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s nothing, only that the data could not be loaded", async (_label, as, deny) => {
    await renderPayments({ as, deny, attempts: [{ data: [attemptRow()], total: 1 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("DHG29JR5A8")).not.toBeInTheDocument();
  });
});

describe("APY-2 the bank transactions", () => {
  const tx = (over = {}) => transaction(over);

  it("asks for the newest first when the tab is opened, with the number of transactions", async () => {
    const { calls } = await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx()], total: 5 }] });
    await openTransactions();

    await screen.findByText("DHG29JR5A8 thanh toan");

    expect(calls.transactions[0].get("sort")).toBe("-receivedAt");
    expect(screen.getByText("5 giao dịch")).toBeInTheDocument();
    expect(calls.transactions[0].has("needsReview")).toBe(false);
  });

  it("shows time, amount, content and bank reference, result and order for each transaction", async () => {
    const matched = tx({ id: "tx-2", providerTransactionId: "SP-2", transferContent: "", verificationStatus: "MATCHED", paymentAttemptId: "at-1", paymentAttempt: attempt({ order: { id: "o-1", status: "confirmed", paymentStatus: "paid", totalVnd: 380_000, totalUsd: 14.61, userId: null } }) });
    await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx(), matched], total: 2 }] });
    await openTransactions();
    await screen.findByText("SP-1001");
    const first = rowOf("SP-1001");
    const second = rowOf("SP-2");

    expect(within(first).getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(within(first).getByText(Y("verification.UNMATCHED"))).toBeInTheDocument();
    expect(within(first).getByText("—")).toBeInTheDocument();
    expect(within(second).getByText("—", { selector: "span.text-xs" })).toBeInTheDocument();
    expect(within(second).getByText(Y("verification.MATCHED"))).toBeInTheDocument();
    expect(within(second).getByRole("link", { name: "#o-1" })).toHaveAttribute("href", "/admin/orders?orderId=o-1");
    expect(within(second).getByText(msg("common.orderPaymentStatus.paid"))).toBeInTheDocument();
  });

  it("filters by the result of matching, searches, and sorts four ways (newest first, never by creation date)", async () => {
    const { calls } = await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx()], total: 1 }] });
    await openTransactions();
    await screen.findByText("SP-1001");

    expect(options(screen.getByRole("combobox", { name: Y("table.filters.status") }))).toEqual(["", "MATCHED", "UNMATCHED", "ACCOUNT_MISMATCH", "AMOUNT_MISMATCH", "LATE", "NOT_PAYABLE", "DUPLICATE_PAYMENT", "IGNORED", "MANUALLY_CONFIRMED"]);
    expect(options(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") }))).toEqual(["-receivedAt", "receivedAt", "-amount", "amount"]);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: Y("table.filters.status") }), "LATE");
    await waitFor(() => expect(last(calls.transactions).get("verificationStatus")).toBe("LATE"));
    await userEvent.type(screen.getByPlaceholderText(Y("table.searchPlaceholder")), "SP-");
    await waitFor(() => expect(last(calls.transactions).get("search")).toBe("SP-"));
  });

  it.each(["UNMATCHED", "AMOUNT_MISMATCH", "LATE", "NOT_PAYABLE"])("offers 'attach to an order' for a %s transaction whose order is not paid", async (verificationStatus) => {
    await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx({ verificationStatus: verificationStatus as never })], total: 1 }] });
    await openTransactions();
    await screen.findByText("SP-1001");

    expect(within(rowOf("SP-1001")).getByRole("button", { name: Y("table.attach") })).toBeInTheDocument();
  });

  it.each(["MATCHED", "ACCOUNT_MISMATCH", "DUPLICATE_PAYMENT", "IGNORED", "MANUALLY_CONFIRMED"])("offers nothing for a %s transaction", async (verificationStatus) => {
    await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx({ verificationStatus: verificationStatus as never })], total: 1 }] });
    await openTransactions();
    await screen.findByText("SP-1001");

    expect(within(rowOf("SP-1001")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers nothing when the order the transaction belongs to is already paid, or to an admin who may not confirm", async () => {
    const paid = tx({ paymentAttempt: attempt({ order: { id: "o-1", status: "confirmed", paymentStatus: "paid", totalVnd: 1, totalUsd: 1, userId: null } }) });
    const view = await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [paid], total: 1 }] });
    await openTransactions();
    await screen.findByText("SP-1001");
    expect(within(rowOf("SP-1001")).queryByRole("button")).not.toBeInTheDocument();
    view.unmount();

    await renderPayments({ as: "adminLimited", attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx()], total: 1 }] });
    await openTransactions();
    await screen.findByText("SP-1001");
    expect(within(rowOf("SP-1001")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the attach form with that transaction's facts", async () => {
    const { calls } = await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx()], total: 1 }], orders: [] });
    await openTransactions();
    await screen.findByText("SP-1001");

    await userEvent.click(within(rowOf("SP-1001")).getByRole("button", { name: Y("table.attach") }));

    const form = (await screen.findByRole("heading", { level: 2, name: Y("confirm.titleAttach") })).closest(".fixed") as HTMLElement;
    expect(within(form).getByText("SP-1001", { exact: false })).toBeInTheDocument();
    expect(calls.transactions).toHaveLength(1);
  });

  it("closes the form and asks for the transactions again once an attached transaction is confirmed", async () => {
    const { calls } = await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx()], total: 1 }], orders: [{ id: "o-1", status: "pending", totalVnd: 1, totalUsd: 1, createdAt: "2026-03-05T05:00:00.000Z", shippingAddress: {} }] });
    await openTransactions();
    await screen.findByText("SP-1001");
    await userEvent.click(within(rowOf("SP-1001")).getByRole("button", { name: Y("table.attach") }));
    const form = (await screen.findByRole("heading", { level: 2, name: Y("confirm.titleAttach") })).closest(".fixed") as HTMLElement;
    await userEvent.click(await within(form).findByRole("radio", { name: /#o-1/ }));
    await userEvent.type(form.querySelector("textarea") as HTMLElement, "Checked");

    await userEvent.click(within(form).getByRole("button", { name: msg("admin.payments.confirm.submit") }));

    await waitFor(() => expect(calls.confirms).toHaveLength(1));
    await waitFor(() => expect(calls.transactions.length).toBeGreaterThan(1));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: Y("confirm.titleAttach") })).not.toBeInTheDocument());
  });

  it("says it could not load the transactions", async () => {
    await renderPayments({ attempts: [{ data: [], total: 0 }], failTransactions: true });
    await openTransactions();

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
  });

  it("hides the content and order columns on narrow screens", async () => {
    await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [tx()], total: 1 }] });
    await openTransactions();
    await screen.findByText("SP-1001");

    expect(screen.getByRole("columnheader", { name: Y("table.columns.content"), hidden: true }).className).toContain("hidden md:table-cell");
    expect(screen.getByRole("columnheader", { name: Y("table.columns.order"), hidden: true }).className).toContain("hidden sm:table-cell");
  });
});

describe("APY-2P an admin who may view but not confirm payments", () => {
  const viewer = () => adminWith(PERMISSIONS.PAYMENT_ADMIN_VIEW);

  it("sees no 'attach to an order' button on a transaction", async () => {
    await renderPayments({ as: viewer(), attempts: [{ data: [], total: 0 }], transactions: [{ data: [transaction()], total: 1 }] });
    await openTransactions();
    await screen.findByText("SP-1001");

    expect(within(rowOf("SP-1001")).queryByRole("button", { name: Y("table.attach") })).not.toBeInTheDocument();
  });

  it("sees no 'confirm paid' button on a transfer code", async () => {
    await renderPayments({ as: viewer(), attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");

    expect(within(rowOf("DHG29JR5A8")).queryByRole("button", { name: Y("lookup.confirmPaid") })).not.toBeInTheDocument();
  });
});

describe("APY-3 recording a transaction by hand", () => {
  it("gives an admin who may confirm payments the button, and opens an empty form", async () => {
    await renderPayments({ attempts: [{ data: [], total: 0 }], orders: [] });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(Y("page.manual")) }));

    expect(await screen.findByRole("heading", { level: 2, name: Y("confirm.titleManual") })).toBeInTheDocument();
  });

  it("gives an admin who may not confirm payments no button", async () => {
    await renderPayments({ as: adminWith(PERMISSIONS.PAYMENT_ADMIN_VIEW), attempts: [{ data: [], total: 0 }] });
    await screen.findByText(msg("admin.components.dataTable.empty.none"));

    expect(screen.queryByRole("button", { name: new RegExp(Y("page.manual")) })).not.toBeInTheDocument();
  });

  it("refreshes the codes after a transaction was confirmed", async () => {
    const { calls } = await renderPayments({ attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");
    await userEvent.click(within(rowOf("DHG29JR5A8")).getByRole("button", { name: Y("lookup.confirmPaid") }));
    const form = (await screen.findByRole("heading", { level: 2, name: Y("confirm.titleManual") })).closest(".fixed") as HTMLElement;
    await userEvent.type(form.querySelector("textarea") as HTMLElement, "Checked the statement");

    await userEvent.click(within(form).getByRole("button", { name: Y("confirm.submit") }));

    await waitFor(() => expect(calls.attempts.length).toBeGreaterThan(1));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: Y("confirm.titleManual") })).not.toBeInTheDocument());
  });
});

describe("APY-4 the transactions that need review", () => {
  const counts = { payments: 2 };

  it("shows the notice with the number, explanations and a button that turns the filter on and opens the transactions tab", async () => {
    await renderPayments({ counts, attempts: [{ data: [attemptRow()], total: 1 }] });

    const box = await screen.findByRole("region", { name: "2 giao dịch cần đối soát" });

    expect(box).toHaveTextContent(Y("pending.includes"));
    expect(box).toHaveTextContent(Y("pending.excludes"));
    expect(box).toHaveTextContent(Y("pending.how"));
    expect(box).toHaveTextContent(Y("pending.note"));
    await userEvent.click(within(box).getByRole("button", { name: Y("pending.view") }));
    expect(navigation.router.replace).toHaveBeenCalledWith("/admin/payments?needsReview=true", { scroll: false });
  });

  it("with the filter on, shows the transactions tab, asks only for those, and the button turns it off", async () => {
    const { calls } = await renderPayments({ counts, query: { needsReview: "true" }, transactions: [{ data: [transaction()], total: 1 }] });

    await screen.findByText("SP-1001");

    expect(calls.transactions[0].get("needsReview")).toBe("true");
    expect(calls.attempts).toHaveLength(0);
    await userEvent.click(await screen.findByRole("button", { name: msg("admin.components.pendingNotice.viewAll") }));
    expect(navigation.router.replace).toHaveBeenCalledWith("/admin/payments", { scroll: false });
  });

  it("drops the filter when the admin goes to the codes tab", async () => {
    await renderPayments({ counts, query: { needsReview: "true" }, transactions: [{ data: [transaction()], total: 1 }], attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("SP-1001");

    await userEvent.click(tabButton(Y("lookup.tab")));

    expect(navigation.router.replace).toHaveBeenCalledWith("/admin/payments", { scroll: false });
  });

  it("does not touch the address when the tab is changed with no filter", async () => {
    await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [], total: 0 }] });
    await openTransactions();

    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("keeps the transactions tab after the filter is turned off", async () => {
    const { calls } = await renderPayments({ counts, attempts: [{ data: [attemptRow()], total: 1 }], transactions: [{ data: [transaction()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");

    await userEvent.click(await screen.findByRole("button", { name: Y("pending.view") }));

    expect(await screen.findByText("SP-1001")).toBeInTheDocument();
    expect(calls.transactions).toHaveLength(1);
    expect(tabButton(Y("lookup.transactionsTab")).className).toContain("border-[var(--accent-primary)]");
  });

  it("starts the table fresh with the new question when the filter changes in the address", async () => {
    const { calls, rerender } = await renderPayments({ attempts: [{ data: [], total: 0 }], transactions: [{ data: [transaction()], total: 1 }] });
    await openTransactions();
    await screen.findByText("SP-1001");
    expect(calls.transactions).toHaveLength(1);

    navigation.searchParams = new URLSearchParams({ needsReview: "true" });
    const { default: PaymentsContent } = await import("@/src/app/[locale]/(admin)/admin/payments/PaymentsContent");
    rerender(<PaymentsContent />);

    await waitFor(() => expect(calls.transactions).toHaveLength(2));
    expect(calls.transactions[1].get("needsReview")).toBe("true");
  });

  it("shows no notice when nothing needs review, or to an account that cannot see the number", async () => {
    const calm = await renderPayments({ counts: { payments: 0 }, attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");
    expect(screen.queryByRole("region", { name: /giao dịch cần đối soát/ })).not.toBeInTheDocument();
    calm.unmount();

    await renderPayments({ counts: { orders: 1 }, attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");
    expect(screen.queryByRole("region", { name: /giao dịch cần đối soát/ })).not.toBeInTheDocument();
  });

  it("says everything is done when the filter is on and nothing is left", async () => {
    await renderPayments({ counts: { payments: 0 }, query: { needsReview: "true" }, transactions: [{ data: [], total: 0 }] });

    expect(await screen.findByRole("status")).toHaveTextContent(msg("admin.components.pendingNotice.allDone"));
  });
});

describe("APY-5E nothing special", () => {
  it("speaks English in English", async () => {
    await renderPayments({ locale: "en", attempts: [{ data: [attemptRow()], total: 1 }] });
    await screen.findByText("DHG29JR5A8");

    expect(within(rowOf("DHG29JR5A8")).getByText("$14.61")).toBeInTheDocument();
    expect(within(rowOf("DHG29JR5A8")).getByText(msg("admin.payments.attempt.PENDING", "en"))).toBeInTheDocument();
  });
});
