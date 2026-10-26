import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CollectionDetailPage, { generateMetadata as detailMetadata, generateStaticParams } from "@/src/app/[locale]/(public)/collections/[slug]/page";
import CollectionsPage, { generateMetadata as listMetadata } from "@/src/app/[locale]/(public)/collections/page";
import type { AppLocale } from "@/src/i18n/routing";
import { intlServerModule } from "@/tests/_support/intl-server";
import { msg } from "@/tests/_support/messages";
import { collectionOf, collections, collectionsApi, product, renderCollections, type CollectionsApiOptions } from "./collections-kit";

/* The two server-rendered collections pages: what they ask the API for, what they show, their search-engine data and the 404 (specs/storefront/collections.md, flows COL-1 to COL-3E). */

const SPRING = collectionOf({ slug: "spring", name: "Spring", season: "SS26", description: "Soft layers", image: "/spring.jpg" });
const ITEMS = [product({ id: "p1", name: "Silk dress" }), product({ id: "p2", name: "Linen shirt" })];
const detailParams = (locale: AppLocale, slug = "spring") => ({ params: Promise.resolve({ locale, slug }) });
const listParams = (locale: AppLocale) => ({ params: Promise.resolve({ locale }) });
const jsonLd = () => Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap((s) => JSON.parse(s.textContent ?? "[]"));

/** Installs the fake API, lets the server page ask it, then shows what the page returned */
async function show(make: () => Promise<React.ReactNode>, options: CollectionsApiOptions = {}, locale?: "vi" | "en") {
  const calls = collectionsApi(options);
  const page = await make();
  return renderCollections(<>{page}</>, { calls, locale });
}

