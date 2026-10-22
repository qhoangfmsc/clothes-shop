import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { CartItem } from "@/src/app/[locale]/(private)/cart/_common/types";
import { useOrderQuote } from "@/src/app/[locale]/(private)/checkout/_common/use-order-quote";
import type { ShippingMethodId } from "@/src/types/shipping";
import { API } from "@/tests/_support/api";
import { cartLine, cartState, quote, serverCart } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* The price quote hook (specs/storefront/checkout.md, flows CHK-3 and CHK-3E). */

interface ProbeProps {
  items: CartItem[];
  method: ShippingMethodId;
  enabled?: boolean;
}

function Probe({ items, method, enabled = true }: ProbeProps) {
  const result = useOrderQuote(items, method, enabled);
  return (
    <div>
      <p>{result.quote ? `quote ${result.quote.shippingMethod} ${result.quote.totalVnd}` : "no quote"}</p>
      <p>{result.error ? "failed" : "no error"}</p>
      <p>{result.isLoading ? "loading" : "idle"}</p>
    </div>
  );
}

const A = (over: Partial<CartItem> = {}) => cartLine({ productId: "a", serverItemId: "srv-a", ...over });
const B = (over: Partial<CartItem> = {}) => cartLine({ productId: "b", serverItemId: "srv-b", ...over });

/** Fake BE: answers quotes per shipping method and records every request. */
function backend(options: { cart?: CartItem[]; reject400For?: string[][]; fail?: boolean } = {}) {
  const calls = { quotes: [] as { cartItemIds: string[]; shippingMethod: string }[], carts: 0 };
  server.use(
    http.post(`${API}/api/orders/quote`, async ({ request }) => {
      const body = (await request.json()) as { cartItemIds: string[]; shippingMethod: ShippingMethodId };
      calls.quotes.push(body);
      if (options.fail) return HttpResponse.json({ message: "boom" }, { status: 500 });
      if (options.reject400For?.some((ids) => ids.join() === body.cartItemIds.join())) return HttpResponse.json({ message: "stale ids" }, { status: 400 });
      return HttpResponse.json({ data: quote({ shippingMethod: body.shippingMethod, totalVnd: body.shippingMethod === "express" ? 410_000 : 380_000 }) });
    }),
    http.get(`${API}/api/cart`, () => {
      calls.carts += 1;
      return HttpResponse.json(serverCart(options.cart ?? []));
    })
  );
  return calls;
}

const show = (items: CartItem[], method: ShippingMethodId = "standard", enabled = true) =>
  renderApp(<Probe items={items} method={method} enabled={enabled} />, { as: "user", store: { cart: cartState(items) } });

describe("CHK-3 asking the BE for a price", () => {
  it("sends the ids kept in the bag and the shipping method, and returns the BE's quote", async () => {
    const calls = backend();

    await show([A(), B()]);

    expect(await screen.findByText("quote standard 380000")).toBeInTheDocument();
    expect(calls.quotes).toEqual([{ cartItemIds: ["srv-a", "srv-b"], shippingMethod: "standard" }]);
    expect(calls.carts).toBe(0);
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByText("no error")).toBeInTheDocument();
  });

  it("says it is loading until the BE answers", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(`${API}/api/orders/quote`, async () => {
        await open;
        return HttpResponse.json({ data: quote() });
      })
    );
    await show([A()]);

    expect(await screen.findByText("loading")).toBeInTheDocument();
    release();

    expect(await screen.findByText("idle")).toBeInTheDocument();
  });

  it("asks again when the shipping method changes", async () => {
    const calls = backend();
    const view = await show([A()]);
    await screen.findByText("quote standard 380000");

    view.rerender(<Probe items={[A()]} method="express" />);

    expect(await screen.findByText("quote express 410000")).toBeInTheDocument();
    expect(calls.quotes.map((q) => q.shippingMethod)).toEqual(["standard", "express"]);
  });

  it("asks again when a quantity or the set of lines changes", async () => {
    const calls = backend();
    const view = await show([A()]);
    await screen.findByText("quote standard 380000");

    view.rerender(<Probe items={[A({ quantity: 3 })]} method="standard" />);
    await waitFor(() => expect(calls.quotes).toHaveLength(2));
    view.rerender(<Probe items={[A({ quantity: 3 }), B()]} method="standard" />);

    await waitFor(() => expect(calls.quotes).toHaveLength(3));
    expect(calls.quotes[2].cartItemIds).toEqual(["srv-a", "srv-b"]);
  });

  it("does not ask again when the same lines arrive in a new list (the store makes a new array on every change)", async () => {
    const calls = backend();
    const view = await show([A(), B()]);
    await screen.findByText("quote standard 380000");

    view.rerender(<Probe items={[A(), B()]} method="standard" />);
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(calls.quotes).toHaveLength(1);
  });

  it("drops the answer of an older question: a slow answer for the old method never shows over the new one", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(`${API}/api/orders/quote`, async ({ request }) => {
        const { shippingMethod } = (await request.json()) as { shippingMethod: ShippingMethodId };
        if (shippingMethod === "standard") await open;
        return HttpResponse.json({ data: quote({ shippingMethod, totalVnd: shippingMethod === "express" ? 410_000 : 380_000 }) });
      })
    );
    const view = await show([A()]);
    view.rerender(<Probe items={[A()]} method="express" />);
    expect(await screen.findByText("quote express 410000")).toBeInTheDocument();

    release();
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(screen.getByText("quote express 410000")).toBeInTheDocument();
    expect(screen.getByText("idle")).toBeInTheDocument();
  });
});

