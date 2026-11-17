import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { track } from "@vercel/analytics";
import { afterEach, describe, expect, it, vi } from "vitest";
import { selectIsWishlisted } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import ProductDetailClient from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/ProductDetailClient";
import type { Product } from "@/src/types/product";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { product, renderDetail, type RenderDetailOptions } from "./detail-kit";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

/* What a shopper does on a product: look, choose, bag it, save it, share it, ask for a custom order (specs/storefront/product-detail.md, flows PD-4 to PD-11E). */

const D = (key: string, locale: "vi" | "en" = "vi") => msg(`public.product.detail.${key}`, locale);
const FEEDBACK = (key: string) => msg(`shared.feedback.loginPrompt.subtitle.${key}`);

async function page(item: Product = product(), options: RenderDetailOptions & { related?: Product[] } = {}) {
  const { related = [], ...rest } = options;
  return renderDetail(<ProductDetailClient product={item} categoryTitle="Tops" subcategoryLabel="Shirts" relatedProducts={related} />, rest);
}

const size = (name: string) => screen.getByRole("button", { name });
const colour = (name: string, locale: "vi" | "en" = "vi") => screen.getByRole("button", { name: D("selectColor", locale).replace("{name}", name) });
const addButton = (locale: "vi" | "en" = "vi") => screen.getByRole("button", { name: new RegExp(`^(${["addToBag", "addedToBag", "soldOut", "customOrder"].map((key) => D(key, locale)).join("|")})$`) });
const heart = () => screen.getByRole("button", { name: new RegExp(`${D("addToWishlist")}|${D("removeFromWishlist")}`) });
const more = () => screen.getByRole("button", { name: D("increase") });
const less = () => screen.getByRole("button", { name: D("decrease") });

