import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { generateMetadata, generateStaticParams } from "@/src/app/[locale]/layout";
import CatchAllNotFound from "@/src/app/[locale]/[...rest]/page";
import PrivateLayout, { metadata as privateMetadata } from "@/src/app/[locale]/(private)/layout";
import PublicLayout from "@/src/app/[locale]/(public)/layout";
import SiteFooter from "@/src/app/[locale]/_components/SiteFooter";
import SiteHeader from "@/src/app/[locale]/_components/SiteHeader";
import ScopedMessages from "@/src/i18n/ScopedMessages";
import { BRAND_NAME } from "@/src/lib/brand";
import { SITE_URL } from "@/src/lib/site-url";
import { intlServerModule } from "@/tests/_support/intl-server";
import { msg } from "@/tests/_support/messages";
import type { AppLocale } from "@/src/i18n/routing";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-site-test", className: "font-site-class" }) }));

/* The frame around every page: the root layout, the three route-group layouts and the catch-all 404 (specs/platform/app-shell.md, flows SHL-1 to SHL-6E). */

const params = (locale: string) => ({ params: Promise.resolve({ locale }) });
const child = <p>the page</p>;
type AnyElement = ReactElement<{ children?: unknown; messages?: Record<string, unknown>; locale?: string; scope?: string; lang?: string; className?: string; suppressHydrationWarning?: boolean }>;

describe("SHL-1 the root layout", () => {
  it("is a page in the visitor's language, with the site typeface on it, and holds the page", async () => {
    const html = (await RootLayout({ children: child, ...params("en") })) as AnyElement;

    expect(html.type).toBe("html");
    expect(html.props.lang).toBe("en");
    expect(html.props.className).toBe("font-site-test");
    expect(html.props.suppressHydrationWarning).toBe(true);
    expect(renderToString(html)).toContain("<p>the page</p>");
  });

  it("sends the browser only the texts every page needs: common, shared and auth", async () => {
    const html = (await RootLayout({ children: child, ...params("vi") })) as AnyElement;

    const body = html.props.children as AnyElement;
    const provider = body.props.children as AnyElement;
    expect(provider.props.locale).toBe("vi");
    expect(Object.keys(provider.props.messages ?? {}).sort()).toEqual(["auth", "common", "shared"]);
  });

  it("sends the texts of the language asked for", async () => {
    const html = (await RootLayout({ children: child, ...params("en") })) as AnyElement;

    const provider = (html.props.children as AnyElement).props.children as AnyElement;
    expect(provider.props.locale).toBe("en");
    expect(JSON.stringify(provider.props.messages)).toContain(msg("common.notFound", "en"));
    expect(JSON.stringify(provider.props.messages)).not.toContain(msg("common.notFound", "vi"));
  });

  it.each([["fr"], ["VI"], [""], ["vi-VN"]])("answers 404 for the language %j, which the site does not have", async (locale) => {
    await expect(RootLayout({ children: child, ...params(locale) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("tells the framework which language it renders", async () => {
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await RootLayout({ children: child, ...params("en") });
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("is built ahead of time for each language", () => {
    expect(generateStaticParams()).toEqual([{ locale: "vi" }, { locale: "en" }]);
  });
});

describe("SHL-2 the site's title and share card", () => {
  const meta = (locale: AppLocale) => generateMetadata({ params: Promise.resolve({ locale }) });

  it("has the site's title and description in the language, the application name and absolute addresses", async () => {
    const data = await meta("vi");

    expect(data.title).toBe(msg("shared.site.meta.title"));
    expect(data.description).toBe(msg("shared.site.meta.description"));
    expect(data.applicationName).toBe(BRAND_NAME);
    expect(String(data.metadataBase)).toBe(new URL(SITE_URL).toString());
    expect(data.alternates).toMatchObject({ canonical: "/vi", languages: { vi: "/vi", en: "/en", "x-default": "/vi" } });
  });

  it("has a share card with the brand picture at 1200 by 630, described, and the language of the page", async () => {
    const data = await meta("en");

    expect(data.openGraph).toMatchObject({ type: "website", siteName: BRAND_NAME, locale: "en_US" });
    expect(data.openGraph?.images).toEqual([{ url: "/brand/brand_og.png", width: 1200, height: 630, alt: msg("shared.site.meta.ogAlt", "en") }]);
    expect(data.twitter).toEqual({ card: "summary_large_image", images: ["/brand/brand_og.png"] });
    expect((await meta("vi")).openGraph).toMatchObject({ locale: "vi_VN" });
  });

  it("carries the search-console proof only when it is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION", "proof-123");
    expect((await meta("vi")).verification).toEqual({ google: "proof-123" });
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION", undefined);

    expect((await meta("vi")).verification).toEqual({ google: undefined });
    vi.unstubAllEnvs();
  });
});

describe("SHL-3 the group of public pages", () => {
  it("sends the public texts besides the shared ones, and puts the header and the footer round the page", async () => {
    const tree = (await PublicLayout({ children: child, ...params("vi") })) as AnyElement;

    expect(tree.type).toBe(ScopedMessages);
    expect(tree.props.scope).toBe("public");
    const parts = tree.props.children as AnyElement[];
    expect(parts).toHaveLength(3);
    expect(parts[1]).toEqual(child);
    expect(parts[0].type).toBe(SiteHeader);
    expect(parts[2].type).toBe(SiteFooter);
  });

  it("answers 404 for a language the site does not have", async () => {
    await expect(PublicLayout({ children: child, ...params("fr") })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("tells the framework which language it renders", async () => {
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await PublicLayout({ children: child, ...params("en") });
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });
});

describe("SHL-4 the group of private pages", () => {
  it("keeps the private texts apart, and puts nothing round the page (each page adds its own frame)", async () => {
    const tree = (await PrivateLayout({ children: child, ...params("en") })) as AnyElement;

    expect(tree.type).toBe(ScopedMessages);
    expect(tree.props.scope).toBe("private");
    expect(tree.props.children).toEqual(child);
  });

  it("keeps all of them out of search results, links included", () => {
    expect(privateMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("answers 404 for a language the site does not have", async () => {
    await expect(PrivateLayout({ children: child, ...params("de") })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("SHL-5 the texts a group sends", () => {
  const sent = async (scope: "public" | "private" | "admin") => {
    const provider = (await ScopedMessages({ scope, children: child })) as AnyElement;
    return provider.props;
  };

  it.each([["public"], ["private"], ["admin"]] as const)("%s gets the shared texts and its own, and not the others'", async (scope) => {
    const props = await sent(scope);

    expect(Object.keys(props.messages ?? {}).sort()).toEqual(["auth", "common", scope, "shared"].sort());
  });

  it("uses the language of the request", async () => {
    const props = await sent("public");

    expect(props.locale).toBe("vi");
  });
});

describe("SHL-6E an address no page matches", () => {
  it("answers 404 so that the language's own page shows", () => {
    expect(() => CatchAllNotFound()).toThrow("NEXT_NOT_FOUND");
  });
});
