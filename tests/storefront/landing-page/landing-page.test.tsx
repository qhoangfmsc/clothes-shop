import { act, screen, waitFor } from "@testing-library/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/src/app/[locale]/(public)/page";
import LandingPage from "@/src/app/[locale]/(public)/landing-page/page";
import { SYMBOLS } from "@/src/app/[locale]/(public)/landing-page/_common/constants";
import type { AppLocale } from "@/src/i18n/routing";
import { intlServerModule } from "@/tests/_support/intl-server";
import { msg } from "@/tests/_support/messages";
import { collectionOf, collectionsApi, renderCollections } from "../collections/collections-kit";

/* The home page and its scroll story: structured data, the scroll-driven layout and the outro (specs/storefront/landing-page.md, flows LND-1 to LND-5). */

const VH = 800;
const WRAP_HEIGHT = 3000;
const MAX_SCROLL = WRAP_HEIGHT - VH;
const OUTRO_START = VH + MAX_SCROLL;
const params = (locale: AppLocale) => ({ params: Promise.resolve({ locale }) });
const jsonLd = () => Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap((s) => JSON.parse(s.textContent ?? "[]"));

let frames: FrameRequestCallback[] = [];
const frame = () => {
  const due = frames.splice(0);
  act(() => due.forEach((callback) => callback(0)));
};
const scrollTo = (y: number) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  frame();
};
const byId = (id: string) => document.getElementById(id) as HTMLElement;

beforeEach(() => {
  frames = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  Object.defineProperty(window, "innerHeight", { configurable: true, value: VH });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  /* jsdom measures nothing: the block of cards is 3000px tall */
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get(this: HTMLElement) { return this.style.paddingTop === "40vh" ? WRAP_HEIGHT : 0; } });
});
afterEach(() => {
  Reflect.deleteProperty(HTMLMediaElement.prototype, "play");
  Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
  Reflect.deleteProperty(window, "scrollY");
  Reflect.deleteProperty(window, "innerHeight");
});

async function story(options: { locale?: "vi" | "en" } = {}) {
  const calls = collectionsApi({ list: [collectionOf()] });
  const view = await renderCollections(<LandingPage />, { ...options, calls });
  frame();
  return view;
}

describe("LND-1 the home page", () => {
  const show = async (locale: AppLocale = "vi") => {
    const calls = collectionsApi({ list: [] });
    const page = await Home(params(locale));
    return renderCollections(<>{page}</>, { locale, calls });
  };

  it("names the brand and the shop for search engines: a website and a clothing store", async () => {
    await show();

    const types = jsonLd().map((item) => item["@type"]);
    expect(types).toEqual(expect.arrayContaining(["WebSite", "ClothingStore"]));
    const site = jsonLd().find((item) => item["@type"] === "WebSite");
    expect(site).toMatchObject({ name: "DOOVAN", inLanguage: "vi", description: msg("shared.site.meta.description") });
    expect(jsonLd().find((item) => item["@type"] === "ClothingStore")).toMatchObject({ disambiguatingDescription: msg("shared.site.identity") });
  });

  it("lists the five main sections of the site, in order, with addresses in this language", async () => {
    await show();

    const nav = jsonLd().find((item) => item["@type"] === "ItemList");
    expect(nav.itemListElement.map((entry: { position: number; name: string }) => [entry.position, entry.name])).toEqual([
      [1, msg("shared.header.nav.shop")],
      [2, msg("shared.header.nav.newIn")],
      [3, msg("shared.header.nav.collections")],
      [4, msg("shared.header.nav.customOrder")],
      [5, msg("shared.header.nav.about")],
    ]);
    expect(nav.itemListElement.map((entry: { url: string }) => entry.url.replace(/^https?:\/\/[^/]+/, ""))).toEqual(["/vi/shop", "/vi/new-in", "/vi/collections", "/vi/contact", "/vi/about"]);
  });

  it("has a heading for crawlers and screen readers, which sighted visitors do not see", async () => {
    await show();

    const heading = screen.getByRole("heading", { level: 1, name: msg("public.landing.heading") });
    expect(heading.className).toContain("sr-only");
  });

  it("speaks English in English", async () => {
    await show("en");

    expect(screen.getByRole("heading", { level: 1, name: msg("public.landing.heading", "en") })).toBeInTheDocument();
    expect(jsonLd().find((item) => item["@type"] === "WebSite")).toMatchObject({ inLanguage: "en" });
    expect(jsonLd().find((item) => item["@type"] === "ItemList").itemListElement[0].url).toMatch(/\/en\/shop$/);
  });

  it("tells the framework which language it renders", async () => {
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await Home(params("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("shows the story under the heading", async () => {
    await show();

    expect(byId("scroll-spacer")).toBeInTheDocument();
    expect(screen.getByText(msg("public.landing.caption"))).toBeInTheDocument();
  });
});

describe("LND-2 the height of the story", () => {
  it("is the screen, plus the cards that scroll, plus two more screens for the ending", async () => {
    await story();

    expect(byId("scroll-spacer").style.height).toBe(`${VH + MAX_SCROLL + 2 * VH}px`);
  });

  it("is worked out again when the window changes size", async () => {
    await story();

    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    act(() => void window.dispatchEvent(new Event("resize")));

    expect(byId("scroll-spacer").style.height).toBe(`${1000 + (WRAP_HEIGHT - 1000) + 2000}px`);
  });

  it("never lets the cards' scroll go negative when they are shorter than the screen", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get() { return 300; } });
    await story();

    expect(byId("scroll-spacer").style.height).toBe(`${VH + 0 + 2 * VH}px`);
  });
});

