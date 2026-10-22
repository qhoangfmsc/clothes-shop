import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { fetchCart } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { fetchWishlist } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import { isPurchasable } from "@/src/lib/product-purchase";
import { makeStore } from "@/src/store";
import { API, seedSession } from "@/tests/_support/api";
import { cartLine, cartState, product, quote, serverCart, serverWishlist, wishlistItem, wishlistState } from "@/tests/_support/fixtures";
import { media } from "@/tests/_support/media-query";
import { msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";

/* The shared sample data and the matchMedia stand-in (specs/platform/dev-tooling.md, flows QG-15 and QG-15E). */

describe("QG-15 sample data", () => {
  it("product() is a complete product that can be bought, and any field can be replaced", () => {
    const p = product({ name: "Silk dress", badge: "sold_out" });

    expect(p).toMatchObject({ id: expect.any(String), name: "Silk dress", sizes: expect.any(Array), colors: expect.any(Array) });
    expect(p.colors[0]).toEqual({ name: expect.any(String), hex: expect.stringMatching(/^#/) });
    expect(isPurchasable(product().badge)).toBe(true);
    expect(isPurchasable(p.badge)).toBe(false);
  });

  it("cartLine() is one priced line, and any field can be replaced", () => {
    expect(cartLine()).toMatchObject({ size: "M", color: "Red", quantity: 1, lineTotalVnd: 350_000 });
    expect(cartLine({ quantity: 3, size: "L" })).toMatchObject({ quantity: 3, size: "L" });
  });

  it("cartState() is a full cart state for the store, with the lines given", () => {
    const state = cartState([cartLine()], { isOpen: true });

    expect(state).toEqual({ items: [cartLine()], deselectedKeys: [], pendingAddKeys: [], pendingSync: 0, isOpen: true, isSyncing: false });
    expect(makeStore({ cart: state }).getState().cart.items).toHaveLength(1);
  });

  it("serverCart() gives lines an id, keeps the id a line already has, and is what fetchCart reads back", async () => {
    const lines = [cartLine({ productId: "a", serverItemId: "keep-me" }), cartLine({ productId: "b", size: "S", color: "Blue", colorHex: "#00f", quantity: 2, lineTotalVnd: null, lineTotalUsd: null })];
    expect(serverCart(lines).data.items.map((i) => i.id)).toEqual(["keep-me", "si-b-S-Blue"]);
    seedSession({ access: "test-access" });
    server.use(http.get(`${API}/api/cart`, () => HttpResponse.json(serverCart(lines))));
    const store = makeStore();

    await store.dispatch(fetchCart());

    const [a, b] = store.getState().cart.items;
    expect(a).toEqual(lines[0]);
    expect(b).toMatchObject({ productId: "b", size: "S", color: "Blue", colorHex: "#00f", quantity: 2, serverItemId: "si-b-S-Blue", lineTotalVnd: 350_000 * 2 });
  });
});

describe("QG-15 sample quote and wishlist", () => {
  it("quote() is a complete price quote whose total is the subtotal plus the shipping fee, and any field can be replaced", () => {
    const q = quote();

    expect(q.totalVnd).toBe(q.subtotalVnd + q.shippingFeeVnd);
    expect(quote({ shippingMethod: "express", freeShipping: true })).toMatchObject({ shippingMethod: "express", freeShipping: true });
  });

  it("wishlistItem() and wishlistState() fit the wishlist slice", () => {
    const state = wishlistState([wishlistItem({ productId: "p2" })], { isSyncing: true });

    expect(state).toEqual({ items: [wishlistItem({ productId: "p2" })], isSyncing: true });
    expect(makeStore({ wishlist: state }).getState().wishlist.items.map((i) => i.productId)).toEqual(["p2"]);
    expect(wishlistState()).toEqual({ items: [], isSyncing: false });
  });

  it("serverWishlist() gives the shape of GET /api/wishlist that fetchWishlist reads back into the same items", async () => {
    const items = [wishlistItem({ productId: "a", addedAt: "2026-02-01T00:00:00.000Z" }), wishlistItem({ productId: "b", name: "Skirt", badge: "custom_order" })];
    seedSession({ access: "test-access" });
    server.use(http.get(`${API}/api/wishlist`, () => HttpResponse.json(serverWishlist(items))));
    const store = makeStore();

    await store.dispatch(fetchWishlist());

    expect(store.getState().wishlist.items).toEqual(items);
  });
});

describe("QG-15 msgf", () => {
  it("fills the {placeholders} of a real message, in either language", () => {
    expect(msgf("private.cart.header.itemCount", { count: 3 })).toBe("3 sản phẩm");
    expect(msgf("private.cart.item.size", { size: "M" }, "en")).toBe(msg("private.cart.item.size", "en").replace("{size}", "M"));
  });

  it("leaves a placeholder it was not given, and throws for a key that does not exist", () => {
    expect(msgf("private.cart.item.size", {})).toContain("{size}");
    expect(() => msgf("private.cart.nope", {})).toThrow('no message "private.cart.nope" in vi');
  });
});

describe("QG-15E matchMedia", () => {
  it("is there (jsdom has none) and matches nothing by default", () => {
    const query = window.matchMedia("(min-width: 640px)");

    expect(query.matches).toBe(false);
    expect(query.media).toBe("(min-width: 640px)");
    expect(() => query.addEventListener("change", () => {})).not.toThrow();
  });

  it("answers as the test says, per question", () => {
    media.matching = (query) => query.includes("640");

    expect(window.matchMedia("(min-width: 640px)").matches).toBe(true);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);
  });

  it("also replaces window.scrollTo, which jsdom only complains about", () => {
    const complaints = vi.spyOn(console, "error").mockImplementation(() => {});

    window.scrollTo(0, 100);

    expect(complaints).not.toHaveBeenCalled();
    complaints.mockRestore();
  });

  it("is back to the default in the next test (reset after each test)", () => {
    expect(window.matchMedia("(min-width: 640px)").matches).toBe(false);
  });
});
