import { http, HttpResponse } from "msw";
import ProductsContent from "@/src/app/[locale]/(admin)/admin/products/ProductsContent";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { Category } from "@/src/types/category";
import type { Product } from "@/src/types/product";
import { API } from "@/tests/_support/api";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* The fake admin products API and the render function shared by the admin products tests. */

const STAMP = "2026-01-01T00:00:00.000Z";

export function category(over: Partial<Category> = {}): Category {
  return {
    id: "c1",
    slug: "tops",
    title: "Tops",
    description: "",
    heroImage: null,
    priority: 1,
    subcategories: [{ id: "s1", slug: "shirts", label: "Shirts", description: "", count: 1 }],
    createdAt: STAMP,
    updatedAt: STAMP,
    ...over,
  };
}

/** Two categories: Tops (with sub-categories) and Bags (without) — the second shows that a sub-category is not always required. */
export const CATEGORIES: Category[] = [
  category(),
  category({ id: "c2", slug: "bags", title: "Bags", priority: 2, subcategories: [] }),
];

export interface ProductsApiOptions {
  pages?: { data: Product[]; total: number }[];
  categories?: Category[] | "fail";
  /** Fail the list (500) from the nth request on */
  failListFrom?: number;
  deny?: 401 | 403;
  /** Refuse create/update/delete with this status and body */
  refuse?: { status: number; body: Record<string, unknown> };
}

export interface ProductsCalls {
  lists: URLSearchParams[];
  categories: URLSearchParams[];
  creates: Record<string, unknown>[];
  updates: { id: string; body: Record<string, unknown> }[];
  deletes: string[];
}

export function productsApi(options: ProductsApiOptions = {}): ProductsCalls {
  const calls: ProductsCalls = { lists: [], categories: [], creates: [], updates: [], deletes: [] };
  const refused = () => (options.refuse ? HttpResponse.json(options.refuse.body, { status: options.refuse.status }) : null);
  server.use(
    http.get(`${API}/api/admin/products`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (options.failListFrom && calls.lists.length >= options.failListFrom) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.get(`${API}/api/admin/categories`, ({ request }) => {
      calls.categories.push(new URL(request.url).searchParams);
      if (options.categories === "fail") return HttpResponse.json({ message: "no" }, { status: 500 });
      const data = options.categories ?? CATEGORIES;
      return HttpResponse.json({ data, total: data.length, page: 1, limit: 200 });
    }),
    http.post(`${API}/api/admin/products`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.creates.push(body);
      return refused() ?? HttpResponse.json({ data: { id: "new-1", ...body } });
    }),
    http.patch(`${API}/api/admin/products/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.updates.push({ id: String(params.id), body });
      return refused() ?? HttpResponse.json({ data: { id: params.id, ...body } });
    }),
    http.delete(`${API}/api/admin/products/:id`, ({ params }) => {
      calls.deletes.push(String(params.id));
      return refused() ?? HttpResponse.json({ data: null });
    })
  );
  return calls;
}

export interface RenderProductsOptions extends ProductsApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
}

export async function renderProducts(options: RenderProductsOptions = {}) {
  const { as = "adminFull", locale, ...api } = options;
  const calls = productsApi(api);
  const view = await renderApp(<ProductsContent />, { as, locale });
  return { calls, ...view };
}
