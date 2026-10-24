import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { SYSTEM_PASSWORD } from "@/src/lib/system-password";
import { isSystemUnlocked } from "@/src/lib/system-password-session";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";
import { unlockSystem } from "@/tests/_support/admin";
import { msg, msgf } from "@/tests/_support/messages";
import { adminOrder, adminUser, renderUsers, type RenderUsersOptions } from "./users-kit";

/* The user window: the password question, the orders tab, the order on top, and the role tab (specs/admin/users.md, flows AUS-4 to AUS-8E). */

const U = (key: string) => msg(`admin.users.${key}`);
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const PROMPT = msg("shared.feedback.systemPassword.title");
const passwordBox = () => screen.getByPlaceholderText(msg("shared.feedback.systemPassword.placeholder"));
const windowTitle = () => screen.findByRole("heading", { level: 2, name: U("modal.title") });
const ordersOf = (count: number, from = 1) => Array.from({ length: count }, (_, i) => adminOrder({ id: `o-${from + i}`, items: [] }));

async function openWindow(options: RenderUsersOptions = {}, user = adminUser()) {
  const locale = options.locale ?? "vi";
  const view = await renderUsers({ pages: [{ data: [user], total: 1 }], ...options });
  await screen.findByText(user.name ?? user.email);
  await userEvent.click(within(rowOf(user.name ?? user.email)).getByRole("button", { name: msg("admin.users.table.view", locale) }));
  await userEvent.type(await screen.findByPlaceholderText(msg("shared.feedback.systemPassword.placeholder", locale)), `${SYSTEM_PASSWORD}{Enter}`);
  await screen.findByRole("heading", { level: 2, name: msg("admin.users.modal.title", locale) });
  return view;
}
const windowBox = () => screen.getByRole("heading", { level: 2, name: U("modal.title") }).closest(".fixed") as HTMLElement;

describe("AUS-4 the password question before opening", () => {
  it("asks for the system password and opens nothing, nor asks the BE for orders, before it is right", async () => {
    const { calls } = await renderUsers({ pages: [{ data: [adminUser()], total: 1 }] });
    await screen.findByText("Mai Tran");

    await userEvent.click(within(rowOf("Mai Tran")).getByRole("button", { name: U("table.view") }));

    expect(await screen.findByText(PROMPT)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: U("modal.title") })).not.toBeInTheDocument();
    expect(calls.orderLists).toEqual([]);
  });

  it("keeps asking after a wrong password, then opens the window and unlocks the admin session on the right one", async () => {
    await renderUsers({ pages: [{ data: [adminUser()], total: 1 }] });
    await screen.findByText("Mai Tran");
    await userEvent.click(within(rowOf("Mai Tran")).getByRole("button", { name: U("table.view") }));

    await userEvent.type(await screen.findByPlaceholderText(msg("shared.feedback.systemPassword.placeholder")), "nope{Enter}");
    expect(await screen.findByText(msg("shared.feedback.systemPassword.error"))).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: U("modal.title") })).not.toBeInTheDocument();
    expect(isSystemUnlocked()).toBe(false);
    await userEvent.type(passwordBox(), `${SYSTEM_PASSWORD}{Enter}`);

    expect(await windowTitle()).toBeInTheDocument();
    expect(isSystemUnlocked()).toBe(true);
  });

  it("asks again even when the admin session was unlocked a moment ago", async () => {
    unlockSystem();
    await renderUsers({ pages: [{ data: [adminUser()], total: 1 }] });
    await screen.findByText("Mai Tran");

    await userEvent.click(within(rowOf("Mai Tran")).getByRole("button", { name: U("table.view") }));

    expect(await screen.findByText(PROMPT)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: U("modal.title") })).not.toBeInTheDocument();
  });

  it("opens nothing when the question is closed with the X button", async () => {
    const { calls } = await renderUsers({ pages: [{ data: [adminUser()], total: 1 }] });
    await screen.findByText("Mai Tran");
    await userEvent.click(within(rowOf("Mai Tran")).getByRole("button", { name: U("table.view") }));
    await screen.findByText(PROMPT);

    await userEvent.click(screen.getByText(PROMPT).closest("form")!.querySelector("button")!);

    await waitFor(() => expect(screen.queryByText(PROMPT)).not.toBeInTheDocument());
    expect(screen.queryByRole("heading", { level: 2, name: U("modal.title") })).not.toBeInTheDocument();
    expect(calls.orderLists).toEqual([]);
  });
});

