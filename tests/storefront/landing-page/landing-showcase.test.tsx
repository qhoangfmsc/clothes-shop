import { createRef } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CollectionShowcase from "@/src/app/[locale]/(public)/landing-page/_components/CollectionShowcase";
import { msg } from "@/tests/_support/messages";
import { collections, collectionsApi, renderCollections } from "../collections/collections-kit";

/* The wall of collection pictures at the end of the home page (specs/storefront/landing-page.md, flows LND-8 to LND-9E). */

const decoded = (value: string | null) => decodeURIComponent(value ?? "");

async function wall(n: number, options: { locale?: "vi" | "en"; list?: number } = {}) {
  const calls = collectionsApi({ list: options.list ?? collections(n) });
  const panelRef = createRef<HTMLDivElement>();
  const wrapRef = createRef<HTMLDivElement>();
  const view = await renderCollections(<CollectionShowcase panelRef={panelRef} wrapRef={wrapRef} />, { locale: options.locale, calls });
  return { ...view, panelRef, wrapRef };
}
const gridOf = (columns: number) => Array.from(document.querySelectorAll<HTMLElement>("div")).find((grid) => grid.style.gridTemplateColumns === `repeat(${columns}, 1fr)`)!;
/** Each row of a grid as text: L where a card sits, a dot where the cell is empty */
const pattern = (columns: number) => {
  const cells = Array.from(gridOf(columns).children);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns).map((cell) => (cell.matches("a.collection-card") ? "L" : "·")).join(""));
  return rows;
};
const cardsOf = (columns: number) => Array.from(gridOf(columns).querySelectorAll<HTMLAnchorElement>("a.collection-card"));

describe("LND-8 the wall of pictures", () => {
  it("asks the API for every collection and shows each as a card that links to it, with its picture, name and an invitation", async () => {
    const view = await wall(3);

    await waitFor(() => expect(cardsOf(2)).toHaveLength(3));
    expect(view.calls.list.map((p) => Object.fromEntries(p))).toEqual([{ limit: "200" }]);
    const card = cardsOf(2)[1];
    expect(card).toHaveAttribute("href", "/collections/col-2");
    expect(decoded(within(card).getByAltText("Collection 2").getAttribute("src"))).toContain("/col-2.jpg");
    expect(within(card).getByText("Collection 2", { selector: "span" })).toBeInTheDocument();
    expect(within(card).getByText(msg("public.landing.showcase.shopNow"))).toBeInTheDocument();
  });

  it("starts every card shrunk to nothing, at a 2:3 shape, for the scroll to grow it", async () => {
    await wall(2);

    await waitFor(() => expect(cardsOf(2)).toHaveLength(2));
    expect(cardsOf(2)[0].style.transform).toBe("scale(0)");
    expect(cardsOf(2)[0].style.aspectRatio).toBe("2/3");
  });

  it("speaks English in English", async () => {
    await wall(1, { locale: "en" });

    await waitFor(() => expect(cardsOf(2)).toHaveLength(1));
    expect(within(cardsOf(2)[0]).getByText(msg("public.landing.showcase.shopNow", "en"))).toBeInTheDocument();
  });

  it("hands its two blocks to the page, which scrolls and fades them", async () => {
    const { panelRef, wrapRef } = await wall(1);

    expect(panelRef.current?.style.position).toBe("fixed");
    expect(wrapRef.current?.style.paddingTop).toBe("40vh");
    expect(wrapRef.current?.parentElement).toBe(panelRef.current);
  });

  it("lays the cards out on two, three, four and five columns, scattered", async () => {
    await wall(5);
    await waitFor(() => expect(cardsOf(2)).toHaveLength(5));

    expect(pattern(2)).toEqual(["LL", "·L", "L·", "·L"]);
    expect(pattern(4)).toEqual(["L·L·", "···L", "L···", "···L"]);
    expect(pattern(5)).toEqual(["L·L··", "···L·", "·L··L"]);
  });

  it("lays four cards out on three columns", async () => {
    await wall(4);
    await waitFor(() => expect(cardsOf(3)).toHaveLength(4));

    expect(pattern(3)).toEqual(["L·L", "L··", "·L·"]);
  });

  it("puts the cards in order, row by row", async () => {
    await wall(5);
    await waitFor(() => expect(cardsOf(4)).toHaveLength(5));

    expect(cardsOf(4).map((a) => a.getAttribute("href"))).toEqual(["/collections/col-1", "/collections/col-2", "/collections/col-3", "/collections/col-4", "/collections/col-5"]);
  });

  it("grows each card from its outer corner: those in the left half from the right, the others from the left", async () => {
    await wall(5);
    await waitFor(() => expect(cardsOf(5)).toHaveLength(5));

    for (const columns of [2, 3, 4, 5]) {
      for (const card of cardsOf(columns)) {
        const column = Array.from(gridOf(columns).children).indexOf(card) % columns;
        expect(card.style.transformOrigin).toBe(column < columns / 2 ? "right bottom" : "left bottom");
      }
    }
    expect(cardsOf(2).map((card) => card.style.transformOrigin)).toEqual(["right bottom", "left bottom", "left bottom", "right bottom", "left bottom"]);
  });
});

describe("LND-9 telling the page the wall has grown", () => {
  it("sends a resize event soon after the collections arrive, so that the page works out its height again", async () => {
    const onResize = vi.fn();
    window.addEventListener("resize", onResize);
    try {
      await wall(2);

      await waitFor(() => expect(onResize).toHaveBeenCalled(), { timeout: 1000 });
    } finally {
      window.removeEventListener("resize", onResize);
    }
  });
});

describe("LND-9E no collections to show", () => {
  it("shows an empty wall, and sends no resize, when there are none", async () => {
    const onResize = vi.fn();
    window.addEventListener("resize", onResize);
    try {
      await wall(0);

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(document.querySelectorAll("a.collection-card")).toHaveLength(0);
      expect(onResize).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("resize", onResize);
    }
  });

  it("shows an empty wall when the collections cannot be read", async () => {
    await wall(0, { list: 500 });

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(document.querySelectorAll("a.collection-card")).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
