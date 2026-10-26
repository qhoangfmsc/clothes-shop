import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CollectionDetailClient from "@/src/app/[locale]/(public)/collections/[slug]/_components/CollectionDetailClient";
import { selectIsWishlisted } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import type { Collection } from "@/src/types/collection";
import type { Product } from "@/src/types/product";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { collectionOf, product, renderCollections, type RenderCollectionsOptions } from "./collections-kit";

/* One collection: hero, lookbook, quote and the grid of its products (specs/storefront/collections.md, flows COL-9 to COL-14E). */

const D = (key: string, locale: "vi" | "en" = "vi") => msg(`public.collections.detail.${key}`, locale);
const items = (n: number, over: Partial<Product> = {}) => Array.from({ length: n }, (_, i) => product({ id: `p${i + 1}`, name: `Item ${i + 1}`, description: `About item ${i + 1}`, images: [`/p${i + 1}.jpg`], priceVnd: 100_000 * (i + 1), priceUsd: 5 * (i + 1), ...over }));

async function detail(products: Product[] = items(4), options: RenderCollectionsOptions & { collection?: Collection } = {}) {
  const { collection = collectionOf({ name: "Spring", season: "SS26", subtitle: "Light and warm", description: "Soft layers", image: "/spring.jpg" }), ...rest } = options;
  return renderCollections(
    <main>
      <CollectionDetailClient collection={collection} products={products} />
    </main>,
    rest
  );
}
const lookbook = () => Array.from(document.querySelectorAll(".cd-editorial__item")) as HTMLElement[];
const cards = () => Array.from(document.querySelectorAll(".cd-shop-card")) as HTMLElement[];
const heartOf = (card: HTMLElement) => within(card).getByRole("button", { name: new RegExp(`${D("addToWishlist")}|${D("removeFromWishlist")}`) });

describe("COL-9 the hero and the quote", () => {
  it("shows the cover with the collection's name, the season, the name as the heading, the subtitle and the description", async () => {
    await detail();

    expect(screen.getByRole("heading", { level: 1, name: "Spring" })).toBeInTheDocument();
    expect(screen.getByText("SS26")).toBeInTheDocument();
    expect(screen.getByText("Light and warm")).toBeInTheDocument();
    expect(decodeURIComponent(screen.getAllByAltText("Spring")[0].getAttribute("src") ?? "")).toContain("/spring.jpg");
    expect(screen.getByText(D("scroll"))).toBeInTheDocument();
  });

  it("quotes the description, signed with the season", async () => {
    await detail();

    expect(screen.getByText("“Soft layers”")).toBeInTheDocument();
    expect(screen.getByText("— DOOVAN, SS26")).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await detail(items(2), { locale: "en" });

    expect(screen.getByText(D("lookbook", "en"))).toBeInTheDocument();
    expect(screen.getAllByText(D("viewDetails", "en"))).toHaveLength(2);
  });
});

