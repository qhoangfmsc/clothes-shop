import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { collection, renderCollections } from "./collections-kit";

/* The collection table and who may act on it (specs/admin/collections.md, flows ACL-1 to ACL-3E). */

const L = (key: string) => msg(`admin.collections.${key}`);
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const last = <T,>(items: T[]) => items[items.length - 1];
const seasonFilter = () => screen.getByRole("combobox", { name: L("table.filters.season") });

describe("ACL-1 the table", () => {
  it("opens newest first, 25 to a page, with the total", async () => {
    const { calls } = await renderCollections({ pages: [{ data: [collection()], total: 7 }] });

    await screen.findByText("Spring");

    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(calls.lists[0].has("season")).toBe(false);
    expect(screen.getByText("7 bộ sưu tập")).toBeInTheDocument();
  });

  it("shows each collection with its picture, name, subtitle, season and how many products it has", async () => {
    await renderCollections({ pages: [{ data: [collection({ image: "https://img.example/c.jpg", products: [{ id: "p1" }, { id: "p2" }] })], total: 1 }] });
    await screen.findByText("Spring");
    const row = rowOf("Spring");

    expect(row.querySelector("img")).not.toBeNull();
    expect(within(row).getByText("Light and bright")).toBeInTheDocument();
    expect(within(row).getByText("Limited Edition")).toBeInTheDocument();
    expect(within(row).getByText("2 sản phẩm")).toBeInTheDocument();
  });

  it("shows a placeholder for a missing picture, and dashes for a missing subtitle or season; zero products", async () => {
    await renderCollections({ pages: [{ data: [collection({ image: "", subtitle: "", season: "", products: undefined })], total: 1 }] });
    await screen.findByText("Spring");
    const row = rowOf("Spring");

    expect(row.querySelector("img")).toBeNull();
    expect(row.querySelector("svg")).not.toBeNull();
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).getByText("0 sản phẩm")).toBeInTheDocument();
    expect(within(row).queryByText("Light and bright")).not.toBeInTheDocument();
    expect(row.querySelectorAll("p")).toHaveLength(1);
  });

  it("searches and sorts four ways", async () => {
    const { calls } = await renderCollections({ pages: [{ data: [collection()], total: 1 }] });
    await screen.findByText("Spring");

    expect(within(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") })).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["-createdAt", "createdAt", "name", "-name"]);
    await userEvent.type(screen.getByPlaceholderText(L("table.searchPlaceholder")), "spr");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("spr"));
  });

  it("reads in English in English", async () => {
    await renderCollections({ locale: "en", pages: [{ data: [collection()], total: 1 }] });
    await screen.findByText("Spring");

    expect(screen.getByText(msg("admin.collections.page.add", "en"))).toBeInTheDocument();
  });
});

describe("ACL-1S the season filter", () => {
  it("starts with the known season and learns the others from the pages it has loaded, never forgetting one", async () => {
    const { calls } = await renderCollections({ pages: [{ data: [collection({ id: "a", season: "Limited Edition" }), collection({ id: "b", name: "Autumn", slug: "autumn", season: "Autumn 2026" })], total: 2 }] });
    await screen.findByText("Autumn");

    expect(within(seasonFilter()).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "Limited Edition", "Autumn 2026"]);
    await userEvent.selectOptions(seasonFilter(), "Autumn 2026");
    await waitFor(() => expect(last(calls.lists).get("season")).toBe("Autumn 2026"));
    expect(within(seasonFilter()).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "Limited Edition", "Autumn 2026"]);
  });

  it("keeps a season it saw earlier when the next page, filtered by another season, no longer has it", async () => {
    const all = [collection({ id: "a", name: "Spring", season: "Limited Edition" }), collection({ id: "b", name: "Autumn", slug: "autumn", season: "Autumn 2026" })];
    await renderCollections({ answer: (params) => { const season = params.get("season"); const data = season ? all.filter((c) => c.season === season) : all; return { data, total: data.length }; } });
    await screen.findByText("Autumn");

    await userEvent.selectOptions(seasonFilter(), "Limited Edition");
    await waitFor(() => expect(screen.queryByText("Autumn")).not.toBeInTheDocument());

    expect(within(seasonFilter()).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "Limited Edition", "Autumn 2026"]);
  });

  it("offers only the known season when no collection has another", async () => {
    await renderCollections({ pages: [{ data: [collection({ season: "" })], total: 1 }] });
    await screen.findByText("Spring");

    expect(within(seasonFilter()).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "Limited Edition"]);
  });
});

describe("ACL-2 who may do what", () => {
  const edit = () => screen.queryAllByRole("button", { name: msg("admin.components.crud.edit") });
  const remove = () => screen.queryAllByRole("button", { name: msg("admin.components.crud.delete") });
  const add = () => screen.queryByRole("button", { name: new RegExp(L("page.add")) });

  it("gives an admin with every permission the add, edit and delete buttons", async () => {
    await renderCollections({ pages: [{ data: [collection()], total: 1 }] });
    await screen.findByText("Spring");

    expect(add()).toBeInTheDocument();
    expect(edit()).toHaveLength(1);
    expect(remove()).toHaveLength(1);
  });

  it.each([
    ["create", PERMISSIONS.COLLECTION_CREATE, { add: true, edit: false, remove: false }],
    ["update", PERMISSIONS.COLLECTION_UPDATE, { add: false, edit: true, remove: false }],
    ["delete", PERMISSIONS.COLLECTION_DELETE, { add: false, edit: false, remove: true }],
    ["view", PERMISSIONS.COLLECTION_VIEW, { add: false, edit: false, remove: false }],
  ] as const)("an admin who may only %s gets just the matching button", async (_label, permission, expected) => {
    await renderCollections({ as: adminWith(permission), pages: [{ data: [collection()], total: 1 }] });
    await screen.findByText("Spring");

    expect(Boolean(add())).toBe(expected.add);
    expect(edit().length > 0).toBe(expected.edit);
    expect(remove().length > 0).toBe(expected.remove);
  });
});

describe("ACL-3E nothing to show, or no way to load it", () => {
  it("says there is no data, or that nothing matches the search", async () => {
    await renderCollections({ pages: [{ data: [], total: 0 }] });
    expect(await screen.findByText(msg("admin.components.dataTable.empty.none"))).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(L("table.searchPlaceholder")), "zzz");

    expect(await screen.findByText(msg("admin.components.dataTable.empty.filtered"))).toBeInTheDocument();
  });

  it("says it could not load instead of saying there is no data", async () => {
    await renderCollections({ failListFrom: 1 });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText(msg("admin.components.dataTable.empty.none"))).not.toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s nothing, only that the data could not be loaded", async (_label, as, deny) => {
    await renderCollections({ as, deny, pages: [{ data: [collection()], total: 1 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("Spring")).not.toBeInTheDocument();
  });
});
