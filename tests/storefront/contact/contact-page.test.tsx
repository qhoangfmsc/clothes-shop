import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ContactPage, { generateMetadata } from "@/src/app/[locale]/(public)/contact/page";
import ProductSummaryCard from "@/src/app/[locale]/(public)/contact/_components/ProductSummaryCard";
import type { AppLocale } from "@/src/i18n/routing";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_MAPS_URL, CONTACT_PHONE, CONTACT_PHONE_E164 } from "@/src/lib/contact";
import { SOCIALS } from "@/src/lib/socials";
import { intlServerModule } from "@/tests/_support/intl-server";
import { msg } from "@/tests/_support/messages";
import { orderProduct, product, productApi, renderContact } from "./contact-kit";

/* The contact page for custom orders, and the card of the product being ordered (specs/storefront/contact.md, flows CT-6 to CT-9E). */

const C = (key: string, locale: "vi" | "en" = "vi") => msg(`public.contact.${key}`, locale);
const props = (locale: AppLocale, productParam?: string | string[]) => ({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ product: productParam }) });
async function show(productParam?: string | string[], products: Parameters<typeof productApi>[0] = {}, locale: AppLocale = "vi") {
  const asked = productApi(products);
  const page = await ContactPage(props(locale, productParam));
  const view = await renderContact(<>{page}</>, { locale });
  return Object.assign(view, { asked });
}

