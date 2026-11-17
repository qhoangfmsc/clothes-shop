import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewInPage, { generateMetadata } from "@/src/app/[locale]/(public)/new-in/page";
import NewInClient from "@/src/app/[locale]/(public)/new-in/_components/NewInClient";
import type { AppLocale } from "@/src/i18n/routing";
import type { Product } from "@/src/types/product";
import type { BannerItem } from "@/src/types/site-config";
import { intlServerModule } from "@/tests/_support/intl-server";
import { msg } from "@/tests/_support/messages";
import { product, products, renderShop, shopApi, type RenderShopOptions, type ShopApiOptions } from "../shop/shop-kit";

/* The new-in page: hero, ticker, two spotlights, the grid of new products and the newsletter box (specs/storefront/new-in.md, flows NI-1 to NI-8E). */

const N = (key: string, locale: "vi" | "en" = "vi") => msg(`public.newIn.${key}`, locale);
const decoded = (value: string | null) => decodeURIComponent(value ?? "");
const params = (locale: AppLocale) => ({ params: Promise.resolve({ locale }) });

async function client(items: Product[] = products(5), heroBanners: BannerItem[] = [], total = items.length, options: RenderShopOptions = {}) {
  return renderShop(
    <main>
      <NewInClient products={items} total={total} heroBanners={heroBanners} />
    </main>,
    options
  );
}
const spotlights = () => Array.from(document.querySelectorAll("[data-ni-spotlight-info]")).map((info) => info.closest("section") as HTMLElement);

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

