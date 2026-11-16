import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DrawerSearch from "@/src/app/[locale]/_components/DrawerSearch";
import HamburgerMenu from "@/src/app/[locale]/_components/HamburgerMenu";
import type { AutocompleteItem } from "@/src/hooks/use-api";
import { API } from "@/tests/_support/api";
import { productSummary } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";
import { chromeApi } from "./chrome-kit";

/* The search box inside the burger menu, for screens where the header has none (specs/platform/site-chrome.md, flow CHR-28). */

const S = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.header.search.${key}`, locale);
const hit = (id: string, name: string, over: Partial<AutocompleteItem> = {}): AutocompleteItem => ({ ...productSummary({ id, name, image: `/${id}.jpg` }), priceVnd: 350_000, priceUsd: 13.46, ...over });
/* The links are real: stop jsdom from trying to go there */
const stay = (e: Event) => e.preventDefault();
beforeEach(() => document.addEventListener("click", stay));
afterEach(() => document.removeEventListener("click", stay));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function backend(results: AutocompleteItem[] | number = [], delay = 0) {
  const searches: URLSearchParams[] = [];
  server.use(
    http.get(`${API}/api/products/autocomplete`, async ({ request }) => {
      searches.push(new URL(request.url).searchParams);
      if (delay) await wait(delay);
      if (typeof results === "number") return HttpResponse.json({}, { status: results });
      return HttpResponse.json({ data: results });
    })
  );
  return searches;
}
async function box(results: AutocompleteItem[] | number = [], options: { locale?: "vi" | "en"; delay?: number; close?: () => void } = {}) {
  const searches = backend(results, options.delay);
  const close = options.close ?? vi.fn();
  await renderApp(<DrawerSearch close={close} />, { locale: options.locale });
  return { searches, close };
}
const field = (locale: "vi" | "en" = "vi") => screen.getByRole("searchbox", { name: S("placeholder", locale) });
const rows = () => screen.queryAllByRole("link");

describe("CHR-28 the search box in the burger menu", () => {
  it("is a field with the same hint as the header's, and lists nothing at first", async () => {
    await box();

    expect(field()).toHaveAttribute("placeholder", S("placeholder"));
    expect(rows()).toHaveLength(0);
  });

  it("asks for nothing for one letter, and for two or more asks for five suggestions", async () => {
    const { searches } = await box([hit("a", "Silk dress")]);

    await userEvent.type(field(), "s");
    await wait(450);
    expect(searches).toEqual([]);
    await userEvent.type(field(), "i");

    await waitFor(() => expect(searches).toHaveLength(1));
    expect(Object.fromEntries(searches[0])).toEqual({ q: "si", limit: "5" });
  });

  it("lists each suggestion as a link to its product page, with its picture, name and price", async () => {
    await box([hit("a", "Silk dress"), hit("b", "Linen shirt")]);

    await userEvent.type(field(), "si");

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(screen.queryByText(/Không có kết quả/)).not.toBeInTheDocument();
    expect(rows().map((link) => link.getAttribute("href"))).toEqual(["/shop/tops/shirts/a", "/shop/tops/shirts/b"]);
    expect(within(rows()[0]).getByText("Silk dress")).toBeInTheDocument();
    expect(within(rows()[0]).getByText("350.000 VNĐ")).toBeInTheDocument();
    expect(rows()[0].querySelector("img")?.getAttribute("src")).toContain(encodeURIComponent("/a.jpg"));
  });

  it("shows 'price on request' for a custom order and dollars in English", async () => {
    await box([hit("a", "Made to order", { badge: "custom_order" }), hit("b", "Ready")], { locale: "en" });

    await userEvent.type(field("en"), "or");

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(within(rows()[0]).getByText(msg("common.priceOnRequest", "en"))).toBeInTheDocument();
    expect(within(rows()[1]).getByText("$13.46")).toBeInTheDocument();
  });

  it("goes to the shop for a suggestion that has no category, and shows one without a picture", async () => {
    await box([hit("c", "Loose", { category: null, subcategory: null, image: null })]);

    await userEvent.type(field(), "lo");

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveAttribute("href", "/shop");
    expect(rows()[0].querySelector("img")).toBeNull();
  });

  it("closes the menu when a suggestion is chosen", async () => {
    const { close } = await box([hit("a", "Silk dress")]);
    await userEvent.type(field(), "si");
    await waitFor(() => expect(rows()).toHaveLength(1));

    await userEvent.click(rows()[0]);

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("says it is searching while the answer is on its way, and never says there are no results then", async () => {
    await box([hit("a", "Silk dress")], { delay: 300 });

    await userEvent.type(field(), "si");

    expect(await screen.findByText(S("loading"))).toBeInTheDocument();
    expect(screen.queryByText(/Không có kết quả/)).not.toBeInTheDocument();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByText(S("loading"))).not.toBeInTheDocument();
  });

  it("does not say it is searching while suggestions are on the list and the words change", async () => {
    await box([hit("a", "Silk dress")], { delay: 300 });
    await userEvent.type(field(), "si");
    await waitFor(() => expect(rows()).toHaveLength(1));

    await userEvent.type(field(), "l");

    expect(rows()).toHaveLength(1);
    expect(screen.queryByText(S("loading"))).not.toBeInTheDocument();
  });

  it("does not count spaces as letters", async () => {
    await box([]);

    await userEvent.type(field(), "z ");
    await wait(450);

    expect(screen.queryByText(/Không có kết quả/)).not.toBeInTheDocument();
  });

  it("says nothing matched, with the words typed", async () => {
    await box([]);

    await userEvent.type(field(), "zzz");

    expect(await screen.findByText(msg("shared.header.search.noResults").replace("{query}", "zzz"))).toBeInTheDocument();
  });

  it("says nothing matched when the search fails", async () => {
    await box(500);

    await userEvent.type(field(), "zzz");

    expect(await screen.findByText(msg("shared.header.search.noResults").replace("{query}", "zzz"))).toBeInTheDocument();
  });

  it("does not say nothing matched for one letter", async () => {
    await box([]);

    await userEvent.type(field(), "z");
    await wait(450);

    expect(screen.queryByText(/Không có kết quả/)).not.toBeInTheDocument();
  });

  it("is a search form that does not reload the page when Enter is pressed", async () => {
    await box([hit("a", "Silk dress")]);
    await userEvent.type(field(), "si");

    const form = field().closest("form")!;
    const submit = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);

    expect(submit.defaultPrevented).toBe(true);
  });
});

describe("CHR-28 inside the drawer", () => {
  it("is the first thing in the list of links, and is only for screens narrower than the header's search", async () => {
    chromeApi();
    backend();
    await renderApp(<HamburgerMenu />);

    await userEvent.click(screen.getByRole("button", { name: msg("shared.header.drawer.open") }));

    const input = await screen.findByRole("searchbox", { name: S("placeholder") });
    const nav = document.querySelector("nav") as HTMLElement;
    expect(nav.firstElementChild).toContainElement(input);
    expect(input.closest("form")?.className).toContain("lg:hidden");
  });
});
