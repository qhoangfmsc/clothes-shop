import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HeaderNav from "@/src/app/[locale]/_components/HeaderNav";
import Logo from "@/src/app/[locale]/_components/Logo";
import SiteHeader from "@/src/app/[locale]/_components/SiteHeader";
import { CONTACT_PATH } from "@/src/lib/product-purchase";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { categories, chromeApi, type ChromeApiOptions } from "./chrome-kit";

/* The header: logo, the row of links, the mega menu under "Shop", and how the bar hides when scrolling (specs/platform/site-chrome.md, flows CHR-15 to CHR-19E). */

const H = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.header.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface NavOptions extends ChromeApiOptions {
  locale?: "vi" | "en";
  isHidden?: boolean;
  onMenuToggle?: (open: boolean) => void;
}
async function nav(options: NavOptions = {}) {
  const { locale, isHidden, onMenuToggle, ...api } = options;
  const calls = chromeApi({ categories: categories(2), ...api });
  const view = await renderApp(<HeaderNav isHidden={isHidden} onMenuToggle={onMenuToggle} />, { locale });
  /* The menu needs the categories: wait until they came */
  await waitFor(() => expect(calls.categories).toBeGreaterThan(0));
  await act(() => wait(30));
  return Object.assign(view, { calls });
}
const shopLink = () => screen.getByRole("link", { name: H("nav.shop") });
const panel = () => screen.queryByRole("link", { name: "Category 1" });
const hoverShop = () => userEvent.hover(shopLink());
const leaveShop = () => userEvent.unhover(shopLink());
const opened = () => waitFor(() => expect(panel()).toBeInTheDocument(), { timeout: 800 });
const closed = () => waitFor(() => expect(panel()).not.toBeInTheDocument(), { timeout: 1500 });

/* The links are real: stop jsdom from trying to go there */
const stay = (e: Event) => e.preventDefault();
beforeEach(() => document.addEventListener("click", stay));
afterEach(() => {
  document.removeEventListener("click", stay);
  Reflect.deleteProperty(document, "scrollingElement");
  Reflect.deleteProperty(document.documentElement, "scrollTop");
});

describe("CHR-15 the row of links", () => {
  it("has the three places and the custom-order pill, each a link, in order", async () => {
    await nav();

    const links = ["nav.shop", "nav.newIn", "nav.collections"].map((key) => screen.getByRole("link", { name: H(key) }));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/shop", "/new-in", "/collections"]);
    expect(screen.getByRole("link", { name: H("nav.customOrder") })).toHaveAttribute("href", CONTACT_PATH);
  });

  it("speaks English in English", async () => {
    await nav({ locale: "en" });

    expect(screen.getByRole("link", { name: H("nav.shop", "en") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: H("nav.customOrder", "en") })).toBeInTheDocument();
  });

  it("holds the search field and the button that opens the drawer", async () => {
    await nav();

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: H("drawer.open") })).toBeInTheDocument();
  });

  it("draws the underline only on wide screens, with a style block that is balanced", async () => {
    const { container } = await nav();

    const css = container.querySelector("style")!.textContent!;
    expect(css.split("{").length).toBe(css.split("}").length);
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain(".header-nav-link::after");
  });
});

describe("CHR-16 the mega menu", () => {
  it("opens after a short pause on 'Shop' and lists each category with its sub-categories and a 'view all'", async () => {
    await nav();

    await hoverShop();
    await wait(200);
    expect(panel()).not.toBeInTheDocument();
    await opened();

    expect(screen.getByRole("link", { name: "Category 1" })).toHaveAttribute("href", "/shop/cat-1");
    expect(screen.getByRole("link", { name: "Sub 2B" })).toHaveAttribute("href", "/shop/cat-2/sub-2b");
    expect(screen.getAllByRole("link", { name: H("megaMenu.viewAll") })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: H("megaMenu.viewMore") })).not.toBeInTheDocument();
  });

  it("does not open when the mouse leaves before the pause is over", async () => {
    await nav();

    await hoverShop();
    await wait(100);
    await leaveShop();
    await wait(400);

    expect(panel()).not.toBeInTheDocument();
  });

  it("does not open when there are no categories", async () => {
    await nav({ categories: [] });

    await hoverShop();
    await wait(450);

    expect(panel()).not.toBeInTheDocument();
  });

  it("draws no dark backdrop when there is nothing to show", async () => {
    await nav({ categories: [] });

    await hoverShop();
    await wait(450);

    expect(document.querySelector("div[style*='z-index: 14']")).toBeNull();
  });

  it("does not open when the categories cannot be read", async () => {
    await nav({ categories: 500 });

    await hoverShop();
    await wait(450);

    expect(panel()).not.toBeInTheDocument();
  });

  it("does not open for the other links", async () => {
    await nav();

    await userEvent.hover(screen.getByRole("link", { name: H("nav.newIn") }));
    await wait(450);

    expect(panel()).not.toBeInTheDocument();
  });

  it("shows four categories and a 'view more' to the shop when there are more", async () => {
    await nav({ categories: categories(6) });

    await hoverShop();
    await opened();

    expect(screen.getByRole("link", { name: "Category 4" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Category 5" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: H("megaMenu.viewMore") })).toHaveAttribute("href", "/shop");
  });

  it("shows no 'view more' with exactly four categories", async () => {
    await nav({ categories: categories(4) });

    await hoverShop();
    await opened();

    expect(screen.getByRole("link", { name: "Category 4" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: H("megaMenu.viewMore") })).not.toBeInTheDocument();
  });

  it("tells the page when it opens and when it closes", async () => {
    const onMenuToggle = vi.fn();
    await nav({ onMenuToggle });
    expect(onMenuToggle).toHaveBeenLastCalledWith(false);

    await hoverShop();
    await opened();
    expect(onMenuToggle).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(onMenuToggle).toHaveBeenLastCalledWith(false));
  });
});

