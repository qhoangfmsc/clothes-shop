import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { product } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { renderProducts } from "./products-kit";

/* The products table: what it asks and shows (specs/admin/products.md, flows APR-1 to APR-3). */

const P = (key: string, locale: "vi" | "en" = "vi") => msg(`admin.products.${key}`, locale);
const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
const last = <T,>(items: T[]) => items[items.length - 1];
const SORT = () => screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") });
const options = (select: HTMLElement) => within(select).getAllByRole("option").map((o) => o.getAttribute("value"));

describe("APR-1 the list", () => {
  it("asks for the newest first, 25 to a page, and shows a row for each product", async () => {
    const { calls } = await renderProducts({
      pages: [{ data: [product({ id: "p1", name: "Silk dress", slug: "silk-dress", priceVnd: 350_000, originalPriceVnd: 450_000, originalPriceUsd: 17.3, badge: "sale" })], total: 1 }],
    });

    await screen.findByText("Silk dress");
    const row = rowOf("Silk dress");

    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(within(row).getByText("silk-dress")).toBeInTheDocument();
    expect(within(row).getByText("tops")).toBeInTheDocument();
    expect(within(row).getByText(/shirts/)).toBeInTheDocument();
    expect(within(row).getByText("350.000 VNĐ")).toBeInTheDocument();
    expect(within(row).getByText("450.000 VNĐ").className).toContain("line-through");
    expect(within(row).getByText(msg("common.status.active"))).toBeInTheDocument();
    expect(within(row).getByText(msg("common.productBadge.sale"))).toBeInTheDocument();
  });

  it("shows a placeholder for a product without picture, dashes for no category and no badge, and no struck price when there is none", async () => {
    await renderProducts({ pages: [{ data: [product({ name: "Plain", images: [], category: null, subcategory: null, badge: null })], total: 1 }] });

    await screen.findByText("Plain");
    const row = rowOf("Plain");

    expect(row.querySelector("img")).toBeNull();
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(row.querySelector(".line-through")).toBeNull();
  });

  it("shows the picture through the media path", async () => {
    await renderProducts({ pages: [{ data: [product({ name: "Pic", images: ["https://abc.supabase.co/storage/v1/object/public/media/p/a.jpg"] })], total: 1 }] });

    await screen.findByText("Pic");

    expect(decodeURIComponent(rowOf("Pic").querySelector("img")!.getAttribute("src")!)).toContain("/media/p/a.jpg");
  });

  it("shows a status it has no name for as it is", async () => {
    await renderProducts({ pages: [{ data: [product({ name: "Odd", status: "archived" as never })], total: 1 }] });

    await screen.findByText("Odd");

    expect(within(rowOf("Odd")).getByText("archived")).toBeInTheDocument();
  });

  it("shows the rating with its count, or 'no reviews yet', and hides the column on phones", async () => {
    await renderProducts({
      pages: [{ data: [product({ id: "p1", name: "Rated", ratingAverage: 4.5, ratingCount: 12 }), product({ id: "p2", name: "Unrated", ratingAverage: null, ratingCount: 0 })], total: 2 }],
    });

    await screen.findByText("Rated");

    expect(within(rowOf("Rated")).getByText("4,5")).toBeInTheDocument();
    expect(within(rowOf("Rated")).getByText("12 đánh giá")).toBeInTheDocument();
    expect(within(rowOf("Unrated")).getByText(P("table.noReviews"))).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: P("table.columns.rating"), hidden: true }).className).toContain("hidden md:table-cell");
  });

  it("shows an average with a count of zero as 'no reviews yet'", async () => {
    await renderProducts({ pages: [{ data: [product({ name: "Zero", ratingAverage: 3, ratingCount: 0 })], total: 1 }] });

    await screen.findByText("Zero");

    expect(within(rowOf("Zero")).getByText(P("table.noReviews"))).toBeInTheDocument();
  });

  it("states the number of products in the header", async () => {
    await renderProducts({ pages: [{ data: [product()], total: 58 }] });
    await screen.findByText("Dress");

    expect(screen.getByText("58 sản phẩm")).toBeInTheDocument();
  });

  it("shows prices in dollars in English", async () => {
    await renderProducts({ locale: "en", pages: [{ data: [product({ name: "Dress", priceUsd: 13.46 })], total: 1 }] });
    await screen.findByText("Dress");

    expect(within(rowOf("Dress")).getByText("$13.46")).toBeInTheDocument();
  });
});