async function choose(sizeName = "M", colourName = "Red", locale: "vi" | "en" = "vi") {
  await userEvent.click(size(sizeName));
  await userEvent.click(colour(colourName, locale));
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("PD-4 what the page shows", () => {
  it("shows the name, the price, the description, the sizes and the colours, and the details", async () => {
    await page(product({ name: "Silk dress", description: "Made of silk", material: "Silk", care: "Hand wash", priceVnd: 350_000 }));

    expect(screen.getByRole("heading", { level: 1, name: "Silk dress" })).toBeInTheDocument();
    expect(screen.getByText("350.000 VNĐ")).toBeInTheDocument();
    expect(screen.getByText("Made of silk")).toBeInTheDocument();
    for (const s of ["S", "M", "L"]) expect(size(s)).toBeInTheDocument();
    expect(colour("Red")).toHaveAttribute("title", "Red");
    expect(within(colour("Blue")).getByText("", { selector: "span" })).toHaveStyle({ background: "#00f" });
    expect(screen.getByText(D("material")).nextSibling).toHaveTextContent("Silk");
    expect(screen.getByText(D("care")).nextSibling).toHaveTextContent("Hand wash");
    expect(screen.getByText(D("category")).nextSibling).toHaveTextContent("Tops — Shirts");
  });

  it("links the breadcrumb to the shop, the category and the sub-category", async () => {
    await page();

    expect(screen.getByRole("link", { name: msg("shared.header.nav.shop") })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Tops" })).toHaveAttribute("href", "/shop/tops");
    expect(screen.getByRole("link", { name: "Shirts" })).toHaveAttribute("href", "/shop/tops/shirts");
  });

  it("shows prices in dollars in English", async () => {
    await page(product({ priceUsd: 13.46, originalPriceVnd: 450_000, originalPriceUsd: 17.31 }), { locale: "en" });

    expect(screen.getByText("$13.46")).toBeInTheDocument();
    expect(screen.getByText("$17.31").className).toContain("line-through");
  });

  it("shows the old price struck through when there is one, and none when there is not", async () => {
    const { unmount } = await page(product({ originalPriceVnd: 450_000, originalPriceUsd: 17.31 }));
    expect(screen.getByText("450.000 VNĐ").className).toContain("line-through");
    unmount();

    await page(product({ originalPriceVnd: null }));
    expect(document.querySelector(".line-through")).toBeNull();
  });

  it("asks for the reviews of this product", async () => {
    const { calls } = await page(product({ id: "p7" }));

    await waitFor(() => expect(calls.summaryFor).toEqual(["p7"]));
  });

  it("shows the badge in words", async () => {
    await page(product({ badge: "new" }));

    expect(screen.getByText(D("badge.new"))).toBeInTheDocument();
  });

  it("shows no badge for a product without one", async () => {
    await page(product({ badge: null }));

    expect(screen.queryByText(D("badge.new"))).not.toBeInTheDocument();
    expect(screen.queryByText(D("badge.sale"))).not.toBeInTheDocument();
  });

  it("shows the rating under the name as a link to the reviews, which asks the reviews to open", async () => {
    await page(product({ ratingAverage: 4.5, ratingCount: 12 }));
    const opened = vi.fn();
    window.addEventListener("reviews:open", opened);

    const link = screen.getByRole("link", { name: /12/ });
    expect(link).toHaveAttribute("href", "#reviews");
    fireEvent.click(link);

    expect(opened).toHaveBeenCalledTimes(1);
    window.removeEventListener("reviews:open", opened);
  });

  it("shows no rating for a product nobody has reviewed", async () => {
    await page(product({ ratingAverage: null, ratingCount: 0 }));

    expect(document.querySelector('a[href="#reviews"]')).toBeNull();
  });

  it("shows no rating when the count is zero even if an average is sent", async () => {
    await page(product({ ratingAverage: 4.5, ratingCount: 0 }));

    expect(document.querySelector('a[href="#reviews"]')).toBeNull();
  });
});

describe("PD-5 choosing a size, a colour and a quantity", () => {
  it("asks for both first, then for what is still missing", async () => {
    await page();
    expect(screen.getByText(D("hintBoth"))).toBeInTheDocument();

    await userEvent.click(size("M"));
    expect(screen.getByText(D("hintColor"))).toBeInTheDocument();
  });

  it("asks for the size when only the colour is chosen", async () => {
    await page();

    await userEvent.click(colour("Red"));

    expect(screen.getByText(D("hintSize"))).toBeInTheDocument();
  });

  it("keeps the bag button off until both are chosen, then turns it on and drops the hint", async () => {
    await page();
    expect(addButton()).toBeDisabled();

    await userEvent.click(size("M"));
    expect(addButton()).toBeDisabled();
    await userEvent.click(colour("Red"));

    expect(addButton()).toBeEnabled();
    expect(screen.queryByText(D("hintBoth"))).not.toBeInTheDocument();
    expect(screen.queryByText(D("hintColor"))).not.toBeInTheDocument();
  });

  it("names the chosen size and colour next to their titles", async () => {
    await page();

    await choose("L", "Blue");

    expect(screen.getByText("— L")).toBeInTheDocument();
    expect(screen.getByText("— Blue")).toBeInTheDocument();
  });

  it("changes the choice when another size is tapped", async () => {
    await page();
    await userEvent.click(size("S"));

    await userEvent.click(size("L"));

    expect(screen.getByText("— L")).toBeInTheDocument();
    expect(screen.queryByText("— S")).not.toBeInTheDocument();
  });

  it("starts at one, counts up to ten and down to one, with each end switched off", async () => {
    await page();
    expect(less()).toBeDisabled();

    for (let i = 0; i < 12; i += 1) if (!more().hasAttribute("disabled")) await userEvent.click(more());
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(more()).toBeDisabled();
    expect(less()).toBeEnabled();

    await userEvent.click(less());
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(more()).toBeEnabled();
  });

  it("shows no colour choice for a product without colours, but still needs a size", async () => {
    await page(product({ colors: [] }));

    expect(screen.queryByText(D("color"))).not.toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });
});

describe("PD-6 putting it in the bag", () => {
  it("asks a visitor to sign in first, saying why, and puts nothing in the bag", async () => {
    const { store, calls } = await page(product(), { as: "guest" });
    await choose();

    await userEvent.click(addButton());

    expect(await screen.findByText(FEEDBACK("addToBag"))).toBeInTheDocument();
    expect(store.getState().cart.items).toEqual([]);
    expect(calls.cart).toEqual([]);
    expect(track).not.toHaveBeenCalledWith("add_to_cart", expect.anything());
  });

  it("puts the chosen size, colour and quantity in the bag at once, tells the BE and counts the event", async () => {
    const { store, calls } = await page(product({ id: "p1", name: "Silk dress", priceVnd: 350_000 }), { as: "user" });
    await choose("M", "Blue");
    await userEvent.click(more());
    await userEvent.click(more());

    await userEvent.click(addButton());

    await waitFor(() => expect(calls.cart).toHaveLength(1));
    expect(calls.cart[0]).toEqual({ productId: "p1", size: "M", color: "Blue", quantity: 3 });
    expect(store.getState().cart.items).toEqual([expect.objectContaining({ productId: "p1", name: "Silk dress", image: "/a.jpg", size: "M", color: "Blue", colorHex: "#00f", quantity: 3, category: "tops", subcategory: "shirts", priceVnd: 350_000 })]);
    expect(track).toHaveBeenCalledWith("add_to_cart", { productId: "p1", vnd: 350_000 });
  });

  it("counts the event in dollars on the English site", async () => {
    await page(product({ priceUsd: 13.46 }), { as: "user", locale: "en" });
    await choose("M", "Red", "en");

    await userEvent.click(addButton("en"));

    expect(track).toHaveBeenCalledWith("add_to_cart", { productId: "p1", usd: 13.46 });
  });

  it("says what was added in a toast with a link to the bag, and turns the button into 'added' for a moment", async () => {
    await page(product({ name: "Silk dress" }), { as: "user" });
    await choose("M", "Red");

    await userEvent.click(addButton());

    const toast = await screen.findByText(/Đã thêm Silk dress \(M, Red\)/);
    expect(within(toast.closest("div") as HTMLElement).getByRole("link", { name: "Xem giỏ hàng" })).toHaveAttribute("href", "/cart");
    expect(addButton()).toHaveTextContent(D("addedToBag"));
    await waitFor(() => expect(addButton()).toHaveTextContent(D("addToBag")), { timeout: 3500 });
  });

  it("puts the quantity in the toast when it is more than one", async () => {
    await page(product({ name: "Silk dress" }), { as: "user" });
    await choose("M", "Red");
    await userEvent.click(more());

    await userEvent.click(addButton());

    expect(await screen.findByText(/Đã thêm Silk dress \(M, Red, ×2\)/)).toBeInTheDocument();
  });

  it("adds nothing more while it says 'added'", async () => {
    const { calls, store } = await page(product(), { as: "user" });
    await choose();
    await userEvent.click(addButton());
    await waitFor(() => expect(calls.cart).toHaveLength(1));

    fireEvent.click(addButton());

    expect(store.getState().cart.items[0].quantity).toBe(1);
    expect(calls.cart).toHaveLength(1);
  });

  it("can be added again once the button is back", async () => {
    const { calls } = await page(product(), { as: "user" });
    await choose();
    await userEvent.click(addButton());
    await waitFor(() => expect(addButton()).toHaveTextContent(D("addToBag")), { timeout: 3500 });

    await userEvent.click(addButton());

    await waitFor(() => expect(calls.cart).toHaveLength(2));
  });
});

describe("PD-6E the BE does not take the bag line", () => {
  it("takes the line back out of the bag and tells the shopper it could not be added", async () => {
    const { store, calls } = await page(product(), { as: "user", cartFails: 500 });
    await choose();

    await userEvent.click(addButton());

    await waitFor(() => expect(calls.cart).toHaveLength(1));
    await waitFor(() => expect(store.getState().cart.items).toEqual([]));
    expect(await screen.findByText(D("addFailed"))).toBeInTheDocument();
  });
});

describe("PD-7 a sold-out product", () => {
  it("says so on a button that cannot be pressed, with a hint, and keeps the price", async () => {
    const { store, calls } = await page(product({ badge: "sold_out" }), { as: "user" });

    expect(addButton()).toHaveTextContent(D("soldOut"));
    expect(addButton()).toBeDisabled();
    expect(screen.getByText(D("soldOutHint"))).toBeInTheDocument();
    expect(screen.getByText("350.000 VNĐ")).toBeInTheDocument();
    fireEvent.click(addButton());
    expect(store.getState().cart.items).toEqual([]);
    expect(calls.cart).toEqual([]);
  });

  it("still lets the shopper save it for later", async () => {
    const { calls } = await page(product({ badge: "sold_out" }), { as: "user" });

    await userEvent.click(heart());

    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p1"]));
  });
});

describe("PD-8 a custom-order product", () => {
  const custom = () => product({ badge: "custom_order", material: "Silk", care: "Hand wash" });

  it("has no size, colour or quantity to choose, and no size guide", async () => {
    await page(custom());

    expect(screen.queryByText(D("size"))).not.toBeInTheDocument();
    expect(screen.queryByText(D("color"))).not.toBeInTheDocument();
    expect(screen.queryByText(D("quantity"))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: D("sizeGuide") })).not.toBeInTheDocument();
  });

  it("shows 'price on request' instead of a price", async () => {
    await page(custom());

    expect(screen.getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
    expect(screen.queryByText("350.000 VNĐ")).not.toBeInTheDocument();
  });

  it("calls the material the original design's material and has no care line", async () => {
    await page(custom());

    expect(screen.getByText(D("materialCustomOrder")).nextSibling).toHaveTextContent("Silk");
    expect(screen.queryByText(D("material"))).not.toBeInTheDocument();
    expect(screen.queryByText("Hand wash")).not.toBeInTheDocument();
  });

  it("offers one button, to the contact page with this product, whoever is looking, and a hint", async () => {
    await page(product({ id: "p 1", badge: "custom_order" }), { as: "guest" });

    expect(screen.getByText(D("customOrderHint"))).toBeInTheDocument();
    await userEvent.click(addButton());

    expect(addButton()).toHaveTextContent(D("customOrder"));
    expect(navigation.router.push).toHaveBeenCalledWith("/contact?product=p%201");
  });

  it("shows no old price either", async () => {
    await page(product({ badge: "custom_order", originalPriceVnd: 450_000, originalPriceUsd: 17.31 }));

    expect(screen.queryByText("450.000 VNĐ")).not.toBeInTheDocument();
  });

  it("puts nothing in the bag", async () => {
    const { store } = await page(custom(), { as: "user" });

    await userEvent.click(addButton());

    expect(store.getState().cart.items).toEqual([]);
  });
});

describe("PD-9 the heart", () => {
  it("asks a visitor to sign in first, saying why, and saves nothing yet", async () => {
    const { calls, store } = await page(product({ id: "p9" }), { as: "guest" });

    await userEvent.click(heart());

    expect(await screen.findByText(FEEDBACK("saveToWishlist"))).toBeInTheDocument();
    expect(selectIsWishlisted("p9")(store.getState())).toBe(false);
    expect(calls.wishlistAdds).toEqual([]);
  });

  it("saves the product for a signed-in shopper: the heart fills, the BE is told, and a toast links to the list", async () => {
    const { calls, store } = await page(product({ id: "p9", name: "Silk dress" }), { as: "user" });
    expect(heart()).toHaveAttribute("aria-label", D("addToWishlist"));

    await userEvent.click(heart());

    await waitFor(() => expect(heart()).toHaveAttribute("aria-label", D("removeFromWishlist")));
    expect(selectIsWishlisted("p9")(store.getState())).toBe(true);
    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p9"]));
    const toast = await screen.findByText(/Đã lưu Silk dress/);
    expect(within(toast.closest("div") as HTMLElement).getByRole("link", { name: "Xem danh sách yêu thích" })).toHaveAttribute("href", "/wishlist");
  });

  it("takes the product off the list on the second click, tells the BE and says so", async () => {
    const { calls, store } = await page(product({ id: "p9", name: "Silk dress" }), { as: "user" });
    await userEvent.click(heart());
    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p9"]));

    await userEvent.click(heart());

    await waitFor(() => expect(calls.wishlistRemoves).toEqual(["p9"]));
    expect(selectIsWishlisted("p9")(store.getState())).toBe(false);
    expect(await screen.findByText("Đã xóa Silk dress khỏi danh sách yêu thích")).toBeInTheDocument();
  });

  it("shows a heart already filled for a product on the list", async () => {
    await page(product({ id: "p9" }), {
      as: "user",
      store: { wishlist: { items: [{ productId: "p9", name: "Dress", priceVnd: 1, priceUsd: 1, image: "/a.jpg", category: "tops", subcategory: "shirts", badge: null }], isLoading: false } } as never,
    });

    expect(heart()).toHaveAttribute("aria-label", D("removeFromWishlist"));
  });

  it("takes the heart back when the BE refuses the save", async () => {
    const { store, calls } = await page(product({ id: "p9" }), { as: "user", wishlistFails: 500 });

    await userEvent.click(heart());

    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p9"]));
    await waitFor(() => expect(selectIsWishlisted("p9")(store.getState())).toBe(false));
  });
});

describe("PD-10 sharing", () => {
  const SHARE = (locale: "vi" | "en" = "vi") => screen.getByRole("button", { name: D("share", locale) });

  it("hands the name, a line of text and the address of the page in this language to the phone's own share sheet", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    await page(product({ name: "Silk dress" }));

    await userEvent.click(SHARE());

    expect(share).toHaveBeenCalledWith({ title: "Silk dress", text: "Xem Silk dress từ DOOVAN", url: `${window.location.origin}/vi/shop/tops/shirts/p1` });
  });

  it("uses the English address and words on the English site", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    await page(product({ name: "Silk dress" }), { locale: "en" });

    await userEvent.click(SHARE("en"));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: `${window.location.origin}/en/shop/tops/shirts/p1`, text: msg("public.product.detail.shareText", "en").replace("{name}", "Silk dress") }));
  });

  it("copies the address and says so when there is no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await page();

    await userEvent.click(SHARE());

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/vi/shop/tops/shirts/p1`);
    expect(await screen.findByText(D("linkCopied"))).toBeInTheDocument();
  });

  it("says nothing when the shopper closes the share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    await page();

    await userEvent.click(SHARE());

    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(screen.queryByText(D("linkCopied"))).not.toBeInTheDocument();
  });

  it("says nothing, and breaks nothing, when the address cannot be copied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await page();

    await userEvent.click(SHARE());

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByText(D("linkCopied"))).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("shares the shop address for a product without a category", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await page(product({ category: null as never, subcategory: null as never }));

    await userEvent.click(SHARE());

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/vi/shop`);
  });
});