describe("COL-10 the lookbook", () => {
  it("features the first three products, each a link to its page with a badge, its place in the three, name, description and price", async () => {
    await detail(items(5, { badge: null }).map((p, i) => (i === 1 ? { ...p, badge: "new" as const } : p)));

    expect(lookbook()).toHaveLength(3);
    const second = lookbook()[1];
    expect(second).toHaveAttribute("href", "/shop/tops/shirts/p2");
    expect(within(second).getByText("02 / 03")).toBeInTheDocument();
    expect(within(second).getByText("Item 2")).toBeInTheDocument();
    expect(within(second).getByText("About item 2")).toBeInTheDocument();
    expect(within(second).getByText("200.000 VNĐ")).toBeInTheDocument();
    expect(within(second).getByText(msg("common.productBadge.new"))).toBeInTheDocument();
    expect(within(second).getByText(D("viewDetails"))).toBeInTheDocument();
    expect(within(lookbook()[0]).queryByText(msg("common.productBadge.new"))).not.toBeInTheDocument();
  });

  it("counts the pieces it has when there are fewer than three", async () => {
    await detail(items(2));

    expect(lookbook()).toHaveLength(2);
    expect(within(lookbook()[0]).getByText("01 / 02")).toBeInTheDocument();
  });

  it("shows no pieces, and keeps its heading, when the collection has no products", async () => {
    await detail([]);

    expect(lookbook()).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 2, name: D("curatedPieces") })).toBeInTheDocument();
  });

  it("shows the old price struck through, and 'price on request' for a custom order", async () => {
    await detail([product({ id: "p1", name: "Sale", originalPriceVnd: 450_000, originalPriceUsd: 17.31 }), product({ id: "p2", name: "Made to order", badge: "custom_order", originalPriceVnd: 450_000, originalPriceUsd: 17.31 })]);

    expect(within(lookbook()[0]).getByText("450.000 VNĐ").className).toContain("line-through");
    expect(within(lookbook()[1]).getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
    expect(within(lookbook()[1]).queryByText("450.000 VNĐ")).not.toBeInTheDocument();
  });

  it("shows prices in dollars in English", async () => {
    await detail(items(1), { locale: "en" });

    expect(within(lookbook()[0]).getByText("$5.00")).toBeInTheDocument();
  });

  it("turns the second piece around", async () => {
    await detail(items(3));

    const [a, b] = lookbook();
    expect(a.className).not.toContain("md:grid-cols-[2fr_3fr]");
    expect(b.className).toContain("md:grid-cols-[2fr_3fr]");
  });

  it("links a product without a category to the shop", async () => {
    await detail([product({ id: "p1", category: null as never })]);

    expect(lookbook()[0]).toHaveAttribute("href", "/shop");
  });
});

