import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { adminReturn, renderReturns } from "./returns-kit";

/* The return queue and how a request is opened (specs/admin/returns.md, flows ARR-1 to ARR-4E). */

const R = (key: string) => msg(`admin.returns.${key}`);
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const tab = (name: string | RegExp) => screen.getByRole("button", { name });
const last = <T,>(items: T[]) => items[items.length - 1];
const panelTitle = (id: string) => screen.findByRole("heading", { level: 2, name: `Yêu cầu trả hàng #${id}` });

describe("ARR-1 the queue", () => {
  it("opens on the requests waiting for a decision, newest first, with the total", async () => {
    const { calls } = await renderReturns({ pages: [{ data: [adminReturn()], total: 9 }] });

    await screen.findByText("#r-1");

    expect(calls.lists[0].get("status")).toBe("REQUESTED");
    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(screen.getByText("9 yêu cầu")).toBeInTheDocument();
    expect(tab(/^Chờ duyệt/).className).toContain("border-[var(--accent-primary)]");
  });

  it("shows each request with its number, order, customer, reason, state and date", async () => {
    await renderReturns({ pages: [{ data: [adminReturn()], total: 1 }] });
    await screen.findByText("#r-1");
    const row = rowOf("#r-1");

    expect(within(row).getByRole("link", { name: "#o-1" })).toHaveAttribute("href", "/admin/orders?orderId=o-1");
    expect(within(row).getByText(msg("common.orderPaymentStatus.paid"))).toBeInTheDocument();
    expect(within(row).getByText("Mai Tran · 0901234567")).toBeInTheDocument();
    expect(within(row).getByText(R("reason.WRONG_SIZE"))).toBeInTheDocument();
    expect(within(row).getByText(R("status.REQUESTED"))).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: R("table.view") })).toBeInTheDocument();
  });

  it("shows a dash when the order or the customer is missing", async () => {
    await renderReturns({ pages: [{ data: [adminReturn({ order: null })], total: 1 }] });
    await screen.findByText("#r-1");

    expect(within(rowOf("#r-1")).getByText("—")).toBeInTheDocument();
    expect(within(rowOf("#r-1")).queryByText(msg("common.orderPaymentStatus.paid"))).not.toBeInTheDocument();
  });

  it("searches, sorts four ways, and hides reason and date on narrow screens", async () => {
    const { calls } = await renderReturns({ pages: [{ data: [adminReturn()], total: 1 }] });
    await screen.findByText("#r-1");

    expect(within(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") })).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["-createdAt", "createdAt", "-updatedAt", "updatedAt"]);
    await userEvent.type(screen.getByPlaceholderText(R("table.searchPlaceholder")), "0901");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("0901"));
    expect(screen.getByRole("columnheader", { name: R("table.columns.reason"), hidden: true }).className).toContain("hidden md:table-cell");
    expect(screen.getByRole("columnheader", { name: R("table.columns.createdAt"), hidden: true }).className).toContain("hidden sm:table-cell");
  });

  it("reads in English in English", async () => {
    await renderReturns({ locale: "en", pages: [{ data: [adminReturn()], total: 1 }] });
    await screen.findByText("#r-1");

    expect(within(rowOf("#r-1")).getByText(msg("admin.returns.reason.WRONG_SIZE", "en"))).toBeInTheDocument();
  });
});

