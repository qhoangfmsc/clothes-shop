import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { api, ApiError } from "@/src/lib/api";
import { API, seedSession } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* ERR-3: the public client behind storefront reads and the contact form. Spec: specs/platform/data-layer.md. */

describe("public api client", () => {
  it("never sends the session token", async () => {
    seedSession({ access: "tok" });
    let auth: string | null = "unset";
    server.use(
      http.get(`${API}/api/products`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ data: [] });
      })
    );

    await expect(api.get("/api/products")).resolves.toEqual({ data: [] });
    expect(auth).toBeNull();
  });

  it("sends JSON for post and patch, and nothing for delete", async () => {
    const seen: Record<string, unknown> = {};
    server.use(
      http.post(`${API}/api/contact`, async ({ request }) => {
        seen.post = await request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.patch(`${API}/api/contact/1`, async ({ request }) => {
        seen.patch = await request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.delete(`${API}/api/contact/1`, async ({ request }) => {
        seen.deleteBody = await request.text();
        return HttpResponse.json({ ok: true });
      })
    );

    await api.post("/api/contact", { name: "Mai" });
    await api.patch("/api/contact/1", { name: "Lan" });
    await api.delete("/api/contact/1");

    expect(seen).toEqual({ post: { name: "Mai" }, patch: { name: "Lan" }, deleteBody: "" });
  });

  it("does not refresh a 401: it throws the ApiError", async () => {
    server.use(http.get(`${API}/api/products`, () => HttpResponse.json({ message: "no" }, { status: 401 })));

    const error = await api.get("/api/products").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "no", status: 401 });
  });
});
