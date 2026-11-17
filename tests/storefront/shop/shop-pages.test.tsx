import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CategoryPage, { generateMetadata as categoryMetadata, generateStaticParams as categoryStaticParams } from "@/src/app/[locale]/(public)/shop/[category]/page";
import SubcategoryPage, { generateMetadata as subcategoryMetadata, generateStaticParams as subcategoryStaticParams } from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/page";
import ShopPage, { generateMetadata as shopMetadata } from "@/src/app/[locale]/(public)/shop/page";
import { msg } from "@/tests/_support/messages";
import { categoryOf, product, products, renderShop, shopApi, subcategoryOf, type RenderShopOptions } from "./shop-kit";
import { intlServerModule } from "@/tests/_support/intl-server";
import type { AppLocale } from "@/src/i18n/routing";

/* The three server-rendered shop pages: what they ask the API for, what they show, their search-engine data and the 404 (specs/storefront/shop.md, flows SHP-1 to SHP-9E). */

const params = <T extends object>(locale: AppLocale, rest: T = {} as T) => ({ params: Promise.resolve({ locale, ...rest }) });
const TOPS = categoryOf({ slug: "tops", title: "Tops", description: "Everything for the top half", subcategories: [subcategoryOf({ slug: "shirts", label: "Shirts", description: "Shirts for every day", count: 4 }), subcategoryOf({ id: "s2", slug: "vests", label: "Vests", count: 1 })] });
const SHOES = categoryOf({ id: "c2", slug: "shoes", title: "Shoes", subcategories: [] });
const jsonLd = () => Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent ?? "{}"));

/** Installs the fake API, lets the server page ask it, then shows what the page returned */
async function show(make: () => Promise<React.ReactNode>, options: RenderShopOptions = {}) {
  const { as, locale, ...api } = options;
  const calls = shopApi(api);
  const page = await make();
  return renderShop(<>{page}</>, { as, locale, calls });
}

