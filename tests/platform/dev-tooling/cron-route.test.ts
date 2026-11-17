import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, dynamic, maxDuration } from "@/src/app/api/cron/ping/route";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* The daily ping that keeps the free database awake (specs/platform/dev-tooling.md, flows GATE-8 and GATE-8E). */

afterEach(() => vi.unstubAllEnvs());

const call = (authorization?: string) => GET(new Request("http://localhost/api/cron/ping", { headers: authorization ? { authorization } : {} }));
const categories = (status = 200) => {
  const seen: string[] = [];
  server.use(
    http.get(`${API}/api/categories`, ({ request }) => {
      seen.push(new URL(request.url).search);
      return HttpResponse.json({ data: [] }, { status });
    })
  );
  return seen;
};

describe("GATE-8 the ping", () => {
  it("is never cached and may run for a minute", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(maxDuration).toBe(60);
  });

  it("reads one real row from the API and reports status and time", async () => {
    const seen = categories();

    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: 200, durationMs: expect.any(Number) });
    expect(seen).toEqual(["?limit=1"]);
  });

  it("asks without any cache and with a timeout", async () => {
    categories();
    const spy = vi.spyOn(globalThis, "fetch");

    await call();

    expect(spy.mock.calls[0][1]).toMatchObject({ cache: "no-store", signal: expect.any(AbortSignal) });
  });

  it("answers anyone when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    categories();

    expect((await call("Bearer whatever")).status).toBe(200);
  });

  it("with a secret, answers the caller that presents it", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    categories();

    expect((await call("Bearer s3cret")).status).toBe(200);
  });
});

describe("GATE-8E refusals and failures", () => {
  it.each([undefined, "Bearer wrong", "s3cret", "Basic s3cret"])("with a secret configured, %j is refused with 401 and the API is not touched", async (header) => {
    vi.stubEnv("CRON_SECRET", "s3cret");

    const res = await call(header); // no API handler: MSW fails the test if the API is called

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("turns an API that is not ok into a 502 that still says what the API answered", async () => {
    categories(503);

    const res = await call();

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, status: 503, durationMs: expect.any(Number) });
  });

  it("turns a network failure into a 502 with the reason", async () => {
    server.use(http.get(`${API}/api/categories`, () => HttpResponse.error()));

    const res = await call();

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, error: expect.any(String), durationMs: expect.any(Number) });
  });
});
