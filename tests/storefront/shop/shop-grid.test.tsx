import { act, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductGrid from "@/src/app/[locale]/(public)/shop/_components/ProductGrid";
import { observers } from "@/tests/_support/browser-apis";
import { msg } from "@/tests/_support/messages";
import { products, renderShop } from "./shop-kit";

/* The grid of cards: the empty page, and the reveal of new cards as they come into view (specs/storefront/shop.md, flows SHP-13 to SHP-14). */

const G = (key: string) => msg(`public.shop.components.productGrid.${key}`);
const grid = (container: HTMLElement) => container.querySelector("div.grid") as HTMLElement;
const watchers = () => observers.intersection.filter((o) => !o.disconnected);

describe("SHP-13 the grid", () => {
  it("shows one card for each product, linked to its page", async () => {
    const { container } = await renderShop(<ProductGrid products={products(3)} />);

    expect(within(grid(container)).getAllByRole("link")).toHaveLength(3);
    expect(screen.getByText("Item 02")).toBeInTheDocument();
  });

  it("lays the cards out in two columns on a phone, growing to five on a wide screen", async () => {
    const { container } = await renderShop(<ProductGrid products={products(2)} />);

    expect(grid(container).className).toContain("grid-cols-2");
    expect(grid(container).className).toContain("sm:grid-cols-3");
    expect(grid(container).className).toContain("lg:grid-cols-4");
    expect(grid(container).className).toContain("xl:grid-cols-5");
  });

  it("says new pieces are coming, with an explanation, when there are no products", async () => {
    const { container } = await renderShop(<ProductGrid products={[]} />);

    expect(screen.getByRole("heading", { name: G("comingSoon") })).toBeInTheDocument();
    expect(screen.getByText(G("comingSoonDescription"))).toBeInTheDocument();
    expect(grid(container)).toBeNull();
  });
});

describe("SHP-14 revealing the cards", () => {
  it("hides the new cards until they come into view, and shows them when they do", async () => {
    const { container } = await renderShop(<ProductGrid products={products(3)} />);
    const cards = Array.from(grid(container).children) as HTMLElement[];
    expect(cards.map((c) => c.style.opacity)).toEqual(["0", "0", "0"]);
    expect(watchers()).toHaveLength(1);
    expect(watchers()[0].observed).toEqual(cards);

    act(() => watchers()[0].triggerFor(true, [cards[0]]));

    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 900))));
    expect(cards[0].style.opacity).toBe("");
    expect(cards[1].style.opacity).toBe("0");
  });

  it("does nothing for a card that has not come into view", async () => {
    const { container } = await renderShop(<ProductGrid products={products(2)} />);
    const cards = Array.from(grid(container).children) as HTMLElement[];

    act(() => watchers()[0].triggerFor(false));

    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 100))));
    expect(cards.map((c) => c.style.opacity)).toEqual(["0", "0"]);
  });

  it("reveals only the cards that were added when more are appended, leaving the first ones alone", async () => {
    const view = await renderShop(<ProductGrid products={products(2)} />);
    const first = Array.from(grid(view.container).children) as HTMLElement[];
    act(() => watchers()[0].triggerFor(true));
    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 900))));
    expect(first.map((c) => c.style.opacity)).toEqual(["", ""]);

    view.rerender(<ProductGrid products={products(4)} />);

    const all = Array.from(grid(view.container).children) as HTMLElement[];
    expect(all.map((c) => c.style.opacity)).toEqual(["", "", "0", "0"]);
    const live = watchers().at(-1)!;
    expect(live.observed).toEqual(all.slice(2));
  });

  it("starts again when the list is replaced by a different one", async () => {
    const view = await renderShop(<ProductGrid products={products(2)} />);
    act(() => watchers()[0].triggerFor(true));
    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 900))));

    view.rerender(<ProductGrid products={products(2, 50)} />);

    const cards = Array.from(grid(view.container).children) as HTMLElement[];
    expect(cards.map((c) => c.style.opacity)).toEqual(["0", "0"]);
  });

  it("leaves no card hidden when the grid goes away or the list changes before they were seen", async () => {
    const view = await renderShop(<ProductGrid products={products(2)} />);
    const cards = Array.from(grid(view.container).children) as HTMLElement[];
    expect(cards.map((c) => c.style.opacity)).toEqual(["0", "0"]);

    view.rerender(<ProductGrid products={[]} />);

    expect(cards.map((c) => c.style.opacity)).toEqual(["", ""]);
    expect(observers.intersection.every((o) => o.disconnected)).toBe(true);
  });

  it("does not watch anything for an empty list", async () => {
    await renderShop(<ProductGrid products={[]} />);

    expect(watchers()).toHaveLength(0);
  });
});
