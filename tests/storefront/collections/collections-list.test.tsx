import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { describe, expect, it } from "vitest";
import CollectionsClient from "@/src/app/[locale]/(public)/collections/_components/CollectionsClient";
import type { Collection } from "@/src/types/collection";
import type { BannerItem } from "@/src/types/site-config";
import { media } from "@/tests/_support/media-query";
import { msg } from "@/tests/_support/messages";
import { collections, renderCollections, type RenderCollectionsOptions } from "./collections-kit";

/* The collections list: hero, running text, cards, editorial spreads (specs/storefront/collections.md, flows COL-4 to COL-8). */

const L = (key: string, locale: "vi" | "en" = "vi") => msg(`public.collections.list.${key}`, locale);
const decoded = (value: string | null) => decodeURIComponent(value ?? "");

/* The page puts the list inside <main>: GSAP's pin wraps a child in a spacer, which React could not remove from the bare test container */
async function list(items: Collection[] = collections(4), heroBanners: BannerItem[] = [], options: RenderCollectionsOptions = {}) {
  return renderCollections(
    <main>
      <CollectionsClient collections={items} heroBanners={heroBanners} />
    </main>,
    options
  );
}
const spreads = () => Array.from(document.querySelectorAll("section")).filter((s) => s.querySelector("[data-spread-text]"));
const touchList = () => screen.getByRole("region", { name: L("carouselAria") });

describe("COL-4 the hero", () => {
  it("names the page, with the season label, the subtitle and a hint to scroll", async () => {
    await list();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${L("heroTitleLine1")}${L("heroTitleLine2")}`);
    expect(screen.getByText(L("heroSeason"))).toBeInTheDocument();
    expect(screen.getByText(L("heroSubtitle"))).toBeInTheDocument();
    expect(screen.getByText(L("scroll"))).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await list(collections(2), [], { locale: "en" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${L("heroTitleLine1", "en")}${L("heroTitleLine2", "en")}`);
  });

  it("has a plain background and no picture when no banner is set", async () => {
    const { container } = await list(collections(2), []);

    expect(container.querySelector("[data-hero-media] img")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Đến mục/ })).not.toBeInTheDocument();
  });

  it("shows the one banner there is, without dots", async () => {
    const { container } = await list(collections(2), [{ image: "/one.jpg" }]);

    const hero = container.querySelector("[data-hero-media] img")!;
    expect(decoded(hero.getAttribute("src"))).toContain("/one.jpg");
    expect(hero).toHaveAttribute("alt", L("heroAlt"));
    expect(screen.queryByRole("button", { name: /^Đến mục/ })).not.toBeInTheDocument();
  });

  it("shows a dot for each of several banners and fades to the one that is picked", async () => {
    const { container } = await list(collections(2), [{ image: "/one.jpg" }, { image: "/two.jpg" }, { image: "/three.jpg" }]);
    const dots = screen.getAllByRole("button", { name: /^Đến mục/ });
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("aria-current", "true");

    await userEvent.click(dots[2]);

    expect(screen.getAllByRole("button", { name: /^Đến mục/ })[2]).toHaveAttribute("aria-current", "true");
    await waitFor(() => expect(Array.from(container.querySelectorAll("[data-hero-media] img")).some((img) => decoded(img.getAttribute("src")).includes("/three.jpg"))).toBe(true));
  });
});

describe("COL-5 the running text", () => {
  it("repeats the strip four times above the cards and four times below", async () => {
    await list();

    expect(screen.getAllByText(L("marquee"))).toHaveLength(8);
  });
});

describe("COL-6 the cards", () => {
  it("has a card for every collection in the touch carousel, with its number, name, subtitle and link", async () => {
    await list(collections(4));

    const region = touchList();
    const links = within(region).getAllByRole("link");
    expect(new Set(links.map((a) => a.getAttribute("href")))).toEqual(new Set(["/collections/col-1", "/collections/col-2", "/collections/col-3", "/collections/col-4"]));
    const first = links.find((a) => a.getAttribute("href") === "/collections/col-2")!;
    expect(within(first).getByText("02")).toBeInTheDocument();
    expect(within(first).getByText("Collection 2")).toBeInTheDocument();
    expect(within(first).getByText("Subtitle 2")).toBeInTheDocument();
    expect(decoded(within(first).getByAltText("Collection 2").getAttribute("src"))).toContain("/col-2.jpg");
  });

  it("has the same cards in the track that scrolls sideways on a wide screen", async () => {
    const { container } = await list(collections(3));

    const track = container.querySelector(".will-change-transform.w-max") as HTMLElement;
    expect(within(track).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/collections/col-1", "/collections/col-2", "/collections/col-3"]);
  });

  it("shows no cards when there are no collections", async () => {
    const { container } = await list([]);

    expect(container.querySelector(".will-change-transform.w-max")!.querySelectorAll("a")).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("numbers the cards from 01 with a leading zero", async () => {
    const { container } = await list(collections(10));

    const numbers = Array.from(container.querySelector(".will-change-transform.w-max")!.querySelectorAll("a span.absolute")).map((n) => n.textContent);
    expect(numbers.slice(0, 2)).toEqual(["01", "02"]);
    expect(numbers[9]).toBe("10");
  });
});

describe("COL-7 the editorial spreads", () => {
  it("makes one for each of the first three collections, with number, name, description, picture and a link in", async () => {
    await list(collections(5));

    const found = spreads();
    expect(found).toHaveLength(3);
    const second = found[1];
    expect(within(second).getByText("02")).toBeInTheDocument();
    expect(within(second).getByRole("heading", { level: 2, name: "Collection 2" })).toBeInTheDocument();
    expect(within(second).getByText("About collection 2")).toBeInTheDocument();
    expect(decoded(within(second).getByAltText("Collection 2").getAttribute("src"))).toContain("/col-2.jpg");
    expect(within(second).getByRole("link", { name: L("exploreCollection") })).toHaveAttribute("href", "/collections/col-2");
  });

  it("makes as many as there are when fewer than three, and none for no collections", async () => {
    const two = await list(collections(2));
    expect(spreads()).toHaveLength(2);
    two.unmount();

    await list([]);
    expect(spreads()).toHaveLength(0);
  });

  it("turns every other spread around, and gives each its own tint", async () => {
    await list(collections(3));

    const [a, b, c] = spreads();
    expect(a.className).not.toContain("lg:flex-row-reverse");
    expect(b.className).toContain("lg:flex-row-reverse");
    expect(c.className).not.toContain("lg:flex-row-reverse");
    expect([a, b, c].map((s) => s.style.background)).toEqual(["var(--color-rose-milk)", "var(--color-vanilla)", "var(--color-lavender-cream)"]);
  });
});

describe("COL-8 the motion on a wide screen with a mouse", () => {
  const pinned = () => ScrollTrigger.getAll().filter((trigger) => trigger.pin);

  it("pins nothing on a phone or a touch screen, where the cards are a carousel", async () => {
    await list();

    expect(pinned()).toHaveLength(0);
  });

  it("pins the cards and scrolls them sideways on a wide screen with a mouse, and lets go on leaving", async () => {
    media.matching = (query) => query.includes("min-width: 768px") || query.includes("pointer: fine");
    const view = await list();
    expect(pinned()).toHaveLength(1);

    act(() => view.unmount());

    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});