describe("COL-11 the grid of products", () => {
  it("names the collection, counts the pieces and shows every product as a link to its page with its picture, name and price", async () => {
    await detail(items(4));

    expect(screen.getByRole("heading", { level: 2, name: "Spring" })).toBeInTheDocument();
    expect(screen.getByText("4 sản phẩm")).toBeInTheDocument();
    expect(cards()).toHaveLength(4);
    const third = cards()[2];
    expect(third).toHaveAttribute("href", "/shop/tops/shirts/p3");
    expect(within(third).getByAltText("Item 3")).toBeInTheDocument();
    expect(within(third).getByText("Item 3")).toBeInTheDocument();
    expect(within(third).getByText("300.000 VNĐ")).toBeInTheDocument();
  });

  it("shows the badge, and 'price on request' for a custom order", async () => {
    await detail([product({ id: "p1", name: "New one", badge: "new" }), product({ id: "p2", name: "Made to order", badge: "custom_order" })]);

    expect(within(cards()[0]).getByText(msg("common.productBadge.new"))).toBeInTheDocument();
    expect(within(cards()[1]).getByText(msg("common.productBadge.custom_order"))).toBeInTheDocument();
    expect(within(cards()[1]).getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
  });

  it("shows no cards, and a count of zero, for a collection with no products", async () => {
    await detail([]);

    expect(cards()).toHaveLength(0);
    expect(screen.getByText("0 sản phẩm")).toBeInTheDocument();
  });

  it("links back to all the collections", async () => {
    await detail();

    expect(screen.getByRole("link", { name: D("allCollections") })).toHaveAttribute("href", "/collections");
    expect(screen.getByRole("link", { name: D("viewCollections") })).toHaveAttribute("href", "/collections");
  });
});

describe("COL-12 the heart on a card", () => {
  it("asks a visitor to sign in first, saying why, and saves nothing", async () => {
    const { calls, store } = await detail(items(2), { as: "guest" });

    await userEvent.click(heartOf(cards()[0]));

    expect(await screen.findByText(msg("shared.feedback.loginPrompt.subtitle.saveToWishlist"))).toBeInTheDocument();
    expect(selectIsWishlisted("p1")(store.getState())).toBe(false);
    expect(calls.wishlistAdds).toEqual([]);
    expect(heartOf(cards()[0])).toHaveAttribute("aria-label", D("addToWishlist"));
  });

  it("saves the product for a signed-in shopper: the heart fills, the BE is told, and a toast links to the list", async () => {
    const { calls, store } = await detail(items(2), { as: "user" });

    await userEvent.click(heartOf(cards()[1]));

    await waitFor(() => expect(heartOf(cards()[1])).toHaveAttribute("aria-label", D("removeFromWishlist")));
    expect(selectIsWishlisted("p2")(store.getState())).toBe(true);
    expect(selectIsWishlisted("p1")(store.getState())).toBe(false);
    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p2"]));
    const toast = await screen.findByText(/Đã lưu Item 2/);
    expect(within(toast.closest("div") as HTMLElement).getByRole("link", { name: "Xem danh sách yêu thích" })).toHaveAttribute("href", "/wishlist");
  });

  it("takes the product off on the second press, tells the BE and says so", async () => {
    const { calls, store } = await detail(items(2), { as: "user" });
    await userEvent.click(heartOf(cards()[0]));
    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p1"]));

    await userEvent.click(heartOf(cards()[0]));

    await waitFor(() => expect(calls.wishlistRemoves).toEqual(["p1"]));
    expect(selectIsWishlisted("p1")(store.getState())).toBe(false);
    expect(await screen.findByText("Đã xóa Item 1 khỏi danh sách yêu thích")).toBeInTheDocument();
  });

  it("shows a heart already filled for a product on the list", async () => {
    await detail(items(2), {
      as: "user",
      store: { wishlist: { items: [{ productId: "p2", name: "Item 2", priceVnd: 1, priceUsd: 1, image: "/a.jpg", category: "tops", subcategory: "shirts", badge: null, addedAt: "2026-01-01T00:00:00.000Z" }], isSyncing: false } },
    });

    expect(heartOf(cards()[1])).toHaveAttribute("aria-label", D("removeFromWishlist"));
    expect(heartOf(cards()[0])).toHaveAttribute("aria-label", D("addToWishlist"));
  });

  it("does not follow the card's link when pressed", async () => {
    await detail(items(1), { as: "user" });

    const notPrevented = fireEvent.click(heartOf(cards()[0]));

    expect(notPrevented).toBe(false);
  });

  it("takes the heart back when the BE refuses the save", async () => {
    const { store, calls } = await detail(items(1), { as: "user", wishlistFails: 500 });

    await userEvent.click(heartOf(cards()[0]));

    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p1"]));
    await waitFor(() => expect(selectIsWishlisted("p1")(store.getState())).toBe(false));
    expect(heartOf(cards()[0])).toHaveAttribute("aria-label", D("addToWishlist"));
  });
});

describe("COL-13 the bag buttons on a card", () => {
  const bag = (card: HTMLElement) => within(card).getAllByRole("button", { name: /^(Thêm vào giỏ hàng|Hết hàng|Đặt hàng thiết kế riêng)$/ });

  it("opens the quick-add drawer for the product, from the icon and from the text button, without following the link", async () => {
    await detail(items(2), { as: "user" });
    const [icon] = bag(cards()[1]);

    expect(fireEvent.click(icon)).toBe(false);

    expect(await screen.findByRole("button", { name: msg("shared.cart.quickAdd.close") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Item 2" })).toHaveAttribute("href", "/shop/tops/shirts/p2");
  });

  it("opens the drawer for a visitor too, who is asked to sign in when adding", async () => {
    await detail(items(1), { as: "guest" });

    await userEvent.click(bag(cards()[0])[0]);

    expect(await screen.findByRole("button", { name: msg("shared.cart.quickAdd.close") })).toBeInTheDocument();
  });

  it("switches the button off for a sold-out product", async () => {
    await detail([product({ id: "p1", badge: "sold_out" })]);

    expect(bag(cards()[0])[0]).toBeDisabled();
  });

  it("sends a custom order to the contact page with the product, and opens no drawer", async () => {
    await detail([product({ id: "p 1", badge: "custom_order" })]);

    await userEvent.click(bag(cards()[0])[0]);

    expect(navigation.router.push).toHaveBeenCalledWith("/contact?product=p%201");
    expect(screen.queryByRole("button", { name: msg("shared.cart.quickAdd.close") })).not.toBeInTheDocument();
  });
});
