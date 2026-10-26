import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ShopProductsClient from "@/src/app/[locale]/(public)/shop/_components/ShopProductsClient";
import { msg } from "@/tests/_support/messages";
import { product, products, renderShop, type RenderShopOptions } from "./shop-kit";

/* The product list of a shop page: filters, sort and "load more" (specs/storefront/shop.md, flows SHP-20 to SHP-27E). */

const F = (key: string, locale: "vi" | "en" = "vi") => msg(`public.shop.components.filters.${key}`, locale);
const P = (key: string) => msg(`public.shop.components.productsClient.${key}`);
const FIRST = products(3);

async function list(options: RenderShopOptions & { initial?: ReturnType<typeof products>; total?: number; scope?: React.ComponentProps<typeof ShopProductsClient>["scope"] } = {}) {
  const { initial = FIRST, total = initial.length, scope, ...rest } = options;
  return renderShop(<ShopProductsClient initialProducts={initial} initialTotal={total} scope={scope} heading={<h2>Heading here</h2>} />, rest);
}
const last = <T,>(items: T[]) => items[items.length - 1];
const sortBox = () => screen.getByRole("combobox") as HTMLSelectElement;
const openPanel = () => userEvent.click(screen.getByRole("button", { name: new RegExp(F("filter")) }));
const names = () => Array.from(document.querySelectorAll("div.grid a span.text-\\[0\\.8125rem\\]")).map((e) => e.textContent);

describe("SHP-20 the toolbar", () => {
  it("shows the heading, the number of products the BE counted (not the number loaded), and the products", async () => {
    await list({ total: 40 });

    expect(screen.getByRole("heading", { name: "Heading here" })).toBeInTheDocument();
    expect(screen.getByText("40 sản phẩm")).toBeInTheDocument();
    expect(names()).toEqual(["Item 01", "Item 02", "Item 03"]);
  });

  it("offers seven ways to sort, newest first, with their names", async () => {
    await list();

    expect(within(sortBox()).getAllByRole("option").map((o) => [o.getAttribute("value"), o.textContent])).toEqual([
      ["-createdAt", F("sort.newest")],
      ["price", F("sort.priceAsc")],
      ["-price", F("sort.priceDesc")],
      ["name", F("sort.nameAsc")],
      ["-name", F("sort.nameDesc")],
      ["-ratingAverage", F("sort.ratingDesc")],
      ["-ratingCount", F("sort.reviewsDesc")],
    ]);
    expect(sortBox().value).toBe("-createdAt");
  });

  it("shows no 'clear all' and no count on the filter button until something is chosen", async () => {
    await list();

    expect(screen.queryByRole("button", { name: new RegExp(F("clearAll")) })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(F("filter")) }).querySelector("span")).toBeNull();
  });

  it("reads in English in English", async () => {
    await list({ locale: "en", total: 3 });

    expect(screen.getByText("3 pieces")).toBeInTheDocument();
  });
});