describe("LND-3 scrolling through the story", () => {
  it("keeps the video and the cards where they start while nothing is scrolled", async () => {
    await story();

    scrollTo(0);

    expect(byId("main-canvas").style.visibility).toBe("visible");
    expect(byId("scroll-spacer").querySelector<HTMLElement>("[style*='padding-top']")!.style.transform).toBe("translateY(0)");
  });

  it("keeps the video up to the end of the first screen and hides it after", async () => {
    await story();

    scrollTo(VH);
    expect(byId("main-canvas").style.visibility).toBe("visible");
    scrollTo(VH + 1);

    expect(byId("main-canvas").style.visibility).toBe("hidden");
  });

  it("scrolls the cards up by what was scrolled past the first screen", async () => {
    await story();
    const wrap = byId("scroll-spacer").querySelector<HTMLElement>("[style*='padding-top']")!;

    scrollTo(VH + 250);
    expect(wrap.style.transform).toBe("translateY(-250px)");
    scrollTo(VH);
    expect(wrap.style.transform).toBe("translateY(0)");
    scrollTo(100);
    expect(wrap.style.transform).toBe("translateY(0)");
  });

  it("brings the video back when scrolled up again", async () => {
    await story();
    scrollTo(VH + 100);

    scrollTo(10);

    expect(byId("main-canvas").style.visibility).toBe("visible");
  });

  it("goes on for every frame", async () => {
    await story();

    frame();
    frame();

    expect(frames).toHaveLength(1);
  });

  it("stops at the end: no more frames, no more listening for resizes", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const view = await story();

    view.unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});

describe("LND-4 the cards growing and shrinking", () => {
  const place = (top: number, bottom: number) => {
    document.querySelectorAll<HTMLElement>(".collection-card").forEach((card) => {
      card.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top, toJSON: () => ({}) });
    });
  };
  const scale = () => parseFloat(document.querySelector<HTMLElement>(".collection-card")!.style.transform.replace("scale(", ""));

  it("shows a card at full size once it is well inside the screen", async () => {
    await story();
    await waitFor(() => expect(document.querySelector(".collection-card")).not.toBeNull());
    place(100, 400);

    frame();

    expect(scale()).toBe(1);
  });

  it("grows a card as it comes in from the bottom, over the lower 60% of the screen", async () => {
    await story();
    await waitFor(() => expect(document.querySelector(".collection-card")).not.toBeNull());
    place(VH - 240, VH + 260);

    frame();

    expect(scale()).toBeCloseTo(240 / (VH * 0.6), 5);
  });

  it("shrinks a card as it leaves at the top, over the upper 40% of the screen", async () => {
    await story();
    await waitFor(() => expect(document.querySelector(".collection-card")).not.toBeNull());
    place(-200, 160);

    frame();

    expect(scale()).toBeCloseTo(160 / (VH * 0.4), 5);
  });

  it("hides a card that is wholly above or wholly below the screen", async () => {
    await story();
    await waitFor(() => expect(document.querySelector(".collection-card")).not.toBeNull());

    place(-300, 0);
    frame();
    expect(scale()).toBe(0);
    place(-300, -100);
    frame();
    expect(scale()).toBe(0);
    place(VH, VH + 300);
    frame();
    expect(scale()).toBe(0);
    place(VH + 100, VH + 400);
    frame();
    expect(scale()).toBe(0);
    place(VH - 1, VH + 300);
    frame();
    expect(scale()).toBeGreaterThan(0);
  });
});