describe("CHR-17 closing the mega menu", () => {
  it("closes shortly after the mouse leaves 'Shop', unless it goes into the panel", async () => {
    const onMenuToggle = vi.fn();
    await nav({ onMenuToggle });
    await hoverShop();
    await opened();

    await leaveShop();
    await userEvent.hover(screen.getByRole("link", { name: "Category 1" }));
    await wait(300);
    expect(onMenuToggle).toHaveBeenLastCalledWith(true);
    await userEvent.unhover(screen.getByRole("link", { name: "Category 1" }));

    await closed();
  });

  it("closes after the mouse leaves 'Shop' for somewhere else", async () => {
    await nav();
    await hoverShop();
    await opened();

    await leaveShop();

    await closed();
  });

  it("closes with Escape", async () => {
    await nav();
    await hoverShop();
    await opened();

    fireEvent.keyDown(window, { key: "Escape" });

    await closed();
  });

  it("closes when the dark backdrop is clicked", async () => {
    await nav();
    await hoverShop();
    await opened();

    const backdrop = panel()!.closest("div[style*='z-index: 15']")!.previousElementSibling as HTMLElement;
    await userEvent.click(backdrop);

    await closed();
  });

  it.each([["a category", "Category 1"], ["a sub-category", "Sub 1A"]])("closes when %s is chosen", async (_what, name) => {
    await nav();
    await hoverShop();
    await opened();

    await userEvent.click(screen.getByRole("link", { name }));

    await closed();
  });

  it("closes when 'Shop' itself is clicked while it is open", async () => {
    await nav();
    await hoverShop();
    await opened();

    await userEvent.click(shopLink());

    await closed();
  });

  it("closes when the header hides, and stays shut", async () => {
    const view = await nav();
    await hoverShop();
    await opened();

    view.rerender(<HeaderNav isHidden />);

    await closed();
  });

  it("does not open again at once after closing (a short rest), but does after it", async () => {
    await nav();
    await hoverShop();
    await opened();
    fireEvent.keyDown(window, { key: "Escape" });

    await userEvent.unhover(shopLink());
    await hoverShop();
    await wait(450);
    expect(panel()).not.toBeInTheDocument();

    await wait(250);
    await userEvent.unhover(shopLink());
    await hoverShop();
    await opened();
  });

  it("keeps the panel open when the mouse comes back to 'Shop' before it closes", async () => {
    const onMenuToggle = vi.fn();
    await nav({ onMenuToggle });
    await hoverShop();
    await opened();

    await leaveShop();
    await hoverShop();
    await wait(400);

    expect(onMenuToggle).toHaveBeenLastCalledWith(true);
    expect(onMenuToggle).toHaveBeenCalledTimes(2);
  });

  it("keeps the panel open for any key but Escape", async () => {
    const onMenuToggle = vi.fn();
    await nav({ onMenuToggle });
    await hoverShop();
    await opened();

    fireEvent.keyDown(window, { key: "Enter" });
    await wait(100);

    expect(onMenuToggle).toHaveBeenLastCalledWith(true);
    expect(onMenuToggle).toHaveBeenCalledTimes(2);
  });

  it("rests after it closed because the mouse left 'Shop': coming back at once does not open it", async () => {
    const onMenuToggle = vi.fn();
    await nav({ onMenuToggle });
    await hoverShop();
    await opened();
    await leaveShop();
    await wait(250);
    expect(onMenuToggle).toHaveBeenLastCalledWith(false);

    await hoverShop();
    await wait(450);

    expect(onMenuToggle).toHaveBeenLastCalledWith(false);
    expect(onMenuToggle).toHaveBeenCalledTimes(3);
  });

  it("rests after it closed because the mouse left the panel: coming back at once does not open it", async () => {
    const onMenuToggle = vi.fn();
    await nav({ onMenuToggle });
    await hoverShop();
    await opened();
    await leaveShop();
    await userEvent.hover(screen.getByRole("link", { name: "Category 1" }));
    await userEvent.unhover(screen.getByRole("link", { name: "Category 1" }));
    await wait(200);
    expect(onMenuToggle).toHaveBeenLastCalledWith(false);

    await hoverShop();
    await wait(450);

    expect(onMenuToggle).toHaveBeenLastCalledWith(false);
    expect(onMenuToggle).toHaveBeenCalledTimes(3);
  });

  it("closes about 120 ms after the mouse leaves the panel", async () => {
    await nav();
    await hoverShop();
    await opened();
    await leaveShop();
    await userEvent.hover(screen.getByRole("link", { name: "Category 1" }));
    await wait(250);

    await userEvent.unhover(screen.getByRole("link", { name: "Category 1" }));

    await closed();
  });

  it("leaves no timers behind when the header goes", async () => {
    const view = await nav();
    await hoverShop();

    view.unmount();
    await wait(400);

    expect(panel()).not.toBeInTheDocument();
  });

  it("stops listening for Escape once closed", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    await nav();
    await hoverShop();
    await opened();
    fireEvent.keyDown(window, { key: "Escape" });
    await closed();

    expect(remove.mock.calls.some(([type]) => type === "keydown")).toBe(true);
  });
});

