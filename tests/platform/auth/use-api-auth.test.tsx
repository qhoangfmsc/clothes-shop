import { renderHook } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { apiFetchStandalone, useApiAuth } from "@/src/hooks/use-api-auth";
import { API, ACCESS_KEY, REFRESH_KEY, seedSession } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* The two non-admin clients: the `useApiAuth().apiFetch` hook (account, checkout, orders…) and the
   `apiFetchStandalone` function (cart / wishlist thunks). Spec: specs/platform/auth.md, flows SES-5 and SES-6. */

const EXPIRED_EVENT = "auth:session-expired";
const STORAGE_URL = "https://abc.supabase.co/storage/v1/object/public/media/products/a.jpg";

function apiFetchFromHook() {
  return renderHook(() => useApiAuth()).result.current.apiFetch;
}

describe("SES-5 apiFetch", () => {
  it("sends the Bearer token, and maps storage URLs to /media paths", async () => {
    seedSession({ access: "tok" });
    let auth: string | null = null;
    server.use(
      http.get(`${API}/api/orders`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ data: { image: STORAGE_URL } });
      })
    );

    await expect(apiFetchFromHook()("/api/orders")).resolves.toEqual({ data: { image: "/media/products/a.jpg" } });
    expect(auth).toBe("Bearer tok");
  });

  it("keeps the BE's URLs untouched with raw: true", async () => {
    server.use(http.get(`${API}/api/reviews/1`, () => HttpResponse.json({ image: STORAGE_URL })));

    await expect(apiFetchFromHook()("/api/reviews/1", { raw: true })).resolves.toEqual({ image: STORAGE_URL });
  });

  it("public: true sends no token and never tries to refresh", async () => {
    seedSession({ access: "tok", refresh: "r1" });
    let auth: string | null = "unset";
    server.use(
      http.get(`${API}/api/products`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ message: "nope" }, { status: 401 });
      })
    );

    await expect(apiFetchFromHook()("/api/products", { public: true })).rejects.toMatchObject({ status: 401 });
    expect(auth).toBeNull();
    expect(localStorage.getItem(ACCESS_KEY)).toBe("tok");
  });

  it("sends a FormData body as is, without a JSON content type", async () => {
    seedSession({ access: "tok" });
    let type: string | null = null;
    let fileText: string | null = null;
    server.use(
      http.post(`${API}/api/upload`, async ({ request }) => {
        type = request.headers.get("content-type");
        fileText = await ((await request.formData()).get("file") as Blob).text();
        return HttpResponse.json({ ok: true });
      })
    );
    const body = new FormData();
    body.append("file", new File(["x"], "a.txt", { type: "text/plain" }));

    await apiFetchFromHook()("/api/upload", { method: "POST", body });
    expect(type).toMatch(/^multipart\/form-data; boundary=/);
    expect(fileText).toBe("x");
  });

  it("refreshes on 401 and retries once with the new token", async () => {
    seedSession({ access: "old", refresh: "r1" });
    let refreshCalls = 0;
    server.use(
      http.get(`${API}/api/me`, ({ request }) =>
        request.headers.get("authorization") === "Bearer new"
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({}, { status: 401 })
      ),
      http.post(`${API}/api/auth/refresh`, async () => {
        refreshCalls += 1;
        await delay(5);
        return HttpResponse.json({ accessToken: "new" });
      })
    );

    await expect(apiFetchFromHook()("/api/me")).resolves.toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem(ACCESS_KEY)).toBe("new");
  });

  it("expires the session when the refresh is rejected", async () => {
    seedSession({ access: "old", refresh: "r1" });
    const expired = vi.fn();
    window.addEventListener(EXPIRED_EVENT, expired);
    server.use(
      http.get(`${API}/api/me`, () => HttpResponse.json({}, { status: 401 })),
      http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({}, { status: 401 }))
    );

    const error = await apiFetchFromHook()("/api/me").catch((e: unknown) => e);
    window.removeEventListener(EXPIRED_EVENT, expired);

    expect(error).toMatchObject({ status: 401, message: "" });
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("throws an ApiError with the BE's message and code", async () => {
    server.use(
      http.post(`${API}/api/orders`, () => HttpResponse.json({ message: "Out of stock", errorCode: 2001 }, { status: 409 }))
    );

    await expect(apiFetchFromHook()("/api/orders", { method: "POST", body: {} })).rejects.toMatchObject({
      message: "Out of stock",
      status: 409,
      errorCode: 2001,
    });
  });

  it("keeps the same function between renders", () => {
    const { result, rerender } = renderHook(() => useApiAuth());
    const first = result.current.apiFetch;
    rerender();
    expect(result.current.apiFetch).toBe(first);
  });
});

describe("SES-6 apiFetchStandalone", () => {
  it("sends the token and maps storage URLs", async () => {
    seedSession({ access: "tok" });
    let auth: string | null = null;
    server.use(
      http.get(`${API}/api/cart`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ image: STORAGE_URL });
      })
    );

    await expect(apiFetchStandalone("/api/cart")).resolves.toEqual({ image: "/media/products/a.jpg" });
    expect(auth).toBe("Bearer tok");
  });

  it("works for a guest (no token)", async () => {
    let auth: string | null = "unset";
    server.use(
      http.get(`${API}/api/cart`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({});
      })
    );

    await apiFetchStandalone("/api/cart");
    expect(auth).toBeNull();
  });

  it("does not refresh on 401, keeps the tokens and stays silent", async () => {
    seedSession({ access: "old", refresh: "r1" });
    const expired = vi.fn();
    window.addEventListener(EXPIRED_EVENT, expired);
    /* no refresh handler: MSW fails the test if one is attempted */
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json({ message: "no" }, { status: 401 })));

    const error = await apiFetchStandalone("/api/cart").catch((e: unknown) => e);
    window.removeEventListener(EXPIRED_EVENT, expired);

    expect(error).toMatchObject({ status: 401, message: "no" });
    expect(localStorage.getItem(ACCESS_KEY)).toBe("old");
    expect(localStorage.getItem(REFRESH_KEY)).toBe("r1");
    expect(expired).not.toHaveBeenCalled();
  });

  it("throws an ApiError with message, status and code", async () => {
    server.use(http.post(`${API}/api/cart/items`, () => HttpResponse.json({ message: "Sold out", errorCode: 2002 }, { status: 400 })));

    await expect(apiFetchStandalone("/api/cart/items", { method: "POST", body: { productId: "1" } })).rejects.toMatchObject({
      message: "Sold out",
      status: 400,
      errorCode: 2002,
    });
  });
});
