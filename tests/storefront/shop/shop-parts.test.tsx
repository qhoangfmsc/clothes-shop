import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import BreadcrumbNav from "@/src/app/[locale]/(public)/shop/_components/BreadcrumbNav";
import CategoryGrid from "@/src/app/[locale]/(public)/shop/_components/CategoryGrid";
import ShopHero from "@/src/app/[locale]/(public)/shop/_components/ShopHero";
import SubcategoryChips from "@/src/app/[locale]/(public)/shop/_components/SubcategoryChips";
import { MAX_INLINE_CATEGORIES } from "@/src/lib/category-display";
import { categoryOf, renderShop } from "./shop-kit";
import { msg } from "@/tests/_support/messages";
import { subcategoryOf } from "@/tests/_support/fixtures";

/* The smaller parts of the shop pages: breadcrumb, category cards, sub-category chips, the hero (specs/storefront/shop.md, flows SHP-15 to SHP-19). */

const S = (key: string) => msg(`public.shop.components.${key}`);
const decoded = (value: string | null) => decodeURIComponent(value ?? "");

describe("SHP-15 the breadcrumb", () => {
  it("links every step but the last, which is plain text, with a diamond between steps", async () => {
    const { container } = await renderShop(<BreadcrumbNav crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: "Tops" }]} />);

    const nav = screen.getByRole("navigation", { name: S("breadcrumb.aria") });
    expect(within(nav).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([["Home", "/"], ["Shop", "/shop"]]);
    expect(within(nav).getByText("Tops").closest("a")).toBeNull();
    expect(container.textContent?.match(/◆/g)).toHaveLength(2);
  });

  it("shows a middle step with no address as plain text", async () => {
    await renderShop(<BreadcrumbNav crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }, { label: "Tops" }]} />);

    expect(screen.getByText("Shop").closest("a")).toBeNull();
  });

  it("shows a single step without a diamond", async () => {
    const { container } = await renderShop(<BreadcrumbNav crumbs={[{ label: "Shop" }]} />);

    expect(container.textContent).not.toContain("◆");
  });
});

