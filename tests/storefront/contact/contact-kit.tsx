import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import type { OrderProduct } from "@/src/app/[locale]/(public)/contact/_common/types";
import type { Product } from "@/src/types/product";
import { API } from "@/tests/_support/api";
import { product as productFixture } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Shared by the contact tests: a custom-order product, the fake product API behind the page, a `window.location` that records where the form sends the visitor, and the render function. */

export const product = productFixture;

export function orderProduct(over: Partial<OrderProduct> = {}): OrderProduct {
  return {
    id: "p1",
    name: "Silk dress",
    sku: "SKU-1",
    priceVnd: 350_000,
    priceUsd: 13.46,
    originalPriceVnd: null,
    originalPriceUsd: null,
    badge: "custom_order",
    images: ["/a.jpg"],
    categoryTitle: "Tops",
    subcategoryLabel: "Shirts",
    description: "",
    material: "",
    url: "https://doovan.test/vi/shop/tops/shirts/p1",
    ...over,
  };
}

/** `GET /api/products/:id` for the contact page: a product, or a status to fail with (404 when unknown) */
export function productApi(products: Record<string, Product | number> = {}) {
  const asked: string[] = [];
  server.use(
    http.get(`${API}/api/products/:id`, ({ params }) => {
      asked.push(String(params.id));
      const found = products[String(params.id)];
      if (typeof found === "number" || !found) return HttpResponse.json({}, { status: typeof found === "number" ? found : 404 });
      return HttpResponse.json({ data: found, related: [] });
    })
  );
  return asked;
}

/** Replaces `window.location` with a copy whose address, when set, is only recorded (jsdom cannot go to a mailto address); `restore` puts the real one back */
export function recordNavigation() {
  const original = window.location;
  const sent = { href: "" };
  const copy = {
    assign: (url: string) => void (sent.href = url),
    replace: (url: string) => void (sent.href = url),
    reload: () => {},
    toString: () => original.href,
  } as Record<string, unknown>;
  for (const key of ["origin", "protocol", "host", "hostname", "port", "pathname", "search", "hash"] as const) copy[key] = original[key];
  Object.defineProperty(copy, "href", { get: () => original.href, set: (url: string) => void (sent.href = url), enumerable: true });
  Object.defineProperty(window, "location", { configurable: true, value: copy });
  return { sent, restore: () => Object.defineProperty(window, "location", { configurable: true, value: original }) };
}

/** What a `mailto:` address carries, decoded */
export function readMailto(href: string) {
  const [address, query = ""] = href.replace(/^mailto:/, "").split("?");
  const params = new URLSearchParams(query.replace(/%20/g, "+"));
  return { address, subject: params.get("subject") ?? "", body: params.get("body") ?? "" };
}

export async function renderContact(ui: ReactElement, options: { locale?: "vi" | "en" } = {}) {
  navigation.pathname = "/contact";
  return renderApp(ui, options);
}
