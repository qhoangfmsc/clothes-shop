import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import { QuickAddProvider } from "@/src/app/[locale]/_components/QuickAddDrawer";
import type { Category } from "@/src/types/category";
import type { Product } from "@/src/types/product";
import type { BannerItem } from "@/src/types/site-config";
import { API } from "@/tests/_support/api";
import { categoryOf, product, subcategoryOf } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Fake public API behind the shop pages (products, categories, banners, wishlist sync) and the render function shared by the shop tests. */

export { categoryOf, product, subcategoryOf };

/** `n` products with distinct ids and names */
export function products(n: number, from = 1, over: Partial<Product> = {}): Product[] {
  return Array.from({ length: n }, (_, i) => product({ id: `p${from + i}`, name: `Item ${String(from + i).padStart(2, "0")}`, slug: `item-${from + i}`, ...over }));
}

type Page = { data: Product[]; total: number };

export interface ShopApiOptions {
  /** What `GET /api/products` answers: pages by their number, or a function of the whole query; a number fails with that status */
  pages?: Page[];
  answer?: (params: URLSearchParams) => Page | number;
  /** Hold the answer to a products request this many milliseconds (to make answers arrive out of order) */
  delayFor?: (params: URLSearchParams) => number;
  /** `GET /api/categories`: the list, and `?slug=` answers from the same list (404 for an unknown slug) */
  categories?: Category[] | number;
  /** `GET /api/site-config?key=…`: the banners, a status to fail with, or `null` for a key nobody configured */
  banners?: BannerItem[] | number | null;
  /** The wishlist calls fail with this status */
  wishlistFails?: number;
}

export interface ShopCalls {
  products: URLSearchParams[];
  categories: URLSearchParams[];
  banners: string[];
  wishlistAdds: string[];
  wishlistRemoves: string[];
}

export function shopApi(options: ShopApiOptions = {}): ShopCalls {
  const calls: ShopCalls = { products: [], categories: [], banners: [], wishlistAdds: [], wishlistRemoves: [] };
  server.use(
    http.get(`${API}/api/products`, async ({ request }) => {
      const params = new URL(request.url).searchParams;
      calls.products.push(params);
      const wait = options.delayFor?.(params) ?? 0;
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      const answer = options.answer?.(params) ?? options.pages?.[Number(params.get("page") ?? 1) - 1] ?? { data: [], total: 0 };
      if (typeof answer === "number") return HttpResponse.json({ message: "boom" }, { status: answer });
      return HttpResponse.json({ ...answer, page: Number(params.get("page") ?? 1), limit: Number(params.get("limit") ?? 25) });
    }),
    http.get(`${API}/api/categories`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      calls.categories.push(params);
      if (typeof options.categories === "number") return HttpResponse.json({ message: "boom" }, { status: options.categories });
      const list = options.categories ?? [];
      const slug = params.get("slug");
      if (slug) {
        const found = list.find((c) => c.slug === slug);
        return found ? HttpResponse.json({ data: found }) : HttpResponse.json({ message: "no such category" }, { status: 404 });
      }
      return HttpResponse.json({ data: list, total: list.length, page: 1, limit: 200 });
    }),
    http.get(`${API}/api/site-config`, ({ request }) => {
      calls.banners.push(new URL(request.url).searchParams.get("key") ?? "");
      if (typeof options.banners === "number") return HttpResponse.json({ message: "boom" }, { status: options.banners });
      if (options.banners === undefined || options.banners === null) return HttpResponse.json({ data: null });
      return HttpResponse.json({ data: { key: "x", type: "BANNER", value: JSON.stringify(options.banners) } });
    }),
    http.post(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.wishlistAdds.push(String(params.id));
      return options.wishlistFails ? HttpResponse.json({ message: "no" }, { status: options.wishlistFails }) : HttpResponse.json({ data: null });
    }),
    http.delete(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.wishlistRemoves.push(String(params.id));
      return options.wishlistFails ? HttpResponse.json({ message: "no" }, { status: options.wishlistFails }) : HttpResponse.json({ data: null });
    })
  );
  return calls;
}

export interface RenderShopOptions extends ShopApiOptions {
  /** The calls of an API that is already installed (a page rendered on the server asks before it is shown): then none is installed again */
  calls?: ShopCalls;
  as?: IdentityName;
  locale?: "vi" | "en";
  store?: Parameters<typeof renderApp>[1] extends infer O ? (O extends { store?: infer S } ? S : never) : never;
}

/** Renders a piece of the shop inside the app's providers and the quick-add drawer */
export async function renderShop(ui: ReactElement, options: RenderShopOptions = {}) {
  const { as = "guest", locale, store, calls: installed, ...api } = options;
  navigation.pathname = "/shop";
  const calls = installed ?? shopApi(api);
  const view = await renderApp(<QuickAddProvider>{ui}</QuickAddProvider>, { as, locale, store });
  /* `rerender` keeps the quick-add drawer around the new element, like the first render */
  const rerender = view.rerender;
  return Object.assign(view, { calls, rerender: (next: ReactElement) => rerender(<QuickAddProvider>{next}</QuickAddProvider>) });
}