describe("SHP-16 the category cards", () => {
  const categories = (n: number) => Array.from({ length: n }, (_, i) => categoryOf({ id: `c${i}`, slug: `cat-${i}`, title: `Category ${i}`, description: `About ${i}`, subcategories: [subcategoryOf({ count: 2 }), subcategoryOf({ id: "s2", slug: "other", count: 3 })] }));

  it("shows each category as a card linked to its page, with its name and what it is about", async () => {
    await renderShop(<CategoryGrid categories={categories(2)} />);

    const link = screen.getByRole("link", { name: /Category 1/ });
    expect(link).toHaveAttribute("href", "/shop/cat-1");
    expect(within(link).getByText("About 1")).toBeInTheDocument();
  });

  it("counts the pieces of all its sub-categories", async () => {
    await renderShop(<CategoryGrid categories={categories(1)} />);

    expect(screen.getByText("5 sản phẩm")).toBeInTheDocument();
  });

  it("shows the picture the admin set, or a plain colour when there is none", async () => {
    await renderShop(<CategoryGrid categories={[categoryOf({ slug: "with", title: "With", heroImage: "/hero.jpg" }), categoryOf({ id: "c2", slug: "without", title: "Without", heroImage: null })]} />);

    expect(decoded(within(screen.getByRole("link", { name: /With\b/ })).getByRole("img").getAttribute("src"))).toContain("/hero.jpg");
    expect(within(screen.getByRole("link", { name: /Without/ })).queryByRole("img")).toBeNull();
  });

  it("is a plain grid up to four categories and has no carousel", async () => {
    await renderShop(<CategoryGrid categories={categories(MAX_INLINE_CATEGORIES)} />);

    expect(screen.queryByRole("region", { name: S("categoryGrid.carouselAria") })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(MAX_INLINE_CATEGORIES);
  });

  it("becomes a carousel with a name of its own for more than four categories, every card still there", async () => {
    await renderShop(<CategoryGrid categories={categories(MAX_INLINE_CATEGORIES + 1)} />);

    expect(screen.getByRole("region", { name: S("categoryGrid.carouselAria") })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(MAX_INLINE_CATEGORIES + 1);
  });

  it("hides the cards until they scroll into view (the reveal), and no card is lost", async () => {
    const { container } = await renderShop(<CategoryGrid categories={categories(3)} />);

    const cards = container.querySelectorAll("[data-category-card]");
    expect(cards).toHaveLength(3);
    expect(Array.from(cards).map((c) => (c as HTMLElement).style.opacity)).toEqual(["0", "0", "0"]);
  });

  it("shows nothing but an empty frame without categories", async () => {
    await renderShop(<CategoryGrid categories={[]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("SHP-17 the sub-category chips", () => {
  const subs = [subcategoryOf({ slug: "shirts", label: "Shirts", count: 4 }), subcategoryOf({ id: "s2", slug: "vests", label: "Vests", count: 0 })];

  it("offers 'all' and each sub-category with how many pieces it has, each linked to its page", async () => {
    await renderShop(<SubcategoryChips categorySlug="tops" subcategories={subs} />);

    const links = screen.getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([[S("subcategoryChips.all"), "/shop/tops"], ["Shirts4", "/shop/tops/shirts"], ["Vests0", "/shop/tops/vests"]]);
  });

  it("marks 'all' as the current one when no sub-category is open", async () => {
    await renderShop(<SubcategoryChips categorySlug="tops" subcategories={subs} />);

    expect(screen.getByRole("link", { name: S("subcategoryChips.all") }).className).toContain("bg-[var(--accent-primary)]");
    expect(screen.getByRole("link", { name: /Shirts/ }).className).not.toContain("bg-[var(--accent-primary)] border");
  });

  it("marks the open sub-category and not 'all'", async () => {
    await renderShop(<SubcategoryChips categorySlug="tops" subcategories={subs} activeSlug="vests" />);

    expect(screen.getByRole("link", { name: /Vests/ }).className).toContain("bg-[var(--accent-primary)]");
    expect(screen.getByRole("link", { name: S("subcategoryChips.all") }).className).not.toContain("bg-[var(--accent-primary)] border-[var(--accent-primary)]");
    expect(screen.getByRole("link", { name: /Shirts/ }).className).not.toContain("bg-[var(--accent-primary)] border-[var(--accent-primary)]");
  });

  it("shows only 'all' for a category with no sub-categories", async () => {
    await renderShop(<SubcategoryChips categorySlug="tops" subcategories={[]} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("SHP-18 the hero", () => {
  const banner = (n: number) => ({ image: `/banner-${n}.jpg` });

  it("shows the label, the title as the page's heading and the description", async () => {
    await renderShop(<ShopHero label="DOOVAN — Tops" title="Tops" description="Everything for the top half" banners={[]} />);

    expect(screen.getByText("DOOVAN — Tops")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Tops" })).toBeInTheDocument();
    expect(screen.getByText("Everything for the top half")).toBeInTheDocument();
  });

  it("leaves the description out when there is none", async () => {
    const { container } = await renderShop(<ShopHero label="" title="Shop" banners={[]} />);

    expect(container.querySelector("[data-hero-desc]")).toBeNull();
  });

  it("shows a plain colour, no picture and no dots without banners", async () => {
    const { container } = await renderShop(<ShopHero label="" title="Shop" banners={[]} />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the one banner as a static picture without dots", async () => {
    const { container } = await renderShop(<ShopHero label="" title="Shop" banners={[banner(1)]} />);

    expect(decoded(container.querySelector("img")!.getAttribute("src"))).toContain("/banner-1.jpg");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a dot for each of several banners, starting on the first, and jumps to the one clicked", async () => {
    const { container } = await renderShop(<ShopHero label="" title="Shop" banners={[banner(1), banner(2), banner(3)]} />);
    const dots = screen.getAllByRole("button");
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("aria-current", "true");
    expect(decoded(container.querySelector("img")!.getAttribute("src"))).toContain("/banner-1.jpg");

    await userEvent.click(dots[2]);

    expect(screen.getAllByRole("button")[2]).toHaveAttribute("aria-current", "true");
    await waitFor(() => expect(Array.from(container.querySelectorAll("img")).some((img) => decoded(img.getAttribute("src")).includes("/banner-3.jpg"))).toBe(true));
  });

  it("starts the entrance and parallax effects on the hero, and puts the text in its start position", async () => {
    const { container } = await renderShop(<ShopHero label="L" title="T" description="D" banners={[banner(1)]} />);

    const parts = container.querySelectorAll("[data-hero-label], [data-hero-title], [data-hero-desc]");
    expect(parts).toHaveLength(3);
    expect(Array.from(parts).map((p) => (p as HTMLElement).style.opacity)).toEqual(["0", "0", "0"]);
  });
});
