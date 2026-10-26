import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HamburgerMenu from "@/src/app/[locale]/_components/HamburgerMenu";
import { CONTACT_PATH } from "@/src/lib/product-purchase";
import { ACCESS_KEY } from "@/tests/_support/api";
import { observers } from "@/tests/_support/browser-apis";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { IdentityName } from "@/tests/_support/identities";
import { msg, msgf } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { banner, categories, chromeApi, watchListeners, type ChromeApiOptions } from "./chrome-kit";

/* The drawer that opens from the burger button: links, the shop list, the account part, the featured picture, scroll lock (specs/platform/site-chrome.md, flows CHR-20 to CHR-26E). */

const H = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.header.${key}`, locale);
const A = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.header.account.${key}`, locale);
const dot = (number: number, total: number) => msgf("shared.carousel.dot", { number, total });

const stay = (e: Event) => e.preventDefault();
beforeEach(() => document.addEventListener("click", stay));
afterEach(() => {
  document.removeEventListener("click", stay);
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
});

async function drawer(options: ChromeApiOptions & { as?: IdentityName | AuthUser; locale?: "vi" | "en"; waitForAuth?: boolean; open?: boolean } = {}) {
  const { as, locale, waitForAuth, open = true, ...api } = options;
  const calls = chromeApi({ categories: categories(3), ...api });
  const view = await renderApp(<HamburgerMenu />, { as, locale, waitForAuth });
  if (open) await userEvent.click(screen.getByRole("button", { name: H("drawer.open", locale) }));
  return Object.assign(view, { calls });
}
const dialogNav = () => document.querySelector("nav") as HTMLElement;
const closeButton = (locale?: "vi" | "en") => screen.queryByRole("button", { name: H("drawer.close", locale) });
const gone = () => waitFor(() => expect(closeButton()).not.toBeInTheDocument(), { timeout: 1500 });
const shopButton = () => screen.getByRole("button", { name: new RegExp(H("nav.shop")) });

