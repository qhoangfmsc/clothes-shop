import { describe, expect, it } from "vitest";
import { WARM_UP_PATHS, warmUp } from "@/tests/_support/warm-up";

/* Playwright's global setup (specs/platform/dev-tooling.md, flows GATE-11 and GATE-11E). */

function recorder(answer: (url: string) => Promise<Response> = async () => new Response("ok")) {
  const calls: string[] = [];
  let running = 0;
  let overlapped = false;
  const get = async (input: URL | RequestInfo) => {
    calls.push(String(input));
    if (++running > 1) overlapped = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return await answer(String(input));
    } finally {
      running--;
    }
  };
  return { calls, get: get as typeof fetch, overlapped: () => overlapped };
}

describe("GATE-11 warm-up opens the pages one after another", () => {
  it("opens every page, in order, from the configured address", async () => {
    const r = recorder();

    await warmUp("http://localhost:4000", r.get);

    expect(r.calls).toEqual(WARM_UP_PATHS.map((path) => `http://localhost:4000${path}`));
    expect(WARM_UP_PATHS).toEqual(expect.arrayContaining(["/vi", "/en", "/vi/shop", "/vi/login", "/vi/cart", "/vi/orders", "/vi/wishlist", "/vi/account"]));
  });

  it("never has two requests in flight (a cold dev server must not compile two pages at once)", async () => {
    const r = recorder();

    await warmUp("http://localhost:4000", r.get);

    expect(r.overlapped()).toBe(false);
  });
});

describe("GATE-11E a page that fails does not stop the others", () => {
  it("goes on after a network error", async () => {
    const r = recorder(async (url) => {
      if (url.endsWith("/vi/cart")) throw new Error("connection refused");
      return new Response("ok");
    });

    await expect(warmUp("http://localhost:4000", r.get)).resolves.toBeUndefined();
    expect(r.calls).toHaveLength(WARM_UP_PATHS.length);
  });

  it("goes on after a 500", async () => {
    const r = recorder(async () => new Response("boom", { status: 500 }));

    await warmUp("http://localhost:4000", r.get);

    expect(r.calls).toHaveLength(WARM_UP_PATHS.length);
  });
});
