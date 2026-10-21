import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/src/lib/api";
import { onAdminMutation } from "@/src/lib/admin-events";
import { authApi } from "@/src/lib/auth-api";
import { API, ACCESS_KEY, REFRESH_KEY, seedSession } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* `authApi` is the client behind every Redux thunk and SWR hook in the admin: these tests pin down how it
   treats the session (token header, 401 → refresh → retry, session expiry) and errors. Written against the
   behaviour before `session.ts` existed, and they must stay green through the refactor (spec: specs/platform/auth.md). */

const EXPIRED_EVENT = "auth:session-expired";

/** A protected endpoint: 200 only for `Bearer <accepts>`, 401 otherwise. */
function protectedRoute(path: string, accepts: string) {
  return http.get(`${API}${path}`, ({ request }) =>
    request.headers.get("authorization") === `Bearer ${accepts}`
      ? HttpResponse.json({ ok: true })
      : HttpResponse.json({ message: "unauthorized" }, { status: 401 })
  );
}

function refreshRoute(result: { accessToken: string } | "reject", calls: { count: number; bodies: unknown[] }) {
  return http.post(`${API}/api/auth/refresh`, async ({ request }) => {
    calls.count += 1;
    calls.bodies.push(await request.json());
    await delay(10);
    return result === "reject" ? HttpResponse.json({}, { status: 401 }) : HttpResponse.json(result);
  });
}

describe("SES-1 request basics", () => {
  it("sends the access token as a Bearer header", async () => {
    seedSession({ access: "tok" });
    let auth: string | null = null;
    server.use(
      http.get(`${API}/api/things`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ data: [1] });
      })
    );

    await expect(authApi.get("/api/things")).resolves.toEqual({ data: [1] });
    expect(auth).toBe("Bearer tok");
  });

  it("sends no Authorization header when there is no token", async () => {
    let auth: string | null = "unset";
    server.use(
      http.get(`${API}/api/things`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({});
      })
    );

    await authApi.get("/api/things");
    expect(auth).toBeNull();
  });

  it("sends a JSON body with a JSON content type", async () => {
    seedSession({ access: "tok" });
    let seen: { type: string | null; body: unknown } | null = null;
    server.use(
      http.post(`${API}/api/things`, async ({ request }) => {
        seen = { type: request.headers.get("content-type"), body: await request.json() };
        return HttpResponse.json({ data: { id: "1" } });
      })
    );

    await authApi.post("/api/things", { name: "shirt" });
    expect(seen).toEqual({ type: "application/json", body: { name: "shirt" } });
  });

  it("accepts an absolute URL", async () => {
    server.use(http.get("http://other.test/ping", () => HttpResponse.json({ pong: true })));
    await expect(authApi.get("http://other.test/ping")).resolves.toEqual({ pong: true });
  });
});