describe("CHR-20 opening and closing the drawer", () => {
  it("is a burger button at first and the drawer is not there", async () => {
    await drawer({ open: false });

    expect(screen.getByRole("button", { name: H("drawer.open") })).toBeInTheDocument();
    expect(closeButton()).not.toBeInTheDocument();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("opens over the page with the name of the shop and a close button, and locks the page from scrolling", async () => {
    await drawer();

    expect(closeButton()).toBeInTheDocument();
    expect(screen.getByText("DOOVAN")).toBeInTheDocument();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.contains(closeButton()!.closest("div[style*='z-index: 100']"))).toBe(true);
  });

  it.each([
    ["the close button", async () => userEvent.click(closeButton()!)],
    ["Escape", async () => void fireEvent.keyDown(window, { key: "Escape" })],
    ["a click on the dark backdrop", async () => userEvent.click(closeButton()!.closest("div[style*='z-index: 100']")!.previousElementSibling as HTMLElement)],
  ])("closes with %s, and lets the page scroll again", async (_what, close) => {
    await drawer();

    await close();

    await gone();
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("speaks English in English", async () => {
    await drawer({ locale: "en" });

    expect(closeButton("en")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(H("nav.newIn", "en")) })).toBeInTheDocument();
  });

  it("ignores other keys, and stops listening once closed", async () => {
    const onWindow = watchListeners(window);
    await drawer();

    fireEvent.keyDown(window, { key: "Enter" });
    expect(document.documentElement.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    await gone();

    expect(onWindow.leftOn("keydown")).toBe(0);
  });
});

describe("CHR-21 the links", () => {
  it("lists the custom order first as a highlighted row, then the shop, new in, collections and about, each with a line of description", async () => {
    await drawer();

    const custom = screen.getByRole("link", { name: new RegExp(H("nav.customOrder")) });
    expect(custom).toHaveAttribute("href", CONTACT_PATH);
    expect(within(custom).getByText(H("navDescription.customOrder"))).toBeInTheDocument();
    for (const [key, href] of [["newIn", "/new-in"], ["collections", "/collections"], ["about", "/about"]]) {
      const link = screen.getByRole("link", { name: new RegExp(H(`nav.${key}`)) });
      expect(link).toHaveAttribute("href", href);
      expect(within(link).getByText(H(`navDescription.${key}`))).toBeInTheDocument();
    }
    const order = Array.from(dialogNav().children).map((row) => row.textContent ?? "");
    expect(order.findIndex((t) => t.includes(H("nav.customOrder")))).toBe(0);
    expect(order.findIndex((t) => t.includes(H("nav.shop")))).toBe(1);
  });

  it.each([["customOrder"], ["newIn"], ["collections"], ["about"]])("closes the drawer when %s is chosen", async (key) => {
    await drawer();

    await userEvent.click(screen.getByRole("link", { name: new RegExp(H(`nav.${key}`)) }));

    await gone();
  });
});

describe("CHR-22 the shop list", () => {
  it("is folded at first, and opens and folds again with the 'Shop' row", async () => {
    await drawer();
    await waitFor(() => expect(screen.queryByText("Category 1")).not.toBeInTheDocument());

    await userEvent.click(shopButton());
    expect(await screen.findByText("Category 1")).toBeInTheDocument();
    await userEvent.click(shopButton());

    await waitFor(() => expect(screen.queryByText("Category 1")).not.toBeInTheDocument(), { timeout: 1500 });
  });

  it("lists every category as a link with how many sub-categories it has, then 'view all products'", async () => {
    await drawer({ categories: categories(6) });
    await waitFor(() => expect(shopButton()).toBeInTheDocument());
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    await userEvent.click(shopButton());

    const first = await screen.findByRole("link", { name: /Category 1/ });
    expect(first).toHaveAttribute("href", "/shop/cat-1");
    expect(within(first).getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Category 6/ })).toHaveAttribute("href", "/shop/cat-6");
    expect(screen.getByRole("link", { name: new RegExp(H("megaMenu.viewAllProducts")) })).toHaveAttribute("href", "/shop");
  });

  it("shows only 'view all products' when there are no categories", async () => {
    await drawer({ categories: [] });

    await userEvent.click(shopButton());

    expect(await screen.findByRole("link", { name: new RegExp(H("megaMenu.viewAllProducts")) })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Category/ })).not.toBeInTheDocument();
  });

  it("colours the first four categories differently", async () => {
    await drawer({ categories: categories(5) });
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    await userEvent.click(shopButton());

    const dots = (await screen.findAllByRole("link", { name: /Category \d/ })).map((link) => (link.querySelector("span") as HTMLElement).style.background);

    expect(dots.slice(0, 4)).toEqual(["var(--color-dusty-rose)", "var(--color-sage)", "var(--color-dusty-blue)", "var(--color-champagne-gold)"]);
    expect(dots[4]).toBe("var(--color-champagne-gold)");
  });

  it("closes the drawer when a category or 'view all products' is chosen", async () => {
    await drawer();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    await userEvent.click(shopButton());

    await userEvent.click(await screen.findByRole("link", { name: /Category 2/ }));
    await gone();
    await userEvent.click(screen.getByRole("button", { name: H("drawer.open") }));
    await userEvent.click(shopButton());
    await userEvent.click(await screen.findByRole("link", { name: new RegExp(H("megaMenu.viewAllProducts")) }));

    await gone();
  });

  it("is folded again when the drawer is opened the next time", async () => {
    await drawer();
    await userEvent.click(shopButton());
    await screen.findByText("Category 1");

    await userEvent.click(closeButton()!);
    await gone();
    await userEvent.click(screen.getByRole("button", { name: H("drawer.open") }));

    expect(screen.queryByText("Category 1")).not.toBeInTheDocument();
  });
});