describe("AUS-5 the window", () => {
  it("names the user by email and opens on the orders tab", async () => {
    await openWindow({ orders: [{ data: ordersOf(1), total: 1 }] });

    expect(screen.getAllByText("mai@example.com").length).toBeGreaterThan(1);
    expect(screen.getByRole("button", { name: U("modal.tabs.orders") }).className).toContain("border-[var(--accent-primary)]");
    expect(await screen.findByText("#o-1")).toBeInTheDocument();
  });

  it("closes with the X button and by a click on the dark area, but not by a click inside", async () => {
    await openWindow({ orders: [{ data: ordersOf(1), total: 1 }] });
    const box = (await windowTitle()).closest(".bg-\\[var\\(--bg-primary\\)\\]") as HTMLElement;

    await userEvent.click(box);
    expect(screen.getByRole("heading", { level: 2, name: U("modal.title") })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: U("modal.close") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: U("modal.title") })).not.toBeInTheDocument());

    await userEvent.click(within(rowOf("Mai Tran")).getByRole("button", { name: U("table.view") }));
    await userEvent.type(await screen.findByPlaceholderText(msg("shared.feedback.systemPassword.placeholder")), `${SYSTEM_PASSWORD}{Enter}`);
    const again = (await windowTitle()).closest(".fixed") as HTMLElement;
    await userEvent.click(again);
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: U("modal.title") })).not.toBeInTheDocument());
  });

  it("starts again for another user: the orders tab, page one, no order open", async () => {
    await renderUsers({ pages: [{ data: [adminUser({ id: "u-1", name: "Ann" }), adminUser({ id: "u-2", name: "Bob", role: "admin" })], total: 2 }], orders: [{ data: ordersOf(5), total: 12 }, { data: ordersOf(5, 6), total: 12 }] });
    await screen.findByText("Ann");
    const open = async (name: string) => {
      await userEvent.click(within(rowOf(name)).getByRole("button", { name: U("table.view") }));
      await userEvent.type(await screen.findByPlaceholderText(msg("shared.feedback.systemPassword.placeholder")), `${SYSTEM_PASSWORD}{Enter}`);
      await windowTitle();
    };
    await open("Ann");
    await screen.findByText("#o-1");
    await userEvent.click(screen.getByRole("button", { name: U("orders.next") }));
    await screen.findByText("#o-6");
    await userEvent.click(screen.getByRole("button", { name: U("modal.tabs.role") }));
    await userEvent.click(screen.getByRole("button", { name: U("modal.close") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: U("modal.title") })).not.toBeInTheDocument());

    await open("Bob");

    expect(screen.getByText("Trang 1 / 3")).toBeInTheDocument();
    expect(await screen.findByText("#o-1")).toBeInTheDocument();
    expect(screen.queryByText("#o-6")).not.toBeInTheDocument();
  });
});