describe("CHR-18 the logo", () => {
  it("is the name of the shop, a link home that says so", async () => {
    await renderApp(<Logo />);

    const link = screen.getByRole("link", { name: msg("shared.footer.homeAria") });
    expect(link).toHaveAttribute("href", "/");
    expect(within(link).getByText("DOOVAN")).toBeInTheDocument();
  });

  it("says so in English", async () => {
    await renderApp(<Logo />, { locale: "en" });

    expect(screen.getByRole("link", { name: msg("shared.footer.homeAria", "en") })).toBeInTheDocument();
  });
});

describe("CHR-19 the bar while scrolling", () => {
  /* jsdom has no `document.scrollingElement`, which framer-motion's `useScroll` watches */
  beforeEach(() => Object.defineProperty(document, "scrollingElement", { value: document.documentElement, configurable: true }));
  const scrollTo = async (y: number) => {
    Object.defineProperty(document.documentElement, "scrollTop", { value: y, configurable: true });
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await wait(60);
    });
  };
  async function header() {
    chromeApi({ categories: categories(2) });
    const view = await renderApp(<SiteHeader />);
    const bar = view.container.querySelector("header") ?? document.querySelector("header")!;
    const glass = () => bar.firstElementChild as HTMLElement;
    return { bar, glass };
  }

  it("holds the logo and the links, fixed at the top, with a clear background at first", async () => {
    const { bar, glass } = await header();

    expect(screen.getByRole("link", { name: msg("shared.footer.homeAria") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: H("nav.shop") })).toBeInTheDocument();
    expect(bar.style.position).toBe("fixed");
    expect(bar.style.zIndex).toBe("100");
    expect(glass().style.opacity).toBe("0");
  });

  it("gets a background once the page is scrolled past 60 px, and loses it back at the top", async () => {
    const { glass } = await header();

    await scrollTo(40);
    await wait(700);
    expect(glass().style.opacity).toBe("0");
    await scrollTo(70);
    await waitFor(() => expect(glass().style.opacity).toBe("1"), { timeout: 1500 });
    await scrollTo(0);

    await waitFor(() => expect(glass().style.opacity).toBe("0"), { timeout: 1500 });
  });

  it("slides up when scrolling down past 80 px, and back down at the first scroll up", async () => {
    const { bar } = await header();

    await scrollTo(60);
    await scrollTo(120);
    await waitFor(() => expect(bar.style.transform).toContain("-9rem"), { timeout: 2000 });
    await scrollTo(110);

    await waitFor(() => expect(bar.style.transform).not.toContain("-9rem"), { timeout: 2000 });
  });

  it("ignores small moves: a short step down while shown, a short step up while hidden", async () => {
    const { bar } = await header();
    await scrollTo(120);
    await waitFor(() => expect(bar.style.transform).toContain("-9rem"), { timeout: 2000 });

    await scrollTo(117);
    await wait(700);
    expect(bar.style.transform).toContain("-9rem");
    await scrollTo(100);
    await waitFor(() => expect(bar.style.transform).not.toContain("-9rem"), { timeout: 2000 });
    await scrollTo(103);
    await wait(700);

    expect(bar.style.transform).not.toContain("-9rem");
  });

  it("stays when the scroll is small or the page is near the top", async () => {
    const { bar } = await header();

    await scrollTo(30);
    await scrollTo(75);
    await wait(700);
    expect(bar.style.transform ?? "").not.toContain("-9rem");
    await scrollTo(79);
    await wait(700);

    expect(bar.style.transform ?? "").not.toContain("-9rem");
  });

  it("closes the mega menu when the bar slides away", async () => {
    await header();
    await userEvent.hover(screen.getByRole("link", { name: H("nav.shop") }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Category 1" })).toBeInTheDocument(), { timeout: 1500 });

    await scrollTo(120);

    await waitFor(() => expect(screen.queryByRole("link", { name: "Category 1" })).not.toBeInTheDocument(), { timeout: 3000 });
  });

  it("gets its background while the mega menu is open, even at the top", async () => {
    const { glass } = await header();

    await userEvent.hover(screen.getByRole("link", { name: H("nav.shop") }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Category 1" })).toBeInTheDocument(), { timeout: 1500 });

    await waitFor(() => expect(glass().style.opacity).toBe("1"), { timeout: 1500 });
  });
});