describe("CT-6 the page", () => {
  it("names the page, explains it, lists the three steps in order and has the form", async () => {
    await show();

    expect(screen.getByText(C("hero.label"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: C("hero.heading") })).toBeInTheDocument();
    expect(screen.getByText(C("hero.description"))).toBeInTheDocument();
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps.map((s) => s.querySelector("h3")!.textContent)).toEqual([C("steps.items.tell.title"), C("steps.items.design.title"), C("steps.items.confirm.title")]);
    expect(steps.map((s) => s.querySelector("span")!.textContent)).toEqual(["1", "2", "3"]);
    expect(within(steps[0]).getByText(C("steps.items.tell.text"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: C("form.title") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: C("form.actions.sendEmail") })).toBeInTheDocument();
  });

  it("gives the ways to reach the shop: email, phone, every social profile in a new tab, and the address on the map", async () => {
    await show();

    const section = screen.getByRole("heading", { level: 2, name: C("channels.title") }).closest("section")!;
    expect(within(section).getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    expect(within(section).getByRole("link", { name: CONTACT_PHONE })).toHaveAttribute("href", `tel:${CONTACT_PHONE_E164}`);
    for (const { label, href } of SOCIALS) {
      const link = within(section).getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    const map = within(section).getByRole("link", { name: CONTACT_ADDRESS });
    expect(map).toHaveAttribute("href", CONTACT_MAPS_URL);
    expect(map).toHaveAttribute("target", "_blank");
    expect(within(section).getByText(C("channels.note"))).toBeInTheDocument();
  });

  it("links back to the shop", async () => {
    await show();

    expect(screen.getByRole("link", { name: C("back") })).toHaveAttribute("href", "/shop");
  });

  it("speaks English in English", async () => {
    await show(undefined, {}, "en");

    expect(screen.getByRole("heading", { level: 1, name: C("hero.heading", "en") })).toBeInTheDocument();
  });

  it("tells the framework which language it renders", async () => {
    productApi();
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await ContactPage(props("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("has a title with the brand, a description, language alternates and a share card", async () => {
    const meta = await generateMetadata(props("vi"));

    expect(meta.title).toBe(`${C("meta.title")} — DOOVAN`);
    expect(meta.description).toBe(C("meta.description"));
    expect(meta.alternates).toMatchObject({ canonical: "/vi/contact", languages: { vi: "/vi/contact", en: "/en/contact", "x-default": "/vi/contact" } });
    expect(meta.openGraph).toMatchObject({ url: "/vi/contact", title: meta.title });
  });
});

describe("CT-7 the product being ordered", () => {
  const dress = product({ id: "p1", name: "Silk dress", sku: "SKU-9", badge: "custom_order", description: "Long and light", material: "Silk" });

  it("is not looked up when the address names none", async () => {
    const { asked } = await show();

    expect(asked).toEqual([]);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("is looked up by the id in the address and shown beside the form", async () => {
    const { asked } = await show("p1", { p1: dress });

    expect(asked).toEqual(["p1"]);
    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { level: 3, name: "Silk dress" })).toBeInTheDocument();
    expect(within(card).getByText("Tops · Shirts")).toBeInTheDocument();
  });

  it("takes the first of several ids, and ignores spaces around it", async () => {
    const { asked } = await show(["  p1  ", "p2"], { p1: dress });

    expect(asked).toEqual(["p1"]);
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("does not look anything up for an id of only spaces", async () => {
    const { asked } = await show("   ", { p1: dress });

    expect(asked).toEqual([]);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("lets the form work freely for an id nobody knows, or when the product cannot be read", async () => {
    await show("nope", {});
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: C("form.actions.sendEmail") })).toBeInTheDocument();
  });

  it("carries the product's page address, in this language, into the email", async () => {
    await show("p1", { p1: dress }, "en");
    const mailto = (await import("./contact-kit")).recordNavigation();
    try {
      await userEvent.type(screen.getByPlaceholderText(C("form.design.placeholder", "en")), "Red");
      await userEvent.type(screen.getByPlaceholderText(C("form.contact.namePlaceholder", "en")), "Mai");
      await userEvent.type(screen.getByPlaceholderText(C("form.contact.phonePlaceholder", "en")), "0901234567");

      await userEvent.click(screen.getByRole("button", { name: C("form.actions.sendEmail", "en") }));

      const body = decodeURIComponent(mailto.sent.href.split("body=")[1].replace(/%20/g, " "));
      expect(body).toMatch(/\/en\/shop\/tops\/shirts\/p1/);
      expect(body).toContain("SKU-9");
    } finally {
      mailto.restore();
    }
  });

  it("links to the shop in the email for a product without a category", async () => {
    await show("p1", { p1: { ...dress, category: null as never, subcategory: null as never } });
    const mailto = (await import("./contact-kit")).recordNavigation();
    try {
      await userEvent.type(screen.getByPlaceholderText(C("form.design.placeholder")), "Red");
      await userEvent.type(screen.getByPlaceholderText(C("form.contact.namePlaceholder")), "Mai");
      await userEvent.type(screen.getByPlaceholderText(C("form.contact.phonePlaceholder")), "0901234567");

      await userEvent.click(screen.getByRole("button", { name: C("form.actions.sendEmail") }));

      expect(decodeURIComponent(mailto.sent.href)).toMatch(/\/vi\/shop(\s|&|$|\n)/);
    } finally {
      mailto.restore();
    }
  });
});

describe("CT-8 the card of the product", () => {
  const card = (over = {}, locale?: "vi" | "en") => renderContact(<ProductSummaryCard product={orderProduct(over)} />, { locale });

  it("shows the picture, the name, the place in the shop, the price, the description and the material with its hint", async () => {
    await card({ description: "Long and light", material: "Silk" });

    expect(screen.getByAltText("Silk dress")).toBeInTheDocument();
    expect(screen.getByText("Tops · Shirts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Silk dress" })).toBeInTheDocument();
    expect(screen.getByText("Long and light")).toBeInTheDocument();
    expect(screen.getByText(C("product.material"), { exact: false }).closest("p")).toHaveTextContent(`${C("product.material")}: Silk`);
    expect(screen.getByText(C("product.materialHint"))).toBeInTheDocument();
  });

  it("shows 'price on request' for a custom order, and the price for the others", async () => {
    const view = await card({ badge: "custom_order" });
    expect(screen.getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
    view.unmount();

    await card({ badge: null, priceVnd: 350_000 });
    expect(screen.getByText("350.000 VNĐ")).toBeInTheDocument();
  });

  it("shows the old price struck through with the percentage taken off, rounded", async () => {
    await card({ badge: null, priceVnd: 298_000, priceUsd: 11.46, originalPriceVnd: 450_000, originalPriceUsd: 17.31 });

    expect(screen.getByText("450.000 VNĐ").className).toContain("line-through");
    expect(screen.getByText("−34%")).toBeInTheDocument();
  });

  it.each([[null], [350_000], [300_000]])("shows no discount when the old price is %s and the price is 350.000", async (original) => {
    await card({ badge: null, priceVnd: 350_000, originalPriceVnd: original, originalPriceUsd: original ? 10 : null });

    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
    expect(document.querySelector(".line-through")).toBeNull();
  });

  it("shows no price details for a custom order, even with an old price", async () => {
    await card({ badge: "custom_order", originalPriceVnd: 450_000, originalPriceUsd: 17.31 });

    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
  });

  it("shows prices in dollars in English", async () => {
    await card({ badge: null, priceUsd: 13.46 }, "en");

    expect(screen.getByText("$13.46")).toBeInTheDocument();
  });

  it("leaves out the place, the description and the material when there are none", async () => {
    await card({ badge: null, categoryTitle: null, subcategoryLabel: null, description: "", material: "" });

    expect(screen.queryByText(C("product.materialHint"))).not.toBeInTheDocument();
    expect(screen.queryByText("·")).not.toBeInTheDocument();
    expect(Array.from(screen.getByRole("article").querySelectorAll("p, span")).filter((el) => !el.textContent)).toEqual([]);
  });

  it("shows only the category when there is no sub-category", async () => {
    await card({ subcategoryLabel: null });

    expect(screen.getByText("Tops")).toBeInTheDocument();
  });

  it("shows the badge in words", async () => {
    await card({ badge: "new" });

    expect(screen.getByText(msg("common.productBadge.new"))).toBeInTheDocument();
  });

  it("has no thumbnails for one picture, and a thumbnail for each of several that changes the big picture", async () => {
    const one = await card({ images: ["/a.jpg"] });
    expect(screen.queryByRole("group", { name: C("product.gallery") })).not.toBeInTheDocument();
    one.unmount();

    await card({ images: ["/a.jpg", "/b.jpg", "/c.jpg"] });
    const group = screen.getByRole("group", { name: C("product.gallery") });
    const thumbs = within(group).getAllByRole("button");
    expect(thumbs.map((t) => t.getAttribute("aria-label"))).toEqual(["Xem ảnh 1", "Xem ảnh 2", "Xem ảnh 3"]);
    expect(thumbs[0]).toHaveAttribute("aria-pressed", "true");
    expect(decodeURIComponent(screen.getByAltText("Silk dress").getAttribute("src") ?? "")).toContain("/a.jpg");

    await userEvent.click(thumbs[2]);

    expect(decodeURIComponent(screen.getByAltText("Silk dress").getAttribute("src") ?? "")).toContain("/c.jpg");
    expect(thumbs[2]).toHaveAttribute("aria-pressed", "true");
    expect(thumbs[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("shows no picture when the product has none", async () => {
    await card({ images: [] });

    expect(screen.queryByAltText("Silk dress")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Silk dress" })).toBeInTheDocument();
  });
});
