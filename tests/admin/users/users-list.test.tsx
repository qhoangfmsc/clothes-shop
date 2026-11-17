import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { dateText, msg } from "@/tests/_support/messages";
import { adminUser, renderUsers } from "./users-kit";

/* The users table: what it asks, shows and filters, and who gets the View button (specs/admin/users.md, flows AUS-1 to AUS-3E). */

const U = (key: string) => msg(`admin.users.${key}`);
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const last = <T,>(items: T[]) => items[items.length - 1];
const filter = (key: string) => screen.getByRole("combobox", { name: U(`table.filters.${key}`) });

describe("AUS-1 the table", () => {
  it("opens on everybody, newest first, with the total", async () => {
    const { calls } = await renderUsers({ pages: [{ data: [adminUser()], total: 12 }] });

    await screen.findByText("Mai Tran");

    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    for (const key of ["role", "status", "search"]) expect(calls.lists[0].has(key), key).toBe(false);
    expect(screen.getByText("Tổng 12 người dùng")).toBeInTheDocument();
  });

  it("shows each user with a picture or an initial, name, email, role, state and the day they joined", async () => {
    await renderUsers({ pages: [{ data: [adminUser({ image: "https://lh3.googleusercontent.com/a.jpg", role: "admin" })], total: 1 }] });
    await screen.findByText("Mai Tran");
    const row = rowOf("Mai Tran");

    expect(row.querySelector("img")).not.toBeNull();
    expect(within(row).getByText("mai@example.com")).toBeInTheDocument();
    expect(within(row).getByText(msg("common.role.admin"))).toBeInTheDocument();
    expect(within(row).getByText(msg("common.status.active"))).toBeInTheDocument();
    expect(within(row).getByText(dateText("2026-03-05T05:00:00.000Z", "short"))).toBeInTheDocument();
  });

  it("shows the first letter of the name, or of the email when there is no name, instead of a picture", async () => {
    await renderUsers({ pages: [{ data: [adminUser({ id: "u-1", name: "linh" }), adminUser({ id: "u-2", name: null, email: "zed@example.com" })], total: 2 }] });
    await screen.findByText("linh");

    expect(rowOf("linh").querySelector("img")).toBeNull();
    expect(within(rowOf("linh")).getByText("L")).toBeInTheDocument();
    expect(within(rowOf("zed@example.com")).getByText("Z")).toBeInTheDocument();
    expect(within(rowOf("zed@example.com")).getByText("—")).toBeInTheDocument();
  });

  it("colours an admin gold and a customer blue, an active account green and any other one rose", async () => {
    await renderUsers({ pages: [{ data: [adminUser({ id: "u-1", name: "Ann", role: "admin" }), adminUser({ id: "u-2", name: "Bob", role: "user", status: "disabled" })], total: 2 }] });
    await screen.findByText("Ann");

    expect(within(rowOf("Ann")).getByText(msg("common.role.admin")).className).toContain("accent-primary");
    expect(within(rowOf("Bob")).getByText(msg("common.role.user")).className).toContain("accent-blue");
    expect(within(rowOf("Ann")).getByText(msg("common.status.active")).className).toContain("accent-sage");
    expect(within(rowOf("Bob")).getByText(msg("common.status.disabled")).className).toContain("accent-rose");
  });

  it("shows a state it has no word for as it came", async () => {
    await renderUsers({ pages: [{ data: [adminUser({ status: "frozen" as never })], total: 1 }] });
    await screen.findByText("Mai Tran");

    expect(within(rowOf("Mai Tran")).getByText("frozen").className).toContain("accent-rose");
  });

  it("searches, sorts six ways, and filters by role and by state", async () => {
    const { calls } = await renderUsers({ pages: [{ data: [adminUser()], total: 1 }] });
    await screen.findByText("Mai Tran");

    expect(within(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") })).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["-createdAt", "createdAt", "name", "-name", "email", "-email"]);
    expect(within(filter("role")).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "user", "admin"]);
    expect(within(filter("status")).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "active", "disabled"]);
    await userEvent.type(screen.getByPlaceholderText(U("table.searchPlaceholder")), "mai");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("mai"));
    await userEvent.selectOptions(filter("role"), "admin");
    await waitFor(() => expect(last(calls.lists).get("role")).toBe("admin"));
    await userEvent.selectOptions(filter("status"), "disabled");
    await waitFor(() => expect(last(calls.lists).get("status")).toBe("disabled"));
  });

  it("reads in English in English", async () => {
    await renderUsers({ locale: "en", pages: [{ data: [adminUser({ role: "admin" })], total: 1 }] });
    await screen.findByText("Mai Tran");

    expect(within(rowOf("Mai Tran")).getByText(msg("common.role.admin", "en"))).toBeInTheDocument();
  });
});

describe("AUS-2 who may open a user", () => {
  it("gives the View button to an admin who may update users", async () => {
    await renderUsers({ pages: [{ data: [adminUser()], total: 1 }] });
    await screen.findByText("Mai Tran");

    expect(within(rowOf("Mai Tran")).getByRole("button", { name: U("table.view") })).toBeInTheDocument();
  });

  it.each([
    ["only view users", adminWith(PERMISSIONS.USER_ADMIN_VIEW)],
    ["only view orders", "adminLimited"],
  ] as const)("gives no View button to an admin who may %s", async (_label, as) => {
    await renderUsers({ as, pages: [{ data: [adminUser()], total: 1 }] });
    await screen.findByText("Mai Tran");

    expect(within(rowOf("Mai Tran")).queryByRole("button", { name: U("table.view") })).not.toBeInTheDocument();
  });
});

describe("AUS-3E nothing to show, or no way to load it", () => {
  it("says there is no data, or that nothing matches the search", async () => {
    await renderUsers({ pages: [{ data: [], total: 0 }] });
    expect(await screen.findByText(msg("admin.components.dataTable.empty.none"))).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(U("table.searchPlaceholder")), "zzz");

    expect(await screen.findByText(msg("admin.components.dataTable.empty.filtered"))).toBeInTheDocument();
  });

  it("says it could not load instead of saying there is no data", async () => {
    await renderUsers({ failListFrom: 1 });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText(msg("admin.components.dataTable.empty.none"))).not.toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s nothing, only that the data could not be loaded", async (_label, as, deny) => {
    await renderUsers({ as, deny, pages: [{ data: [adminUser()], total: 1 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("Mai Tran")).not.toBeInTheDocument();
  });
});
