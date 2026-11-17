import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/tests/_support/msw-server";

/* The same-origin proxy that hides Supabase Storage (flows PRX-1 and PRX-1E). */

const ORIGIN = "https://storage.test";

async function load(origin: string | null = `${ORIGIN}/`) {
  vi.resetModules();
  vi.stubEnv("MEDIA_STORAGE_ORIGIN", origin ?? "");
  const { GET } = await import("@/src/app/media/[...path]/route");
  return (path: string[], init?: RequestInit) => GET(new Request(`http://localhost/media/${path.join("/")}`, init), { params: Promise.resolve({ path }) });
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe("PRX-1 serving an image", () => {
  it("streams the object and returns only the allowed headers plus a 3-day cache", async () => {
    server.use(
      http.get(`${ORIGIN}/products/a.jpg`, () =>
        HttpResponse.text("IMAGE", {
          headers: {
            "content-type": "image/jpeg",
            etag: '"abc"',
            "last-modified": "Wed, 21 Oct 2026 07:28:00 GMT",
            "sb-project-ref": "secret-ref",
            "set-cookie": "a=b",
            "x-internal": "1",
          },
        })
      )
    );
    const get = await load();

    const res = await get(["products", "a.jpg"]);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("IMAGE");
    expect(res.headers.get("content-type")).toContain("image/jpeg");
    expect(res.headers.get("etag")).toBe('"abc"');
    expect(res.headers.get("last-modified")).toBe("Wed, 21 Oct 2026 07:28:00 GMT");
    expect(res.headers.get("cache-control")).toBe("public, max-age=259200");
    expect(res.headers.get("sb-project-ref")).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("x-internal")).toBeNull();
  });

  it("ignores trailing slashes of the configured origin and encodes each path segment", async () => {
    let url = "";
    server.use(
      http.get(`${ORIGIN}/*`, ({ request }) => {
        url = new URL(request.url).pathname;
        return HttpResponse.text("ok");
      })
    );
    const get = await load(`${ORIGIN}///`);

    await get(["folder", "a b.jpg"]);

    expect(url).toBe("/folder/a%20b.jpg");
  });

  it("forwards a Range request and returns the 206 as it is", async () => {
    let range: string | null = null;
    server.use(
      http.get(`${ORIGIN}/v.mp4`, ({ request }) => {
        range = request.headers.get("range");
        return new HttpResponse("PART", { status: 206, headers: { "content-type": "video/mp4", "content-range": "bytes 0-3/10" } });
      })
    );
    const get = await load();

    const res = await get(["v.mp4"], { headers: { range: "bytes=0-3" } });

    expect(range).toBe("bytes=0-3");
    expect(res.status).toBe(206);
    expect(await res.text()).toBe("PART");
    expect(res.headers.get("content-range")).toBeNull(); // known gap: only four headers are forwarded (see the spec)
  });

  it("does not forward the visitor's other headers upstream", async () => {
    let cookie: string | null = "unset";
    server.use(
      http.get(`${ORIGIN}/a.jpg`, ({ request }) => {
        cookie = request.headers.get("cookie");
        return HttpResponse.text("ok");
      })
    );
    const get = await load();

    await get(["a.jpg"], { headers: { cookie: "session=1", authorization: "Bearer x" } });

    expect(cookie).toBeNull();
  });
});

describe("PRX-1E refusals and upstream failures", () => {
  it("answers 503 when the storage origin is not configured", async () => {
    const get = await load(null);

    const res = await get(["a.jpg"]);

    expect(res.status).toBe(503);
  });

  it.each([[["..", "secret"]], [["a", ".."]], [["."]], [["a/b"]], [["a", "b/c.jpg"]]])("refuses the path %j with 404 without asking upstream", async (path) => {
    const get = await load(); // no handler: MSW fails the test if upstream is called

    const res = await get(path);

    expect(res.status).toBe(404);
  });

  it.each([
    [404, 404],
    [400, 404],
    [403, 502],
    [500, 502],
    [503, 502],
    [304, 502],
  ])("upstream %d becomes %d", async (upstream, answer) => {
    server.use(http.get(`${ORIGIN}/a.jpg`, () => new HttpResponse(null, { status: upstream })));
    const get = await load();

    const res = await get(["a.jpg"]);

    expect(res.status).toBe(answer);
    expect(res.headers.get("cache-control")).toBeNull();
  });
});