describe("CHK-3E ids that are out of date, and a quote that cannot be had", () => {
  it("reads the BE cart for fresh ids when the BE says 400 to the ones kept here, then asks again", async () => {
    const calls = backend({ cart: [A({ serverItemId: "srv-new" })], reject400For: [["srv-a"]] });

    await show([A()]);

    expect(await screen.findByText("quote standard 380000")).toBeInTheDocument();
    expect(calls.quotes.map((q) => q.cartItemIds)).toEqual([["srv-a"], ["srv-new"]]);
    expect(calls.carts).toBe(1);
  });

  it("goes to the BE cart first when a line has no id yet (the first question is already the fresh one)", async () => {
    const calls = backend({ cart: [A({ serverItemId: "srv-from-be" })] });

    await show([A({ serverItemId: undefined })]);

    expect(await screen.findByText("quote standard 380000")).toBeInTheDocument();
    expect(calls.carts).toBe(1);
    expect(calls.quotes.map((q) => q.cartItemIds)).toEqual([["srv-from-be"]]);
  });

  it("reports an error, and sends no quote request, when the BE cart does not have a reviewed line", async () => {
    const calls = backend({ cart: [] });

    await show([A({ serverItemId: undefined })]);

    expect(await screen.findByText("failed")).toBeInTheDocument();
    expect(screen.getByText("no quote")).toBeInTheDocument();
    expect(calls.quotes).toEqual([]);
  });

  it("reports an error for any other failure and does not read the cart", async () => {
    const calls = backend({ fail: true });

    await show([A()]);

    expect(await screen.findByText("failed")).toBeInTheDocument();
    expect(screen.getByText("no quote")).toBeInTheDocument();
    expect(calls.carts).toBe(0);
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("clears the error once a later question succeeds", async () => {
    server.use(
      http.post(`${API}/api/orders/quote`, async ({ request }) => {
        const { shippingMethod } = (await request.json()) as { shippingMethod: ShippingMethodId };
        return shippingMethod === "standard" ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json({ data: quote({ shippingMethod: "express", totalVnd: 410_000 }) });
      })
    );
    const view = await show([A()]);
    expect(await screen.findByText("failed")).toBeInTheDocument();

    view.rerender(<Probe items={[A()]} method="express" />);

    expect(await screen.findByText("quote express 410000")).toBeInTheDocument();
    expect(screen.getByText("no error")).toBeInTheDocument();
  });

  it("asks nothing when it is switched off", async () => {
    const calls = backend();

    await show([A()], "standard", false);
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(calls.quotes).toEqual([]);
    expect(screen.getByText("no quote")).toBeInTheDocument();
  });

  it("asks nothing for an empty bag", async () => {
    const calls = backend();

    await show([]);
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(calls.quotes).toEqual([]);
    expect(calls.carts).toBe(0);
  });
});
