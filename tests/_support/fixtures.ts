import type { CartItem } from "@/src/app/[locale]/(private)/cart/_common/types";
import type { OrderQuote } from "@/src/app/[locale]/(private)/checkout/_common/checkout";
import type { WishlistItem } from "@/src/app/[locale]/(private)/wishlist/_common/types";
import type { RootState } from "@/src/store";
import type { Product } from "@/src/types/product";

/* Sample data shared by the component tests. A test replaces only the fields it cares about. */

const STAMP = "2026-01-01T00:00:00.000Z";

export function product(over: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "dress",
    sku: "SKU-1",
    name: "Dress",
    priceVnd: 350_000,
    priceUsd: 13.46,
    originalPriceVnd: null,
    originalPriceUsd: null,
    images: ["/a.jpg"],
    category: { id: "c1", slug: "tops", title: "Tops", description: "", heroImage: null, priority: 1, createdAt: STAMP, updatedAt: STAMP },
    subcategory: { id: "s1", slug: "shirts", label: "Shirts", description: "", count: 1, createdAt: STAMP, updatedAt: STAMP },
    badge: null,
    status: "active",
    description: "",
    material: "",
    care: "",
    sizes: ["S", "M", "L"],
    colors: [
      { name: "Red", hex: "#f00" },
      { name: "Blue", hex: "#00f" },
    ],
    tags: [],
    ratingAverage: null,
    ratingCount: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...over,
  };
}

/** One priced cart line: the dress in size M, colour Red. */
export function cartLine(over: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    name: "Dress",
    priceVnd: 350_000,
    priceUsd: 13.46,
    lineTotalVnd: 350_000,
    lineTotalUsd: 13.46,
    image: "/a.jpg",
    size: "M",
    color: "Red",
    colorHex: "#f00",
    quantity: 1,
    category: "tops",
    subcategory: "shirts",
    badge: null,
    ...over,
  };
}

/** Starting state for `renderApp(ui, { store: { cart: cartState([...]) } })`. */
export function cartState(items: CartItem[] = [], over: Partial<RootState["cart"]> = {}): RootState["cart"] {
  return { items, deselectedKeys: [], pendingAddKeys: [], pendingSync: 0, isOpen: false, isSyncing: false, ...over };
}

/** The body the BE answers with for `GET /api/cart` and every cart write: the whole cart. */
export function serverCart(lines: CartItem[]) {
  return {
    data: {
      id: "cart-1",
      items: lines.map((line) => ({
        id: line.serverItemId ?? `si-${line.productId}-${line.size}-${line.color}`,
        productId: line.productId,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
        lineTotalVnd: line.lineTotalVnd ?? line.priceVnd * line.quantity,
        lineTotalUsd: line.lineTotalUsd ?? line.priceUsd * line.quantity,
        product: {
          name: line.name,
          priceVnd: line.priceVnd,
          priceUsd: line.priceUsd,
          badge: line.badge ?? null,
          images: [line.image],
          category: { slug: line.category },
          subcategory: { slug: line.subcategory },
          colors: [{ name: line.color, hex: line.colorHex }],
        },
      })),
    },
  };
}

/** What `POST /api/orders/quote` answers for one dress at the standard rate. */
export function quote(over: Partial<OrderQuote> = {}): OrderQuote {
  return {
    shippingMethod: "standard",
    subtotalVnd: 350_000,
    subtotalUsd: 13.46,
    shippingFeeVnd: 30_000,
    shippingFeeUsd: 1.15,
    totalVnd: 380_000,
    totalUsd: 14.61,
    freeShipping: false,
    freeShippingThresholdVnd: 1_000_000,
    freeShippingThresholdUsd: 38.46,
    ...over,
  };
}

export function wishlistItem(over: Partial<WishlistItem> = {}): WishlistItem {
  return { productId: "p1", name: "Dress", priceVnd: 350_000, priceUsd: 13.46, image: "/a.jpg", category: "tops", subcategory: "shirts", badge: null, addedAt: STAMP, ...over };
}

export function wishlistState(items: WishlistItem[] = [], over: Partial<RootState["wishlist"]> = {}): RootState["wishlist"] {
  return { items, isSyncing: false, ...over };
}

/** The body of `GET /api/wishlist`: one entry per saved product, oldest first as the BE keeps them. */
export function serverWishlist(items: WishlistItem[]) {
  return {
    data: items.map((item) => ({
      productId: item.productId,
      createdAt: item.addedAt,
      product: {
        id: item.productId,
        name: item.name,
        priceVnd: item.priceVnd,
        priceUsd: item.priceUsd,
        badge: item.badge ?? null,
        images: [item.image],
        category: { slug: item.category },
        subcategory: { slug: item.subcategory },
      },
    })),
  };
}
