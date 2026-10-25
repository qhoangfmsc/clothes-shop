import { beforeEach, describe, expect, it, vi } from "vitest";
import { FUNNEL_EVENTS, moneyProp, trackEvent } from "@/src/lib/analytics";
import { percentChange } from "@/src/lib/percent-change";

const tracked = vi.hoisted(() => ({
  calls: [] as unknown[][],
  fail: false,
  track(...args: unknown[]) {
    if (tracked.fail) throw new Error("blocked");
    tracked.calls.push(args);
  },
}));
vi.mock("@vercel/analytics", () => ({ track: tracked.track }));

/* Sending events and comparing two periods (specs/admin/analytics.md, flows ANA-9 and ANA-10). */

beforeEach(() => {
  tracked.calls.length = 0;
  tracked.fail = false;
});

describe("ANA-9 sending events", () => {
  it("passes the name and the data on to Vercel", () => {
    trackEvent("add_to_cart", { productId: "p1", vnd: 350_000 });

    expect(tracked.calls).toEqual([["add_to_cart", { productId: "p1", vnd: 350_000 }]]);
  });

  it("never breaks the page when sending fails (an ad blocker, offline, the server)", () => {
    tracked.fail = true;

    expect(() => trackEvent("purchase", { orderId: "o-1", usd: 13.46 })).not.toThrow();
  });

  it("sends an amount as the dong for Vietnamese and as dollars for any other language", () => {
    expect(moneyProp({ vnd: 350_000, usd: 13.46 }, "vi")).toEqual({ vnd: 350_000 });
    expect(moneyProp({ vnd: 350_000, usd: 13.46 }, "en")).toEqual({ usd: 13.46 });
    expect(moneyProp({ vnd: 350_000, usd: 13.46 }, "fr")).toEqual({ usd: 13.46 });
  });

  it("keeps the funnel steps in the order shoppers go through them", () => {
    expect([...FUNNEL_EVENTS]).toEqual(["view_product", "add_to_cart", "begin_checkout", "purchase"]);
  });
});

describe("ANA-10 comparing two periods", () => {
  it.each([
    [150, 100, 0.5],
    [50, 100, -0.5],
    [100, 100, 0],
    [0, 100, -1],
    [10, 4, 1.5],
  ])("is %d against %d a change of %d", (current, previous, change) => {
    expect(percentChange(current, previous)).toBeCloseTo(change);
  });

  it.each([[0], [null], [undefined]])("has nothing to compare against when the previous is %s", (previous) => {
    expect(percentChange(50, previous)).toBeNull();
  });
});
