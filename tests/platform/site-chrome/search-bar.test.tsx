import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchBar from "@/src/app/[locale]/_components/SearchBar";
import type { AutocompleteItem } from "@/src/hooks/use-api";
import { API } from "@/tests/_support/api";
import { product, productSummary } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import { watchListeners } from "./chrome-kit";

/* The search box in the header: opening, suggestions, keys, history (specs/platform/site-chrome.md, flows CHR-10 to CHR-14E). */

const S = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.header.search.${key}`, locale);
const KEY = "doovan-search-history";
const hit = (id: string, name: string, over: Partial<AutocompleteItem> = {}): AutocompleteItem => ({ ...productSummary({ id, name, image: `/${id}.jpg` }), priceVnd: 350_000, priceUsd: 13.46, ...over });

interface Backend {
  results?: AutocompleteItem[] | number;
  delay?: number;
  products?: Record<string, ReturnType<typeof product> | number>;
}
function backend(options: Backend = {}) {
  const calls = { searches: [] as URLSearchParams[], products: [] as string[] };
  server.use(
    http.get(`${API}/api/products/autocomplete`, async ({ request }) => {
      calls.searches.push(new URL(request.url).searchParams);
      if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay));
      if (typeof options.results === "number") return HttpResponse.json({}, { status: options.results });
      return HttpResponse.json({ data: options.results ?? [] });
    }),
    http.get(`${API}/api/products/:id`, ({ params }) => {
      calls.products.push(String(params.id));
      const found = options.products?.[String(params.id)];
      if (!found || typeof found === "number") return HttpResponse.json({}, { status: typeof found === "number" ? found : 404 });
      return HttpResponse.json({ data: found });
    })
  );
  return calls;
}

async function bar(options: Backend & { locale?: "vi" | "en"; width?: number } = {}) {
  const { locale, width = 1280, ...api } = options;
  window.innerWidth = width;
  const calls = backend(api);
  const view = await renderApp(<SearchBar />, { locale });
  return Object.assign(view, { calls });
}
const input = () => screen.getByRole("combobox");
const open = async () => {
  await userEvent.click(screen.getByRole("combobox").closest("div[style*='max-width']")!);
};
const listbox = () => screen.queryByRole("listbox");
const options = () => screen.queryAllByRole("option");
const saved = () => JSON.parse(localStorage.getItem(KEY) ?? "[]") as AutocompleteItem[];
const type = async (text: string) => {
  await userEvent.type(input(), text);
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 350));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => localStorage.removeItem(KEY));
afterEach(() => {
  window.innerWidth = 1024;
});

describe("CHR-10 opening and closing", () => {
  it("is a small button at first and opens into a field with a hint when pressed, which takes the cursor after a moment", async () => {
    await bar();
    const container = input().closest("div[style*='max-width']") as HTMLElement;
    expect(container.style.maxWidth).toBe("2.125rem");
    expect(input()).toHaveAttribute("placeholder", S("placeholder"));

    await open();

    expect(container.style.maxWidth).toBe("13.75rem");
    await waitFor(() => expect(input()).toHaveFocus());
  });

  it("is a combobox that says it controls the list and whether the list is open", async () => {
    await bar();

    expect(input()).toHaveAttribute("aria-controls", "search-autocomplete-dropdown");
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveAttribute("autocomplete", "off");
  });

  it("closes with Escape, emptying the field", async () => {
    await bar({ results: [hit("a", "Silk dress")] });
    await open();
    await type("sil");
    await waitFor(() => expect(options()).toHaveLength(1));

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(input()).toHaveValue(""));
    expect((input().closest("div[style*='max-width']") as HTMLElement).style.maxWidth).toBe("2.125rem");
  });

  it("stops listening for Escape and for outside clicks once closed", async () => {
    const onWindow = watchListeners(window);
    const onDocument = watchListeners(document);
    await bar();
    await open();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect((input().closest("div[style*='max-width']") as HTMLElement).style.maxWidth).toBe("2.125rem"));

    expect(onWindow.leftOn("keydown")).toBe(0);
    expect(onDocument.leftOn("mousedown")).toBe(0);
  });

  it("closes when the click lands elsewhere and nothing was typed", async () => {
    await bar();
    await open();

    fireEvent.mouseDown(document.body);

    expect((input().closest("div[style*='max-width']") as HTMLElement).style.maxWidth).toBe("2.125rem");
  });

  it("stays open when the click lands elsewhere but something was typed", async () => {
    await bar();
    await open();
    await type("sil");

    fireEvent.mouseDown(document.body);

    expect((input().closest("div[style*='max-width']") as HTMLElement).style.maxWidth).toBe("13.75rem");
  });

  it("stays open for a click on the list, which sits outside the box, even with nothing typed", async () => {
    localStorage.setItem(KEY, JSON.stringify([hit("a", "Silk dress")]));
    await bar();
    await open();
    await waitFor(() => expect(options()).toHaveLength(1));

    fireEvent.mouseDown(options()[0]);

    expect((input().closest("div[style*='max-width']") as HTMLElement).style.maxWidth).toBe("13.75rem");
  });

  it("stays open for a click inside itself", async () => {
    await bar();
    await open();

    fireEvent.mouseDown(input());

    expect((input().closest("div[style*='max-width']") as HTMLElement).style.maxWidth).toBe("13.75rem");
  });

  it("does not listen for Escape or outside clicks while closed", async () => {
    await bar();

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.mouseDown(document.body);

    expect(input()).toHaveValue("");
  });
});

describe("CHR-11 suggestions", () => {
  it("asks nothing for one letter, and for two or more asks after a short pause for ten suggestions on a wide screen", async () => {
    const { calls } = await bar({ results: [hit("a", "Silk dress")] });
    await open();

    await type("s");
    await settle();
    expect(calls.searches).toEqual([]);
    await type("i");

    await waitFor(() => expect(calls.searches).toHaveLength(1));
    expect(Object.fromEntries(calls.searches[0])).toEqual({ q: "si", limit: "10" });
  });

  it("shows no list for one letter when there is nothing recent", async () => {
    await bar({ results: [hit("a", "Silk dress")] });
    await open();

    await type("s");
    await settle();

    expect(listbox()).toBeNull();
    expect(input()).toHaveAttribute("aria-expanded", "false");
  });

  it.each([[500, "5"], [800, "8"], [1280, "10"]])("asks for as many suggestions as the screen has room for: %ipx wide, %s", async (width, limit) => {
    const { calls } = await bar({ width, results: [hit("a", "Silk dress")] });
    await open();

    await type("silk");

    await waitFor(() => expect(calls.searches).toHaveLength(1));
    expect(calls.searches[0].get("limit")).toBe(limit);
  });

  it("opens the list below the field once the field has opened, with each suggestion's picture, name and price", async () => {
    await bar({ results: [hit("a", "Silk dress"), hit("b", "Linen shirt")] });
    await open();

    await type("si");

    await waitFor(() => expect(options()).toHaveLength(2));
    expect(listbox()).toBeInTheDocument();
    expect(screen.queryByText(/Không có kết quả/)).not.toBeInTheDocument();
    expect(input()).toHaveAttribute("aria-expanded", "true");
    const first = options()[0];
    expect(within(first).getByText("Silk dress")).toBeInTheDocument();
    expect(within(first).getByText("350.000 VNĐ")).toBeInTheDocument();
    expect(first.querySelector("img")?.getAttribute("src")).toContain(encodeURIComponent("/a.jpg"));
  });

  it("shows 'price on request' for a custom order and the price in dollars in English", async () => {
    await bar({ results: [hit("a", "Made to order", { badge: "custom_order" }), hit("b", "Ready")], locale: "en" });
    await open();

    await type("or");

    await waitFor(() => expect(options()).toHaveLength(2));
    expect(within(options()[0]).getByText(msg("common.priceOnRequest", "en"))).toBeInTheDocument();
    expect(within(options()[1]).getByText("$13.46")).toBeInTheDocument();
  });

  it("shows a suggestion without a picture without breaking", async () => {
    await bar({ results: [hit("a", "No picture", { image: null })] });
    await open();

    await type("no");

    await waitFor(() => expect(options()).toHaveLength(1));
    expect(options()[0].querySelector("img")).toBeNull();
  });

  it("says it is searching while the answer is on its way", async () => {
    await bar({ results: [hit("a", "Silk dress")], delay: 300 });
    await open();

    await type("si");

    expect(await screen.findByText(S("loading"))).toBeInTheDocument();
    expect(screen.queryByText(/Không có kết quả/)).not.toBeInTheDocument();
    await waitFor(() => expect(options()).toHaveLength(1));
    expect(screen.queryByText(S("loading"))).not.toBeInTheDocument();
  });

  it("says nothing matched, with the words typed", async () => {
    await bar({ results: [] });
    await open();

    await type("zzz");

    expect(await screen.findByText(msg("shared.header.search.noResults").replace("{query}", "zzz"))).toBeInTheDocument();
  });

  it("says nothing matched when the search fails", async () => {
    await bar({ results: 500 });
    await open();

    await type("zzz");

    expect(await screen.findByText(msg("shared.header.search.noResults").replace("{query}", "zzz"))).toBeInTheDocument();
  });

  it("clears the suggestions and the words with the cross, and puts the cursor back in the field", async () => {
    await bar({ results: [hit("a", "Silk dress")] });
    await open();
    await type("sil");
    await waitFor(() => expect(options()).toHaveLength(1));

    await userEvent.click(screen.getByRole("button", { name: S("clear") }));

    expect(input()).toHaveValue("");
    expect(input()).toHaveFocus();
    expect(options()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: S("clear") })).not.toBeInTheDocument();
  });

  it("shows the cross only while there are words", async () => {
    await bar();
    await open();
    expect(screen.queryByRole("button", { name: S("clear") })).not.toBeInTheDocument();

    await type("a");

    expect(screen.getByRole("button", { name: S("clear") })).toBeInTheDocument();
  });
});

describe("CHR-12 choosing a suggestion", () => {
  const withResults = async () => {
    const view = await bar({ results: [hit("a", "Silk dress"), hit("b", "Linen shirt")] });
    await open();
    await type("si");
    await waitFor(() => expect(options()).toHaveLength(2));
    return view;
  };

  it("goes to the product's page from the category and sub-category it came with, remembers it and closes", async () => {
    await withResults();

    await userEvent.click(options()[1]);

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/tops/shirts/b"));
    expect(saved().map((h) => h.id)).toEqual(["b"]);
    expect(input()).toHaveValue("");
    expect((input().closest("div[style*='max-width']") as HTMLElement).style.maxWidth).toBe("2.125rem");
  });

  it("looks the page up when the suggestion has no category, and goes there", async () => {
    const { calls } = await bar({ results: [hit("c", "Loose", { category: null, subcategory: null })], products: { c: product({ id: "c" }) } });
    await open();
    await type("lo");
    await waitFor(() => expect(options()).toHaveLength(1));

    await userEvent.click(options()[0]);

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/tops/shirts/c"));
    expect(calls.products).toEqual(["c"]);
  });

  it("goes to the shop when that page cannot be found", async () => {
    await bar({ results: [hit("c", "Loose", { category: null, subcategory: null })], products: { c: 404 } });
    await open();
    await type("lo");
    await waitFor(() => expect(options()).toHaveLength(1));

    await userEvent.click(options()[0]);

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop"));
  });

  it("moves down with the arrow key, wrapping from the last to the first, and says which one is lit", async () => {
    await withResults();

    await userEvent.keyboard("{ArrowDown}");
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
    expect(input()).toHaveAttribute("aria-activedescendant", "search-result-0");
    await userEvent.keyboard("{ArrowDown}");
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowDown}");

    expect(options()[0]).toHaveAttribute("aria-selected", "true");
  });

  it("moves up with the arrow key, wrapping from the first to the last, and from nothing to the last", async () => {
    await withResults();

    await userEvent.keyboard("{ArrowUp}");
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowUp}");
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowUp}");

    expect(options()[1]).toHaveAttribute("aria-selected", "true");
  });

  it("opens the lit suggestion with Enter, and does nothing with Enter when none is lit", async () => {
    await withResults();

    await userEvent.keyboard("{Enter}");
    expect(navigation.router.push).not.toHaveBeenCalled();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/tops/shirts/b"));
  });

  it("closes with Escape inside the field, and nothing is lit when it opens again", async () => {
    await withResults();
    await userEvent.keyboard("{ArrowDown}");

    await userEvent.keyboard("{Escape}");
    expect(options()).toHaveLength(0);
    await open();
    await type("si");

    await waitFor(() => expect(options()).toHaveLength(2));
    expect(options().every((o) => o.getAttribute("aria-selected") === "false")).toBe(true);
    expect(input()).not.toHaveAttribute("aria-activedescendant");
  });

  it("lights the suggestion under the mouse", async () => {
    await withResults();

    await userEvent.hover(options()[1]);

    expect(options()[1]).toHaveAttribute("aria-selected", "true");
  });

  it("puts the light out when the list changes", async () => {
    await withResults();
    await userEvent.keyboard("{ArrowDown}");
    expect(options()[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.type(input(), "l");

    await waitFor(() => expect(options().every((o) => o.getAttribute("aria-selected") === "false")).toBe(true));
  });

  it("ignores the arrow keys when there is nothing to choose", async () => {
    await bar({ results: [] });
    await open();
    await type("zzz");
    await screen.findByText(/Không có kết quả/);

    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(navigation.router.push).not.toHaveBeenCalled();
  });
});

describe("CHR-13 recent searches", () => {
  const seed = (...items: AutocompleteItem[]) => localStorage.setItem(KEY, JSON.stringify(items));

  it("shows the recent products as soon as the field opens, under a heading, with a cross for each", async () => {
    seed(hit("a", "Silk dress"), hit("b", "Linen shirt"));
    await bar();
    await open();

    await waitFor(() => expect(options()).toHaveLength(2));
    expect(screen.getByText(S("recent"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa “Silk dress” khỏi lịch sử" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa “Linen shirt” khỏi lịch sử" })).toBeInTheDocument();
  });

  it("shows no list when there is no history and nothing is typed", async () => {
    await bar();
    await open();
    await settle();

    expect(listbox()).toBeNull();
  });

  it("keeps only the recent ones that match the words, then adds suggestions that are not among them", async () => {
    seed(hit("a", "Silk dress"), hit("b", "Linen shirt"));
    await bar({ results: [hit("a", "Silk dress"), hit("c", "Silk scarf")] });
    await open();

    await type("SILK");

    await waitFor(() => expect(options().map((o) => within(o).getAllByText(/Silk/)[0].textContent)).toEqual(["Silk dress", "Silk scarf"]));
    expect(screen.queryByText(S("recent"))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xóa “Silk scarf”/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa “Silk dress” khỏi lịch sử" })).toBeInTheDocument();
  });

  it("ignores spaces around the words when it looks through the recent ones", async () => {
    seed(hit("a", "Silk dress"), hit("b", "Linen shirt"));
    await bar();
    await open();

    await type("dress ");

    await waitFor(() => expect(options().map((o) => within(o).getAllByText(/Silk|Linen/)[0].textContent)).toEqual(["Silk dress"]));
  });

  it("does not say it is searching while recent ones are on the list", async () => {
    seed(hit("a", "Silk dress"));
    await bar({ results: [], delay: 1500 });
    await open();

    await type("si");
    await settle();

    expect(options()).toHaveLength(1);
    expect(screen.queryByText(S("loading"))).not.toBeInTheDocument();
  });

  it("forgets one with its cross, without opening it", async () => {
    seed(hit("a", "Silk dress"), hit("b", "Linen shirt"));
    await bar();
    await open();
    await waitFor(() => expect(options()).toHaveLength(2));

    await userEvent.click(screen.getByRole("button", { name: "Xóa “Silk dress” khỏi lịch sử" }));

    await waitFor(() => expect(options()).toHaveLength(1));
    expect(saved().map((h) => h.id)).toEqual(["b"]);
    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("does not take the cursor from the field when a cross is pressed", async () => {
    seed(hit("a", "Silk dress"));
    await bar();
    await open();
    await waitFor(() => expect(options()).toHaveLength(1));
    const cross = screen.getByRole("button", { name: "Xóa “Silk dress” khỏi lịch sử" });

    const notPrevented = fireEvent.mouseDown(cross);

    expect(notPrevented).toBe(false);
  });

  it("puts the one opened at the top of the history, without a copy", async () => {
    seed(hit("a", "Silk dress"), hit("b", "Linen shirt"));
    await bar();
    await open();
    await waitFor(() => expect(options()).toHaveLength(2));

    await userEvent.click(options()[1]);

    await waitFor(() => expect(saved().map((h) => h.id)).toEqual(["b", "a"]));
  });

  it("opens a recent product with the keys too", async () => {
    seed(hit("a", "Silk dress"));
    await bar();
    await open();
    await waitFor(() => expect(options()).toHaveLength(1));

    await userEvent.keyboard("{ArrowDown}{Enter}");

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/tops/shirts/a"));
  });

  it("shows prices in dollars for recent products in English", async () => {
    seed(hit("a", "Silk dress"));
    await bar({ locale: "en" });
    await open();

    await waitFor(() => expect(options()).toHaveLength(1));
    expect(within(options()[0]).getByText("$13.46")).toBeInTheDocument();
  });
});

describe("CHR-14 where the list sits", () => {
  it("is a window of its own over the page, at least 320 wide", async () => {
    await bar({ results: [hit("a", "Silk dress")] });
    await open();
    await type("si");

    await waitFor(() => expect(options()).toHaveLength(1));
    const dropdown = document.getElementById("search-autocomplete-dropdown")!;
    expect(dropdown.style.position).toBe("fixed");
    expect(dropdown.style.width).toBe("320px");
    expect(document.body.contains(dropdown)).toBe(true);
  });

  it("follows the field when the window changes size or scrolls", async () => {
    await bar({ results: [hit("a", "Silk dress")] });
    const container = (await Promise.resolve(input().closest("div[style*='max-width']"))) as HTMLElement;
    container.getBoundingClientRect = () => ({ top: 10, bottom: 44, left: 100, right: 400, width: 300, height: 34, x: 100, y: 10, toJSON: () => ({}) });
    await open();
    await type("si");
    await waitFor(() => expect(options()).toHaveLength(1));
    const dropdown = () => document.getElementById("search-autocomplete-dropdown")!;
    expect(dropdown().style.top).toBe("50px");
    expect(dropdown().style.left).toBe("100px");

    container.getBoundingClientRect = () => ({ top: 20, bottom: 54, left: 120, right: 520, width: 400, height: 34, x: 120, y: 20, toJSON: () => ({}) });
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(dropdown().style.top).toBe("60px");
    expect(dropdown().style.width).toBe("400px");
    act(() => void window.dispatchEvent(new Event("scroll")));
    expect(dropdown().style.left).toBe("120px");
  });

  it("stops following once it is gone", async () => {
    const onWindow = watchListeners(window);
    const view = await bar({ results: [hit("a", "Silk dress")] });
    await open();
    await type("si");
    await waitFor(() => expect(options()).toHaveLength(1));

    view.unmount();

    expect(document.getElementById("search-autocomplete-dropdown")).toBeNull();
    expect(onWindow.leftOn("resize")).toBe(0);
    expect(onWindow.leftOn("scroll")).toBe(0);
  });
});