describe("CHR-23 the account part", () => {
  it("invites a guest to sign in, with a link to the login page that closes the drawer", async () => {
    await drawer();

    const signIn = screen.getByRole("link", { name: new RegExp(A("signIn")) });
    expect(signIn).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: new RegExp(A("signOut")) })).not.toBeInTheDocument();
    await userEvent.click(signIn);

    await gone();
  });

  it("shows nothing about the account while the session is still being checked", async () => {
    await drawer({ as: "user", waitForAuth: false, open: false });
    fireEvent.click(screen.getByRole("button", { name: H("drawer.open") }));

    expect(screen.queryByRole("link", { name: new RegExp(A("signIn")) })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mai/ })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Mai/ })).toBeInTheDocument();
  });

  it("shows a signed-in customer's name and email, folded, with no sign-in link", async () => {
    await drawer({ as: "user" });

    const row = await screen.findByRole("button", { name: /Mai/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(within(row).getByText("mai@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: new RegExp(A("signIn")) })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: new RegExp(A("myAccount")) })).not.toBeInTheDocument();
  });

  it("opens the account links and the sign-out row with the name row, and folds them again", async () => {
    await drawer({ as: "user" });
    const row = await screen.findByRole("button", { name: /Mai/ });

    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    for (const [key, href] of [["myAccount", "/account"], ["wishlist", "/wishlist"], ["orders", "/orders"]]) {
      expect(await screen.findByRole("link", { name: new RegExp(A(key)) })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("button", { name: new RegExp(A("signOut")) })).toBeInTheDocument();
    await userEvent.click(row);

    await waitFor(() => expect(screen.queryByRole("link", { name: new RegExp(A("myAccount")) })).not.toBeInTheDocument(), { timeout: 1500 });
  });

  it("closes the drawer when an account link is chosen", async () => {
    await drawer({ as: "user" });
    await userEvent.click(await screen.findByRole("button", { name: /Mai/ }));

    await userEvent.click(await screen.findByRole("link", { name: new RegExp(A("orders")) }));

    await gone();
  });

  it("asks before signing out; 'no' keeps the session and the drawer", async () => {
    await drawer({ as: "user" });
    await userEvent.click(await screen.findByRole("button", { name: /Mai/ }));
    await userEvent.click(await screen.findByRole("button", { name: new RegExp(A("signOut")) }));

    await userEvent.click(await screen.findByRole("button", { name: msg("common.actions.cancel") }));

    await waitFor(() => expect(screen.queryByText(A("signOutConfirm.title"))).not.toBeInTheDocument());
    expect(localStorage.getItem(ACCESS_KEY)).not.toBeNull();
    expect(closeButton()).toBeInTheDocument();
  });

  it("signs out when confirmed: the session ends and the drawer closes", async () => {
    await drawer({ as: "user" });
    await userEvent.click(await screen.findByRole("button", { name: /Mai/ }));
    await userEvent.click(await screen.findByRole("button", { name: new RegExp(A("signOut")) }));
    await screen.findByText(A("signOutConfirm.title"));

    await userEvent.click(screen.getAllByRole("button", { name: A("signOutConfirm.confirm") }).at(-1)!);

    await gone();
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
  });

  it("uses the same account part for an admin, and 'someone' when the name is missing", async () => {
    await drawer({ as: { id: "u-9", email: "no-name@example.com", name: null, image: null, provider: "google", providerId: "g", role: "user", status: "active", createdAt: "x", updatedAt: "x" } });

    const row = await screen.findByRole("button", { name: new RegExp(A("userFallback")) });
    expect(within(row).getByText("no-name@example.com")).toBeInTheDocument();
  });
});

describe("CHR-24 the featured picture", () => {
  const banners = [banner(1), banner(2, { ctaLabel: undefined, ctaHref: undefined }), banner(3)];
  const featured = () => document.querySelector<HTMLElement>(".drawer-featured-panel");

  it("asks for the banners of the menu and shows none when nothing is set", async () => {
    const { calls } = await drawer({ banners: null });

    expect(calls.banners).toEqual(["NAV_MENU_BANNERS"]);
    expect(featured()).toBeNull();
  });

  it("shows none when the banners cannot be read", async () => {
    await drawer({ banners: 500 });
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(featured()).toBeNull();
  });

  it("shows the first banner with its heading, title, subtitle and a link to where it points", async () => {
    await drawer({ banners: [banner(1)] });

    expect(await screen.findByText("Banner 1")).toBeInTheDocument();
    expect(featured()).not.toBeNull();
    expect(within(featured()!).getByText(H("drawer.featured"))).toBeInTheDocument();
    expect(within(featured()!).getByText("Subtitle 1")).toBeInTheDocument();
    expect(within(featured()!).getByRole("link", { name: /Go 1/, hidden: true })).toHaveAttribute("href", "/shop/cat-1");
    expect(within(featured()!).getByAltText("Banner 1")).toBeInTheDocument();
  });

  it("invites with 'Discover' to the shop when the banner names no link, and leaves out a missing title and subtitle", async () => {
    await drawer({ banners: [{ image: "/b.jpg" }] });

    const link = await screen.findByRole("link", { name: new RegExp(H("drawer.discover")), hidden: true });
    expect(link).toHaveAttribute("href", "/shop");
    expect(featured()!.querySelectorAll("span:empty")).toHaveLength(0);
    expect(within(featured()!).getAllByText(/.+/).map((n) => n.textContent)).not.toContain("undefined");
  });

  it("says 'Discover' in English", async () => {
    await drawer({ banners: [{ image: "/b.jpg" }], locale: "en" });

    expect(await screen.findByRole("link", { name: /Discover/, hidden: true })).toBeInTheDocument();
  });

  it("shows dots only when there is more than one banner, and chooses with them", async () => {
    await drawer({ banners: [banner(1)] });
    await screen.findByText("Banner 1");
    expect(screen.queryByRole("button", { name: dot(1, 1), hidden: true })).not.toBeInTheDocument();
  });

  it("changes to the banner of the dot that is pressed", async () => {
    await drawer({ banners });
    await screen.findByText("Banner 1");
    expect(screen.getByRole("button", { name: dot(1, 3), hidden: true })).toHaveAttribute("aria-current", "true");

    await userEvent.click(screen.getByRole("button", { name: dot(3, 3), hidden: true }));

    expect(await screen.findByText("Banner 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dot(3, 3), hidden: true })).toHaveAttribute("aria-current", "true");
  });

  it("closes the drawer when the banner's link is chosen", async () => {
    await drawer({ banners: [banner(1)] });

    await userEvent.click(await screen.findByRole("link", { name: /Go 1/, hidden: true }));

    await gone();
  });
});

describe("CHR-25 the banners that turn by themselves", () => {
  const banners = [banner(1), banner(2), banner(3)];
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 1500)));
  async function turning() {
    const interval = vi.spyOn(window, "setInterval");
    await drawer({ banners });
    await screen.findByText("Banner 1");
    const tick = () => {
      const call = interval.mock.calls.filter(([, ms]) => ms === 4000).at(-1);
      expect(call).toBeDefined();
      act(() => void (call![0] as () => void)());
    };
    /* The dots live in the picture that fades out and in, so they show the new banner a moment later */
    const shows = (number: number) => waitFor(() => expect(screen.getByRole("button", { name: dot(number, 3), hidden: true })).toHaveAttribute("aria-current", "true"), { timeout: 3000 });
    const current = () => screen.getAllByRole("button", { name: /./, hidden: true }).find((b) => b.getAttribute("aria-current") === "true")!.getAttribute("aria-label");
    return { tick, shows, current };
  }

  it("turns to the next every 4 seconds while the picture is in view, and round to the first after the last", async () => {
    const { tick, shows } = await turning();
    act(() => observers.intersection.at(-1)!.trigger(true));

    await shows(1);
    tick();
    await shows(2);
    tick();
    await shows(3);
    tick();
    await shows(1);
  });

  it("waits while the picture is not in view", async () => {
    const { tick, current } = await turning();

    tick();
    await settle();

    expect(current()).toBe(dot(1, 3));
  });

  it("holds for a while after a dot is pressed", async () => {
    const { tick, shows } = await turning();
    act(() => observers.intersection.at(-1)!.trigger(true));
    await userEvent.click(screen.getByRole("button", { name: dot(2, 3), hidden: true }));
    await shows(2);

    tick();
    await settle();

    await shows(2);
  });

  it("does not turn with one banner", async () => {
    const interval = vi.spyOn(window, "setInterval");
    await drawer({ banners: [banner(1)] });
    await screen.findByText("Banner 1");

    expect(interval.mock.calls.some(([, ms]) => ms === 4000)).toBe(false);
  });
});

describe("CHR-26 scrolling inside the drawer", () => {
  const touch = (target: Element, type: "touchstart" | "touchmove", y: number) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "touches", { value: [{ clientY: y }] });
    target.dispatchEvent(event);
    return event;
  };
  const scrollable = (el: HTMLElement, state: { top: number; height: number; scroll: number }) => {
    Object.defineProperty(el, "scrollTop", { value: state.top, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: state.height, configurable: true });
    Object.defineProperty(el, "scrollHeight", { value: state.scroll, configurable: true });
  };

  it("does not let the page behind scroll when a finger moves over the backdrop", async () => {
    await drawer();
    const backdrop = closeButton()!.closest("div[style*='z-index: 100']")!.previousElementSibling as HTMLElement;

    touch(backdrop, "touchstart", 100);
    const event = touch(backdrop, "touchmove", 80);

    expect(event.defaultPrevented).toBe(true);
  });

  it("does not let the page behind scroll when nothing in the drawer can scroll", async () => {
    await drawer();

    touch(dialogNav(), "touchstart", 100);
    const event = touch(dialogNav(), "touchmove", 80);

    expect(event.defaultPrevented).toBe(true);
  });

  it("lets the list scroll in the middle, and stops the bounce at the top and at the bottom", async () => {
    await drawer();
    const nav = dialogNav();
    scrollable(nav, { top: 50, height: 400, scroll: 1000 });

    touch(nav, "touchstart", 200);
    expect(touch(nav, "touchmove", 180).defaultPrevented).toBe(false);

    scrollable(nav, { top: 0, height: 400, scroll: 1000 });
    touch(nav, "touchstart", 200);
    expect(touch(nav, "touchmove", 230).defaultPrevented).toBe(true);
    touch(nav, "touchstart", 200);
    expect(touch(nav, "touchmove", 170).defaultPrevented).toBe(false);

    scrollable(nav, { top: 600, height: 400, scroll: 1000 });
    touch(nav, "touchstart", 200);
    expect(touch(nav, "touchmove", 170).defaultPrevented).toBe(true);
    touch(nav, "touchstart", 200);
    expect(touch(nav, "touchmove", 230).defaultPrevented).toBe(false);
  });

  it("finds the scrolling part above the thing touched", async () => {
    await drawer();
    const nav = dialogNav();
    scrollable(nav, { top: 50, height: 400, scroll: 1000 });
    const inner = nav.querySelector("span") as HTMLElement;

    touch(inner, "touchstart", 200);

    expect(touch(inner, "touchmove", 180).defaultPrevented).toBe(false);
  });

  it("does not let the page scroll when the part that scrolls is exactly as tall as what it holds", async () => {
    await drawer();
    const nav = dialogNav();
    scrollable(nav, { top: 50, height: 400, scroll: 400 });

    touch(nav, "touchstart", 200);
    const event = touch(nav, "touchmove", 230);

    expect(event.defaultPrevented).toBe(true);
  });

  it("does not let the page scroll when the part that scrolls is taller than what it holds", async () => {
    await drawer();
    const nav = dialogNav();
    scrollable(nav, { top: 50, height: 400, scroll: 300 });

    touch(nav, "touchstart", 200);
    const event = touch(nav, "touchmove", 230);

    expect(event.defaultPrevented).toBe(true);
  });

  it("lets a part with `overflow: scroll` scroll too", async () => {
    await drawer();
    const inner = dialogNav().querySelector("span") as HTMLElement;
    inner.style.overflowY = "scroll";
    scrollable(inner, { top: 50, height: 400, scroll: 1000 });

    touch(inner, "touchstart", 200);

    expect(touch(inner, "touchmove", 180).defaultPrevented).toBe(false);
  });

  it("looks for a part that scrolls only inside the drawer, not in the page around it", async () => {
    await drawer();
    document.body.style.overflowY = "auto";
    scrollable(document.body, { top: 50, height: 400, scroll: 1000 });

    touch(closeButton()!, "touchstart", 200);
    const event = touch(closeButton()!, "touchmove", 180);

    expect(event.defaultPrevented).toBe(true);
    document.body.style.overflowY = "";
    Reflect.deleteProperty(document.body, "scrollTop");
    Reflect.deleteProperty(document.body, "clientHeight");
    Reflect.deleteProperty(document.body, "scrollHeight");
  });

  it("measures each move from the one before it", async () => {
    await drawer();
    const nav = dialogNav();
    scrollable(nav, { top: 0, height: 400, scroll: 1000 });

    touch(nav, "touchstart", 200);
    touch(nav, "touchmove", 300);
    const event = touch(nav, "touchmove", 290);

    expect(event.defaultPrevented).toBe(false);
  });

  it("stops watching touches once the drawer is closed", async () => {
    const onDocument = watchListeners(document);
    await drawer();
    await userEvent.click(closeButton()!);
    await gone();

    const event = touch(document.body, "touchmove", 10);

    expect(event.defaultPrevented).toBe(false);
    expect(onDocument.leftOn("touchstart")).toBe(0);
    expect(onDocument.leftOn("touchmove")).toBe(0);
  });
});