describe("SES-2 refresh on 401", () => {
  it("refreshes, stores the new access token and retries once", async () => {
    seedSession({ access: "old", refresh: "r1" });
    const calls = { count: 0, bodies: [] as unknown[] };
    server.use(protectedRoute("/api/me", "new"), refreshRoute({ accessToken: "new" }, calls));

    await expect(authApi.get("/api/me")).resolves.toEqual({ ok: true });
    expect(calls.count).toBe(1);
    expect(calls.bodies).toEqual([{ refreshToken: "r1" }]);
    expect(localStorage.getItem(ACCESS_KEY)).toBe("new");
    expect(localStorage.getItem(REFRESH_KEY)).toBe("r1");
  });

  it("gives up with the normal error when the retry is still 401", async () => {
    seedSession({ access: "old", refresh: "r1" });
    const calls = { count: 0, bodies: [] as unknown[] };
    server.use(protectedRoute("/api/me", "never"), refreshRoute({ accessToken: "new" }, calls));

    await expect(authApi.get("/api/me")).rejects.toMatchObject({ status: 401, message: "unauthorized" });
    expect(calls.count).toBe(1);
  });

  it("does not try to refresh a non-401 error", async () => {
    seedSession({ access: "old", refresh: "r1" });
    server.use(http.get(`${API}/api/me`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    await expect(authApi.get("/api/me")).rejects.toMatchObject({ status: 500 });
  });
});

describe("SES-3 concurrent 401s", () => {
  it("shares one refresh between requests that fail together", async () => {
    seedSession({ access: "old", refresh: "r1" });
    const calls = { count: 0, bodies: [] as unknown[] };
    server.use(
      protectedRoute("/api/a", "new"),
      protectedRoute("/api/b", "new"),
      refreshRoute({ accessToken: "new" }, calls)
    );

    const results = await Promise.all([authApi.get("/api/a"), authApi.get("/api/b")]);
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(calls.count).toBe(1);
  });

  it("allows a new refresh once the previous one has finished", async () => {
    seedSession({ access: "old", refresh: "r1" });
    const calls = { count: 0, bodies: [] as unknown[] };
    server.use(protectedRoute("/api/a", "new"), refreshRoute({ accessToken: "new" }, calls));
    await authApi.get("/api/a");

    localStorage.setItem(ACCESS_KEY, "stale-again");
    await authApi.get("/api/a");
    expect(calls.count).toBe(2);
  });
});

describe("SES-4 session expiry", () => {
  it("clears the tokens, announces the expiry and throws a 401 when the refresh is rejected", async () => {
    seedSession({ access: "old", refresh: "r1" });
    const expired = vi.fn();
    window.addEventListener(EXPIRED_EVENT, expired);
    const calls = { count: 0, bodies: [] as unknown[] };
    server.use(protectedRoute("/api/me", "new"), refreshRoute("reject", calls));

    const error = await authApi.get("/api/me").catch((e: unknown) => e);
    window.removeEventListener(EXPIRED_EVENT, expired);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, message: "" });
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("expires the session without calling the API when there is no refresh token", async () => {
    seedSession({ access: "old" });
    const expired = vi.fn();
    window.addEventListener(EXPIRED_EVENT, expired);
    /* no refresh handler on purpose: MSW fails the test on any unexpected request */
    server.use(protectedRoute("/api/me", "new"));

    const error = await authApi.get("/api/me").catch((e: unknown) => e);
    window.removeEventListener(EXPIRED_EVENT, expired);

    expect(error).toMatchObject({ status: 401, message: "" });
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("clears the tokens when the refresh request fails on the network", async () => {
    seedSession({ access: "old", refresh: "r1" });
    server.use(
      protectedRoute("/api/me", "new"),
      http.post(`${API}/api/auth/refresh`, () => HttpResponse.error())
    );

    await expect(authApi.get("/api/me")).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });
});

describe("SES-7 admin write notifications", () => {
  async function countNotifications(run: () => Promise<unknown>) {
    const listener = vi.fn();
    const off = onAdminMutation(listener);
    await run().catch(() => undefined);
    off();
    return listener.mock.calls.length;
  }

  it.each([
    ["post", "/api/admin/products"],
    ["put", "/api/admin/products/1"],
    ["patch", "/api/admin/products/1"],
    ["delete", "/api/admin/products/1"],
  ] as const)("notifies after a successful %s %s", async (method, path) => {
    server.use(http[method](`${API}${path}`, () => HttpResponse.json({ data: {} })));
    expect(await countNotifications(() => authApi[method](path))).toBe(1);
  });

  it("does not notify for a GET", async () => {
    server.use(http.get(`${API}/api/admin/products`, () => HttpResponse.json({ data: [] })));
    expect(await countNotifications(() => authApi.get("/api/admin/products"))).toBe(0);
  });

  it("does not notify for a write outside /api/admin/", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json({})));
    expect(await countNotifications(() => authApi.post("/api/cart/items", {}))).toBe(0);
  });

  it("does not notify when the write fails", async () => {
    server.use(http.post(`${API}/api/admin/products`, () => HttpResponse.json({ message: "no" }, { status: 400 })));
    expect(await countNotifications(() => authApi.post("/api/admin/products", {}))).toBe(0);
  });
});

describe("SES-8 errors from the API", () => {
  it("throws an ApiError with message, status and error code", async () => {
    server.use(
      http.get(`${API}/api/x`, () => HttpResponse.json({ message: "Storage off", errorCode: 1601 }, { status: 503 }))
    );

    const error = await authApi.get("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Storage off", status: 503, errorCode: 1601, code: "1601", name: "ApiError" });
  });

  it("falls back to a status message when the body is not JSON", async () => {
    server.use(http.get(`${API}/api/x`, () => new HttpResponse("<html>bad gateway</html>", { status: 502 })));

    await expect(authApi.get("/api/x")).rejects.toMatchObject({ message: "API error: 502", status: 502 });
  });
});