describe("LND-5 the ending", () => {
  const read = () => ({
    overlay: parseFloat(byId("outro-overlay").style.opacity),
    footer: parseFloat(byId("outro-footer").style.opacity),
    buy: byId("outro-buy").style.transform,
    info: byId("outro-info").style.transform,
  });

  it("is hidden until the last screen of the cards has been passed, and exactly there", async () => {
    await story();

    scrollTo(OUTRO_START);

    expect(read()).toEqual({ overlay: 0, footer: 0, buy: "scale(0)", info: "translateY(0)" });
  });

  it("fades in, with the button growing and the label moving up, in step with the scroll", async () => {
    await story();
    const progress = 350 / (VH - 100);

    scrollTo(OUTRO_START + 350);

    const now = read();
    expect(now.overlay).toBeCloseTo(progress, 5);
    expect(now.footer).toBeCloseTo(progress, 5);
    expect(parseFloat(now.buy.replace("scale(", ""))).toBeCloseTo(progress, 5);
    expect(parseFloat(now.info.replace("translateY(", ""))).toBeCloseTo(-(166 - 80) * progress, 4);
  });

  it("is complete after one screen less a hundred pixels, and goes no further", async () => {
    await story();

    scrollTo(OUTRO_START + VH - 100);
    expect(read()).toMatchObject({ overlay: 1, footer: 1, buy: "scale(1)", info: `translateY(${-(166 - 80)}px)` });
    scrollTo(OUTRO_START + 5000);

    expect(read()).toMatchObject({ overlay: 1, footer: 1, buy: "scale(1)" });
  });

  it("moves the label by the offset the label itself asks for, and by 160 when it asks for none", async () => {
    await story();
    byId("outro-info").removeAttribute("data-outro-offset");

    scrollTo(OUTRO_START + VH - 100);

    expect(byId("outro-info").style.transform).toBe(`translateY(${-(160 - 80)}px)`);
  });

  it("goes back to hidden when scrolled up again", async () => {
    await story();
    scrollTo(OUTRO_START + 300);

    scrollTo(OUTRO_START - 10);

    expect(read()).toEqual({ overlay: 0, footer: 0, buy: "scale(0)", info: "translateY(0)" });
  });
});

describe("LND-6 the symbol in the circle", () => {
  const symbol = () => byId("circle-symbol").textContent;

  it("changes to a random one of the symbols, but not more often than every 80 milliseconds", async () => {
    const now = vi.spyOn(performance, "now");
    vi.spyOn(Math, "random").mockReturnValue(0);
    now.mockReturnValue(1000);
    await story();
    expect(symbol()).toBe(SYMBOLS[0]);

    vi.spyOn(Math, "random").mockReturnValue(0.99);
    now.mockReturnValue(1080);
    frame();
    expect(symbol()).toBe(SYMBOLS[0]);
    now.mockReturnValue(1081);
    frame();

    expect(symbol()).toBe(SYMBOLS[SYMBOLS.length - 1]);
  });
});

describe("LND-7 the black panel", () => {
  it("slides up over the first screen, following the scroll, and is let go on leaving", async () => {
    const view = await story();

    const triggers = ScrollTrigger.getAll();
    expect(triggers).toHaveLength(1);
    expect(triggers[0].trigger).toBe(byId("scroll-spacer"));
    expect(triggers[0].vars.scrub).toBe(true);
    expect(triggers[0].vars.start).toBe("top top");
    expect(triggers[0].vars.end).toBe("100vh top");

    view.unmount();

    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});
