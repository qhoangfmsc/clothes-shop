import { http, HttpResponse } from "msw";
import CategoriesContent from "@/src/app/[locale]/(admin)/admin/categories/CategoriesContent";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { Category, SubCategory } from "@/src/types/category";
import { API } from "@/tests/_support/api";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample categories, the fake admin categories API and the render function shared by the admin categories tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export function subCategory(over: Partial<SubCategory> = {}): SubCategory {
  return { id: "s-1", slug: "shirts", label: "Shirts", description: "", count: 3, ...over };
}

export function category(over: Partial<Category> = {}): Category {
  return { id: "c-1", slug: "tops", title: "Tops", description: "Everything for the top half", heroImage: null, priority: 1, subcategories: [subCategory()], createdAt: STAMP, updatedAt: STAMP, ...over };
}

type Refusal = { status: number; body: Record<string, unknown> };

export interface CategoriesApiOptions {
  pages?: { data: Category[]; total: number }[];
  failListFrom?: number;
  deny?: 401 | 403;
  /** The answer to the "which rank is next" question (`sort=-priority&limit=1`): the last category, none, or a status to fail with */
  last?: Category | null | number;
  refuse?: { create?: Refusal; update?: Refusal; delete?: Refusal; reorder?: Refusal };
}

export interface CategoriesCalls {
  lists: URLSearchParams[];
  priorityAsks: URLSearchParams[];
  creates: Record<string, unknown>[];
  updates: { id: string; body: Record<string, unknown> }[];
  deletes: string[];
  reorders: string[][];
}

export function categoriesApi(options: CategoriesApiOptions = {}): CategoriesCalls {
  const calls: CategoriesCalls = { lists: [], priorityAsks: [], creates: [], updates: [], deletes: [], reorders: [] };
  const refused = (refusal?: Refusal) => (refusal ? HttpResponse.json(refusal.body, { status: refusal.status }) : null);
  server.use(
    http.get(`${API}/api/admin/categories`, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get("sort") === "-priority" && url.searchParams.get("limit") === "1") {
        calls.priorityAsks.push(url.searchParams);
        if (typeof options.last === "number") return HttpResponse.json({ message: "boom" }, { status: options.last });
        return HttpResponse.json({ data: options.last ? [options.last] : [], total: options.last ? 1 : 0, page: 1, limit: 1 });
      }
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (options.failListFrom && calls.lists.length >= options.failListFrom) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.patch(`${API}/api/admin/categories/reorder`, async ({ request }) => {
      calls.reorders.push(((await request.json()) as { ids: string[] }).ids);
      return refused(options.refuse?.reorder) ?? HttpResponse.json({ data: null });
    }),
    http.post(`${API}/api/admin/categories`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.creates.push(body);
      return refused(options.refuse?.create) ?? HttpResponse.json({ data: category({ id: "c-new", ...(body as Partial<Category>) }) });
    }),
    http.patch(`${API}/api/admin/categories/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.updates.push({ id: String(params.id), body });
      return refused(options.refuse?.update) ?? HttpResponse.json({ data: category({ id: String(params.id), ...(body as Partial<Category>) }) });
    }),
    http.delete(`${API}/api/admin/categories/:id`, ({ params }) => {
      calls.deletes.push(String(params.id));
      return refused(options.refuse?.delete) ?? HttpResponse.json({ data: null });
    })
  );
  return calls;
}

export interface RenderCategoriesOptions extends CategoriesApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
}

export async function renderCategories(options: RenderCategoriesOptions = {}) {
  const { as = "adminFull", locale, ...api } = options;
  navigation.pathname = "/admin/categories";
  navigation.searchParams = new URLSearchParams();
  const calls = categoriesApi(api);
  const view = await renderApp(<CategoriesContent />, { as, locale });
  return { calls, ...view };
}
