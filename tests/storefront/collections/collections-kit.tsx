import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import { QuickAddProvider } from "@/src/app/[locale]/_components/QuickAddDrawer";
import type { Collection } from "@/src/types/collection";
import type { BannerItem } from "@/src/types/site-config";
import { API } from "@/tests/_support/api";
import { product } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Fake public API behind the collections pages (list, one collection with its products, hero banners, wishlist sync) and the render function shared by the collections tests. */

export { product };

const STAMP = "2026-01-01T00:00:00.000Z";

export function collectionOf(over: Partial<Collection> = {}): Collection {
  return { id: "c1", slug: "spring", name: "Spring", subtitle: "Light and warm", description: "Soft layers for spring", image: "/spring.jpg", productIds: [], season: "SS26", createdAt: STAMP, updatedAt: STAMP, ...over };
}

/** `n` collections with distinct slugs and names */
export function collections(n: number): Collection[] {
  return Array.from({ length: n }, (_, i) => collectionOf({ id: `c${i + 1}`, slug: `col-${i + 1}`, name: `Collection ${i + 1}`, subtitle: `Subtitle ${i + 1}`, description: `About collection ${i + 1}`, image: `/col-${i + 1}.jpg` }));
}

export interface CollectionsApiOptions {
  /** `GET /api/collections` (the list): the collections, or a status to fail with */
  list?: Collection[] | number;
  /** `GET /api/collections?slug=`: the collection with its products, or a status to fail with; anything else is a 404 */
  bySlug?: Record<string, { data: Collection; products: ReturnType<typeof product>[] } | number>;
  /** `GET /api/site-config?key=…`: the banners, a status to fail with, or nothing configured */
  banners?: BannerItem[] | number | null;
  /** The wishlist calls fail with this status */
  wishlistFails?: number;
}

export interface CollectionsCalls {
  list: URLSearchParams[];
  slugs: string[];
  banners: string[];
  wishlistAdds: string[];
  wishlistRemoves: string[];
}

export function collectionsApi(options: CollectionsApiOptions = {}): CollectionsCalls {
  const calls: CollectionsCalls = { list: [], slugs: [], banners: [], wishlistAdds: [], wishlistRemoves: [] };
  server.use(
    http.get(`${API}/api/collections`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const slug = params.get("slug");
      if (slug) {
        calls.slugs.push(slug);
        const found = options.bySlug?.[slug];
        if (typeof found === "number") return HttpResponse.json({}, { status: found });
        return found ? HttpResponse.json(found) : HttpResponse.json({}, { status: 404 });
      }
      calls.list.push(params);
      if (typeof options.list === "number") return HttpResponse.json({}, { status: options.list });
      const list = options.list ?? [];
      return HttpResponse.json({ data: list, total: list.length, page: 1, limit: Number(params.get("limit") ?? 25) });
    }),
    http.get(`${API}/api/site-config`, ({ request }) => {
      calls.banners.push(new URL(request.url).searchParams.get("key") ?? "");
      if (typeof options.banners === "number") return HttpResponse.json({}, { status: options.banners });
      if (!options.banners) return HttpResponse.json({ data: null });
      return HttpResponse.json({ data: { key: "x", type: "BANNER", value: JSON.stringify(options.banners) } });
    }),
    http.post(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.wishlistAdds.push(String(params.id));
      return HttpResponse.json(options.wishlistFails ? {} : { data: null }, { status: options.wishlistFails ?? 200 });
    }),
    http.delete(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.wishlistRemoves.push(String(params.id));
      return HttpResponse.json({ data: null });
    })
  );
  return calls;
}

export interface RenderCollectionsOptions extends CollectionsApiOptions {
  calls?: CollectionsCalls;
  as?: IdentityName;
  locale?: "vi" | "en";
  store?: Parameters<typeof renderApp>[1] extends infer O ? (O extends { store?: infer S } ? S : never) : never;
}

/** Renders a collections page inside the app's providers and the quick-add drawer */
export async function renderCollections(ui: ReactElement, options: RenderCollectionsOptions = {}) {
  const { as = "guest", locale, store, calls: installed, ...api } = options;
  navigation.pathname = "/collections";
  const calls = installed ?? collectionsApi(api);
  const view = await renderApp(<QuickAddProvider>{ui}</QuickAddProvider>, { as, locale, store });
  const rerender = view.rerender;
  return Object.assign(view, { calls, rerender: (next: ReactElement) => rerender(<QuickAddProvider>{next}</QuickAddProvider>) });
}