describe("AUS-6 the orders tab", () => {
  it("asks for this user's orders five at a time, says how many there are, and shows each with its number, items, state and total", async () => {
    const orders = [adminOrder({ id: "o-7", status: "shipping", totalVnd: 123_000, items: [adminOrder().items[0], adminOrder().items[0]] })];
    const { calls } = await openWindow({ orders: [{ data: orders, total: 1 }] });

    await screen.findByText("#o-7");

    expect(Object.fromEntries(calls.orderLists[0])).toEqual({ userId: "u-1", limit: "5" });
    expect(screen.getByText("1 đơn hàng của người dùng này")).toBeInTheDocument();
    const line = screen.getByText("#o-7").closest("div") as HTMLElement;
    expect(within(line).getByText("2 sản phẩm")).toBeInTheDocument();
    expect(within(line).getByText(msg("common.orderStatus.shipping"))).toBeInTheDocument();
    expect(within(line).getByText("123.000 VNĐ")).toBeInTheDocument();
    expect(screen.queryByText(/^Trang \d/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: U("orders.next") })).not.toBeInTheDocument();
  });

  it("counts an order without lines as no items, and shows dollars in English", async () => {
    await openWindow({ locale: "en", orders: [{ data: [adminOrder({ id: "o-8", items: undefined as never, totalUsd: 4.73 })], total: 1 }] });

    const line = (await screen.findByText("#o-8")).closest("div") as HTMLElement;

    expect(within(line).getByText("0 items")).toBeInTheDocument();
    expect(within(line).getByText("$4.73")).toBeInTheDocument();
  });

  it("shows each state in its own colour, and a state it does not know in the quiet one", async () => {
    const states = ["pending", "confirmed", "shipping", "delivered", "completed", "cancelled", "mystery"];
    await openWindow({ orders: [{ data: states.map((status, i) => adminOrder({ id: `o-${i + 1}`, status: status as never, items: [] })), total: 7 }] });
    await screen.findByText("#o-1");
    const pill = (id: string, label: string) => within(screen.getByText(`#${id}`).closest("div") as HTMLElement).getByText(label);

    expect(pill("o-1", msg("common.orderStatus.pending")).className).toContain("color-honey");
    expect(pill("o-2", msg("common.orderStatus.confirmed")).className).toContain("accent-blue");
    expect(pill("o-3", msg("common.orderStatus.shipping")).className).toContain("accent-lavender");
    expect(pill("o-4", msg("common.orderStatus.delivered")).className).toContain("accent-sage");
    expect(pill("o-5", msg("common.orderStatus.completed")).className).toContain("accent-primary");
    expect(pill("o-6", msg("common.orderStatus.cancelled")).className).toContain("accent-rose");
    expect(pill("o-7", "mystery").className).toContain("text-[var(--text-muted)]");
  });

  it("says there are no orders for a user with none", async () => {
    await openWindow({ orders: [{ data: [], total: 0 }] });

    expect(await screen.findByText(U("orders.empty"))).toBeInTheDocument();
    expect(screen.getByText("0 đơn hàng của người dùng này")).toBeInTheDocument();
  });

  it("says there are no orders when they cannot be loaded", async () => {
    await openWindow({ orders: 500 });

    expect(await screen.findByText(U("orders.empty"))).toBeInTheDocument();
    expect(screen.getByText("0 đơn hàng của người dùng này")).toBeInTheDocument();
  });

  it("shows a loading line while the orders are on their way", async () => {
    await openWindow({ orders: [{ data: ordersOf(1), total: 1 }], ordersDelayMs: 300 });

    expect(await screen.findByText(U("orders.loading"))).toBeInTheDocument();
    expect(await screen.findByText("#o-1")).toBeInTheDocument();
    expect(screen.queryByText(U("orders.loading"))).not.toBeInTheDocument();
  });

  it("pages through the orders: page numbers, previous off on the first page and next off on the last", async () => {
    const { calls } = await openWindow({ orders: [{ data: ordersOf(5), total: 11 }, { data: ordersOf(5, 6), total: 11 }, { data: ordersOf(1, 11), total: 11 }] });
    await screen.findByText("#o-1");
    expect(screen.getByText("Trang 1 / 3")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: U("orders.previous") })).toBeDisabled();
    expect(screen.getByRole("button", { name: U("orders.next") })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: U("orders.next") }));
    expect(await screen.findByText("#o-6")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: U("orders.previous") })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: U("orders.next") }));
    expect(await screen.findByText("#o-11")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: U("orders.next") })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: U("orders.previous") }));
    expect(await screen.findByText("#o-6")).toBeInTheDocument();

    expect(calls.orderLists.map((q) => q.get("page"))).toEqual([null, "2", "3", "2"]);
  });

  it("shows no pager for exactly five orders", async () => {
    await openWindow({ orders: [{ data: ordersOf(5), total: 5 }] });
    await screen.findByText("#o-1");

    expect(screen.queryByRole("button", { name: U("orders.next") })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Trang \d/)).not.toBeInTheDocument();
  });
});

describe("AUS-7 an order on top of the window", () => {
  const orderTitle = (id: string) => screen.findByRole("heading", { level: 2, name: msgf("admin.components.orderDetailPanel.title", { id }) });

  it("opens the order on top at once, then replaces it with the full one asked for with the user's id", async () => {
    const { calls } = await openWindow({
      orders: [{ data: [adminOrder({ id: "o-5", items: [], note: "" })], total: 1 }],
      orderDetail: adminOrder({ id: "o-5", note: "Leave it at the door" }),
    });

    await userEvent.click(await screen.findByText("#o-5"));

    expect(await orderTitle("o-5")).toBeInTheDocument();
    expect(await screen.findByText("Leave it at the door")).toBeInTheDocument();
    expect(calls.orderDetails).toHaveLength(1);
    expect(calls.orderDetails[0].id).toBe("o-5");
    expect(calls.orderDetails[0].query.get("userId")).toBe("u-1");
    expect(screen.getByRole("heading", { level: 2, name: U("modal.title") })).toBeInTheDocument();
  });

  it("keeps the order from the list when the full one cannot be loaded", async () => {
    await openWindow({ orders: [{ data: [adminOrder({ id: "o-5", items: [], note: "From the list" })], total: 1 }], orderDetail: 500 });

    await userEvent.click(await screen.findByText("#o-5"));

    expect(await orderTitle("o-5")).toBeInTheDocument();
    expect(await screen.findByText("From the list")).toBeInTheDocument();
  });

  it("keeps the order open when something inside it is clicked", async () => {
    await openWindow({ orders: [{ data: [adminOrder({ id: "o-5", items: [] })], total: 1 }] });
    await userEvent.click(await screen.findByText("#o-5"));

    await userEvent.click(await orderTitle("o-5"));

    expect(screen.getByRole("heading", { level: 2, name: msgf("admin.components.orderDetailPanel.title", { id: "o-5" }) })).toBeInTheDocument();
  });

  it("closes the order, leaving the window, with its X button or a click on the dark area", async () => {
    await openWindow({ orders: [{ data: [adminOrder({ id: "o-5", items: [] })], total: 1 }] });
    await userEvent.click(await screen.findByText("#o-5"));
    await orderTitle("o-5");

    await userEvent.click(within((await orderTitle("o-5")).closest(".z-110") as HTMLElement).getByRole("button", { name: msg("admin.components.orderDetailPanel.close") }));

    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: msgf("admin.components.orderDetailPanel.title", { id: "o-5" }) })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 2, name: U("modal.title") })).toBeInTheDocument();
    await userEvent.click(screen.getByText("#o-5"));
    const top = (await orderTitle("o-5")).closest(".z-110") as HTMLElement;
    await userEvent.click(top);
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: msgf("admin.components.orderDetailPanel.title", { id: "o-5" }) })).not.toBeInTheDocument());
  });
});