describe("SHP-1 the shop page", () => {
  const api = { categories: [TOPS, SHOES], pages: [{ data: products(3), total: 40 }], banners: [{ image: "/banner-1.jpg" }] };

  it("asks the API for every category in priority order, the first 25 products and the shop banners", async () => {
    const view = await show(() => ShopPage(params("vi")), api);

    expect(Object.fromEntries(view.calls.categories[0])).toEqual({ sort: "priority", limit: "200" });
    expect(Object.fromEntries(view.calls.products[0])).toEqual({ limit: "25" });
    expect(view.calls.banners).toEqual(["SHOP_HERO_BANNERS"]);
  });

  it("shows the hero, the breadcrumb, a card for each category with how many there are, and the first products with their total", async () => {
    await show(() => ShopPage(params("vi")), api);

    expect(screen.getByRole("heading", { level: 1, name: msg("public.shop.pages.index.hero.title") })).toBeInTheDocument();
    const crumbs = screen.getByRole("navigation", { name: msg("public.shop.components.breadcrumb.aria") });
    expect(within(crumbs).getByRole("link", { name: msg("shared.header.nav.home") })).toHaveAttribute("href", "/");
    expect(within(crumbs).getByText(msg("shared.header.nav.shop")).closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: /Tops/ })).toHaveAttribute("href", "/shop/tops");
    expect(screen.getByRole("link", { name: /Shoes/ })).toHaveAttribute("href", "/shop/shoes");
    expect(screen.getByText("2 danh mục tuyển chọn, mỗi danh mục kể một câu chuyện riêng về sự thanh lịch và chủ đích.")).toBeInTheDocument();
    expect(screen.getByText("Item 02")).toBeInTheDocument();
    expect(screen.getByText("40 sản phẩm")).toBeInTheDocument();
    expect(screen.getByText(msg("public.shop.pages.index.all.title"))).toBeInTheDocument();
  });

  it("puts the banners the admin configured in the hero, and still renders when they cannot be read", async () => {
    const with_ = await show(() => ShopPage(params("vi")), api);
    expect(decodeURIComponent(with_.container.querySelector("[data-hero-bg] img")!.getAttribute("src") ?? "")).toContain("/banner-1.jpg");
    with_.unmount();

    const without = await show(() => ShopPage(params("vi")), { ...api, banners: 500 });
    expect(without.container.querySelector("[data-hero-bg] img")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("describes the breadcrumb for search engines: home, then the shop, with absolute addresses", async () => {
    await show(() => ShopPage(params("vi")), api);

    const [crumbs] = jsonLd();
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement.map((i: { name: string; position: number }) => [i.position, i.name])).toEqual([[1, msg("shared.header.nav.home")], [2, msg("shared.header.nav.shop")]]);
    expect(crumbs.itemListElement[1].item).toMatch(/\/vi\/shop$/);
  });

  it("speaks English in English", async () => {
    await show(() => ShopPage(params("en")), { ...api, locale: "en" });

    expect(screen.getByRole("heading", { level: 1, name: msg("public.shop.pages.index.hero.title", "en") })).toBeInTheDocument();
    expect(jsonLd()[0].itemListElement[1].item).toMatch(/\/en\/shop$/);
  });

  it("tells the framework which language it renders", async () => {
    shopApi(api);
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await ShopPage(params("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("fails (so the error page shows) when the categories or the products cannot be read", async () => {
    shopApi({ ...api, categories: 500 });
    await expect(ShopPage(params("vi"))).rejects.toThrow("/api/categories");
    shopApi({ ...api, answer: () => 500 });
    await expect(ShopPage(params("vi"))).rejects.toThrow("/api/products");
  });

  it("has a title with the brand, a description, language alternates and a share card", async () => {
    const meta = await shopMetadata(params("vi"));

    expect(meta.title).toBe(`${msg("public.shop.pages.index.meta.title")} — DOOVAN`);
    expect(meta.description).toBe(msg("public.shop.pages.index.meta.description"));
    expect(meta.alternates).toMatchObject({ canonical: "/vi/shop", languages: { vi: "/vi/shop", en: "/en/shop", "x-default": "/vi/shop" } });
    expect(meta.openGraph).toMatchObject({ url: "/vi/shop", title: meta.title });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("SHP-2 a category page", () => {
  const api = { categories: [TOPS, SHOES], pages: [{ data: [product({ images: ["/first.jpg"] }), ...products(2, 2)], total: 17 }] };
  const page = (slug = "tops", locale: AppLocale = "vi") => CategoryPage(params(locale, { category: slug }));

  it("asks for this category and its first 25 products", async () => {
    const view = await show(() => page(), api);

    expect(view.calls.categories.map((p) => p.get("slug"))).toContain("tops");
    expect(Object.fromEntries(view.calls.products[0])).toEqual({ category: "tops", limit: "25" });
  });

  it("shows the hero from the first product's picture, the breadcrumb, the chips and the products with their total", async () => {
    const { container } = await show(() => page(), api);

    expect(screen.getByRole("heading", { level: 1, name: "Tops" })).toBeInTheDocument();
    expect(screen.getByText("DOOVAN — Tops")).toBeInTheDocument();
    expect(decodeURIComponent(container.querySelector("[data-hero-bg] img")!.getAttribute("src") ?? "")).toContain("/first.jpg");
    const crumbs = screen.getByRole("navigation", { name: msg("public.shop.components.breadcrumb.aria") });
    expect(within(crumbs).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/", "/shop"]);
    expect(screen.getByRole("link", { name: /Shirts/ })).toHaveAttribute("href", "/shop/tops/shirts");
    expect(screen.getByText("17 sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Bộ sưu tập Tops")).toBeInTheDocument();
  });

  it("keeps asking for this category when the shopper sorts the list", async () => {
    const view = await show(() => page(), api);

    await userEvent.selectOptions(screen.getByRole("combobox"), "price");

    await waitFor(() => expect(view.calls.products).toHaveLength(2));
    expect(Object.fromEntries(view.calls.products[1])).toEqual({ category: "tops", sort: "price", limit: "25" });
  });

  it("marks 'all' as the open chip", async () => {
    await show(() => page(), api);

    expect(screen.getByRole("link", { name: msg("public.shop.components.subcategoryChips.all") }).className).toContain("bg-[var(--accent-primary)] border");
  });

  it("shows a plain hero, with no picture, for a category with no products yet", async () => {
    const { container } = await show(() => page("shoes"), { ...api, pages: [{ data: [], total: 0 }] });

    expect(container.querySelector("[data-hero-bg] img")).toBeNull();
    expect(screen.getByText(msg("public.shop.components.productGrid.comingSoon"))).toBeInTheDocument();
  });

  it("describes three steps of breadcrumb for search engines", async () => {
    await show(() => page(), api);

    expect(jsonLd()[0].itemListElement.map((i: { name: string }) => i.name)).toEqual([msg("shared.header.nav.home"), msg("shared.header.nav.shop"), "Tops"]);
    expect(jsonLd()[0].itemListElement[2].item).toMatch(/\/vi\/shop\/tops$/);
  });

  it("answers 404 for a category that does not exist", async () => {
    shopApi(api);

    await expect(page("nowhere")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("has a title, a description and a share card from the category and its first product", async () => {
    shopApi(api);

    const meta = await categoryMetadata(params("vi", { category: "tops" }));

    expect(meta.title).toBe("Tops — Cửa hàng DOOVAN");
    expect(meta.description).toBe("Everything for the top half — Thời trang thiết kế DOOVAN.");
    expect(meta.alternates).toMatchObject({ canonical: "/vi/shop/tops" });
    expect(meta.openGraph).toMatchObject({ images: [{ url: "/first.jpg", alt: "Tops" }] });
  });

  it("falls back to the brand picture for a category without products", async () => {
    shopApi({ ...api, pages: [{ data: [], total: 0 }] });

    const meta = await categoryMetadata(params("vi", { category: "tops" }));

    expect(meta.openGraph).toMatchObject({ images: [{ url: "/brand/brand_og.png" }] });
  });

  it("says 'not found' in the title of a category that does not exist", async () => {
    shopApi(api);

    const meta = await categoryMetadata(params("vi", { category: "nowhere" }));

    expect(meta.title).toBe(`${msg("common.notFound")} — DOOVAN`);
  });

  it("is built ahead of time for every category", async () => {
    shopApi(api);

    expect(await categoryStaticParams()).toEqual([{ category: "tops" }, { category: "shoes" }]);
  });
});

describe("SHP-3 a sub-category page", () => {
  const api = { categories: [TOPS], pages: [{ data: [product({ images: ["/first.jpg"] }), ...products(1, 2)], total: 9 }] };
  const page = (category = "tops", subcategory = "shirts", locale: AppLocale = "vi") => SubcategoryPage(params(locale, { category, subcategory }));

  it("asks for the category of the address and the products of this sub-category", async () => {
    const view = await show(() => page(), api);

    expect(Object.fromEntries(view.calls.products[0])).toEqual({ category: "tops", subcategory: "shirts", limit: "25" });
  });

  it("shows the hero, the breadcrumb with four steps, the chips with this one open, and how many pieces there are", async () => {
    const { container } = await show(() => page(), api);

    expect(screen.getByRole("heading", { level: 1, name: "Shirts" })).toBeInTheDocument();
    expect(screen.getByText("Tops — Shirts")).toBeInTheDocument();
    expect(decodeURIComponent(container.querySelector("[data-hero-bg] img")!.getAttribute("src") ?? "")).toContain("/first.jpg");
    const crumbs = screen.getByRole("navigation", { name: msg("public.shop.components.breadcrumb.aria") });
    expect(within(crumbs).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/", "/shop", "/shop/tops"]);
    expect(screen.getByRole("link", { name: /Shirts\s*4/ }).className).toContain("bg-[var(--accent-primary)] border");
    expect(screen.getByText("9 sản phẩm trong bộ sưu tập này")).toBeInTheDocument();
    expect(screen.getAllByText("Shirts for every day")).toHaveLength(2);
  });

  it("keeps asking for this category and sub-category when the shopper sorts the list", async () => {
    const view = await show(() => page(), api);

    await userEvent.selectOptions(screen.getByRole("combobox"), "price");

    await waitFor(() => expect(view.calls.products).toHaveLength(2));
    expect(Object.fromEntries(view.calls.products[1])).toEqual({ category: "tops", subcategory: "shirts", sort: "price", limit: "25" });
  });

  it("describes four steps of breadcrumb for search engines", async () => {
    await show(() => page(), api);

    expect(jsonLd()[0].itemListElement.map((i: { name: string }) => i.name)).toEqual([msg("shared.header.nav.home"), msg("shared.header.nav.shop"), "Tops", "Shirts"]);
    expect(jsonLd()[0].itemListElement[3].item).toMatch(/\/vi\/shop\/tops\/shirts$/);
  });

  it("answers 404 when the category or the sub-category does not exist", async () => {
    shopApi(api);

    await expect(page("nowhere", "shirts")).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(page("tops", "nowhere")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("has a title with both names, a description and a share card", async () => {
    shopApi(api);

    const meta = await subcategoryMetadata(params("vi", { category: "tops", subcategory: "shirts" }));

    expect(meta.title).toBe("Shirts — Tops — DOOVAN");
    expect(meta.alternates).toMatchObject({ canonical: "/vi/shop/tops/shirts" });
    expect(meta.openGraph).toMatchObject({ images: [{ url: "/first.jpg", alt: "Shirts" }] });
    expect(typeof meta.description).toBe("string");
  });

  it("says 'not found' in the title of a sub-category that does not exist", async () => {
    shopApi(api);

    const meta = await subcategoryMetadata(params("vi", { category: "tops", subcategory: "nowhere" }));

    expect(meta.title).toBe(`${msg("common.notFound")} — DOOVAN`);
  });

  it("is built ahead of time for every category and sub-category pair", async () => {
    shopApi({ ...api, categories: [TOPS, SHOES] });

    expect(await subcategoryStaticParams()).toEqual([{ category: "tops", subcategory: "shirts" }, { category: "tops", subcategory: "vests" }]);
  });
});
