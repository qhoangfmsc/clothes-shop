import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { useAdminCategories, useAdminCollections, useAdminOrders, useAdminProducts, useAdminUsers } from "@/src/hooks/use-admin-api";
import { API, ACCESS_KEY, REFRESH_KEY, seedSession } from "@/tests/_support/api";
import { signInAs } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { SwrIsolated } from "./swr-wrapper";

/* Admin SWR hooks (flows ADM-1 … ADM-4). The FE checks no permission, the BE decides. In this fake BE:
   no token → 401, "user-token" → 403 everywhere, "limited-token" → reads ok and writes 403, any other token → ok. */

const wrapper = SwrIsolated;
const EXPIRED = "auth:session-expired";

type Calls = { method: string; url: string; body: unknown }[];

/** Registers `/api/admin/<resource>` (+ `/:id`) with the permission rules above. */
function adminBackend(resource: string, rows: unknown[] = [{ id: "r1" }]) {
  const calls: Calls = [];
  const decide = (request: Request) => {
    const auth = request.headers.get("authorization");
    if (!auth) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (auth === "Bearer user-token") return HttpResponse.json({ message: "Forbidden" }, { status: 403 });
    if (auth === "Bearer limited-token" && request.method !== "GET") return HttpResponse.json({ message: "Forbidden" }, { status: 403 });
    return null;
  };
  const handle = async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const refused = decide(request);
    calls.push({ method: request.method, url: `${url.pathname}${url.search}`, body: request.method === "GET" ? undefined : await request.json().catch(() => undefined) });
    if (refused) return refused;
    return request.method === "GET" && url.pathname.endsWith(resource)
      ? HttpResponse.json({ data: rows, total: rows.length, page: 1, limit: 25 })
      : HttpResponse.json({ data: { id: "r1", saved: true } });
  };
  for (const path of [`${API}/api/admin/${resource}`, `${API}/api/admin/${resource}/:id`, `${API}/api/admin/${resource}/:id/status`]) {
    server.use(http.get(path, handle), http.post(path, handle), http.patch(path, handle), http.delete(path, handle));
  }
  return { calls, gets: () => calls.filter((c) => c.method === "GET").length };
}

