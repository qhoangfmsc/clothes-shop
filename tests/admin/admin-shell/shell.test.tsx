import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SYSTEM_PASSWORD } from "@/src/lib/system-password";
import { ACCESS_KEY, REFRESH_KEY } from "@/tests/_support/api";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import AdminLayoutClient from "@/src/app/[locale]/(admin)/AdminLayoutClient";
import { notifyAdminMutation } from "@/src/lib/admin-events";
import { IDENTITIES, LIMITED_PERMISSIONS } from "@/tests/_support/identities";
import { renderShell, countsApi } from "./shell-kit";

const shell = () => (
  <AdminLayoutClient>
    <p>page content</p>
  </AdminLayoutClient>
);

/* The admin frame: who gets in, the menu, the drawer, the breadcrumb (specs/admin/admin-shell.md, flows ADM-1 to ADM-6E). */

const S = (key: string, locale: "vi" | "en" = "vi") => msg(`admin.shell.${key}`, locale);
const sidebar = () => document.getElementById("admin-sidebar") as HTMLElement;
const navLink = (name: string) => within(sidebar()).getByRole("link", { name: new RegExp(`^${name}`) });
const hasLink = (name: string) => within(sidebar()).queryByRole("link", { name: new RegExp(`^${name}`) }) !== null;
const ALL_ITEMS = ["products", "categories", "collections", "orders", "payments", "returns", "refunds", "users", "reviews", "analytics", "siteConfig", "media"];

