import { http, HttpResponse, type JsonBodyType } from "msw";
import CheckoutContent from "@/src/app/[locale]/(private)/checkout/CheckoutContent";
import type { OrderQuote } from "@/src/app/[locale]/(private)/checkout/_common/checkout";
import type { CartItem } from "@/src/app/[locale]/(private)/cart/_common/types";
import type { RootState } from "@/src/store";
import type { ShippingInfo, ShippingMethodId } from "@/src/types/shipping";
import { API } from "@/tests/_support/api";
import { cartState, paymentSession, quote, serverCart, shippingInfo } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* The fake BE and the render shortcut shared by the checkout page tests. */

export const A = (over: Partial<CartItem> = {}): CartItem => ({ productId: "a", name: "Dress", serverItemId: "srv-a", priceVnd: 350_000, priceUsd: 13.46, lineTotalVnd: 350_000, lineTotalUsd: 13.46, image: "/a.jpg", size: "M", color: "Red", colorHex: "#f00", quantity: 1, category: "tops", subcategory: "shirts", badge: null, ...over });
export const B = (over: Partial<CartItem> = {}): CartItem => A({ productId: "b", name: "Skirt", serverItemId: "srv-b", priceVnd: 500_000, priceUsd: 19.23, lineTotalVnd: 500_000, lineTotalUsd: 19.23, size: "L", color: "Blue", colorHex: "#00f", ...over });

export interface Backend {
  /** What the BE has in the cart (default: the lines on screen, with their ids) */
  cart?: CartItem[];
  shipping?: ShippingInfo | "error";
  /** Holds the shipping answer back until this promise is resolved */
  shippingGate?: Promise<void>;
  /** Answer for a quote request; return "error" for a failure. Default: the method's own fee, free over the threshold */
  quote?: (method: ShippingMethodId) => OrderQuote | "error";
  subtotalVnd?: number;
  /** Order creation: a status and body to refuse with, a body to accept with, or a function of the request */
  order?: { status: number; body: JsonBodyType } | { data: JsonBodyType };
  addressBody?: JsonBodyType;
  addressStatus?: number;
  cartFails?: boolean;
}

export interface Calls {
  quotes: { cartItemIds: string[]; shippingMethod: ShippingMethodId }[];
  carts: number;
  addresses: Record<string, unknown>[];
  orders: Record<string, unknown>[];
}

const FEE: Record<ShippingMethodId, [number, number]> = { standard: [30_000, 1.15], express: [60_000, 2.31], "store-pickup": [0, 0] };

export function defaultQuote(method: ShippingMethodId, subtotalVnd = 350_000): OrderQuote {
  const free = subtotalVnd >= 1_000_000;
  const [feeVnd, feeUsd] = free ? [0, 0] : FEE[method];
  return quote({ shippingMethod: method, subtotalVnd, subtotalUsd: Math.round((subtotalVnd / 26_000) * 100) / 100, shippingFeeVnd: feeVnd, shippingFeeUsd: feeUsd, totalVnd: subtotalVnd + feeVnd, totalUsd: Math.round(((subtotalVnd + feeVnd) / 26_000) * 100) / 100, freeShipping: free });
}

export function backend(lines: CartItem[], options: Backend = {}): Calls {
  const calls: Calls = { quotes: [], carts: 0, addresses: [], orders: [] };
  server.use(
    http.get(`${API}/api/shipping`, async () => {
      await options.shippingGate;
      return options.shipping === "error" ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json({ data: options.shipping ?? shippingInfo() });
    }),
    http.post(`${API}/api/orders/quote`, async ({ request }) => {
      const body = (await request.json()) as Calls["quotes"][number];
      calls.quotes.push(body);
      const answer = options.quote ? options.quote(body.shippingMethod) : defaultQuote(body.shippingMethod, options.subtotalVnd);
      return answer === "error" ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json({ data: answer });
    }),
    http.get(`${API}/api/cart`, () => {
      calls.carts += 1;
      return options.cartFails ? HttpResponse.error() : HttpResponse.json(serverCart(options.cart ?? lines));
    }),
    http.post(`${API}/api/addresses`, async ({ request }) => {
      calls.addresses.push((await request.json()) as Record<string, unknown>);
      return options.addressStatus && options.addressStatus >= 400 ? HttpResponse.json(options.addressBody ?? { message: "no" }, { status: options.addressStatus }) : HttpResponse.json(options.addressBody ?? { data: { id: "addr-1" } });
    }),
    http.post(`${API}/api/orders`, async ({ request }) => {
      calls.orders.push((await request.json()) as Record<string, unknown>);
      const order = options.order ?? { data: { id: "o-1", totalVnd: 380_000, totalUsd: 14.61 } };
      return "status" in order ? HttpResponse.json(order.body, { status: order.status }) : HttpResponse.json(order);
    })
  );
  return calls;
}

export interface RenderOptions extends Backend {
  as?: "guest" | "user";
  locale?: "vi" | "en";
  waitForAuth?: boolean;
  store?: Partial<RootState>;
}

export async function renderCheckout(lines: CartItem[], options: RenderOptions = {}) {
  const calls = backend(lines, options);
  const view = await renderApp(<CheckoutContent />, {
    as: options.as ?? "user",
    locale: options.locale,
    waitForAuth: options.waitForAuth,
    store: options.store ?? { cart: cartState(lines) },
  });
  return { ...view, calls };
}

export type StatusAnswer = { status: string; amountVnd?: number; amountUsd?: number };

/** The fake payments BE: what `POST /api/payments/qr` and `GET /api/payments/:id/status` answer next (change `qr` / `status` any time), and how often they were asked. */
export function paymentsBackend() {
  const bend = {
    qrCalls: 0,
    statusCalls: 0,
    statusUrls: [] as string[],
    qr: (): ReturnType<typeof paymentSession> | Response => paymentSession(),
    status: (): StatusAnswer | Response => ({ status: "PENDING", amountVnd: 380_000, amountUsd: 14.61 }),
  };
  server.use(
    http.post(`${API}/api/payments/qr`, async () => {
      bend.qrCalls += 1;
      const answer = bend.qr();
      return answer instanceof Response ? answer : HttpResponse.json({ data: answer });
    }),
    http.get(`${API}/api/payments/:orderId/status`, async ({ request }) => {
      bend.statusCalls += 1;
      bend.statusUrls.push(new URL(request.url).pathname);
      const answer = bend.status();
      return answer instanceof Response ? answer : HttpResponse.json({ data: answer });
    })
  );
  return bend;
}
