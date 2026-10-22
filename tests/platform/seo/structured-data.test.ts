import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL, CONTACT_PHONE_E164, GOOGLE_BUSINESS_URL } from "@/src/lib/contact";
import { SOCIALS } from "@/src/lib/socials";
import { absoluteUrl, breadcrumbJsonLd, pageUrl, productJsonLd, siteJsonLd, siteNavigationJsonLd } from "@/src/lib/structured-data";
import type { Product } from "@/src/types/product";

/* Structured data for search engines (specs/platform/seo.md, flows SEO-3 … SEO-5). */

const ORIGIN = "http://localhost:3000";

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: "p1",
    name: "Silk dress",
    description: "A dress",
    sku: "SKU-1",
    images: ["/media/a.jpg", "https://cdn.example.com/b.jpg"],
    priceVnd: 350_000,
    priceUsd: 13.46,
    badge: null,
    material: "Silk",
    colors: [{ name: "Red", hex: "#f00" }, { name: "Blue", hex: "#00f" }],
    category: { slug: "tops", title: "Tops" },
    ...overrides,
  }) as unknown as Product;

describe("SEO-3 URLs", () => {
  it.each([
    ["https://cdn.example.com/a.jpg", "https://cdn.example.com/a.jpg"],
    ["http://cdn.example.com/a.jpg", "http://cdn.example.com/a.jpg"],
    ["/media/a.jpg", `${ORIGIN}/media/a.jpg`],
    ["media/a.jpg", `${ORIGIN}/media/a.jpg`],
    ["/icon.png", `${ORIGIN}/icon.png`],
  ])("absoluteUrl(%s) is %s", (input, output) => {
    expect(absoluteUrl(input)).toBe(output);
  });

  it("pageUrl puts the origin and the language in front of a locale-less path", () => {
    expect(pageUrl("vi", "/shop")).toBe(`${ORIGIN}/vi/shop`);
    expect(pageUrl("en", "")).toBe(`${ORIGIN}/en`);
    expect(pageUrl("en")).toBe(`${ORIGIN}/en`);
  });
});

