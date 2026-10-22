import type { CartItem } from "@/src/app/[locale]/(private)/cart/_common/types";
import type { OrderQuote } from "@/src/app/[locale]/(private)/checkout/_common/checkout";
import type { PaymentSession } from "@/src/app/[locale]/(private)/checkout/_common/payment";
import type { WishlistItem } from "@/src/app/[locale]/(private)/wishlist/_common/types";
import type { RootState } from "@/src/store";
import type { Order, OrderItem } from "@/src/app/[locale]/(private)/orders/_common/types";
import type { ReturnEligibility, ReturnRequest } from "@/src/app/[locale]/(private)/returns/_common/types";
import type { Product, ProductSummary } from "@/src/types/product";
import type { PendingReviewItem } from "@/src/types/review";
import type { ShippingInfo } from "@/src/types/shipping";

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

/** What `GET /api/shipping` answers: the three methods the BE accepts, with the store's own wording. */
export function shippingInfo(over: Partial<ShippingInfo> = {}): ShippingInfo {
  return {
    methods: [
      { id: "standard", name: "Giao tiêu chuẩn", description: "", estimatedDays: "3-5 ngày", priceVnd: 30_000, priceUsd: 1.15, icon: "truck" },
      { id: "express", name: "Giao nhanh", description: "", estimatedDays: "1-2 ngày", priceVnd: 60_000, priceUsd: 2.31, icon: "express" },
      { id: "store-pickup", name: "Nhận tại cửa hàng", description: "", estimatedDays: "Trong ngày", priceVnd: 0, priceUsd: 0, icon: "store" },
    ],
    returnPolicy: { days: 7, description: "", conditions: [] },
    freeShippingThresholdVnd: 1_000_000,
    freeShippingThresholdUsd: 38.46,
    ...over,
  };
}

/** A VietQR session as `POST /api/payments/qr` answers, waiting for the transfer and valid for a long time. */
export function paymentSession(over: Partial<PaymentSession> = {}): PaymentSession {
  return {
    orderId: "o1",
    paymentId: "pay-1",
    qrUrl: "https://img.vietqr.io/image/qr.png",
    amountVnd: 380_000,
    amountUsd: 14.61,
    bankName: "Vietcombank",
    accountNumber: "0123456789",
    accountName: "DOOVAN CO",
    transferContent: "DOOVAN O1 AAA111",
    status: "PENDING",
    expiresAt: "2099-01-01T00:00:00.000Z",
    ...over,
  };
}

/** The short product nested in order lines and reviews. */
export function productSummary(over: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "p1",
    name: "Dress",
    slug: "dress",
    image: "/a.jpg",
    badge: null,
    category: { id: "c1", slug: "tops", title: "Tops" },
    subcategory: { id: "s1", slug: "shirts", label: "Shirts" },
    ...over,
  };
}

/** One line of an order: the dress, size M, colour Red, one piece. */
export function orderItem(over: Partial<OrderItem> = {}): OrderItem {
  return { id: "oi-1", productId: "p1", productName: "Dress", productImage: "/a.jpg", product: productSummary(), quantity: 1, priceVnd: 350_000, priceUsd: 13.46, size: "M", color: "Red", createdAt: STAMP, ...over };
}

/** An order as `GET /api/orders/:id` answers: pending, not paid yet, one line, standard delivery. */
export function order(over: Partial<Order> = {}): Order {
  return {
    id: "o-1",
    status: "pending",
    paymentStatus: "unpaid",
    paidAt: null,
    deliveredAt: null,
    paymentAttempts: [],
    refunds: [],
    subtotalVnd: 350_000,
    subtotalUsd: 13.46,
    shippingFeeVnd: 30_000,
    shippingFeeUsd: 1.15,
    totalVnd: 380_000,
    totalUsd: 14.61,
    shippingMethod: "standard",
    shippingAddress: { fullName: "Mai", phone: "0901234567", addressLine1: "1 Le Loi", city: "Ho Chi Minh", country: "Vietnam" },
    note: "",
    createdAt: "2026-03-05T05:00:00.000Z",
    updatedAt: "2026-03-05T05:00:00.000Z",
    items: [orderItem()],
    ...over,
  };
}

/** A line the customer can still review. */
export function pendingReview(over: Partial<PendingReviewItem> = {}): PendingReviewItem {
  return { orderItemId: "oi-1", orderId: "o-1", productId: "p1", productName: "Dress", productImage: "/a.jpg", product: productSummary(), size: "M", color: "Red", quantity: 1, deliveredAt: STAMP, reviewDeadline: "2099-01-01T00:00:00.000Z", ...over };
}

/** A return request waiting for the shop: one piece of the dress, wrong size. */
export function returnRequest(over: Partial<ReturnRequest> = {}): ReturnRequest {
  return {
    id: "r-1",
    orderId: "o-1",
    status: "REQUESTED",
    reason: "WRONG_SIZE",
    note: null,
    adminNote: null,
    createdAt: "2026-03-10T05:00:00.000Z",
    approvedAt: null,
    receivedAt: null,
    items: [{ id: "ri-1", orderItemId: "oi-1", productName: "Dress", productImage: "/a.jpg", size: "M", color: "Red", priceVnd: 350_000, priceUsd: 13.46, quantity: 1, acceptedQuantity: null }],
    refund: null,
    ...over,
  };
}

/** What `GET /api/returns/eligibility/:orderId` answers for an order that can still be returned. */
export function eligibility(over: Partial<ReturnEligibility> = {}): ReturnEligibility {
  return { orderId: "o-1", eligible: true, reason: null, deadline: "2099-01-01T00:00:00.000Z", returnWindowDays: 7, items: [{ orderItemId: "oi-1", quantity: 1, returnableQuantity: 1 }], ...over };
}
