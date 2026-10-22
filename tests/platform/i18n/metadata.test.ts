import { describe, expect, it } from "vitest";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";

/* Search engine and share-card metadata per language (flows I18-4 and I18-4E). */

describe("I18-4 buildAlternates", () => {
  it("points canonical at the page's own language and lists every language", () => {
    expect(buildAlternates("en", "/shop")).toEqual({
      canonical: "/en/shop",
      languages: { vi: "/vi/shop", en: "/en/shop", "x-default": "/vi/shop" },
    });
  });

  it("the home page has an empty path", () => {
    expect(buildAlternates("vi")).toEqual({ canonical: "/vi", languages: { vi: "/vi", en: "/en", "x-default": "/vi" } });
  });

  it("x-default is always the default language, whatever the page language is", () => {
    expect(buildAlternates("en", "/a")?.languages).toMatchObject({ "x-default": "/vi/a" });
    expect(buildAlternates("vi", "/a")?.languages).toMatchObject({ "x-default": "/vi/a" });
  });
});

describe("I18-4 withBrand", () => {
  it("ends every title with the brand, which is never translated", () => {
    expect(withBrand("Shop")).toBe("Shop — DOOVAN");
    expect(withBrand("Cửa hàng")).toBe("Cửa hàng — DOOVAN");
  });
});

describe("I18-4 buildSocialMetadata", () => {
  const base = { locale: "vi" as const, path: "/shop", title: "Shop", description: "All products" };

  it("builds the Open Graph card for the page's language", () => {
    const { openGraph } = buildSocialMetadata({ ...base, image: "/media/a.jpg", imageAlt: "A dress" });

    expect(openGraph).toMatchObject({
      type: "website",
      siteName: "DOOVAN",
      locale: "vi_VN",
      alternateLocale: ["en_US"],
      url: "/vi/shop",
      title: "Shop",
      description: "All products",
      images: [{ url: "/media/a.jpg", alt: "A dress" }],
    });
  });

  it("lists the other languages as alternates, not its own", () => {
    expect(buildSocialMetadata({ ...base, locale: "en" }).openGraph).toMatchObject({ locale: "en_US", alternateLocale: ["vi_VN"] });
  });

  it("builds the Twitter card from the same texts and image", () => {
    expect(buildSocialMetadata({ ...base, image: "/media/a.jpg" }).twitter).toEqual({
      card: "summary_large_image",
      title: "Shop",
      description: "All products",
      images: ["/media/a.jpg"],
    });
  });

  it("the home page has an empty path", () => {
    expect(buildSocialMetadata({ locale: "en", title: "T", description: "D" }).openGraph).toMatchObject({ url: "/en" });
  });
});

describe("I18-4E a page without its own image", () => {
  it.each([undefined, null, ""])("falls back to the brand image (%j)", (image) => {
    const { openGraph, twitter } = buildSocialMetadata({ locale: "vi", title: "Shop", description: "D", image });

    expect(openGraph?.images).toEqual([{ url: "/brand/brand_og.png", width: 1200, height: 630, alt: "Shop" }]);
    expect(twitter?.images).toEqual(["/brand/brand_og.png"]);
  });

  it("uses the title as the image description unless one is given", () => {
    const withoutAlt = buildSocialMetadata({ locale: "vi", title: "Shop", description: "D", image: "/a.jpg" });
    const withAlt = buildSocialMetadata({ locale: "vi", title: "Shop", description: "D", image: "/a.jpg", imageAlt: "Photo" });

    expect(withoutAlt.openGraph?.images).toEqual([{ url: "/a.jpg", alt: "Shop" }]);
    expect(withAlt.openGraph?.images).toEqual([{ url: "/a.jpg", alt: "Photo" }]);
  });
});