describe("SHP-21 sorting", () => {
  it("asks the BE for page one of the new order, replaces the list and the count, and offers 'clear all'", async () => {
    const { calls } = await list({ total: 3, answer: () => ({ data: products(2, 10), total: 2 }) });

    await userEvent.selectOptions(sortBox(), "-price");

    await waitFor(() => expect(names()).toEqual(["Item 10", "Item 11"]));
    expect(Object.fromEntries(last(calls.products))).toEqual({ sort: "-price", limit: "25" });
    expect(screen.getByText("2 sản phẩm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(F("clearAll")) })).toBeInTheDocument();
  });

  it("carries what the page is about in every request (a category, a sub-category, a badge)", async () => {
    const { calls } = await list({ scope: { category: "tops", subcategory: "shirts", badge: "new" }, answer: () => ({ data: [], total: 0 }) });

    await userEvent.selectOptions(sortBox(), "name");

    await waitFor(() => expect(calls.products).toHaveLength(1));
    expect(Object.fromEntries(calls.products[0])).toEqual({ category: "tops", subcategory: "shirts", badge: "new", sort: "name", limit: "25" });
  });

  it("says there are no products yet when a filter finds none", async () => {
    await list({ answer: () => ({ data: [], total: 0 }) });

    await userEvent.selectOptions(sortBox(), "name");

    expect(await screen.findByText(msg("public.shop.components.productGrid.comingSoon"))).toBeInTheDocument();
    expect(screen.getByText("0 sản phẩm")).toBeInTheDocument();
  });
});

describe("SHP-22 the filter panel", () => {
  it("opens and closes with the Filter button", async () => {
    await list();
    expect(screen.queryByText(F("priceRange"))).not.toBeInTheDocument();

    await openPanel();
    expect(screen.getByText(F("priceRange"))).toBeInTheDocument();
    await openPanel();

    await waitFor(() => expect(screen.queryByText(F("priceRange"))).not.toBeInTheDocument());
  });

  it("offers four fixed price bands in dong and asks for the one chosen; choosing it again lifts the filter", async () => {
    const { calls } = await list({ answer: () => ({ data: FIRST, total: 3 }) });
    await openPanel();
    const band = (name: string) => screen.getByRole("button", { name });

    expect(["Dưới 500.000 VNĐ", "500.000 VNĐ – 1.000.000 VNĐ", "1.000.000 VNĐ – 2.000.000 VNĐ", "Trên 2.000.000 VNĐ"].map((n) => band(n).getAttribute("aria-pressed"))).toEqual(["false", "false", "false", "false"]);
    await userEvent.click(band("Dưới 500.000 VNĐ"));
    await waitFor(() => expect(calls.products).toHaveLength(1));
    expect(Object.fromEntries(calls.products[0])).toMatchObject({ maxPrice: "500000" });
    expect(calls.products[0].has("minPrice")).toBe(false);
    expect(band("Dưới 500.000 VNĐ")).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(band("500.000 VNĐ – 1.000.000 VNĐ"));
    await waitFor(() => expect(calls.products).toHaveLength(2));
    expect(Object.fromEntries(calls.products[1])).toMatchObject({ minPrice: "500000", maxPrice: "1000000" });
    await userEvent.click(band("Trên 2.000.000 VNĐ"));
    await waitFor(() => expect(calls.products).toHaveLength(3));
    expect(Object.fromEntries(calls.products[2])).toMatchObject({ minPrice: "2000000" });
    expect(calls.products[2].has("maxPrice")).toBe(false);

    await userEvent.click(band("Trên 2.000.000 VNĐ"));
    await waitFor(() => expect(calls.products).toHaveLength(4));
    expect(calls.products[3].has("minPrice")).toBe(false);
    expect(calls.products[3].has("maxPrice")).toBe(false);

    await userEvent.click(band("Dưới 500.000 VNĐ"));
    await userEvent.click(band("Dưới 500.000 VNĐ"));
    await waitFor(() => expect(calls.products).toHaveLength(6));
    expect(calls.products[5].has("maxPrice")).toBe(false);
    expect(calls.products[5].has("minPrice")).toBe(false);
  });

  it("names the bands in dong even in English", async () => {
    await list({ locale: "en" });
    await userEvent.click(screen.getByRole("button", { name: new RegExp(F("filter", "en")) }));

    expect(screen.getByRole("button", { name: "Under 500.000 VNĐ" })).toBeInTheDocument();
  });

  it("offers one to four stars and asks for products rated at least that, bringing the choice back off on a second click", async () => {
    const { calls } = await list({ answer: () => ({ data: FIRST, total: 3 }) });
    await openPanel();
    const stars = (n: number) => screen.getByRole("button", { name: `Từ ${n} sao trở lên` });

    expect([4, 3, 2, 1].map((n) => stars(n).getAttribute("aria-pressed"))).toEqual(["false", "false", "false", "false"]);
    await userEvent.click(stars(3));
    await waitFor(() => expect(calls.products).toHaveLength(1));
    expect(calls.products[0].get("minRating")).toBe("3");
    expect(stars(3)).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(stars(3));
    await waitFor(() => expect(calls.products).toHaveLength(2));
    expect(calls.products[1].has("minRating")).toBe(false);
  });

  it("offers the sizes and colours of the products seen, sizes in order, and asks with the chosen ones joined by commas", async () => {
    const seen = [product({ id: "a", name: "A", sizes: ["M", "S"], colors: [{ name: "Red", hex: "#f00" }] }), product({ id: "b", name: "B", sizes: ["L", "S"], colors: [{ name: "Blue", hex: "#00f" }, { name: "Red", hex: "#0000ff" }] })];
    const { calls } = await list({ initial: seen, answer: () => ({ data: seen, total: 2 }) });
    await openPanel();

    const sizeButtons = within(screen.getByText(F("size")).parentElement as HTMLElement).getAllByRole("button");
    expect(sizeButtons.map((b) => b.textContent)).toEqual(["L", "M", "S"]);
    const colourButtons = within(screen.getByText(F("color")).parentElement as HTMLElement).getAllByRole("button");
    expect(colourButtons.map((b) => b.textContent)).toEqual(["Red", "Blue"]);
    expect((colourButtons[0].querySelector("span") as HTMLElement).style.background).toBe("rgb(255, 0, 0)");
    await userEvent.click(screen.getByRole("button", { name: "S" }));
    await userEvent.click(screen.getByRole("button", { name: "L" }));
    await userEvent.click(screen.getByRole("button", { name: "Blue" }));
    await userEvent.click(screen.getByRole("button", { name: "Red" }));
    await waitFor(() => expect(calls.products).toHaveLength(4));

    expect(last(calls.products).get("sizes")).toBe("S,L");
    expect(last(calls.products).get("colors")).toBe("Blue,Red");
    await userEvent.click(screen.getByRole("button", { name: "S" }));
    await userEvent.click(screen.getByRole("button", { name: "Blue" }));
    await waitFor(() => expect(calls.products).toHaveLength(6));
    expect(last(calls.products).get("sizes")).toBe("L");
    expect(last(calls.products).get("colors")).toBe("Red");
  });

  it("hides the size and colour groups for products that have none", async () => {
    await list({ initial: [product({ sizes: [], colors: [] })] });
    await openPanel();

    expect(screen.queryByText(F("size"))).not.toBeInTheDocument();
    expect(screen.queryByText(F("color"))).not.toBeInTheDocument();
  });

  it("keeps offering a size once seen, even when the filtered list no longer has it", async () => {
    await list({ initial: [product({ sizes: ["S", "M"] })], answer: () => ({ data: [product({ id: "z", sizes: ["S"] })], total: 1 }) });
    await openPanel();

    await userEvent.click(screen.getByRole("button", { name: "S" }));
    await waitFor(() => expect(screen.getByText("1 sản phẩm")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "M" })).toBeInTheDocument();
  });

  it("offers 'clear all' for a rating alone", async () => {
    await list({ answer: () => ({ data: FIRST, total: 3 }) });
    await openPanel();

    await userEvent.click(screen.getByRole("button", { name: "Từ 4 sao trở lên" }));

    expect(await screen.findByRole("button", { name: new RegExp(F("clearAll")) })).toBeInTheDocument();
  });

  it("offers the sizes and colours of the products a filter brings in, as well as those seen before", async () => {
    const answer = () => ({ data: [product({ id: "z", name: "Z", sizes: ["XL"], colors: [{ name: "Green", hex: "#0f0" }] })], total: 1 });
    await list({ initial: [product({ sizes: ["S"], colors: [{ name: "Red", hex: "#f00" }] })], answer });
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "S" }));
    await waitFor(() => expect(screen.getByText("1 sản phẩm")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "XL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Green" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "S" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Red" })).toBeInTheDocument();
  });

  it("counts the groups of filters in use on the Filter button: price, rating, sizes and colours each once", async () => {
    await list({ answer: () => ({ data: FIRST, total: 3 }) });
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "Dưới 500.000 VNĐ" }));
    await userEvent.click(screen.getByRole("button", { name: "Từ 4 sao trở lên" }));
    await userEvent.click(screen.getByRole("button", { name: "S" }));
    await userEvent.click(screen.getByRole("button", { name: "M" }));
    await userEvent.click(screen.getByRole("button", { name: "Red" }));

    await waitFor(() => expect(screen.getByRole("button", { name: new RegExp(F("filter")) }).querySelector("span")?.textContent).toBe("4"));
  });

  it("counts a changed sort as a reason to show 'clear all', but not as a group on the button", async () => {
    await list({ answer: () => ({ data: FIRST, total: 3 }) });

    await userEvent.selectOptions(sortBox(), "price");

    expect(await screen.findByRole("button", { name: new RegExp(F("clearAll")) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(F("filter")) }).querySelector("span")).toBeNull();
  });

  it("clears every choice and the sort at once and asks for the first page again", async () => {
    const { calls } = await list({ answer: () => ({ data: FIRST, total: 3 }) });
    await openPanel();
    await userEvent.selectOptions(sortBox(), "price");
    await userEvent.click(screen.getByRole("button", { name: "Dưới 500.000 VNĐ" }));
    await userEvent.click(screen.getByRole("button", { name: "S" }));
    await userEvent.click(screen.getByRole("button", { name: "Red" }));
    await userEvent.click(screen.getByRole("button", { name: "Từ 2 sao trở lên" }));
    await waitFor(() => expect(calls.products.length).toBe(5));

    await userEvent.click(screen.getByRole("button", { name: new RegExp(F("clearAll")) }));

    await waitFor(() => expect(calls.products.length).toBe(6));
    expect(Object.fromEntries(last(calls.products))).toEqual({ sort: "-createdAt", limit: "25" });
    expect(sortBox().value).toBe("-createdAt");
    expect(screen.queryByRole("button", { name: new RegExp(F("clearAll")) })).not.toBeInTheDocument();
  });
});