describe("AUS-8 the role tab", () => {
  const roleBox = () => within(windowBox()).getByRole("combobox") as HTMLSelectElement;
  const save = () => screen.getByRole("button", { name: new RegExp(`^(${U("role.save")}|${U("role.saving")})$`) });
  const toRoleTab = async () => userEvent.click(screen.getByRole("button", { name: U("modal.tabs.role") }));

  it("offers both roles with the user's own chosen, and Save off until the choice changes", async () => {
    await openWindow({}, adminUser({ role: "admin" }));

    await toRoleTab();

    expect(roleBox()).toHaveValue("admin");
    expect(within(roleBox()).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["user", "admin"]);
    expect(save()).toBeDisabled();
    await userEvent.selectOptions(roleBox(), "user");
    expect(save()).toBeEnabled();
    await userEvent.selectOptions(roleBox(), "admin");
    expect(save()).toBeDisabled();
  });

  it("changes the role, tells the admin, keeps the new role in the window and reloads the table", async () => {
    const { calls } = await openWindow({ pages: [{ data: [adminUser({ role: "user" })], total: 1 }] });
    const before = calls.lists.length;
    await toRoleTab();
    await userEvent.selectOptions(roleBox(), "admin");

    await userEvent.click(save());

    await waitFor(() => expect(calls.patches).toEqual([{ id: "u-1", body: { role: "admin" } }]));
    expect(await screen.findByText(U("toast.roleUpdated"))).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
    expect(roleBox()).toHaveValue("admin");
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("shows the saving label and keeps the button off while the change is on its way", async () => {
    await openWindow({});
    server.use(http.patch(`${API}/api/admin/users/:id`, async () => {
      await delay(300);
      return HttpResponse.json({ data: adminUser({ role: "admin" }) });
    }));
    await toRoleTab();
    await userEvent.selectOptions(roleBox(), "admin");

    await userEvent.click(save());

    expect(await screen.findByRole("button", { name: U("role.saving") })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: U("role.save") })).toBeDisabled());
  });

  it("says the change failed, in the BE's words or its own, and keeps Save on", async () => {
    const own = await openWindow({ refuse: { status: 500, body: {} } });
    await toRoleTab();
    await userEvent.selectOptions(roleBox(), "admin");
    await userEvent.click(save());
    expect(await screen.findByText(U("toast.roleFailed"))).toBeInTheDocument();
    expect(save()).toBeEnabled();
    expect(own.calls.patches).toHaveLength(1);
    own.unmount();

    await openWindow({ refuse: { status: 403, body: { message: "Not allowed for you" } } });
    await toRoleTab();
    await userEvent.selectOptions(roleBox(), "admin");
    await userEvent.click(save());
    expect(await screen.findByText("Not allowed for you")).toBeInTheDocument();
  });

  it("goes back to the orders tab without losing them", async () => {
    await openWindow({ orders: [{ data: ordersOf(1), total: 1 }] });
    await screen.findByText("#o-1");
    await toRoleTab();

    await userEvent.click(screen.getByRole("button", { name: U("modal.tabs.orders") }));

    expect(screen.getByText("#o-1")).toBeInTheDocument();
  });
});