describe("NI-1 the page the server builds", () => {
  const api: ShopApiOptions = { pages: [{ data: products(3, 1, { badge: "new" }), total: 40 }], banners: [{ image: "/new-hero.jpg" }] };
  const show = async (options: ShopApiOptions = api, locale: AppLocale = "vi") => {
    const calls = shopApi(options);
    const page = await NewInPage(params(locale));
    return renderShop(<>{page}</>, { calls, locale });
  };

  it("asks the API for the first 25 products with the 'new' badge and for the hero banners", async () => {
    const view = await show();

    expect(Object.fromEntries(view.calls.products[0])).toEqual({ badge: "new", limit: "25" });
    expect(view.calls.banners).toEqual(["NEW_IN_HERO_BANNERS"]);
  });

  it("shows the hero, the products and their total", async () => {
    const view = await show();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${N("hero.titleLine1")}${N("hero.titleLine2")}`);
    expect(decoded(view.container.querySelector("[data-ni-hero-image] img")!.getAttribute("src"))).toContain("/new-hero.jpg");
    expect(screen.getByText("40 sản phẩm")).toBeInTheDocument();
  });

  it("still renders when the banners cannot be read", async () => {
    const view = await show({ ...api, banners: 500 });

    expect(view.container.querySelector("[data-ni-hero-image] img")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("fails (so the error page shows) when the products cannot be read", async () => {
    shopApi({ ...api, answer: () => 500 });

    await expect(NewInPage(params("vi"))).rejects.toThrow("/api/products");
  });

  it("tells the framework which language it renders", async () => {
    shopApi(api);
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await NewInPage(params("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("has a title with the brand, a description, language alternates and a share card", async () => {
    const meta = await generateMetadata(params("vi"));

    expect(meta.title).toBe(`${N("meta.title")} — DOOVAN`);
    expect(meta.description).toBe(N("meta.description"));
    expect(meta.alternates).toMatchObject({ canonical: "/vi/new-in", languages: { vi: "/vi/new-in", en: "/en/new-in", "x-default": "/vi/new-in" } });
    expect(meta.openGraph).toMatchObject({ url: "/vi/new-in", title: meta.title });
  });
});

describe("NI-2 the hero", () => {
  it("says what is on, names the page, invites to the drops and has the watermark", async () => {
    await client();

    expect(screen.getByText(N("hero.live"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${N("hero.titleLine1")}${N("hero.titleLine2")}`);
    expect(screen.getByText(N("hero.subtitle"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: N("hero.cta") })).toHaveAttribute("href", "#new-drops");
    expect(screen.getByText(N("hero.watermark"))).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await client(products(1), [], 1, { locale: "en" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${N("hero.titleLine1", "en")}${N("hero.titleLine2", "en")}`);
  });

  it("has a plain background and no picture without a banner", async () => {
    const { container } = await client(products(1), []);

    expect(container.querySelector("[data-ni-hero-image] img")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Đến mục/ })).not.toBeInTheDocument();
  });

  it("shows the one banner there is, named, without dots", async () => {
    const { container } = await client(products(1), [{ image: "/one.jpg" }]);

    const img = container.querySelector("[data-ni-hero-image] img")!;
    expect(decoded(img.getAttribute("src"))).toContain("/one.jpg");
    expect(img).toHaveAttribute("alt", N("hero.alt"));
    expect(screen.queryByRole("button", { name: /^Đến mục/ })).not.toBeInTheDocument();
  });

  it("shows a dot for each of several banners and fades to the one that is picked", async () => {
    const { container } = await client(products(1), [{ image: "/one.jpg" }, { image: "/two.jpg" }]);
    const dots = screen.getAllByRole("button", { name: /^Đến mục/ });
    expect(dots).toHaveLength(2);

    await userEvent.click(dots[1]);

    await waitFor(() => expect(Array.from(container.querySelectorAll("[data-ni-hero-image] img")).some((img) => decoded(img.getAttribute("src")).includes("/two.jpg"))).toBe(true));
    expect(screen.getAllByRole("button", { name: /^Đến mục/ })[1]).toHaveAttribute("aria-current", "true");
  });

  it("glides to the grid when the invitation is pressed, instead of jumping", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await client();

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: N("hero.cta") }));

    expect(notPrevented).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("new-drops"));
  });

  it("lets the address change as usual when there is no grid to glide to", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { container } = await client();
    container.querySelector("#new-drops")!.removeAttribute("id");

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: N("hero.cta") }));

    expect(notPrevented).toBe(true);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("NI-2 leaving the page", () => {
  it("lets go of every scroll effect of the hero and the spotlights", async () => {
    const view = await client();
    expect(ScrollTrigger.getAll().length).toBeGreaterThan(0);

    view.unmount();

    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});

describe("NI-3 the ticker", () => {
  it("runs the three phrases, twice over", async () => {
    await client();

    for (const key of ["ticker.newDrop", "ticker.limited", "ticker.handcrafted"]) expect(screen.getAllByText(N(key))).toHaveLength(2);
  });
});

describe("NI-4 the spotlights", () => {
  it("features the first two products, each with a tag, name, description, price, picture and a link in", async () => {
    await client(products(5, 1, { description: "Soft cotton", priceVnd: 350_000 }));

    const [first, second] = spotlights();
    expect(spotlights()).toHaveLength(2);
    expect(within(first).getByText(N("spotlight.editorsPick"))).toBeInTheDocument();
    expect(within(first).getByRole("heading", { level: 2, name: "Item 01" })).toBeInTheDocument();
    expect(within(first).getByText("Soft cotton")).toBeInTheDocument();
    expect(within(first).getByText("350.000 VNĐ")).toBeInTheDocument();
    expect(decoded(within(first).getByAltText("Item 01").getAttribute("src"))).toContain("/a.jpg");
    expect(within(first).getByRole("link", { name: N("spotlight.shopNow") })).toHaveAttribute("href", "/shop/tops/shirts/p1");
    expect(within(second).getByText(N("spotlight.mostWanted"))).toBeInTheDocument();
    expect(within(second).getByRole("heading", { level: 2, name: "Item 02" })).toBeInTheDocument();
    expect(within(second).getByRole("link", { name: N("spotlight.shopNow") })).toHaveAttribute("href", "/shop/tops/shirts/p2");
  });

  it("gives each its own tint, and turns the second around", async () => {
    await client();

    const [first, second] = spotlights();
    expect(first.style.background).toBe("var(--bg-section-2)");
    expect(second.style.background).toBe("var(--bg-section-5)");
    expect(first.className).not.toContain("lg:flex-row-reverse");
    expect(second.className).toContain("lg:flex-row-reverse");
  });

  it("features only one when there is one product, and none for none", async () => {
    const one = await client(products(1));
    expect(spotlights()).toHaveLength(1);
    one.unmount();

    await client([]);
    expect(spotlights()).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("shows 'price on request' for a custom order", async () => {
    await client([product({ id: "p1", name: "Made to order", badge: "custom_order" })]);

    expect(within(spotlights()[0]).getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
    expect(within(spotlights()[0]).queryByText("350.000 VNĐ")).not.toBeInTheDocument();
  });

  it("shows prices in dollars in English", async () => {
    await client([product({ id: "p1", priceUsd: 13.46 })], [], 1, { locale: "en" });

    expect(within(spotlights()[0]).getByText("$13.46")).toBeInTheDocument();
  });

  it("links a product without a category to the shop", async () => {
    await client([product({ id: "p1", category: null as never })]);

    expect(within(spotlights()[0]).getByRole("link", { name: N("spotlight.shopNow") })).toHaveAttribute("href", "/shop");
  });
});

describe("NI-5 the grid of new products", () => {
  it("shows the heading, every product and the total of the BE", async () => {
    await client(products(3), [], 40);

    const grid = document.getElementById("new-drops")!;
    expect(within(grid).getByText(N("grid.label"))).toBeInTheDocument();
    expect(within(grid).getByRole("heading", { level: 2, name: N("grid.title") })).toBeInTheDocument();
    expect(within(grid).getByText("40 sản phẩm")).toBeInTheDocument();
    expect(within(grid).getByText("Item 03")).toBeInTheDocument();
  });

  it("asks for the next page of the 'new' ones, and only those, when more are wanted", async () => {
    const view = await client(products(3), [], 30, { pages: [{ data: products(3), total: 30 }, { data: products(3, 4), total: 30 }] });

    await userEvent.click(screen.getByRole("button", { name: msg("public.shop.components.productsClient.loadMore") }));

    await waitFor(() => expect(view.calls.products).toHaveLength(1));
    expect(Object.fromEntries(view.calls.products[0])).toMatchObject({ badge: "new", page: "2" });
    expect(await screen.findByText("Item 04")).toBeInTheDocument();
  });
});

describe("NI-6 the newsletter box", () => {
  it("invites with a title, a line, an email field with a name and a join button", async () => {
    await client();

    expect(screen.getByRole("heading", { level: 2, name: N("newsletter.title") })).toBeInTheDocument();
    expect(screen.getByText(N("newsletter.description"))).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: N("newsletter.emailAria") })).toHaveAttribute("type", "email");
    expect(screen.getByRole("textbox", { name: N("newsletter.emailAria") })).toHaveAttribute("placeholder", N("newsletter.placeholder"));
    expect(screen.getByRole("button", { name: N("newsletter.join") })).toHaveAttribute("type", "submit");
  });

  it("sends nothing anywhere when submitted: the page stays, and so does what was typed", async () => {
    const view = await client();
    const email = screen.getByRole("textbox", { name: N("newsletter.emailAria") });
    await userEvent.type(email, "mai@example.com");

    const notPrevented = fireEvent.submit(email.closest("form")!);

    expect(notPrevented).toBe(false);
    expect(email).toHaveValue("mai@example.com");
    expect(view.calls.products).toEqual([]);
  });
});
