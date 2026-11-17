import { delay, http, HttpResponse } from "msw";
import UsersContent from "@/src/app/[locale]/(admin)/admin/users/UsersContent";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { AdminOrder, AdminUser } from "@/src/hooks/use-admin-api";
import { API } from "@/tests/_support/api";
import { adminOrder, shippingInfo } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample users, the fake admin users API (list, one user's orders, role change) and the render function shared by the admin users tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export function adminUser(over: Partial<AdminUser> = {}): AdminUser {
  return { id: "u-1", email: "mai@example.com", name: "Mai Tran", image: null, provider: "google", role: "user", status: "active", createdAt: STAMP, updatedAt: STAMP, ...over };
}

export { adminOrder };

export interface UsersApiOptions {
  pages?: { data: AdminUser[]; total: number }[];
  failListFrom?: number;
  deny?: 401 | 403;
  /** `GET /api/admin/orders?userId=…`: pages of that user's orders, or a status to fail with */
  orders?: { data: AdminOrder[]; total: number }[] | number;
  /** Hold the answer to the orders list for this long (to see the loading line) */
  ordersDelayMs?: number;
  /** `GET /api/admin/orders/:id`: the order, or a status to fail with */
  orderDetail?: AdminOrder | number;
  /** `PATCH /api/admin/users/:id`: refuse with this status and body */
  refuse?: { status: number; body: Record<string, unknown> };
}

export interface UsersCalls {
  lists: URLSearchParams[];
  orderLists: URLSearchParams[];
  orderDetails: { id: string; query: URLSearchParams }[];
  patches: { id: string; body: Record<string, unknown> }[];
}

export function usersApi(options: UsersApiOptions = {}): UsersCalls {
  const calls: UsersCalls = { lists: [], orderLists: [], orderDetails: [], patches: [] };
  server.use(
    http.get(`${API}/api/admin/users`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (options.failListFrom && calls.lists.length >= options.failListFrom) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.get(`${API}/api/admin/orders`, async ({ request }) => {
      const url = new URL(request.url);
      calls.orderLists.push(url.searchParams);
      if (options.ordersDelayMs) await delay(options.ordersDelayMs);
      if (typeof options.orders === "number") return HttpResponse.json({ message: "boom" }, { status: options.orders });
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.orders?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 5) });
    }),
    http.get(`${API}/api/admin/orders/:id`, ({ params, request }) => {
      calls.orderDetails.push({ id: String(params.id), query: new URL(request.url).searchParams });
      if (typeof options.orderDetail === "number") return HttpResponse.json({ message: "no such order" }, { status: options.orderDetail });
      return HttpResponse.json({ data: options.orderDetail ?? adminOrder({ id: String(params.id) }) });
    }),
    http.get(`${API}/api/shipping`, () => HttpResponse.json({ data: shippingInfo() })),
    http.patch(`${API}/api/admin/users/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.patches.push({ id: String(params.id), body });
      if (options.refuse) return HttpResponse.json(options.refuse.body, { status: options.refuse.status });
      return HttpResponse.json({ data: adminUser({ id: String(params.id), ...(body as Partial<AdminUser>) }) });
    })
  );
  return calls;
}

export interface RenderUsersOptions extends UsersApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
}

export async function renderUsers(options: RenderUsersOptions = {}) {
  const { as = "adminFull", locale, ...api } = options;
  navigation.pathname = "/admin/users";
  navigation.searchParams = new URLSearchParams();
  const calls = usersApi(api);
  const view = await renderApp(<UsersContent />, { as, locale });
  return { calls, ...view };
}
