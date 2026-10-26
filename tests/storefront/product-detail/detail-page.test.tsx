import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductDetailPage, { generateMetadata, generateStaticParams } from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/page";
import type { AppLocale } from "@/src/i18n/routing";
import { intlServerModule } from "@/tests/_support/intl-server";
import { msg } from "@/tests/_support/messages";
import { categoryOf, detailApi, pageApi, product, renderDetail, subcategoryOf, type PageApiOptions } from "./detail-kit";

/* The server-rendered product page: what it asks the API for, what it shows, its search-engine data and the 404 (specs/storefront/product-detail.md, flows PD-1 to PD-3E). */

const params = (locale: AppLocale, rest: Partial<{ category: string; subcategory: string; productId: string }> = {}) => ({
  params: Promise.resolve({ locale, category: "tops", subcategory: "shirts", productId: "p1", ...rest }),
});
const TOPS = categoryOf({ slug: "tops", title: "Tops", subcategories: [subcategoryOf({ slug: "shirts", label: "Shirts" })] });
const DRESS = product({ id: "p1", name: "Silk dress", description: "A dress made of silk", images: ["/silk.jpg", "/two.jpg"], material: "Silk", colors: [{ name: "Red", hex: "#f00" }] });
const API: PageApiOptions = { product: DRESS, related: [product({ id: "p2", name: "Linen shirt" })], categories: [TOPS] };
const jsonLd = () => Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap((s) => JSON.parse(s.textContent ?? "[]"));

async function show(options: PageApiOptions = API, locale: AppLocale = "vi") {
  const pageCalls = pageApi(options);
  const calls = detailApi({});
  const page = await ProductDetailPage(params(locale));
  const view = await renderDetail(<>{page}</>, { calls, locale });
  return Object.assign(view, { pageCalls });
}

describe("PD-1 the product page", () => {
  it("asks the API for the product with its five related ones, and for its category", async () => {
    const { pageCalls } = await show();

    expect(pageCalls.products).toHaveLength(1);
    expect(Object.fromEntries(pageCalls.products[0])).toEqual({ relatedLimit: "5" });
    expect(pageCalls.categories).toEqual(["tops"]);
  });

  it("shows the product: its name as the heading, the description, the breadcrumb to its sub-category and the related products", async () => {
    await show();

    expect(screen.getByRole("heading", { level: 1, name: "Silk dress" })).toBeInTheDocument();
    expect(screen.getByText("A dress made of silk")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tops" })).toHaveAttribute("href", "/shop/tops");
    expect(screen.getAllByRole("link", { name: "Shirts" })[0]).toHaveAttribute("href", "/shop/tops/shirts");
    expect(screen.getByRole("link", { name: /Linen shirt/ })).toHaveAttribute("href", "/shop/tops/shirts/p2");
  });

  it("tells the framework which language it renders", async () => {
    pageApi(API);
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await ProductDetailPage(params("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("describes the product for search engines: name, price, picture addresses, colours, and in stock", async () => {
    await show();

    const [item] = jsonLd();
    expect(item).toMatchObject({ "@type": "Product", name: "Silk dress", sku: "SKU-1", category: "Tops", material: "Silk", color: "Red" });
    expect(item.image).toHaveLength(2);
    expect(item.url).toMatch(/\/vi\/shop\/tops\/shirts\/p1$/);
    expect(item.offers).toMatchObject({ priceCurrency: "VND", price: 350_000, availability: "https://schema.org/InStock" });
  });

  it("describes the way to the product for search engines: home, shop, category, sub-category, product", async () => {
    await show();

    const crumbs = jsonLd()[1];
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement.map((i: { position: number; name: string }) => [i.position, i.name])).toEqual([
      [1, msg("shared.header.nav.home")],
      [2, msg("shared.header.nav.shop")],
      [3, "Tops"],
      [4, "Shirts"],
      [5, "Silk dress"],
    ]);
    expect(crumbs.itemListElement[4].item).toMatch(/\/vi\/shop\/tops\/shirts\/p1$/);
  });

  it("speaks English in English, with dollar prices for search engines", async () => {
    await show({ ...API, product: { ...DRESS, priceUsd: 13.46 } }, "en");

    expect(jsonLd()[0].offers).toMatchObject({ priceCurrency: "USD", price: 13.46 });
    expect(jsonLd()[0].url).toMatch(/\/en\/shop\/tops\/shirts\/p1$/);
    expect(jsonLd()[1].itemListElement[0].name).toBe(msg("shared.header.nav.home", "en"));
  });

  it("does not advertise a sold-out product as in stock, nor a custom-order product (no price) as an offer", async () => {
    await show({ ...API, product: { ...DRESS, badge: "sold_out" } });
    expect(jsonLd()[0].offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("gives a custom-order product no offer at all", async () => {
    await show({ ...API, product: { ...DRESS, badge: "custom_order" } });

    expect(jsonLd()[0].offers).toBeUndefined();
  });
});

describe("PD-2 a product the BE rejects the related limit of", () => {
  it("asks again without it and still shows the page (the BE then sends its own default)", async () => {
    const { pageCalls } = await show({ ...API, rejectRelatedLimit: true });

    expect(pageCalls.products.map((p) => p.has("relatedLimit"))).toEqual([true, false]);
    expect(screen.getByRole("heading", { level: 1, name: "Silk dress" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Linen shirt/ })).toBeInTheDocument();
  });
});

describe("PD-2E a page that is not there", () => {
  it("answers 404 for a product the API does not know", async () => {
    pageApi({ ...API, product: undefined });

    await expect(ProductDetailPage(params("vi"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers 404 for a category the API does not know", async () => {
    pageApi(API);

    await expect(ProductDetailPage(params("vi", { category: "nowhere" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers 404 for a sub-category the category does not have", async () => {
    pageApi(API);

    await expect(ProductDetailPage(params("vi", { subcategory: "nowhere" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("PD-3 the product's title, description and share card", () => {
  it("has the product's name with the brand as title, its description, language alternates and its first picture as the share picture", async () => {
    pageApi(API);

    const meta = await generateMetadata(params("vi"));

    expect(meta.title).toBe("Silk dress — DOOVAN");
    expect(meta.description).toBe("A dress made of silk");
    expect(meta.alternates).toMatchObject({ canonical: "/vi/shop/tops/shirts/p1", languages: { vi: "/vi/shop/tops/shirts/p1", en: "/en/shop/tops/shirts/p1" } });
    expect(meta.openGraph).toMatchObject({ images: [{ url: "/silk.jpg", alt: "Silk dress" }] });
  });

  it("is built ahead of time for every product, at its own category and sub-category", async () => {
    pageApi({ ...API, all: [product({ id: "p1" }), product({ id: "p2", category: null, subcategory: null })] });

    expect(await generateStaticParams()).toEqual([
      { category: "tops", subcategory: "shirts", productId: "p1" },
      { category: "", subcategory: "", productId: "p2" },
    ]);
  });
});

describe("PD-3E a title for a product that is not there", () => {
  it("says 'not found' with the brand", async () => {
    pageApi({ ...API, product: undefined });

    const meta = await generateMetadata(params("vi"));

    expect(meta.title).toBe(`${msg("common.notFound")} — DOOVAN`);
    expect(meta.description).toBeUndefined();
  });
});