describe("COL-1 the collections page", () => {
  const api = { list: collections(4), banners: [{ image: "/hero-1.jpg" }] };

  it("asks the API for every collection in one page and for the hero banners", async () => {
    const view = await show(() => CollectionsPage(listParams("vi")), api);

    expect(Object.fromEntries(view.calls.list[0])).toEqual({ limit: "200" });
    expect(view.calls.banners).toEqual(["COLLECTIONS_HERO_BANNERS"]);
  });

  it("shows the hero, a card for each collection and the first three as editorial spreads", async () => {
    await show(() => CollectionsPage(listParams("vi")), api);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${msg("public.collections.list.heroTitleLine1")}${msg("public.collections.list.heroTitleLine2")}`);
    expect(screen.getAllByRole("link", { name: /Collection 4/ })[0]).toHaveAttribute("href", "/collections/col-4");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Collection 1", "Collection 2", "Collection 3"]);
  });

  it("puts the banner the admin configured in the hero, and still renders when it cannot be read", async () => {
    const withBanner = await show(() => CollectionsPage(listParams("vi")), api);
    expect(decodeURIComponent(withBanner.container.querySelector("[data-hero-media] img")!.getAttribute("src") ?? "")).toContain("/hero-1.jpg");
    withBanner.unmount();

    const without = await show(() => CollectionsPage(listParams("vi")), { ...api, banners: 500 });
    expect(without.container.querySelector("[data-hero-media] img")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("describes the way to the page for search engines: home, then collections, with absolute addresses", async () => {
    await show(() => CollectionsPage(listParams("vi")), api);

    const [crumbs] = jsonLd();
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement.map((i: { position: number; name: string }) => [i.position, i.name])).toEqual([[1, msg("shared.header.nav.home")], [2, msg("shared.header.nav.collections")]]);
    expect(crumbs.itemListElement[1].item).toMatch(/\/vi\/collections$/);
  });

  it("speaks English in English", async () => {
    await show(() => CollectionsPage(listParams("en")), api, "en");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(msg("public.collections.list.heroTitleLine2", "en"));
    expect(jsonLd()[0].itemListElement[1].item).toMatch(/\/en\/collections$/);
  });

  it("tells the framework which language it renders", async () => {
    collectionsApi(api);
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await CollectionsPage(listParams("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("shows the hero and no cards when there are no collections", async () => {
    await show(() => CollectionsPage(listParams("vi")), { list: [] });

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 2 })).toEqual([]);
  });

  it("fails (so the error page shows) when the collections cannot be read", async () => {
    collectionsApi({ list: 500 });

    await expect(CollectionsPage(listParams("vi"))).rejects.toThrow("/api/collections");
  });

  it("has a title with the brand, a description, language alternates and a share card", async () => {
    const meta = await listMetadata(listParams("vi"));

    expect(meta.title).toBe(`${msg("public.collections.meta.title")} — DOOVAN`);
    expect(meta.description).toBe(msg("public.collections.meta.description"));
    expect(meta.alternates).toMatchObject({ canonical: "/vi/collections", languages: { vi: "/vi/collections", en: "/en/collections", "x-default": "/vi/collections" } });
    expect(meta.openGraph).toMatchObject({ url: "/vi/collections", title: meta.title });
  });
});

describe("COL-2 a collection page", () => {
  const api: CollectionsApiOptions = { bySlug: { spring: { data: SPRING, products: ITEMS } }, list: [SPRING] };

  it("asks the API for the collection by its address and shows it with its products", async () => {
    const view = await show(() => CollectionDetailPage(detailParams("vi")), api);

    expect(new Set(view.calls.slugs)).toEqual(new Set(["spring"]));
    expect(screen.getByRole("heading", { level: 1, name: "Spring" })).toBeInTheDocument();
    expect(screen.getByText("SS26")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Silk dress/ })[0]).toHaveAttribute("href", "/shop/tops/shirts/p1");
    expect(screen.getByText("2 sản phẩm")).toBeInTheDocument();
  });

  it("describes the way to the page for search engines: home, collections, this collection", async () => {
    await show(() => CollectionDetailPage(detailParams("vi")), api);

    const [crumbs] = jsonLd();
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual([msg("shared.header.nav.home"), msg("shared.header.nav.collections"), "Spring"]);
    expect(crumbs.itemListElement[2].item).toMatch(/\/vi\/collections\/spring$/);
  });

  it("speaks English in English", async () => {
    await show(() => CollectionDetailPage(detailParams("en")), api, "en");

    expect(jsonLd()[0].itemListElement[2].item).toMatch(/\/en\/collections\/spring$/);
    expect(screen.getByText("2 pieces")).toBeInTheDocument();
  });

  it("tells the framework which language it renders", async () => {
    collectionsApi(api);
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await CollectionDetailPage(detailParams("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("has the collection's name in the title, its description, language alternates and its cover as the share picture", async () => {
    collectionsApi(api);

    const meta = await detailMetadata(detailParams("vi"));

    expect(meta.title).toBe("Spring — Bộ sưu tập — DOOVAN");
    expect(meta.description).toBe("Soft layers");
    expect(meta.alternates).toMatchObject({ canonical: "/vi/collections/spring", languages: { vi: "/vi/collections/spring", en: "/en/collections/spring" } });
    expect(meta.openGraph).toMatchObject({ url: "/vi/collections/spring", title: "Spring — Bộ sưu tập — DOOVAN", images: [{ url: "/spring.jpg", alt: "Spring" }] });
  });

  it("is built ahead of time for every collection", async () => {
    collectionsApi({ list: collections(3) });

    expect(await generateStaticParams()).toEqual([{ slug: "col-1" }, { slug: "col-2" }, { slug: "col-3" }]);
  });
});

describe("COL-3E a collection that is not there", () => {
  it("answers 404 for an address the API does not know", async () => {
    collectionsApi({ bySlug: {} });

    await expect(CollectionDetailPage(detailParams("vi", "nowhere"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers 404 as well when the API fails, since a failed read looks like a missing collection", async () => {
    collectionsApi({ bySlug: { spring: 500 } });

    await expect(CollectionDetailPage(detailParams("vi"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("says 'not found' in the title", async () => {
    collectionsApi({ bySlug: {} });

    const meta = await detailMetadata(detailParams("vi", "nowhere"));

    expect(meta.title).toBe(`${msg("common.notFound")} — DOOVAN`);
    expect(meta.description).toBeUndefined();
  });
});