describe("ARR-2 the tabs", () => {
  it("shows the waiting count on the first tab and the six tabs in order", async () => {
    await renderReturns({ counts: { returns: 3 }, pages: [{ data: [adminReturn()], total: 1 }] });

    expect(await screen.findByRole("button", { name: "Chờ duyệt (3)" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").filter((b) => b.className.includes("whitespace-nowrap")).map((b) => b.textContent)).toEqual(["Chờ duyệt (3)", "Đã duyệt", "Đã nhận hàng", "Đã hoàn tiền", "Từ chối", "Khách hủy", "Tất cả"]);
  });

  it("goes to a tab by the address, the waiting tab removing the status, keeping the other filters", async () => {
    await renderReturns({ query: { status: "APPROVED", orderId: "o-5" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.none"));

    await userEvent.click(tab(R("tabs.RECEIVED")));
    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/returns?status=RECEIVED&orderId=o-5", { scroll: false });
    await userEvent.click(tab(/^Chờ duyệt/));
    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/returns?orderId=o-5", { scroll: false });
  });

  it("goes back to the bare page when nothing else is left", async () => {
    await renderReturns({ query: { status: "APPROVED" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.none"));

    await userEvent.click(tab(/^Chờ duyệt/));

    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/returns", { scroll: false });
  });

  it.each([
    ["APPROVED", "APPROVED"],
    ["RECEIVED", "RECEIVED"],
    ["REFUNDED", "REFUNDED"],
    ["REJECTED", "REJECTED"],
    ["CANCELLED", "CANCELLED"],
    ["junk", "REQUESTED"],
  ])("asks for status %s when the address says %s", async (param, expected) => {
    const { calls } = await renderReturns({ query: { status: param }, pages: [{ data: [], total: 0 }] });
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(0));

    expect(calls.lists[0].get("status")).toBe(expected);
  });

  it("asks for no status on the 'all' tab", async () => {
    const { calls } = await renderReturns({ query: { status: "all" }, pages: [{ data: [adminReturn()], total: 1 }] });
    await screen.findByText("#r-1");

    expect(calls.lists[0].has("status")).toBe(false);
  });

  it("starts the table fresh when the tab or the order filter changes in the address", async () => {
    const { calls, rerender } = await renderReturns({ pages: [{ data: [adminReturn()], total: 1 }] });
    await screen.findByText("#r-1");
    navigation.searchParams = new URLSearchParams({ status: "REJECTED", orderId: "o-8" });
    const { default: ReturnsContent } = await import("@/src/app/[locale]/(admin)/admin/returns/ReturnsContent");

    rerender(<ReturnsContent />);

    await waitFor(() => expect(calls.lists).toHaveLength(2));
    expect(calls.lists[1].get("status")).toBe("REJECTED");
    expect(calls.lists[1].get("orderId")).toBe("o-8");
  });

  it("shows the chip for the order in the address, with a way to clear it, and none otherwise", async () => {
    const view = await renderReturns({ query: { orderId: "o-9" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.none"));
    const chip = screen.getByRole("link", { name: /Đơn #o-9/ });
    expect(chip).toHaveAttribute("href", "/admin/returns");
    expect(view.calls.lists[0].get("orderId")).toBe("o-9");
    view.unmount();

    const none = await renderReturns({ pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.none"));
    expect(screen.queryByRole("link", { name: /Đơn #/ })).not.toBeInTheDocument();
    expect(none.calls.lists[0].has("orderId")).toBe(false);
  });
});

describe("ARR-2N the notice", () => {
  it("shows the number, what it counts and what it leaves out, and a button for all, on the waiting tab", async () => {
    await renderReturns({ counts: { returns: 2 }, pages: [{ data: [adminReturn()], total: 1 }] });

    const box = await screen.findByRole("region", { name: "2 yêu cầu chờ duyệt" });

    expect(box).toHaveTextContent(R("pending.includes"));
    expect(box).toHaveTextContent(R("pending.excludes"));
    expect(box).toHaveTextContent(R("pending.how"));
    await userEvent.click(within(box).getByRole("button", { name: msg("admin.components.pendingNotice.viewAll") }));
    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/returns?status=all", { scroll: false });
  });

  it("has a second line that goes to the approved requests waiting for the parcel", async () => {
    await renderReturns({ counts: { returns: 2 }, pages: [{ data: [adminReturn()], total: 1 }] });
    const button = await screen.findByRole("button", { name: R("pending.approvedView") });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);

    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/returns?status=APPROVED", { scroll: false });
  });

  it("marks the approved line as pressed when that tab is open", async () => {
    await renderReturns({ counts: { returns: 2 }, query: { status: "APPROVED" }, pages: [{ data: [], total: 0 }] });

    expect(await screen.findByRole("button", { name: R("pending.approvedView") })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers the waiting ones from another tab", async () => {
    await renderReturns({ counts: { returns: 2 }, query: { status: "all" }, pages: [{ data: [adminReturn()], total: 1 }] });

    await userEvent.click(await screen.findByRole("button", { name: R("pending.view") }));

    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/returns", { scroll: false });
  });

  it("is not shown when nothing waits, or to an account that cannot see the number", async () => {
    const calm = await renderReturns({ counts: { returns: 0 }, pages: [{ data: [adminReturn()], total: 1 }] });
    await screen.findByText("#r-1");
    expect(screen.queryByRole("button", { name: R("pending.approvedView") })).not.toBeInTheDocument();
    calm.unmount();

    await renderReturns({ counts: { orders: 5 }, pages: [{ data: [adminReturn()], total: 1 }] });
    await screen.findByText("#r-1");
    expect(screen.queryByRole("button", { name: R("pending.approvedView") })).not.toBeInTheDocument();
  });
});

describe("ARR-3 opening a request", () => {
  const request = adminReturn({ id: "r-1", note: "Too small" });

  it("opens the panel at once with the row's data, names it in the address, then shows the fuller data", async () => {
    const fuller = adminReturn({ id: "r-1", note: "Too small", adminNote: "Send to the shop" });
    const { calls } = await renderReturns({ pages: [{ data: [adminReturn({ id: "r-1" })], total: 1 }], detail: fuller });
    await screen.findByText("#r-1");

    await userEvent.click(within(rowOf("#r-1")).getByRole("button", { name: R("table.view") }));

    expect(await panelTitle("r-1")).toBeInTheDocument();
    expect(navigation.router.push).toHaveBeenCalledWith("/admin/returns?returnId=r-1", { scroll: false });
    expect(await screen.findByText("Send to the shop")).toBeInTheDocument();
    expect(calls.details).toEqual(["r-1"]);
  });

  it("keeps the row's data when the fuller data cannot be loaded", async () => {
    await renderReturns({ pages: [{ data: [request], total: 1 }], detail: 500 });
    await screen.findByText("#r-1");

    await userEvent.click(within(rowOf("#r-1")).getByRole("button", { name: R("table.view") }));

    expect(await screen.findByText("Too small")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Yêu cầu trả hàng #r-1" })).toBeInTheDocument();
  });

  it("closes by taking the request out of the address, keeping the other filters", async () => {
    await renderReturns({ query: { status: "all" }, pages: [{ data: [request], total: 1 }], detail: request });
    await screen.findByText("#r-1");
    await userEvent.click(within(rowOf("#r-1")).getByRole("button", { name: R("table.view") }));
    await panelTitle("r-1");

    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.formKit.close") }));

    expect(navigation.router.push).toHaveBeenLastCalledWith("/admin/returns?status=all", { scroll: false });
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: "Yêu cầu trả hàng #r-1" })).not.toBeInTheDocument());
  });

  it("opens the request named in the address on arrival, once", async () => {
    const { calls } = await renderReturns({ query: { returnId: "r-9" }, pages: [{ data: [], total: 0 }], detail: adminReturn({ id: "r-9", note: "From the link" }) });

    expect(await screen.findByText("From the link")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(calls.details).toEqual(["r-9"]);
  });

  it("shows no panel when the request in the address cannot be found", async () => {
    const { calls } = await renderReturns({ query: { returnId: "zzz" }, pages: [{ data: [], total: 0 }], detail: 404 });
    await waitFor(() => expect(calls.details).toEqual(["zzz"]));
    await screen.findByText(R("table.empty.none"));

    expect(screen.queryByRole("heading", { level: 2, name: /Yêu cầu trả hàng/ })).not.toBeInTheDocument();
  });

  it("closes the panel when the address no longer names a request", async () => {
    const { rerender } = await renderReturns({ query: { returnId: "r-9" }, pages: [{ data: [], total: 0 }], detail: adminReturn({ id: "r-9", note: "From the link" }) });
    await screen.findByText("From the link");
    navigation.searchParams = new URLSearchParams();
    const { default: ReturnsContent } = await import("@/src/app/[locale]/(admin)/admin/returns/ReturnsContent");

    rerender(<ReturnsContent />);

    await waitFor(() => expect(screen.queryByText("From the link")).not.toBeInTheDocument());
  });

  it("does not fetch a request again when its own click has just put it in the address", async () => {
    const { calls, rerender } = await renderReturns({ pages: [{ data: [request], total: 1 }], detail: request });
    await screen.findByText("#r-1");
    await userEvent.click(within(rowOf("#r-1")).getByRole("button", { name: R("table.view") }));
    await panelTitle("r-1");
    navigation.searchParams = new URLSearchParams({ returnId: "r-1" });
    const { default: ReturnsContent } = await import("@/src/app/[locale]/(admin)/admin/returns/ReturnsContent");

    rerender(<ReturnsContent />);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(calls.details).toEqual(["r-1"]);
  });

  it("reloads the list after an action on the open request", async () => {
    const { calls } = await renderReturns({ pages: [{ data: [adminReturn({ id: "r-1", status: "REQUESTED" })], total: 1 }], action: adminReturn({ id: "r-1", status: "APPROVED" }) });
    await screen.findByText("#r-1");
    await userEvent.click(within(rowOf("#r-1")).getByRole("button", { name: R("table.view") }));
    await panelTitle("r-1");
    const before = calls.lists.length;

    await userEvent.click(screen.getByRole("button", { name: R("detail.actions.approve") }));
    await userEvent.click(await screen.findByRole("button", { name: R("approve.submit") }));

    await waitFor(() => expect(calls.approves).toHaveLength(1));
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });
});

describe("ARR-4E nothing to show, or no way to load it", () => {
  it("says there are no requests, or that nothing matches the search", async () => {
    await renderReturns({ pages: [{ data: [], total: 0 }] });
    expect(await screen.findByText(R("table.empty.none"))).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(R("table.searchPlaceholder")), "zzz");

    expect(await screen.findByText(R("table.empty.filtered"))).toBeInTheDocument();
  });

  it("says it could not load instead of saying there are no requests", async () => {
    await renderReturns({ failListFrom: 1 });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText(R("table.empty.none"))).not.toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s nothing, only that the data could not be loaded", async (_label, as, deny) => {
    await renderReturns({ as, deny, pages: [{ data: [adminReturn()], total: 1 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("#r-1")).not.toBeInTheDocument();
  });
});