describe("PD-11 counting the visit", () => {
  it("counts one view of the product, with its price", async () => {
    await page(product({ id: "p7", priceVnd: 350_000 }));

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("view_product", { productId: "p7", vnd: 350_000 });
  });

  it("counts the price in dollars on the English site", async () => {
    await page(product({ priceUsd: 13.46 }), { locale: "en" });

    expect(track).toHaveBeenCalledWith("view_product", { productId: "p1", usd: 13.46 });
  });

  it("does not count again when the page redraws, but counts the next product", async () => {
    const view = await page(product({ id: "p7" }));
    const next = (item: Product) => <ProductDetailClient product={item} categoryTitle="Tops" subcategoryLabel="Shirts" relatedProducts={[]} />;

    view.rerender(next(product({ id: "p7" })));
    expect(track).toHaveBeenCalledTimes(1);
    view.rerender(next(product({ id: "p8" })));

    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith("view_product", { productId: "p8", vnd: 350_000 });
  });
});

describe("PD-12 related products", () => {
  const related = (n: number) => Array.from({ length: n }, (_, i) => product({ id: `r${i + 1}`, name: `Related ${i + 1}`, images: [`/r${i + 1}.jpg`], priceVnd: 100_000 * (i + 1) }));

  it("shows each as a link to its own page, with its name and price, under a heading", async () => {
    await page(product(), { related: related(3) });

    expect(screen.getByRole("heading", { level: 2, name: D("related.title") })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Related 2/ });
    expect(link).toHaveAttribute("href", "/shop/tops/shirts/r2");
    expect(within(link).getByText("200.000 VNĐ")).toBeInTheDocument();
  });

  it("shows nothing at all when there are none", async () => {
    await page(product(), { related: [] });

    expect(screen.queryByText(D("related.label"))).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: D("related.title") })).not.toBeInTheDocument();
  });

  it("keeps the fifth for wide screens, so that the row is never uneven", async () => {
    await page(product(), { related: related(5) });

    expect(screen.getByRole("link", { name: /Related 4/ }).className).not.toContain("hidden");
    expect(screen.getByRole("link", { name: /Related 5/ }).className).toContain("hidden lg:flex");
  });

  it("shows 'price on request' for a related custom-order product, and its price for the others", async () => {
    await page(product(), { related: [product({ id: "r1", name: "Made to order", badge: "custom_order" }), product({ id: "r2", name: "Ready", priceVnd: 90_000 })] });

    expect(within(screen.getByRole("link", { name: /Made to order/ })).getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /Ready/ })).getByText("90.000 VNĐ")).toBeInTheDocument();
  });

  it("links a related product that has no category to the shop", async () => {
    await page(product(), { related: [product({ id: "r1", name: "Loose", category: null as never })] });

    expect(screen.getByRole("link", { name: /Loose/ })).toHaveAttribute("href", "/shop");
  });
});