describe("SEO-3 breadcrumbs and navigation", () => {
  it("numbers the crumbs from 1 and uses absolute URLs in the page's language", () => {
    expect(breadcrumbJsonLd("en", [{ name: "Home", path: "" }, { name: "Shop", path: "/shop" }, { name: "Tops", path: "/shop/tops" }])).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/en` },
        { "@type": "ListItem", position: 2, name: "Shop", item: `${ORIGIN}/en/shop` },
        { "@type": "ListItem", position: 3, name: "Tops", item: `${ORIGIN}/en/shop/tops` },
      ],
    });
  });

  it("an empty trail is an empty list", () => {
    expect(breadcrumbJsonLd("vi", []).itemListElement).toEqual([]);
  });

  it("lists the main sections as navigation elements", () => {
    expect(siteNavigationJsonLd("vi", [{ name: "Cửa hàng", path: "/shop" }, { name: "Giới thiệu", path: "/about" }])).toEqual({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: [
        { "@type": "SiteNavigationElement", position: 1, name: "Cửa hàng", url: `${ORIGIN}/vi/shop` },
        { "@type": "SiteNavigationElement", position: 2, name: "Giới thiệu", url: `${ORIGIN}/vi/about` },
      ],
    });
  });
});

describe("SEO-4 a product", () => {
  it("describes the product, with absolute images and the brand", () => {
    const data = productJsonLd("vi", product(), "/shop/tops/shirts/p1");

    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Silk dress",
      description: "A dress",
      sku: "SKU-1",
      image: [`${ORIGIN}/media/a.jpg`, "https://cdn.example.com/b.jpg"],
      url: `${ORIGIN}/vi/shop/tops/shirts/p1`,
      brand: { "@type": "Brand", name: "DOOVAN" },
      category: "Tops",
      material: "Silk",
      color: "Red, Blue",
    });
  });

  it("offers the Vietnamese price in VND on the Vietnamese page, exactly as the API sent it", () => {
    expect(productJsonLd("vi", product(), "/p").offers).toEqual({
      "@type": "Offer",
      url: `${ORIGIN}/vi/p`,
      priceCurrency: "VND",
      price: 350_000,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    });
  });

  it("offers the USD price on the other languages' pages", () => {
    expect(productJsonLd("en", product(), "/p").offers).toMatchObject({ priceCurrency: "USD", price: 13.46, url: `${ORIGIN}/en/p` });
  });

  it("never claims a rating", () => {
    expect(productJsonLd("vi", product(), "/p")).not.toHaveProperty("aggregateRating");
  });
});

describe("SEO-4E products with less data", () => {
  it("a custom-order product has no price, so no offer", () => {
    expect(productJsonLd("vi", product({ badge: "custom_order" }), "/p")).not.toHaveProperty("offers");
  });

  it.each(["new", "sale", "bestseller", "limited", null] as const)("a %s product keeps its offer", (badge) => {
    expect(productJsonLd("vi", product({ badge }), "/p")).toHaveProperty("offers");
  });

  it("advertises a sold-out product as out of stock, and any other badge as in stock", () => {
    expect(productJsonLd("vi", product({ badge: "sold_out" }), "/p").offers).toMatchObject({ availability: "https://schema.org/OutOfStock" });
    expect(productJsonLd("vi", product({ badge: "new" }), "/p").offers).toMatchObject({ availability: "https://schema.org/InStock" });
    expect(productJsonLd("vi", product({ badge: null }), "/p").offers).toMatchObject({ availability: "https://schema.org/InStock" });
  });

  it("leaves out category, material and colour when the product has none", () => {
    const data = productJsonLd("vi", product({ category: null, material: "", colors: [] }), "/p");

    expect(data).not.toHaveProperty("category");
    expect(data).not.toHaveProperty("material");
    expect(data).not.toHaveProperty("color");
  });
});

describe("SEO-5 the brand on the home page", () => {
  const [site, store] = siteJsonLd("vi", "Mô tả", "Thương hiệu thời trang Việt Nam") as unknown as [Record<string, unknown>, Record<string, unknown>];

  it("is a WebSite and a ClothingStore", () => {
    expect(site["@type"]).toBe("WebSite");
    expect(store["@type"]).toBe("ClothingStore");
  });

  it("points the site's publisher at the store by a stable id", () => {
    expect(store["@id"]).toBe(`${ORIGIN}/#organization`);
    expect(site.publisher).toEqual({ "@id": store["@id"] });
  });

  it("names the brand, its other spelling, its language and its description", () => {
    expect(site).toMatchObject({ name: "DOOVAN", alternateName: ["Doovan"], url: ORIGIN, description: "Mô tả", inLanguage: "vi" });
    expect(store).toMatchObject({ name: "DOOVAN", alternateName: ["Doovan"], description: "Mô tả", disambiguatingDescription: "Thương hiệu thời trang Việt Nam", foundingDate: "2026", logo: `${ORIGIN}/icon.png` });
  });

  it("gives contact details, an address and a customer-service contact point", () => {
    expect(store).toMatchObject({ email: CONTACT_EMAIL, telephone: CONTACT_PHONE_E164, address: { "@type": "PostalAddress", addressCountry: "VN" } });
    expect(store.contactPoint).toMatchObject({ "@type": "ContactPoint", contactType: "customer service", email: CONTACT_EMAIL, telephone: CONTACT_PHONE_E164, availableLanguage: ["vi", "en"] });
  });

  it("links the social profiles and the Google Business Profile, which also is the map", () => {
    expect(store.sameAs).toEqual([...SOCIALS.map((s) => s.href), GOOGLE_BUSINESS_URL]);
    expect(store.hasMap).toBe(GOOGLE_BUSINESS_URL);
  });

  it("uses the language of the page", () => {
    expect((siteJsonLd("en", "d", "i") as { inLanguage: string }[])[0].inLanguage).toBe("en");
  });
});
