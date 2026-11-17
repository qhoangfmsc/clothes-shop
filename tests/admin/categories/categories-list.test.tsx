import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/src/lib/permissions";
import { API } from "@/tests/_support/api";
import { adminWith } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { category, renderCategories, subCategory } from "./categories-kit";

/* The category table, who may act on it, and putting the rows in order (specs/admin/categories.md, flows ACT-1 to ACT-4E). */

const drag = vi.hoisted(() => ({ onDragEnd: null as null | ((event: { active: { id: string }; over: { id: string } | null }) => void | Promise<void>) }));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: typeof drag.onDragEnd }) => {
      drag.onDragEnd = onDragEnd;
      return <>{children}</>;
    },
  };
});

beforeEach(() => {
  drag.onDragEnd = null;
});

const C = (key: string) => msg(`admin.categories.${key}`);
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const titles = () => screen.getAllByRole("row").slice(1).map((row) => within(row).queryByText(/^(Tops|Bottoms|Shoes)$/)?.textContent);
const last = <T,>(items: T[]) => items[items.length - 1];
const dragEnd = (from: string, to: string | null) => act(async () => drag.onDragEnd?.({ active: { id: from }, over: to ? { id: to } : null }));
const THREE = [category({ id: "c-1", title: "Tops", priority: 1 }), category({ id: "c-2", title: "Bottoms", priority: 2, slug: "bottoms", subcategories: [] }), category({ id: "c-3", title: "Shoes", priority: 3, slug: "shoes", subcategories: [] })];