describe("SHP-23 'load more'", () => {
  it("shows the button only while the BE has more than what is on screen, saying only 'load more'", async () => {
    const some = await list({ total: 40 });
    expect(screen.getByRole("button", { name: P("loadMore") })).toBeInTheDocument();
    some.unmount();

    await list({ total: 3 });
    expect(screen.queryByRole("button", { name: P("loadMore") })).not.toBeInTheDocument();
  });

  it("asks for the next page with the same filters and adds it after the products shown, which stay where they are", async () => {
    const { calls } = await list({ total: 6, answer: (params) => (params.get("page") === "2" ? { data: products(3, 4), total: 6 } : { data: FIRST, total: 6 }) });
    const firstCards = Array.from(document.querySelectorAll("div.grid > div")) as HTMLElement[];
    await userEvent.selectOptions(sortBox(), "price");
    await waitFor(() => expect(calls.products).toHaveLength(1));

    await userEvent.click(await screen.findByRole("button", { name: P("loadMore") }));

    await waitFor(() => expect(names()).toEqual(["Item 01", "Item 02", "Item 03", "Item 04", "Item 05", "Item 06"]));
    expect(Object.fromEntries(last(calls.products))).toEqual({ sort: "price", page: "2", limit: "25" });
    expect(screen.queryByRole("button", { name: P("loadMore") })).not.toBeInTheDocument();
    void firstCards;
  });

  it("does not show a product twice when the next page repeats one", async () => {
    await list({ total: 5, answer: () => ({ data: [products(1, 3)[0], ...products(2, 4)], total: 5 }) });

    await userEvent.click(screen.getByRole("button", { name: P("loadMore") }));

    await waitFor(() => expect(names()).toEqual(["Item 01", "Item 02", "Item 03", "Item 04", "Item 05"]));
  });

  it("shows 'loading' and keeps the button off while the page is on its way, and asks only once for a double click", async () => {
    const { calls } = await list({ total: 6, delayFor: () => 300, answer: () => ({ data: products(3, 4), total: 6 }) });

    await userEvent.dblClick(screen.getByRole("button", { name: P("loadMore") }));

    const busy = await screen.findByRole("button", { name: P("loadingMore") });
    expect(busy).toBeDisabled();
    await waitFor(() => expect(names()).toHaveLength(6));
    expect(calls.products).toHaveLength(1);
  });

  it("asks for page two, then page three, and takes the new total from each answer", async () => {
    const { calls } = await list({ total: 6, answer: (params) => ({ data: products(3, params.get("page") === "3" ? 7 : 4), total: params.get("page") === "3" ? 11 : 9 }) });

    await userEvent.click(screen.getByRole("button", { name: P("loadMore") }));
    await waitFor(() => expect(names()).toHaveLength(6));
    expect(screen.getByText("9 sản phẩm")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: P("loadMore") }));
    await waitFor(() => expect(names()).toHaveLength(9));

    expect(calls.products.map((p) => p.get("page"))).toEqual(["2", "3"]);
    expect(screen.getByText("11 sản phẩm")).toBeInTheDocument();
  });

  it("goes back to page one after a filter, even when the shopper had already loaded more", async () => {
    const { calls } = await list({ total: 60, answer: (params) => ({ data: products(25, 100 * Number(params.get("page") ?? 1)), total: 60 }) });
    await userEvent.click(screen.getByRole("button", { name: P("loadMore") }));
    await waitFor(() => expect(calls.products).toHaveLength(1));
    await userEvent.selectOptions(sortBox(), "price");
    await waitFor(() => expect(calls.products).toHaveLength(2));

    await userEvent.click(await screen.findByRole("button", { name: P("loadMore") }));

    await waitFor(() => expect(calls.products).toHaveLength(3));
    expect(calls.products.map((p) => p.get("page"))).toEqual(["2", null, "2"]);
  });

  it("starts again from page one of the new result when a filter changes, so the next 'load more' asks for page two of it", async () => {
    const { calls } = await list({ total: 60, answer: (params) => ({ data: params.get("sort") === "price" ? products(25, 100) : products(25), total: 60 }) });
    await userEvent.selectOptions(sortBox(), "price");
    await waitFor(() => expect(names()[0]).toBe("Item 100"));

    await userEvent.click(screen.getByRole("button", { name: P("loadMore") }));

    await waitFor(() => expect(calls.products).toHaveLength(2));
    expect(calls.products.map((p) => p.get("page"))).toEqual([null, "2"]);
    expect(last(calls.products).get("sort")).toBe("price");
  });
});