describe("ADM-1 an admin with every permission", () => {
  it("useAdminProducts reads the list with the list contract and sensible defaults before it arrives", async () => {
    signInAs("adminFull");
    const backend = adminBackend("products", [{ id: "p1" }, { id: "p2" }]);

    const { result } = renderHook(() => useAdminProducts({ search: "dress", status: "active", sort: "-price", page: 2, limit: 10 }), { wrapper });

    expect(result.current).toMatchObject({ products: [], total: 0, page: 1, limit: 25, isLoading: true, isError: false });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(backend.calls[0]).toMatchObject({ method: "GET", url: "/api/admin/products?search=dress&status=active&sort=-price&page=2&limit=10" });
    expect(result.current).toMatchObject({ products: [{ id: "p1" }, { id: "p2" }], total: 2, page: 1, limit: 25 });
  });

  it("creating, updating and deleting call the API and then refresh the list", async () => {
    signInAs("adminFull");
    const backend = adminBackend("products");
    const { result } = renderHook(() => useAdminProducts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(backend.gets()).toBe(1);

    let created: unknown;
    await act(async () => void (created = await result.current.createProduct({ name: "Dress" } as never)));
    expect(created).toEqual({ id: "r1", saved: true });
    await waitFor(() => expect(backend.gets()).toBe(2));

    await act(async () => void (await result.current.updateProduct("r1", { name: "Gown" })));
    await waitFor(() => expect(backend.gets()).toBe(3));

    await act(async () => void (await result.current.deleteProduct("r1")));
    await waitFor(() => expect(backend.gets()).toBe(4));

    expect(backend.calls.filter((c) => c.method !== "GET")).toEqual([
      { method: "POST", url: "/api/admin/products", body: { name: "Dress" } },
      { method: "PATCH", url: "/api/admin/products/r1", body: { name: "Gown" } },
      { method: "DELETE", url: "/api/admin/products/r1", body: undefined },
    ]);
  });

  it.each([
    ["categories", () => useAdminCategories({ search: "t", sort: "priority", page: 3, limit: 5 }), "/api/admin/categories?search=t&sort=priority&page=3&limit=5"],
    ["collections", () => useAdminCollections({ season: "summer", sort: "name" }), "/api/admin/collections?season=summer&sort=name"],
    ["orders", () => useAdminOrders({ status: "pending", sort: "-createdAt" }), "/api/admin/orders?status=pending&sort=-createdAt"],
    ["users", () => useAdminUsers({ role: "admin", status: "active", search: "mai" }), "/api/admin/users?search=mai&role=admin&status=active"],
  ] as const)("the %s hook asks for the right URL", async (resource, hook, url) => {
    signInAs("adminFull");
    const backend = adminBackend(resource);

    const { result } = renderHook(hook as () => { isLoading: boolean }, { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(backend.calls[0].url).toBe(url);
  });

  it("categories and collections can be created, updated and deleted", async () => {
    signInAs("adminFull");
    const categories = adminBackend("categories");
    const collections = adminBackend("collections");
    const cat = renderHook(() => useAdminCategories(), { wrapper });
    const col = renderHook(() => useAdminCollections(), { wrapper });
    await waitFor(() => expect(cat.result.current.isLoading || col.result.current.isLoading).toBe(false));

    await act(async () => {
      await cat.result.current.createCategory({ title: "Tops" });
      await cat.result.current.updateCategory("r1", { title: "Tees" });
      await cat.result.current.deleteCategory("r1");
      await col.result.current.createCollection({ name: "Summer" } as never);
      await col.result.current.updateCollection("r1", { name: "Winter" } as never);
      await col.result.current.deleteCollection("r1");
    });

    expect(categories.calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.url}`)).toEqual(["POST /api/admin/categories", "PATCH /api/admin/categories/r1", "DELETE /api/admin/categories/r1"]);
    expect(collections.calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.url}`)).toEqual(["POST /api/admin/collections", "PATCH /api/admin/collections/r1", "DELETE /api/admin/collections/r1"]);
  });

  it("orders: read one without refreshing, change its status and refresh", async () => {
    signInAs("adminFull");
    const backend = adminBackend("orders");
    const { result } = renderHook(() => useAdminOrders(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => void (await result.current.getOrderDetail("o1")));
    expect(backend.gets()).toBe(2); // the list and the detail: no refresh after a read

    await act(async () => void (await result.current.updateOrderStatus("o1", "confirmed")));
    await waitFor(() => expect(backend.gets()).toBe(3));
    expect(backend.calls.find((c) => c.method === "PATCH")).toEqual({ method: "PATCH", url: "/api/admin/orders/o1/status", body: { status: "confirmed" } });
  });

  it("users: read one, update one and refresh", async () => {
    signInAs("adminFull");
    const backend = adminBackend("users");
    const { result } = renderHook(() => useAdminUsers(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.getUserDetail("u1");
      await result.current.updateUser("u1", { status: "disabled" });
    });

    expect(backend.calls.find((c) => c.method === "PATCH")).toEqual({ method: "PATCH", url: "/api/admin/users/u1", body: { status: "disabled" } });
    await waitFor(() => expect(backend.gets()).toBe(3));
  });
});

describe("ADM-2 a visitor who is not signed in (khách)", () => {
  it("gets a 401, cannot refresh, shows isError, and the app is told the session is over", async () => {
    adminBackend("products"); // no refresh handler: with no refresh token none may be attempted
    const expired = vi.fn();
    window.addEventListener(EXPIRED, expired);

    const { result } = renderHook(() => useAdminProducts(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    window.removeEventListener(EXPIRED, expired);

    expect(result.current.products).toEqual([]);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("a write is refused too and rejects with a 401", async () => {
    adminBackend("products");
    const { result } = renderHook(() => useAdminProducts(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await expect(result.current.createProduct({ name: "x" } as never)).rejects.toMatchObject({ status: 401 });
  });
});

describe("ADM-3 a customer account (user)", () => {
  it("gets a 403: isError, no data, and the session is kept (it is valid, just not allowed)", async () => {
    seedSession({ access: "user-token", refresh: "r1" });
    adminBackend("orders");
    const expired = vi.fn();
    window.addEventListener(EXPIRED, expired);

    const { result } = renderHook(() => useAdminOrders(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    window.removeEventListener(EXPIRED, expired);

    expect(result.current.orders).toEqual([]);
    expect(expired).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACCESS_KEY)).toBe("user-token");
    expect(localStorage.getItem(REFRESH_KEY)).toBe("r1");
  });
});

describe("ADM-4 an admin who lacks the permission to change things", () => {
  it("can read the list", async () => {
    seedSession({ access: "limited-token" });
    adminBackend("products", [{ id: "p1" }]);

    const { result } = renderHook(() => useAdminProducts(), { wrapper });

    await waitFor(() => expect(result.current.products).toEqual([{ id: "p1" }]));
    expect(result.current.isError).toBe(false);
  });

  it.each([
    ["create", (h: ReturnType<typeof useAdminProducts>) => h.createProduct({ name: "x" } as never)],
    ["update", (h: ReturnType<typeof useAdminProducts>) => h.updateProduct("r1", { name: "x" })],
    ["delete", (h: ReturnType<typeof useAdminProducts>) => h.deleteProduct("r1")],
  ])("%s is refused with a 403 and the list is not reloaded", async (_action, act1) => {
    seedSession({ access: "limited-token", refresh: "r1" });
    const backend = adminBackend("products");
    const { result } = renderHook(() => useAdminProducts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const readsBefore = backend.gets();

    await expect(act1(result.current)).rejects.toMatchObject({ status: 403, message: "Forbidden" });

    expect(backend.gets()).toBe(readsBefore);
    expect(localStorage.getItem(REFRESH_KEY)).toBe("r1");
  });

  it("changing an order's status is refused with a 403", async () => {
    seedSession({ access: "limited-token" });
    adminBackend("orders");
    const { result } = renderHook(() => useAdminOrders(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.updateOrderStatus("o1", "confirmed")).rejects.toMatchObject({ status: 403 });
  });
});