describe("ACT-1 the table", () => {
  it("opens in priority order with every category on one page, and the count", async () => {
    const { calls } = await renderCategories({ pages: [{ data: THREE, total: 3 }] });

    await screen.findByText("Tops");

    expect(calls.lists[0].get("sort")).toBe("priority");
    expect(calls.lists[0].get("limit")).toBe("200");
    expect(screen.getByText("3 danh mục")).toBeInTheDocument();
    expect(titles()).toEqual(["Tops", "Bottoms", "Shoes"]);
  });

  it("shows each category with its rank, name, sub-category chips and description", async () => {
    await renderCategories({ pages: [{ data: [category({ priority: 4, subcategories: [subCategory({ id: "s-1", label: "Shirts" }), subCategory({ id: "s-2", label: "Vests" })] })], total: 1 }] });
    await screen.findByText("Tops");
    const row = rowOf("Tops");

    expect(within(row).getByText("4")).toBeInTheDocument();
    expect(within(row).getByText("Shirts")).toBeInTheDocument();
    expect(within(row).getByText("Vests")).toBeInTheDocument();
    expect(within(row).getByText("Everything for the top half")).toBeInTheDocument();
  });

  it("shows a dash for no sub-categories and for no description", async () => {
    await renderCategories({ pages: [{ data: [category({ subcategories: [], description: "" })], total: 1 }] });
    await screen.findByText("Tops");

    expect(within(rowOf("Tops")).getAllByText("—")).toHaveLength(2);
  });

  it("shows a missing sub-category list as a dash too", async () => {
    await renderCategories({ pages: [{ data: [category({ subcategories: undefined as never })], total: 1 }] });
    await screen.findByText("Tops");

    expect(within(rowOf("Tops")).getByText("—")).toBeInTheDocument();
  });

  it("cuts a description longer than fifty letters and shows exactly fifty whole", async () => {
    const fifty = "a".repeat(50);
    await renderCategories({ pages: [{ data: [category({ id: "c-1", title: "Tops", description: `${fifty}b` }), category({ id: "c-2", title: "Bottoms", description: fifty })], total: 2 }] });
    await screen.findByText("Tops");

    expect(within(rowOf("Tops")).getByText(`${fifty}...`)).toBeInTheDocument();
    expect(within(rowOf("Bottoms")).getByText(fifty)).toBeInTheDocument();
  });

  it("searches and sorts five ways, priority first", async () => {
    const { calls } = await renderCategories({ pages: [{ data: THREE, total: 3 }] });
    await screen.findByText("Tops");

    expect(within(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") })).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["priority", "-createdAt", "createdAt", "title", "-title"]);
    await userEvent.type(screen.getByPlaceholderText(C("table.searchPlaceholder")), "top");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("top"));
  });

  it("reads in English in English", async () => {
    await renderCategories({ locale: "en", pages: [{ data: THREE, total: 3 }] });
    await screen.findByText("Tops");

    expect(screen.getByText(msg("admin.categories.page.add", "en"))).toBeInTheDocument();
  });
});

describe("ACT-2 who may do what", () => {
  const edit = () => screen.queryAllByRole("button", { name: msg("admin.components.crud.edit") });
  const remove = () => screen.queryAllByRole("button", { name: msg("admin.components.crud.delete") });
  const add = () => screen.queryByRole("button", { name: new RegExp(C("page.add")) });

  it("gives an admin with every permission the add, edit and delete buttons", async () => {
    await renderCategories({ pages: [{ data: [category()], total: 1 }] });
    await screen.findByText("Tops");

    expect(add()).toBeInTheDocument();
    expect(edit()).toHaveLength(1);
    expect(remove()).toHaveLength(1);
  });

  it.each([
    ["create", PERMISSIONS.CATEGORY_CREATE, { add: true, edit: false, remove: false }],
    ["update", PERMISSIONS.CATEGORY_UPDATE, { add: false, edit: true, remove: false }],
    ["delete", PERMISSIONS.CATEGORY_DELETE, { add: false, edit: false, remove: true }],
    ["view", PERMISSIONS.CATEGORY_VIEW, { add: false, edit: false, remove: false }],
  ] as const)("an admin who may only %s gets just the matching button", async (_label, permission, expected) => {
    await renderCategories({ as: adminWith(permission), pages: [{ data: [category()], total: 1 }] });
    await screen.findByText("Tops");

    expect(Boolean(add())).toBe(expected.add);
    expect(edit().length > 0).toBe(expected.edit);
    expect(remove().length > 0).toBe(expected.remove);
  });
});

describe("ACT-3 putting the categories in order", () => {
  it("lets the rows be dragged while the priority sort is on, and not under another sort", async () => {
    await renderCategories({ pages: [{ data: THREE, total: 3 }] });
    await screen.findByText("Tops");
    expect(screen.getAllByRole("button", { name: msg("admin.components.dataTable.reorder.handle") })).toHaveLength(3);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") }), "title");

    await waitFor(() => expect(screen.getAllByRole("button", { name: msg("admin.components.dataTable.reorder.disabled") })[0]).toBeDisabled());
  });

  it("sends every id in the new order, tells the admin and reloads the table", async () => {
    const { calls } = await renderCategories({ pages: [{ data: THREE, total: 3 }] });
    await screen.findByText("Tops");
    const before = calls.lists.length;

    await dragEnd("c-1", "c-3");

    await waitFor(() => expect(calls.reorders).toEqual([["c-2", "c-3", "c-1"]]));
    expect(await screen.findByText(C("toast.reordered"))).toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("puts the rows back, reloads and says why when the BE refuses", async () => {
    const { calls } = await renderCategories({ pages: [{ data: THREE, total: 3 }], refuse: { reorder: { status: 409, body: { message: "Someone else changed the order" } } } });
    await screen.findByText("Tops");
    const before = calls.lists.length;

    await dragEnd("c-1", "c-3");

    expect(await screen.findByText("Someone else changed the order")).toBeInTheDocument();
    await waitFor(() => expect(titles()).toEqual(["Tops", "Bottoms", "Shoes"]));
    expect(calls.lists.length).toBeGreaterThan(before);
  });

  it("puts the rows back at once, without waiting for the table to reload", async () => {
    await renderCategories({ pages: [{ data: THREE, total: 3 }], refuse: { reorder: { status: 409, body: { message: "Someone else changed the order" } } } });
    await screen.findByText("Tops");
    server.use(http.get(`${API}/api/admin/categories`, async () => {
      await delay(600);
      return HttpResponse.json({ data: THREE, total: 3, page: 1, limit: 200 });
    }));

    await dragEnd("c-1", "c-3");
    await screen.findByText("Someone else changed the order");

    expect(titles()).toEqual(["Tops", "Bottoms", "Shoes"]);
  });

  it("uses its own words when the BE gives none", async () => {
    await renderCategories({ pages: [{ data: THREE, total: 3 }], refuse: { reorder: { status: 500, body: {} } } });
    await screen.findByText("Tops");

    await dragEnd("c-1", "c-2");

    expect(await screen.findByText(C("toast.reorderFailed"))).toBeInTheDocument();
  });
});

describe("ACT-4E nothing to show, or no way to load it", () => {
  it("says there is no data, or that nothing matches the search", async () => {
    await renderCategories({ pages: [{ data: [], total: 0 }] });
    expect(await screen.findByText(msg("admin.components.dataTable.empty.none"))).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(C("table.searchPlaceholder")), "zzz");

    expect(await screen.findByText(msg("admin.components.dataTable.empty.filtered"))).toBeInTheDocument();
  });

  it("says it could not load instead of saying there is no data", async () => {
    await renderCategories({ failListFrom: 1 });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText(msg("admin.components.dataTable.empty.none"))).not.toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s nothing, only that the data could not be loaded", async (_label, as, deny) => {
    await renderCategories({ as, deny, pages: [{ data: THREE, total: 3 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("Tops")).not.toBeInTheDocument();
  });
});