describe("SHP-27E when the BE does not answer", () => {
  it("tells the shopper and keeps the products on screen when a filter cannot be applied", async () => {
    await list({ answer: () => 500 });

    await userEvent.selectOptions(sortBox(), "price");

    expect(await screen.findByText(P("loadFailed"))).toBeInTheDocument();
    expect(names()).toEqual(["Item 01", "Item 02", "Item 03"]);
  });

  it("tells the shopper and lets them try again when 'load more' fails", async () => {
    await list({ total: 6, answer: () => 500 });

    await userEvent.click(screen.getByRole("button", { name: P("loadMore") }));

    expect(await screen.findByText(P("loadFailed"))).toBeInTheDocument();
    expect(names()).toHaveLength(3);
    await waitFor(() => expect(screen.getByRole("button", { name: P("loadMore") })).toBeEnabled());
  });

  it("ignores an answer that comes back after the shopper has already chosen something else", async () => {
    const { calls } = await list({
      delayFor: (params) => (params.get("sort") === "price" ? 500 : 0),
      answer: (params) => ({ data: products(2, params.get("sort") === "price" ? 50 : 70), total: 2 }),
    });

    await userEvent.selectOptions(sortBox(), "price");
    await userEvent.selectOptions(sortBox(), "name");
    await waitFor(() => expect(names()).toEqual(["Item 70", "Item 71"]));
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(calls.products).toHaveLength(2);
    expect(names()).toEqual(["Item 70", "Item 71"]);
  });

  it("lets the shopper load more of the new result while an old 'load more' is still on its way", async () => {
    await list({
      total: 60,
      delayFor: (params) => (params.get("page") === "2" && params.get("sort") === "-createdAt" ? 800 : 0),
      answer: (params) => ({ data: params.get("sort") === "price" ? products(25, 200) : products(25, 100), total: 60 }),
    });
    await userEvent.click(screen.getByRole("button", { name: P("loadMore") }));
    expect(await screen.findByRole("button", { name: P("loadingMore") })).toBeDisabled();

    await userEvent.selectOptions(sortBox(), "price");

    await waitFor(() => expect(names()[0]).toBe("Item 200"));
    expect(screen.getByRole("button", { name: P("loadMore") })).toBeEnabled();
  });

  it("ignores a 'load more' answer that comes back after a filter changed", async () => {
    await list({
      total: 6,
      delayFor: (params) => (params.get("page") === "2" ? 500 : 0),
      answer: (params) => (params.get("page") === "2" ? { data: products(3, 90), total: 6 } : { data: products(2, 70), total: 2 }),
    });

    await userEvent.click(screen.getByRole("button", { name: P("loadMore") }));
    await userEvent.selectOptions(sortBox(), "name");
    await waitFor(() => expect(names()).toEqual(["Item 70", "Item 71"]));
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(names()).toEqual(["Item 70", "Item 71"]);
    expect(screen.queryByRole("button", { name: P("loadingMore") })).not.toBeInTheDocument();
  });
});