describe("APR-1E the list cannot be loaded, or the account is refused", () => {
  it("says it could not load instead of saying there are no products", async () => {
    await renderProducts({ failListFrom: 1 });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText(msg("admin.components.dataTable.empty.none"))).not.toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s no products, only that the data could not be loaded", async (_label, as, deny) => {
    await renderProducts({ as, deny, pages: [{ data: [product()], total: 1 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("Dress")).not.toBeInTheDocument();
  });

  it("shows an empty table when there are no products", async () => {
    await renderProducts({ pages: [{ data: [], total: 0 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.empty.none"))).toBeInTheDocument();
  });
});

describe("APR-2 searching, filtering and sorting", () => {
  it("offers the categories by their slug, in order, and asks all of them (up to 200)", async () => {
    const { calls } = await renderProducts({ pages: [{ data: [product()], total: 1 }] });
    await screen.findByText("Dress");

    await waitFor(() => expect(options(screen.getByRole("combobox", { name: P("table.filters.category") }))).toEqual(["", "bags", "tops"]));
    expect(calls.categories[0].get("limit")).toBe("200");
  });

  it("filters by category, status, badge and the least number of stars, and searches", async () => {
    const { calls } = await renderProducts({ pages: [{ data: [product()], total: 1 }] });
    await screen.findByText("Dress");
    await waitFor(() => expect(options(screen.getByRole("combobox", { name: P("table.filters.category") }))).toContain("tops"));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: P("table.filters.category") }), "tops");
    await waitFor(() => expect(last(calls.lists).get("category")).toBe("tops"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: P("table.filters.status") }), "disabled");
    await waitFor(() => expect(last(calls.lists).get("status")).toBe("disabled"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: P("table.filters.badge") }), "sale");
    await waitFor(() => expect(last(calls.lists).get("badge")).toBe("sale"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: P("table.filters.minRating") }), "4");
    await waitFor(() => expect(last(calls.lists).get("minRating")).toBe("4"));
    await userEvent.type(screen.getByPlaceholderText(P("table.searchPlaceholder")), "silk");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("silk"));

    expect(last(calls.lists).get("category")).toBe("tops");
    expect(last(calls.lists).get("status")).toBe("disabled");
    expect(last(calls.lists).get("badge")).toBe("sale");
  });

  it("offers every status, every badge and the star choices from 5 down to 1", async () => {
    await renderProducts({ pages: [{ data: [product()], total: 1 }] });
    await screen.findByText("Dress");

    expect(options(screen.getByRole("combobox", { name: P("table.filters.status") }))).toEqual(["", "active", "disabled"]);
    expect(options(screen.getByRole("combobox", { name: P("table.filters.badge") }))).toEqual(["", "new", "sale", "bestseller", "sold_out", "limited", "custom_order"]);
    expect(options(screen.getByRole("combobox", { name: P("table.filters.minRating") }))).toEqual(["", "5", "4", "3", "2", "1"]);
    expect(within(screen.getByRole("combobox", { name: P("table.filters.minRating") })).getByRole("option", { name: "Từ 4 sao trở lên" })).toBeInTheDocument();
  });

  it("does not send filters that are not set", async () => {
    const { calls } = await renderProducts({ pages: [{ data: [product()], total: 1 }] });
    await screen.findByText("Dress");

    for (const key of ["search", "category", "status", "badge", "minRating"]) expect(calls.lists[0].has(key), key).toBe(false);
  });

  it("offers nine sort orders and sends the one chosen", async () => {
    const { calls } = await renderProducts({ pages: [{ data: [product()], total: 1 }] });
    await screen.findByText("Dress");

    expect(options(SORT())).toEqual(["-createdAt", "createdAt", "-price", "price", "name", "-name", "-ratingAverage", "ratingAverage", "-ratingCount"]);
    await userEvent.selectOptions(SORT(), "-ratingCount");
    await waitFor(() => expect(last(calls.lists).get("sort")).toBe("-ratingCount"));
  });
});

describe("APR-3 who sees the buttons", () => {
  it("gives an admin with every permission the add, edit and delete buttons", async () => {
    await renderProducts({ pages: [{ data: [product({ name: "Dress" })], total: 1 }] });
    await screen.findByText("Dress");

    expect(screen.getByRole("button", { name: new RegExp(P("page.add")) })).toBeInTheDocument();
    expect(within(rowOf("Dress")).getByTitle(msg("admin.components.crud.edit"))).toBeInTheDocument();
    expect(within(rowOf("Dress")).getByTitle(msg("admin.components.crud.delete"))).toBeInTheDocument();
  });

  it("gives an admin who may only view orders none of them", async () => {
    await renderProducts({ as: "adminLimited", pages: [{ data: [product({ name: "Dress" })], total: 1 }] });
    await screen.findByText("Dress");

    expect(screen.queryByRole("button", { name: new RegExp(P("page.add")) })).not.toBeInTheDocument();
    expect(within(rowOf("Dress")).queryByTitle(msg("admin.components.crud.edit"))).not.toBeInTheDocument();
    expect(within(rowOf("Dress")).queryByTitle(msg("admin.components.crud.delete"))).not.toBeInTheDocument();
  });

  it.each([
    ["create", PERMISSIONS.PRODUCT_CREATE, { add: true, edit: false, remove: false }],
    ["update", PERMISSIONS.PRODUCT_UPDATE, { add: false, edit: true, remove: false }],
    ["delete", PERMISSIONS.PRODUCT_DELETE, { add: false, edit: false, remove: true }],
  ] as const)("shows only what the %s permission allows", async (_label, permission, expected) => {
    await renderProducts({ as: adminWith(PERMISSIONS.PRODUCT_VIEW, permission), pages: [{ data: [product({ name: "Dress" })], total: 1 }] });
    await screen.findByText("Dress");

    expect(screen.queryByRole("button", { name: new RegExp(P("page.add")) }) !== null).toBe(expected.add);
    expect(within(rowOf("Dress")).queryByTitle(msg("admin.components.crud.edit")) !== null).toBe(expected.edit);
    expect(within(rowOf("Dress")).queryByTitle(msg("admin.components.crud.delete")) !== null).toBe(expected.remove);
  });
});