describe("ADM-1 who gets in", () => {
  it("shows the page to an admin with every permission", async () => {
    await renderShell({ as: "adminFull" });

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("shows the page to a limited admin on the page that admin may see", async () => {
    await renderShell({ as: "adminLimited", path: "/admin/orders" });

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest"],
    ["a shopper", "user"],
  ] as const)("keeps %s out with the 'admin needed' screen and a way back to the shop", async (_label, as) => {
    const { calls } = await renderShell({ as });

    expect(screen.getByText(S("denied.adminRequired.title"))).toBeInTheDocument();
    expect(screen.getByText(S("denied.adminRequired.message"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: S("denied.backToStore") })).toHaveAttribute("href", "/");
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(document.getElementById("admin-sidebar")).toBeNull();
    expect(calls.counts).toBe(0);
  });

  it("does not ask a shopper for the system password", async () => {
    await renderShell({ as: "user", unlocked: false });

    expect(screen.queryByPlaceholderText(msg("shared.feedback.systemPassword.placeholder"))).not.toBeInTheDocument();
  });

  it("shows only a loading note while the session is being worked out", async () => {
    await renderShell({ as: "adminFull", waitForAuth: false });

    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(screen.queryByText(S("denied.adminRequired.title"))).not.toBeInTheDocument();
    expect(await screen.findByText("page content")).toBeInTheDocument();
  });
});

describe("ADM-2 a page the account may not see (typed into the address bar)", () => {
  it.each([
    ["/admin/products", "products"],
    ["/admin/products/123/edit", "products"],
    ["/admin/categories", "categories"],
    ["/admin/payments", "payments"],
    ["/admin/users", "users"],
    ["/admin/site-config", "site config"],
  ])("a limited admin who only sees orders is refused %s (%s)", async (path) => {
    const { calls } = await renderShell({ as: "adminLimited", path });

    expect(screen.getByText(S("denied.route.title"))).toBeInTheDocument();
    expect(screen.getByText(S("denied.route.message"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: S("denied.backToStore") })).toHaveAttribute("href", "/");
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(calls.counts).toBe(0);
  });

  it.each(["/admin", "/admin/orders", "/admin/orders/o-1", "/admin/analytics", "/admin/media", "/admin/something-new"])("a limited admin may open %s", async (path) => {
    await renderShell({ as: "adminLimited", path });

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("is not fooled by a page whose name only begins like a menu item", async () => {
    await renderShell({ as: "adminLimited", path: "/admin/productsx" });

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("does not ask for the system password before it is sure the account may be here", async () => {
    await renderShell({ as: "adminLimited", path: "/admin/products", unlocked: false });

    expect(screen.getByText(S("denied.route.title"))).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(msg("shared.feedback.systemPassword.placeholder"))).not.toBeInTheDocument();
  });
});

describe("ADM-3 the system password", () => {
  const field = () => screen.findByPlaceholderText(msg("shared.feedback.systemPassword.placeholder"));

  it("asks for it first, shows nothing else and asks the BE nothing", async () => {
    const { calls } = await renderShell({ unlocked: false });

    expect(await field()).toBeInTheDocument();
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(document.getElementById("admin-sidebar")).toBeNull();
    expect(calls.counts).toBe(0);
  });

  it("opens the frame after the right password, and then asks the BE for the counts", async () => {
    const { calls } = await renderShell({ unlocked: false });

    await userEvent.type(await field(), `${SYSTEM_PASSWORD}{Enter}`);

    expect(await screen.findByText("page content")).toBeInTheDocument();
    await waitFor(() => expect(calls.counts).toBe(1));
  });

  it("sends the visitor to the home page when the prompt is cancelled", async () => {
    await renderShell({ unlocked: false });
    await field();

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.cancel") }));

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
  });

  it("does not ask again on the next page while the unlock is fresh", async () => {
    const { rerender } = await renderShell({ path: "/admin" });

    navigation.pathname = "/admin/orders";
    rerender(shell());

    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(msg("shared.feedback.systemPassword.placeholder"))).not.toBeInTheDocument();
  });

  it("asks again on the next page when more than 15 minutes have passed", async () => {
    const { rerender } = await renderShell({ path: "/admin" });
    sessionStorage.setItem("admin_system_unlocked_at", String(Date.now() - 16 * 60_000));

    navigation.pathname = "/admin/orders";
    rerender(shell());

    expect(await field()).toBeInTheDocument();
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
  });
});

describe("ADM-4 the menu", () => {
  it("shows the dashboard and every item in its group to an admin with every permission", async () => {
    await renderShell({ as: "adminFull" });

    expect(navLink(S("nav.dashboard"))).toHaveAttribute("href", "/admin");
    for (const group of ["orders", "audience", "catalog", "system"]) expect(within(sidebar()).getByText(S(`nav.groups.${group}`))).toBeInTheDocument();
    for (const item of ALL_ITEMS) expect(hasLink(S(`nav.items.${item}`))).toBe(true);
    expect(navLink(S("nav.items.orders"))).toHaveAttribute("href", "/admin/orders");
    expect(navLink(S("nav.items.siteConfig"))).toHaveAttribute("href", "/admin/site-config");
  });

  it("shows a limited admin only the dashboard, the permitted item and the items that need none", async () => {
    await renderShell({ as: "adminLimited", path: "/admin/orders" });

    expect(hasLink(S("nav.dashboard"))).toBe(true);
    expect(hasLink(S("nav.items.orders"))).toBe(true);
    expect(hasLink(S("nav.items.analytics"))).toBe(true);
    expect(hasLink(S("nav.items.media"))).toBe(true);
    for (const item of ["products", "categories", "collections", "payments", "returns", "refunds", "users", "reviews", "siteConfig"]) {
      expect(hasLink(S(`nav.items.${item}`)), item).toBe(false);
    }
  });

  it("hides a group when none of its items is allowed", async () => {
    await renderShell({ as: "adminLimited", path: "/admin/orders" });

    expect(within(sidebar()).getByText(S("nav.groups.orders"))).toBeInTheDocument();
    expect(within(sidebar()).getByText(S("nav.groups.audience"))).toBeInTheDocument();
    expect(within(sidebar()).getByText(S("nav.groups.system"))).toBeInTheDocument();
    expect(within(sidebar()).queryByText(S("nav.groups.catalog"))).not.toBeInTheDocument();
  });

  it("marks the page being viewed, and the dashboard only on the dashboard itself", async () => {
    const dashboard = await renderShell({ path: "/admin" });
    expect(navLink(S("nav.dashboard")).className).toContain("border-l-[var(--accent-primary)]");
    expect(navLink(S("nav.items.orders")).className).not.toContain("border-l-[var(--accent-primary)]");
    dashboard.unmount();

    await renderShell({ path: "/admin/orders/o-1" });
    expect(navLink(S("nav.items.orders")).className).toContain("border-l-[var(--accent-primary)]");
    expect(navLink(S("nav.dashboard")).className).not.toContain("border-l-[var(--accent-primary)]");
    expect(navLink(S("nav.items.products")).className).not.toContain("border-l-[var(--accent-primary)]");
  });

  it("links the logo to the shop and names the area", async () => {
    await renderShell();

    expect(within(sidebar()).getByRole("link", { name: /DOOVAN/ })).toHaveAttribute("href", "/");
    expect(within(sidebar()).getByText(S("badge"))).toBeInTheDocument();
  });

  it("shows who is signed in: name, email and role", async () => {
    await renderShell({ as: "adminFull" });

    expect(within(sidebar()).getByText("Admin")).toBeInTheDocument();
    expect(within(sidebar()).getByText("admin@example.com")).toBeInTheDocument();
    expect(within(sidebar()).getByText(msg("common.role.admin"))).toBeInTheDocument();
  });

  it("lets a member of staff who is not an admin in when granted a permission, and marks the role differently from an admin", async () => {
    const staff = { ...IDENTITIES.user!, name: "Sam", permissions: LIMITED_PERMISSIONS };
    await renderShell({ as: staff, path: "/admin/orders" });

    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(within(sidebar()).getByText(msg("common.role.user")).className).toContain("bg-white/10");
    expect(within(sidebar()).getByText(msg("common.role.user")).className).not.toContain("bg-[rgba(201,169,110,0.2)]");
  });

  it("marks an admin's role in gold", async () => {
    await renderShell({ as: "adminFull" });

    expect(within(sidebar()).getByText(msg("common.role.admin")).className).toContain("bg-[rgba(201,169,110,0.2)]");
  });

  it("signs out and goes to the login page", async () => {
    await renderShell();

    await userEvent.click(within(sidebar()).getByRole("button", { name: S("logout") }));

    expect(navigation.router.replace).toHaveBeenCalledWith("/login");
    await waitFor(() => expect(localStorage.getItem(ACCESS_KEY)).toBeNull());
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it("speaks English in English", async () => {
    await renderShell({ locale: "en" });

    expect(hasLink(S("nav.dashboard", "en"))).toBe(true);
    expect(within(sidebar()).getByRole("button", { name: S("logout", "en") })).toBeInTheDocument();
  });
});

describe("ADM-5 the menu drawer on a phone", () => {
  const menuButton = () => screen.getByRole("button", { name: S("menu") });
  const closeButton = () => within(sidebar()).getByRole("button", { name: S("closeMenu") });
  const open = () => expect(sidebar().className).toContain("translate-x-0 visible");

  it("is closed at first: hidden from the keyboard, and the button says so", async () => {
    await renderShell();

    expect(sidebar().className).toContain("max-lg:-translate-x-full max-lg:invisible");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveAttribute("aria-controls", "admin-sidebar");
  });

  it("opens with the menu button and puts the focus on the close button", async () => {
    await renderShell();

    await userEvent.click(menuButton());

    open();
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    expect(closeButton()).toHaveFocus();
  });

  it("closes with its X button and returns the focus to the menu button", async () => {
    await renderShell();
    await userEvent.click(menuButton());

    await userEvent.click(closeButton());

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("closes when the dark area behind it is tapped", async () => {
    await renderShell();
    await userEvent.click(menuButton());

    fireEvent.click(document.querySelector('[aria-hidden="true"].fixed.inset-0') as HTMLElement);

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("closes with Escape, and Escape does nothing while it is closed", async () => {
    await renderShell();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menuButton()).not.toHaveFocus();
    await userEvent.click(menuButton());

    fireEvent.keyDown(document, { key: "Enter" });
    open();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("closes itself when the page changes", async () => {
    const { rerender } = await renderShell({ path: "/admin" });
    await userEvent.click(menuButton());
    open();

    navigation.pathname = "/admin/orders";
    rerender(shell());

    expect(sidebar().className).toContain("max-lg:invisible");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("ADM-6 where you are (breadcrumb)", () => {
  const crumbs = () => Array.from(document.querySelectorAll("main .capitalize")).map((el) => el.textContent);

  it("names each part of the address in the language of the page", async () => {
    await renderShell({ path: "/admin/site-config" });

    expect(crumbs()).toEqual([S("breadcrumb.admin"), S("breadcrumb.site-config")]);
  });

  it("shows a part it has no name for as it is, and marks the last one", async () => {
    await renderShell({ path: "/admin/orders/o-1" });

    expect(crumbs()).toEqual([S("breadcrumb.admin"), S("breadcrumb.orders"), "o-1"]);
    const last = Array.from(document.querySelectorAll("main .capitalize")).pop() as HTMLElement;
    expect(last.className).toContain("font-semibold");
  });

  it("shows the page's own content in the main area", async () => {
    await renderShell({ path: "/admin/orders" });

    expect(within(document.querySelector("main") as HTMLElement).getByText("page content")).toBeInTheDocument();
  });
});

describe("ADM-6E the numbers of work waiting", () => {
  it("shows a count at the end of each menu item that has work, and says it in words for screen readers", async () => {
    await renderShell({ counts: { orders: 3, payments: 1, refunds: 2, returns: 4, reviews: 5 } });

    expect(await within(navLink(S("nav.items.orders"))).findByText("3")).toBeInTheDocument();
    expect(within(navLink(S("nav.items.orders"))).getByText("3 đơn cần xử lý")).toHaveClass("sr-only");
    expect(within(navLink(S("nav.items.orders"))).getByText("3")).toHaveAttribute("title", "3 đơn cần xử lý");
    expect(within(navLink(S("nav.items.payments"))).getByText("1")).toBeInTheDocument();
    expect(within(navLink(S("nav.items.refunds"))).getByText("2")).toBeInTheDocument();
    expect(within(navLink(S("nav.items.returns"))).getByText("4")).toBeInTheDocument();
    expect(within(navLink(S("nav.items.reviews"))).getByText("5")).toBeInTheDocument();
  });

  it("shows no badge for zero, or for a key the BE left out", async () => {
    const { calls } = await renderShell({ counts: { orders: 0, payments: 2 } });
    await waitFor(() => expect(calls.counts).toBe(1));
    await within(navLink(S("nav.items.payments"))).findByText("2");

    expect(within(navLink(S("nav.items.orders"))).queryByText("0")).not.toBeInTheDocument();
    expect(within(navLink(S("nav.items.refunds"))).queryByText(/\d/)).not.toBeInTheDocument();
    expect(within(navLink(S("nav.items.users"))).queryByText(/\d/)).not.toBeInTheDocument();
  });

  it("writes 99+ above 99", async () => {
    await renderShell({ counts: { orders: 100 } });

    expect(await within(navLink(S("nav.items.orders"))).findByText(S("nav.pending.overflow"))).toBeInTheDocument();
    expect(within(navLink(S("nav.items.orders"))).getByText("100 đơn cần xử lý")).toBeInTheDocument();
  });

  it("writes 99 as it is", async () => {
    await renderShell({ counts: { orders: 99 } });

    expect(await within(navLink(S("nav.items.orders"))).findByText("99")).toBeInTheDocument();
  });

  it("puts a dot on the phone menu button while anything waits, and none otherwise", async () => {
    const waiting = await renderShell({ counts: { reviews: 2 } });
    expect(await screen.findByText(S("pendingDot"))).toBeInTheDocument();
    waiting.unmount();

    const calm = await renderShell({ counts: { orders: 0 } });
    await waitFor(() => expect(calm.calls.counts).toBe(1));
    expect(screen.queryByText(S("pendingDot"))).not.toBeInTheDocument();
  });

  it("shows no badge anywhere when the BE refuses the account (403), and no error", async () => {
    const { calls } = await renderShell({ as: "adminLimited", path: "/admin/orders", counts: { status: 403 } });
    await waitFor(() => expect(calls.counts).toBe(1));

    expect(within(sidebar()).queryByText(/^\d+$/)).not.toBeInTheDocument();
    expect(screen.queryByText(S("pendingDot"))).not.toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it.each([
    ["a server error", { status: 500 }],
    ["a lost connection", "network"],
  ] as const)("shows no badge after %s, and does not complain", async (_label, counts) => {
    const { calls } = await renderShell({ counts });
    await waitFor(() => expect(calls.counts).toBe(1));

    expect(within(sidebar()).queryByText(/^\d+$/)).not.toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("keeps the last numbers when asking again fails", async () => {
    await renderShell({ counts: { orders: 3 } });
    await within(navLink(S("nav.items.orders"))).findByText("3");
    const failing = countsApi("network");

    await act(async () => notifyAdminMutation());

    await waitFor(() => expect(failing.counts).toBe(1));
    expect(within(navLink(S("nav.items.orders"))).getByText("3")).toBeInTheDocument();
  });

  it("asks again once, a moment after a burst of admin writes, and shows the new numbers", async () => {
    const { calls } = await renderShell({ counts: { orders: 3 } });
    await within(navLink(S("nav.items.orders"))).findByText("3");
    const next = countsApi({ orders: 7 });

    await act(async () => {
      notifyAdminMutation();
      notifyAdminMutation();
      notifyAdminMutation();
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(next.counts).toBe(0);

    await within(navLink(S("nav.items.orders"))).findByText("7");
    expect(next.counts).toBe(1);
    expect(calls.counts).toBe(1);
  });

  it("does not put the menu dot on for a kind of work it does not know", async () => {
    const { calls } = await renderShell({ counts: { mystery: 9 } as never });
    await waitFor(() => expect(calls.counts).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByText(S("pendingDot"))).not.toBeInTheDocument();
  });

  it("asks again every minute while the tab is showing, and not while it is hidden", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { calls } = await renderShell({ counts: { orders: 1 } });
      await waitFor(() => expect(calls.counts).toBe(1));

      await act(async () => void vi.advanceTimersByTime(61_000));
      await waitFor(() => expect(calls.counts).toBe(2));

      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      await act(async () => void vi.advanceTimersByTime(180_000));
      expect(calls.counts).toBe(2);
    } finally {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      vi.useRealTimers();
    }
  });

  it("does not try again by itself after a failure", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { calls } = await renderShell({ counts: { status: 500 } });
      await waitFor(() => expect(calls.counts).toBe(1));

      await act(async () => void vi.advanceTimersByTime(20_000));

      expect(calls.counts).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores values that are not whole usable numbers, and keys it does not know", async () => {
    await renderShell({ counts: { orders: -1, payments: "3", refunds: 2, mystery: 9, returns: null } as never });

    await within(navLink(S("nav.items.refunds"))).findByText("2");
    expect(within(navLink(S("nav.items.orders"))).queryByText(/\d/)).not.toBeInTheDocument();
    expect(within(navLink(S("nav.items.payments"))).queryByText(/\d/)).not.toBeInTheDocument();
    expect(within(navLink(S("nav.items.returns"))).queryByText(/\d/)).not.toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await renderShell({ counts: { orders: 3 }, locale: "en" });

    expect(await within(navLink(S("nav.items.orders", "en"))).findByText("3 orders need action")).toBeInTheDocument();
  });
});
