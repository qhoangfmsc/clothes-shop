import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ProductCard from "@/src/app/[locale]/(public)/shop/_components/ProductCard";
import { selectIsWishlisted } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import type { Product } from "@/src/types/product";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { product, renderShop, type RenderShopOptions } from "./shop-kit";

/* One product card in the shop grid: what it shows, the heart, the bag button (specs/storefront/shop.md, flows SHP-10 to SHP-12E). */

const C = (key: string, locale: "vi" | "en" = "vi") => msg(`public.shop.components.productCard.${key}`, locale);
const A = (key: string) => msg(`shared.cart.productAction.${key}`);

async function card(item: Product = product(), options: RenderShopOptions = {}) {
  return renderShop(<ProductCard product={item} />, options);
}
/** The card draws its bag button by the window width: a phone gets the icon beside the heart, a desktop the text on the picture */
const setWidth = (width: number) => {
  window.innerWidth = width;
};
afterEach(() => setWidth(1024));
const heart = () => screen.getByRole("button", { name: new RegExp(`${C("addToWishlist")}|${C("removeFromWishlist")}`) });

describe("SHP-10 what a card shows", () => {
  it("shows the first picture with the product's name, the name, the price, and links to the product page", async () => {
    await card(product({ id: "p7", name: "Silk dress", images: ["/silk.jpg", "/other.jpg"], priceVnd: 350_000 }));

    const link = screen.getByRole("link", { name: /Silk dress/ });
    expect(link).toHaveAttribute("href", "/shop/tops/shirts/p7");
    expect(screen.getByAltText("Silk dress").getAttribute("src")).toContain(encodeURIComponent("/silk.jpg"));
    expect(screen.getByText("350.000 VNĐ")).toBeInTheDocument();
  });

  it("shows the price in dollars in English", async () => {
    await card(product({ priceUsd: 13.46 }), { locale: "en" });

    expect(screen.getByText("$13.46")).toBeInTheDocument();
  });

  it("shows the old price struck through next to the price when there is one", async () => {
    await card(product({ priceVnd: 350_000, originalPriceVnd: 450_000, originalPriceUsd: 17.31 }));

    expect(screen.getByText("450.000 VNĐ").className).toContain("line-through");
  });

  it("shows no old price when it is missing", async () => {
    await card(product({ originalPriceVnd: null }));

    expect(document.querySelector(".line-through")).toBeNull();
  });

  it("shows the badge in words, in its own style", async () => {
    await card(product({ badge: "new" }));

    expect(screen.getByText(msg("common.productBadge.new"))).toBeInTheDocument();
  });

  it("shows no badge for a product without one", async () => {
    const { container } = await card(product({ badge: null }));

    expect(screen.queryByText(msg("common.productBadge.new"))).not.toBeInTheDocument();
    expect(container.querySelector("span.uppercase")).toBeNull();
  });

  it("shows the rating once there is a review, and nothing before", async () => {
    const rated = await card(product({ ratingAverage: 4.5, ratingCount: 12 }));
    expect(screen.getByRole("img", { name: "Đánh giá 4,5 trên 5 sao từ 12 đánh giá" })).toBeInTheDocument();
    rated.unmount();

    await card(product({ ratingAverage: null, ratingCount: 0 }));
    expect(screen.queryByRole("img", { name: /\(/ })).not.toBeInTheDocument();
  });

  it("shows 'price on request' instead of a price for a custom-order product", async () => {
    await card(product({ badge: "custom_order", priceVnd: 350_000, originalPriceVnd: 450_000, originalPriceUsd: 17.31 }));

    expect(screen.getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
    expect(screen.queryByText("350.000 VNĐ")).not.toBeInTheDocument();
    expect(screen.queryByText("450.000 VNĐ")).not.toBeInTheDocument();
  });

  it("keeps the price of a sold-out product", async () => {
    await card(product({ badge: "sold_out" }));

    expect(screen.getByText("350.000 VNĐ")).toBeInTheDocument();
  });

  it("links to the shop itself when the product has no category to build a page address from", async () => {
    await card(product({ category: null as never }));

    expect(screen.getByRole("link", { name: /Dress/ })).toHaveAttribute("href", "/shop");
  });
});

describe("SHP-11 the heart", () => {
  it("asks a visitor to sign in first, saying why, and saves nothing yet", async () => {
    const { calls, store } = await card(product({ id: "p9" }), { as: "guest" });

    await userEvent.click(heart());

    expect(await screen.findByText(msg("shared.feedback.loginPrompt.subtitle.saveToWishlist"))).toBeInTheDocument();
    expect(selectIsWishlisted("p9")(store.getState())).toBe(false);
    expect(calls.wishlistAdds).toEqual([]);
  });

  it("saves the product for a signed-in shopper: the heart fills, the BE is told, and a toast links to the list", async () => {
    const { calls, store } = await card(product({ id: "p9", name: "Silk dress" }), { as: "user" });
    expect(heart()).toHaveAttribute("aria-label", C("addToWishlist"));

    await userEvent.click(heart());

    await waitFor(() => expect(heart()).toHaveAttribute("aria-label", C("removeFromWishlist")));
    expect(selectIsWishlisted("p9")(store.getState())).toBe(true);
    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p9"]));
    const toast = await screen.findByText(/Đã lưu Silk dress/);
    expect(within(toast.closest("div") as HTMLElement).getByRole("link", { name: "Xem danh sách yêu thích" })).toHaveAttribute("href", "/wishlist");
  });

  it("takes the product off the list on the second click, tells the BE and says so", async () => {
    const { calls, store } = await card(product({ id: "p9", name: "Silk dress" }), { as: "user" });
    await userEvent.click(heart());
    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p9"]));

    await userEvent.click(heart());

    await waitFor(() => expect(calls.wishlistRemoves).toEqual(["p9"]));
    expect(selectIsWishlisted("p9")(store.getState())).toBe(false);
    expect(await screen.findByText("Đã xóa Silk dress khỏi danh sách yêu thích")).toBeInTheDocument();
    expect(heart()).toHaveAttribute("aria-label", C("addToWishlist"));
  });

  it("shows a heart that is already filled for a product on the list", async () => {
    await card(product({ id: "p9" }), { as: "user", store: { wishlist: { items: [{ productId: "p9", name: "Dress", priceVnd: 1, priceUsd: 1, image: "/a.jpg", category: "tops", subcategory: "shirts", badge: null }], isLoading: false } } as never });

    expect(heart()).toHaveAttribute("aria-label", C("removeFromWishlist"));
  });

  it("keeps a click on the heart or the bag from reaching the product link around the card", async () => {
    setWidth(390);
    await card(product(), { as: "user" });
    let reached = 0;
    const count = () => void (reached += 1);
    document.body.addEventListener("click", count);

    const heartAllowed = fireEvent.click(heart());
    const bagAllowed = fireEvent.click(screen.getByRole("button", { name: A("addToBagAria") }));

    document.body.removeEventListener("click", count);
    expect(heartAllowed).toBe(false);
    expect(bagAllowed).toBe(false);
    expect(reached).toBe(0);
  });

  it("does not open the product page when the heart is clicked", async () => {
    await card(product(), { as: "user" });

    await userEvent.click(heart());

    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("reads in English in English", async () => {
    await card(product(), { as: "user", locale: "en" });

    expect(screen.getByRole("button", { name: C("addToWishlist", "en") })).toBeInTheDocument();
  });
});

describe("SHP-12 the bag button", () => {
  it("is an icon button next to the heart on a phone; it asks a visitor to sign in", async () => {
    setWidth(390);
    await card(product(), { as: "guest" });

    await userEvent.click(screen.getByRole("button", { name: A("addToBagAria") }));

    expect(await screen.findByText(msg("shared.feedback.loginPrompt.subtitle.addToBag"))).toBeInTheDocument();
  });

  it("opens the quick-add drawer for a signed-in shopper", async () => {
    setWidth(390);
    await card(product({ name: "Silk dress" }), { as: "user" });

    await userEvent.click(screen.getByRole("button", { name: A("addToBagAria") }));

    expect(await screen.findByRole("link", { name: "Silk dress" })).toHaveAttribute("href", "/shop/tops/shirts/p1");
  });

  it("is a text button on the picture on a desktop, and the icon button is not drawn", async () => {
    setWidth(1440);
    await card(product(), { as: "user" });

    expect(screen.getByRole("button", { name: A("addToBag") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: A("addToBagAria") })).not.toBeInTheDocument();
  });

  it("is disabled and says sold out for a sold-out product", async () => {
    setWidth(390);
    await card(product({ badge: "sold_out" }), { as: "user" });

    const buttons = screen.getAllByRole("button", { name: A("soldOutAria") });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toBeDisabled();
  });

  it("sends the shopper to the contact page with the product when it is a custom order, never opening the drawer", async () => {
    setWidth(390);
    await card(product({ id: "p5", badge: "custom_order" }), { as: "user" });

    await userEvent.click(screen.getByRole("button", { name: A("customOrderAria") }));

    expect(navigation.router.push).toHaveBeenCalledWith("/contact?product=p5");
    expect(screen.queryByRole("link", { name: "Dress" })).not.toBeInTheDocument();
  });
});

describe("SHP-12E the wishlist cannot be saved", () => {
  it("takes the heart back when the BE refuses the save", async () => {
    const { store, calls } = await card(product({ id: "p9" }), { as: "user", wishlistFails: 500 });

    await userEvent.click(heart());

    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p9"]));
    await waitFor(() => expect(selectIsWishlisted("p9")(store.getState())).toBe(false));
    expect(heart()).toHaveAttribute("aria-label", C("addToWishlist"));
  });
});
