import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { getLegalDocument } from "@/src/app/[locale]/(public)/legal/_common/content";
import { buildLegalMetadata } from "@/src/app/[locale]/(public)/legal/_common/metadata";
import LegalOverviewPage, { generateMetadata as hubMetadata } from "@/src/app/[locale]/(public)/legal/page";
import PrivacyPage, { generateMetadata as privacyMetadata } from "@/src/app/[locale]/(public)/privacy/page";
import ShippingReturnsPage, { generateMetadata as shippingMetadata } from "@/src/app/[locale]/(public)/shipping-returns/page";
import TermsPage, { generateMetadata as termsMetadata } from "@/src/app/[locale]/(public)/terms/page";
import type { AppLocale } from "@/src/i18n/routing";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_HUB_PATH, LEGAL_LAST_UPDATED } from "@/src/lib/legal";
import { API } from "@/tests/_support/api";
import { shippingInfo } from "@/tests/_support/fixtures";
import { intlServerModule } from "@/tests/_support/intl-server";
import { dateText, MESSAGES, msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";
import { resolveServerTree } from "@/tests/_support/server-tree";

/* The legal pages: terms, privacy, shipping and returns, and the overview (specs/storefront/legal.md, flows LGL-1 to LGL-8E). */

const L = (key: string, locale: "vi" | "en" = "vi") => msg(`public.legal.${key}`, locale);
const T = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.legal.${key}`, locale);
const params = (locale: AppLocale) => ({ params: Promise.resolve({ locale }) });
const rawSections = (doc: string, locale: "vi" | "en" = "vi") => Object.entries((MESSAGES[locale] as never as { public: { legal: Record<string, { sections: Record<string, Record<string, string>> }> } }).public.legal[doc].sections);

function shipping(days: number | "down" = 7) {
  server.use(http.get(`${API}/api/shipping`, () => (days === "down" ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json({ data: shippingInfo({ returnPolicy: { days, description: "", conditions: [] } }) }))));
}
async function show(page: (props: ReturnType<typeof params>) => Promise<ReactNode>, locale: AppLocale = "vi") {
  const tree = await resolveServerTree(await page(params(locale)));
  return renderApp(<>{tree}</>, { locale });
}
describe("LGL-1 the content of a document", () => {
  it("reads the title and the introduction, with the shop's details filled in", async () => {
    shipping();

    const doc = await getLegalDocument("vi", "privacy");

    expect(doc.key).toBe("privacy");
    expect(doc.title).toBe(T("privacy"));
    expect(doc.intro).toContain(LEGAL_CONTACT.company);
    expect(doc.intro).not.toContain("{company}");
  });

  it("finds the sections in the order of the file, each with a title", async () => {
    shipping();

    const doc = await getLegalDocument("vi", "terms");

    expect(doc.sections.map((s) => s.key)).toEqual(rawSections("terms").map(([key]) => key));
    expect(doc.sections.map((s) => s.title)).toEqual(rawSections("terms").map(([, items]) => items.title));
  });

  it("makes a paragraph of each p-item and one bullet list of each run of l-items", async () => {
    shipping();

    const privacy = await getLegalDocument("vi", "privacy");

    for (const [index, [, items]] of rawSections("privacy").entries()) {
      const keys = Object.keys(items).filter((k) => k !== "title");
      const expected: string[] = [];
      for (const key of keys) {
        const kind = key.startsWith("l") ? "list" : "paragraph";
        if (kind === "list" && expected.at(-1) === "list") continue;
        expected.push(kind);
      }
      expect(privacy.sections[index].blocks.map((b) => b.type)).toEqual(expected);
    }
    const withList = privacy.sections.find((s) => s.blocks.some((b) => b.type === "list"))!;
    const list = withList.blocks.find((b) => b.type === "list") as { items: string[] };
    expect(list.items.length).toBeGreaterThan(1);
  });

  it("fills in the company, email, phone and address everywhere", async () => {
    shipping();

    for (const key of ["terms", "privacy", "shippingReturns"] as const) {
      const doc = await getLegalDocument("vi", key);
      const text = JSON.stringify(doc);
      expect(text).not.toMatch(/\{(company|email|phone|address|returnWindow)\}/);
      expect(text).toContain(LEGAL_CONTACT.company);
    }
    const privacy = JSON.stringify(await getLegalDocument("vi", "privacy"));
    expect(privacy).toContain(LEGAL_CONTACT.email);
  });

  it("says the return window the admin set, in days", async () => {
    shipping(14);

    const doc = await getLegalDocument("vi", "shippingReturns");

    expect(JSON.stringify(doc)).toContain("14 ngày");
  });

  it("speaks English in English", async () => {
    shipping(7);

    const doc = await getLegalDocument("en", "terms");

    expect(doc.title).toBe(T("terms", "en"));
    expect(JSON.stringify(await getLegalDocument("en", "shippingReturns"))).toContain("7 days");
  });
});

describe("LGL-1E the return window cannot be read", () => {
  it("says the window is on the product page when it cannot be read, and when it is zero", async () => {
    shipping("down");
    expect(JSON.stringify(await getLegalDocument("vi", "shippingReturns"))).toContain(T("returnWindowUnknown"));

    shipping(0);
    expect(JSON.stringify(await getLegalDocument("vi", "shippingReturns"))).toContain(T("returnWindowUnknown"));
  });
});

describe("LGL-2 a reading page", () => {
  it("is headed with the document's title and introduction, and says when it was last updated", async () => {
    shipping();
    await show(TermsPage);

    expect(screen.getByRole("heading", { level: 1, name: T("terms") })).toBeInTheDocument();
    expect(screen.getByText(T("title"))).toBeInTheDocument();
    expect(screen.getAllByText((await getLegalDocument("vi", "terms")).intro).length).toBeGreaterThan(0);
    expect(screen.getByText(L("common.lastUpdated").replace("{date}", dateText(`${LEGAL_LAST_UPDATED}T12:00:00Z`, "long")))).toBeInTheDocument();
  });

  it.each([["terms", TermsPage], ["privacy", PrivacyPage], ["shippingReturns", ShippingReturnsPage]] as const)("shows %s with each section numbered under its own heading", async (doc, page) => {
    shipping();
    await show(page);

    const sections = rawSections(doc);
    const headings = screen.getAllByRole("heading", { level: 2 }).filter((h) => /^\d+\. /.test(h.textContent ?? ""));
    expect(headings.map((h) => h.textContent)).toEqual(sections.map(([, items], i) => `${i + 1}. ${items.title}`));
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("shows paragraphs and bullet lists", async () => {
    shipping();
    await show(PrivacyPage);

    expect(document.querySelectorAll("article p").length).toBeGreaterThan(5);
    expect(document.querySelectorAll("article ul > li").length).toBeGreaterThan(1);
  });

  it("gives each section an address to jump to", async () => {
    shipping();
    await show(TermsPage);

    const first = rawSections("terms")[0][0];
    expect(document.getElementById(`terms-${first}`)).not.toBeNull();
    expect(document.getElementById("terms")).not.toBeNull();
  });

  it("has a table of contents with a link to each section, numbered", async () => {
    shipping();
    await show(PrivacyPage);

    const toc = screen.getByRole("navigation", { name: L("common.contents") });
    const links = within(toc).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(rawSections("privacy").map(([key]) => `#privacy-${key}`));
    expect(links[0].textContent).toBe(`1. ${rawSections("privacy")[0][1].title}`);
  });

  it("links to the two other documents, and not to itself", async () => {
    shipping();
    await show(TermsPage);

    const nav = screen.getByRole("navigation", { name: L("common.otherPolicies") });
    expect(within(nav).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      [T("privacy"), "/privacy"],
      [T("shippingReturns"), "/shipping-returns"],
    ]);
  });

  it("speaks English in English", async () => {
    shipping();
    await show(TermsPage, "en");

    expect(screen.getByRole("heading", { level: 1, name: T("terms", "en") })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: L("common.otherPolicies", "en") })).toBeInTheDocument();
  });

  it("tells the framework which language it renders", async () => {
    shipping();
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await TermsPage(params("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });
});

describe("LGL-3 the overview", () => {
  it("tells the framework which language it renders", async () => {
    shipping();
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await LegalOverviewPage(params("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("is headed with the hub's title, shows the three documents each under its own heading, and has no list of other documents", async () => {
    shipping();
    await show(LegalOverviewPage);

    expect(screen.getByRole("heading", { level: 1, name: L("hub.title") })).toBeInTheDocument();
    expect(screen.getByText(L("hub.subtitle"))).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(LEGAL_DOCS.map((d) => T(d.key)));
    expect(screen.queryByRole("navigation", { name: L("common.otherPolicies") })).not.toBeInTheDocument();
    expect(document.getElementById("terms")).not.toBeNull();
    expect(document.getElementById("shippingReturns")).not.toBeNull();
  });

  it("starts the sections of each document at one, one level lower", async () => {
    shipping();
    await show(LegalOverviewPage);

    const sections = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent ?? "");
    expect(sections.filter((s) => s.startsWith("1. "))).toHaveLength(3);
    expect(sections).toHaveLength(LEGAL_DOCS.reduce((n, d) => n + rawSections(d.key).length, 0));
  });

  it("groups the table of contents by document, with a link to each", async () => {
    shipping();
    await show(LegalOverviewPage);

    const toc = screen.getByRole("navigation", { name: L("common.contents") });
    const docLinks = within(toc).getAllByRole("link").filter((a) => LEGAL_DOCS.some((d) => a.getAttribute("href") === `#${d.key}`));
    expect(docLinks.map((a) => a.textContent)).toEqual(LEGAL_DOCS.map((d) => T(d.key)));
  });

  it("says when it was last updated", async () => {
    shipping();
    await show(LegalOverviewPage);

    expect(screen.getByText(L("common.lastUpdated").replace("{date}", dateText(`${LEGAL_LAST_UPDATED}T12:00:00Z`, "long")))).toBeInTheDocument();
  });
});

describe("LGL-4 titles and descriptions", () => {
  it.each([["terms", termsMetadata, "/terms"], ["privacy", privacyMetadata, "/privacy"], ["shippingReturns", shippingMetadata, "/shipping-returns"]] as const)("%s has its title with the brand, its description, alternates and a share card", async (doc, metadata, path) => {
    const meta = await metadata(params("vi"));

    expect(meta.title).toBe(`${T(doc)} — DOOVAN`);
    expect(meta.description).toBe(L(`${doc}.meta.description`));
    expect(meta.alternates).toMatchObject({ canonical: `/vi${path}`, languages: { vi: `/vi${path}`, en: `/en${path}`, "x-default": `/vi${path}` } });
    expect(meta.openGraph).toMatchObject({ url: `/vi${path}`, title: meta.title });
    expect(meta.robots).toBeUndefined();
  });

  it("is built in English too", async () => {
    const meta = await buildLegalMetadata("en", "privacy");

    expect(meta.title).toBe(`${T("privacy", "en")} — DOOVAN`);
    expect(meta.description).toBe(L("privacy.meta.description", "en"));
  });

  it("gives the overview its own title and keeps it out of search results, while letting links through", async () => {
    const meta = await hubMetadata(params("vi"));

    expect(meta.title).toBe(`${L("hub.meta.title")} — DOOVAN`);
    expect(meta.description).toBe(L("hub.meta.description"));
    expect(meta.alternates).toMatchObject({ canonical: `/vi${LEGAL_HUB_PATH}` });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("LGL-5 the list of documents", () => {
  it("has the three documents with their addresses, and the overview address", () => {
    expect(LEGAL_DOCS.map((d) => [d.key, d.path])).toEqual([["terms", "/terms"], ["privacy", "/privacy"], ["shippingReturns", "/shipping-returns"]]);
    expect(LEGAL_HUB_PATH).toBe("/legal");
  });
});
