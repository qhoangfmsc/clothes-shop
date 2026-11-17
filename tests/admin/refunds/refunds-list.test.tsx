import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { refund, renderRefunds } from "./refunds-kit";

/* The refund queue: what it asks and shows (specs/admin/refunds.md, flows ARF-1 to ARF-4E). */

const R = (key: string, locale: "vi" | "en" = "vi") => msg(`admin.refunds.${key}`, locale);
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const tab = (name: string | RegExp) => screen.getByRole("button", { name });
const last = <T,>(items: T[]) => items[items.length - 1];

describe("ARF-1 the queue", () => {
  it("opens on the refunds waiting for a transfer, newest first, with the total in the header", async () => {
    const { calls } = await renderRefunds({ pages: [{ data: [refund()], total: 7 }] });

    await screen.findByText("#o-1");

    expect(calls.lists[0].get("status")).toBe("REQUESTED");
    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(screen.getByText("7 yêu cầu")).toBeInTheDocument();
    expect(tab(/^Chờ hoàn/).className).toContain("border-[var(--accent-primary)]");
  });

  it("shows each refund with its time, reason, amount, order, customer and where the money came from", async () => {
    await renderRefunds({ pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");
    const row = rowOf("#o-1");

    expect(within(row).getByText(R("reason.ADMIN_CANCELLED"))).toBeInTheDocument();
    expect(within(row).getByText("380.000 VNĐ", { selector: "span.whitespace-nowrap" })).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "#o-1" })).toHaveAttribute("href", "/admin/orders?orderId=o-1");
    expect(within(row).getByText(msg("common.orderPaymentStatus.paid"))).toBeInTheDocument();
    expect(within(row).getByText("Mai Tran · 0901234567")).toBeInTheDocument();
    expect(within(row).getByText("DHG29JR5A8")).toBeInTheDocument();
    expect(within(row).getByText("SP-1001")).toBeInTheDocument();
    expect(within(row).getByText("DHG29JR5A8 thanh toan")).toBeInTheDocument();
    expect(within(row).getByText(/^sepay · 380\.000 VNĐ · /)).toBeInTheDocument();
    expect(within(row).getByText(R("status.REQUESTED"))).toBeInTheDocument();
    expect(within(row).queryByText(/^Xử lý:/)).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: `Sao chép ${R("table.bankReference")}` })).not.toBeInTheDocument();
    expect(row.querySelector(".italic")).toBeNull();
  });

  it("links a refund that comes from a return to that return, with the id made safe", async () => {
    await renderRefunds({ pages: [{ data: [refund({ reason: "RETURN", returnRequestId: "r 1" })], total: 1 }] });
    await screen.findByText("#o-1");

    expect(screen.getByRole("link", { name: R("reason.RETURN") })).toHaveAttribute("href", "/admin/returns?returnId=r%201");
  });

  it("shows a reason it has no name for as it is, and a dash for a customer without name or phone", async () => {
    await renderRefunds({ pages: [{ data: [refund({ reason: "MYSTERY" as never, order: { ...refund().order, customer: null } }), refund({ id: "rf-2", orderId: "o-2", reason: "MYSTERY" as never, returnRequestId: "r1" })], total: 2 }] });
    await screen.findByText("#o-1");

    expect(within(rowOf("#o-1")).getByText("MYSTERY")).toBeInTheDocument();
    expect(within(rowOf("#o-1")).getByText("—")).toBeInTheDocument();
    expect(within(rowOf("#o-2")).getByRole("link", { name: "MYSTERY" })).toBeInTheDocument();
  });

  it("shows the transfer, bank reference with a copy button, and note of a refund that was handled", async () => {
    await renderRefunds({ query: { status: "COMPLETED" }, pages: [{ data: [refund({ status: "COMPLETED", processedAt: "2026-03-06T05:00:00.000Z", bankReference: "FT-9", note: "Sent back" })], total: 1 }] });
    await screen.findByText("#o-1");
    const row = rowOf("#o-1");

    expect(within(row).getByText(R("status.COMPLETED"))).toBeInTheDocument();
    expect(within(row).getByText(/^Xử lý:/)).toBeInTheDocument();
    expect(within(row).getByText("FT-9")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: `Sao chép ${R("table.bankReference")}` })).toBeInTheDocument();
    expect(within(row).getByText("Sent back")).toBeInTheDocument();
  });

  it("leaves out the payment details the BE did not give", async () => {
    await renderRefunds({ pages: [{ data: [refund({ payment: { ...refund().payment, transactionRef: null, transferContent: null, provider: null, paidAt: null } })], total: 1 }] });
    await screen.findByText("#o-1");

    const row = rowOf("#o-1");
    expect(within(row).queryByText("SP-1001")).not.toBeInTheDocument();
    expect(within(row).getByText("380.000 VNĐ", { selector: "span.text-\\[var\\(--text-muted\\)\\]" })).toBeInTheDocument();
  });

  it("searches, and sorts in six ways", async () => {
    const { calls } = await renderRefunds({ pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    const sorts = within(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") })).getAllByRole("option").map((o) => o.getAttribute("value"));
    expect(sorts).toEqual(["-createdAt", "createdAt", "-processedAt", "processedAt", "-amount", "amount"]);
    await userEvent.type(screen.getByPlaceholderText(R("table.searchPlaceholder")), "0901");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("0901"));
  });

  it("hides the source column on narrow screens", async () => {
    await renderRefunds({ pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    expect(screen.getByRole("columnheader", { name: R("table.columns.source"), hidden: true }).className).toContain("hidden lg:table-cell");
  });

  it("shows amounts in dollars in English", async () => {
    await renderRefunds({ locale: "en", pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    expect(within(rowOf("#o-1")).getAllByText("$14.61").length).toBeGreaterThan(0);
  });
});

describe("ARF-2 the tabs", () => {
  it("goes to a tab by putting it in the address, and the waiting tab takes the status out", async () => {
    await renderRefunds({ query: { status: "COMPLETED", orderId: "o-5" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.COMPLETED"));

    await userEvent.click(tab(R("tabs.REJECTED")));
    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/refunds?status=REJECTED&orderId=o-5", { scroll: false });
    await userEvent.click(tab(R("tabs.all")));
    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/refunds?status=all&orderId=o-5", { scroll: false });
    await userEvent.click(tab(/^Chờ hoàn/));
    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/refunds?orderId=o-5", { scroll: false });
  });

  it("goes back to the bare page when no other filter is left", async () => {
    await renderRefunds({ query: { status: "COMPLETED" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.COMPLETED"));

    await userEvent.click(tab(/^Chờ hoàn/));

    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/refunds", { scroll: false });
  });

  it.each([
    ["COMPLETED", "COMPLETED"],
    ["REJECTED", "REJECTED"],
    ["REQUESTED", "REQUESTED"],
    ["nonsense", "REQUESTED"],
  ])("asks for status %s when the address says %s", async (param, expected) => {
    const { calls } = await renderRefunds({ query: { status: param }, pages: [{ data: [], total: 0 }] });
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(0));

    expect(calls.lists[0].get("status")).toBe(expected);
  });

  it("asks for no status at all on the 'all' tab", async () => {
    const { calls } = await renderRefunds({ query: { status: "all" }, pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    expect(calls.lists[0].has("status")).toBe(false);
    expect(tab(R("tabs.all")).className).toContain("border-[var(--accent-primary)]");
  });

  it("starts the table fresh when the tab changes in the address", async () => {
    const { calls, rerender } = await renderRefunds({ pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");
    navigation.searchParams = new URLSearchParams({ status: "REJECTED" });
    const { default: RefundsContent } = await import("@/src/app/[locale]/(admin)/admin/refunds/RefundsContent");

    rerender(<RefundsContent />);

    await waitFor(() => expect(calls.lists).toHaveLength(2));
    expect(calls.lists[1].get("status")).toBe("REJECTED");
  });

  it("filters by the order named in the address, shows it as a chip with a way to clear it", async () => {
    const { calls } = await renderRefunds({ query: { orderId: "o-9" }, pages: [{ data: [refund({ orderId: "o-9" })], total: 1 }] });
    await screen.findByText("#o-9");

    expect(calls.lists[0].get("orderId")).toBe("o-9");
    const chip = screen.getByRole("link", { name: /Đơn #o-9/ });
    expect(chip).toHaveAttribute("href", "/admin/refunds");
    expect(within(chip).getByLabelText(R("page.clearOrderFilter"))).toBeInTheDocument();
  });

  it("shows no chip and sends no order without the filter", async () => {
    const { calls } = await renderRefunds({ pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    expect(calls.lists[0].has("orderId")).toBe(false);
    expect(screen.queryByRole("link", { name: /Đơn #/ })).not.toBeInTheDocument();
  });

  it("shows the number waiting on its tab, from the menu's count", async () => {
    await renderRefunds({ counts: { refunds: 4 }, pages: [{ data: [refund()], total: 1 }] });

    expect(await screen.findByRole("button", { name: "Chờ hoàn (4)" })).toBeInTheDocument();
  });

  it("shows zero when the account cannot see the number", async () => {
    await renderRefunds({ counts: { orders: 1 }, pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    expect(screen.getByRole("button", { name: "Chờ hoàn (0)" })).toBeInTheDocument();
  });
});

describe("ARF-2N the notice", () => {
  it("shows the number and explains, on the waiting tab, with a button to see all", async () => {
    await renderRefunds({ counts: { refunds: 2 }, pages: [{ data: [refund()], total: 1 }] });

    const box = await screen.findByRole("region", { name: "2 khoản chờ chuyển trả khách" });

    expect(box).toHaveTextContent(R("pending.includes"));
    expect(box).toHaveTextContent(R("pending.how"));
    await userEvent.click(within(box).getByRole("button", { name: msg("admin.components.pendingNotice.viewAll") }));
    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/refunds?status=all", { scroll: false });
  });

  it("offers to see the waiting ones from another tab", async () => {
    await renderRefunds({ counts: { refunds: 2 }, query: { status: "all" }, pages: [{ data: [refund()], total: 1 }] });

    await userEvent.click(await screen.findByRole("button", { name: R("pending.view") }));

    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/refunds", { scroll: false });
  });

  it("shows no notice when nothing waits", async () => {
    await renderRefunds({ counts: { refunds: 0 }, pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    expect(screen.queryByRole("region", { name: /khoản chờ chuyển trả khách/ })).not.toBeInTheDocument();
  });
});

describe("ARF-3 who may act on a refund", () => {
  it("gives an admin who may refund the 'transferred' and 'reject' buttons on a waiting refund", async () => {
    await renderRefunds({ pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    expect(within(rowOf("#o-1")).getByRole("button", { name: R("table.complete") })).toBeInTheDocument();
    expect(within(rowOf("#o-1")).getByRole("button", { name: R("table.reject") })).toBeInTheDocument();
  });

  it("gives them none on a refund that is already handled", async () => {
    await renderRefunds({ query: { status: "all" }, pages: [{ data: [refund({ id: "a", orderId: "o-1", status: "COMPLETED" }), refund({ id: "b", orderId: "o-2", status: "REJECTED" })], total: 2 }] });
    await screen.findByText("#o-1");

    const table = within(screen.getByRole("table"));
    expect(table.queryByRole("button", { name: R("table.complete") })).not.toBeInTheDocument();
    expect(table.queryByRole("button", { name: R("table.reject") })).not.toBeInTheDocument();
  });

  it.each([
    ["an admin who may only view orders", "adminLimited"],
    ["an admin who may view but not refund payments", adminWith(PERMISSIONS.PAYMENT_ADMIN_VIEW)],
  ] as const)("gives %s no buttons", async (_label, as) => {
    await renderRefunds({ as, pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    const table = within(screen.getByRole("table"));
    expect(table.queryByRole("button", { name: R("table.complete") })).not.toBeInTheDocument();
    expect(table.queryByRole("button", { name: R("table.reject") })).not.toBeInTheDocument();
  });

  it("opens the 'transferred' form for that refund, and the 'reject' form for that refund", async () => {
    await renderRefunds({ pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");

    await userEvent.click(within(rowOf("#o-1")).getByRole("button", { name: R("table.complete") }));
    expect(await screen.findByRole("heading", { level: 2, name: R("complete.title") })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await userEvent.click(within(rowOf("#o-1")).getByRole("button", { name: R("table.reject") }));

    expect(await screen.findByRole("heading", { level: 2, name: R("reject.title") })).toBeInTheDocument();
  });

  it("closes the form and asks for the table again once a refund is handled", async () => {
    const { calls } = await renderRefunds({ pages: [{ data: [refund()], total: 1 }] });
    await screen.findByText("#o-1");
    await userEvent.click(within(rowOf("#o-1")).getByRole("button", { name: R("table.reject") }));
    const form = (await screen.findByRole("heading", { level: 2, name: R("reject.title") })).closest(".fixed") as HTMLElement;
    await userEvent.type(form.querySelector("textarea") as HTMLElement, "No");

    await userEvent.click(within(form).getByRole("button", { name: R("reject.submit") }));

    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(1));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: R("reject.title") })).not.toBeInTheDocument());
  });
});

describe("ARF-4E nothing to show, or no way to load it", () => {
  it.each([
    ["REQUESTED", undefined],
    ["COMPLETED", "COMPLETED"],
    ["REJECTED", "REJECTED"],
    ["all", "all"],
  ])("says the %s tab is empty in its own words", async (key, status) => {
    await renderRefunds({ query: status ? { status } : {}, pages: [{ data: [], total: 0 }] });

    expect(await screen.findByText(R(`table.empty.${key === "all" ? "all" : key}`))).toBeInTheDocument();
  });

  it("says nothing matches when a search found nothing", async () => {
    await renderRefunds({ pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.REQUESTED"));

    await userEvent.type(screen.getByPlaceholderText(R("table.searchPlaceholder")), "zzz");

    expect(await screen.findByText(R("table.empty.filtered"))).toBeInTheDocument();
  });

  it("says it could not load instead of saying nothing is waiting", async () => {
    await renderRefunds({ failListFrom: 1 });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText(R("table.empty.REQUESTED"))).not.toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s nothing, only that the data could not be loaded", async (_label, as, deny) => {
    await renderRefunds({ as, deny, pages: [{ data: [refund()], total: 1 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("#o-1")).not.toBeInTheDocument();
  });
});
