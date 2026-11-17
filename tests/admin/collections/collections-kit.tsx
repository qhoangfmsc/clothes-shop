import { http, HttpResponse } from "msw";
import CollectionsContent from "@/src/app/[locale]/(admin)/admin/collections/CollectionsContent";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { Collection } from "@/src/types/collection";
import type { Product } from "@/src/types/product";
import { API } from "@/tests/_support/api";
import { product } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample collections, the fake admin collections API (and the product list the picker reads) and the render function shared by the admin collections tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export { product };

/** A collection as the BE lists it: its products are nested as `products: [{ id }]` and the screen turns them into `productIds` */
export type ListedCollection = Omit<Collection, "productIds" | "products"> & { products?: { id: string }[] };

export function collection(over: Partial<ListedCollection> = {}): ListedCollection {
  return { id: "col-1", slug: "spring", name: "Spring", subtitle: "Light and bright", description: "New season", image: "", season: "Limited Edition", products: [], createdAt: STAMP, updatedAt: STAMP, ...over };
}

type Refusal = { status: number; body: Record<string, unknown> };

export interface CollectionsApiOptions {
  pages?: { data: ListedCollection[]; total: number }[];
  /** Answer a list request from its own parameters instead of from `pages` */
  answer?: (params: URLSearchParams) => { data: ListedCollection[]; total: number };
  failListFrom?: number;
  deny?: 401 | 403;
  /** What the product picker is offered (`GET /api/admin/products?limit=200`), or a status to fail with */
  products?: Product[] | number;
  refuse?: { create?: Refusal; update?: Refusal; delete?: Refusal };
}

export interface CollectionsCalls {
  lists: URLSearchParams[];
  productAsks: URLSearchParams[];
  creates: Record<string, unknown>[];
  updates: { id: string; body: Record<string, unknown> }[];
  deletes: string[];
}

export function collectionsApi(options: CollectionsApiOptions = {}): CollectionsCalls {
  const calls: CollectionsCalls = { lists: [], productAsks: [], creates: [], updates: [], deletes: [] };
  const refused = (refusal?: Refusal) => (refusal ? HttpResponse.json(refusal.body, { status: refusal.status }) : null);
  server.use(
    http.get(`${API}/api/admin/collections`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (options.failListFrom && calls.lists.length >= options.failListFrom) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.answer ? options.answer(url.searchParams) : (options.pages?.[page - 1] ?? { data: [], total: 0 });
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.get(`${API}/api/admin/products`, ({ request }) => {
      calls.productAsks.push(new URL(request.url).searchParams);
      if (typeof options.products === "number") return HttpResponse.json({ message: "boom" }, { status: options.products });
      const data = options.products ?? [];
      return HttpResponse.json({ data, total: data.length, page: 1, limit: 200 });
    }),
    http.post(`${API}/api/admin/collections`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.creates.push(body);
      return refused(options.refuse?.create) ?? HttpResponse.json({ data: { ...collection({ id: "col-new" }), ...body } });
    }),
    http.patch(`${API}/api/admin/collections/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.updates.push({ id: String(params.id), body });
      return refused(options.refuse?.update) ?? HttpResponse.json({ data: { ...collection({ id: String(params.id) }), ...body } });
    }),
    http.delete(`${API}/api/admin/collections/:id`, ({ params }) => {
      calls.deletes.push(String(params.id));
      return refused(options.refuse?.delete) ?? HttpResponse.json({ data: null });
    })
  );
  return calls;
}

export interface RenderCollectionsOptions extends CollectionsApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
}

export async function renderCollections(options: RenderCollectionsOptions = {}) {
  const { as = "adminFull", locale, ...api } = options;
  navigation.pathname = "/admin/collections";
  navigation.searchParams = new URLSearchParams();
  const calls = collectionsApi(api);
  const view = await renderApp(<CollectionsContent />, { as, locale });
  return { calls, ...view };
}
