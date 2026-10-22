import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import CartContent from "@/src/app/[locale]/(private)/cart/CartContent";
import type { OrderQuote } from "@/src/app/[locale]/(private)/checkout/_common/checkout";
import { API } from "@/tests/_support/api";
import { cartLine, cartState, quote, serverCart, wishlistItem, wishlistState } from "@/tests/_support/fixtures";
import { msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The cart page, as a visitor and as a signed-in customer (specs/storefront/cart.md, flows CART-9 to CART-16E). */

type Line = ReturnType<typeof cartLine>;
const A = (over: Partial<Line> = {}) => cartLine({ serverItemId: "srv-a", ...over });
const B = (over: Partial<Line> = {}) => cartLine({ productId: "p2", name: "Skirt", serverItemId: "srv-b", ...over });

/** The fake BE behind the page: records what the page sends and answers with the cart it is given. */
function backend(options: { lines?: Line[]; quote?: OrderQuote | "error" } = {}) {
  const calls = { quotes: [] as string[][], patches: [] as { id: string; quantity: number }[], deletes: [] as string[], wishlistAdds: [] as string[], wishlistRemoves: [] as string[] };
  server.use(
    http.post(`${API}/api/orders/quote`, async ({ request }) => {
      calls.quotes.push(((await request.json()) as { cartItemIds: string[] }).cartItemIds);
      return options.quote === "error" ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json({ data: options.quote ?? quote() });
    }),
    http.get(`${API}/api/cart`, () => HttpResponse.json(serverCart(options.lines ?? []))),
    http.patch(`${API}/api/cart/items/:id`, async ({ request, params }) => {
      calls.patches.push({ id: String(params.id), quantity: ((await request.json()) as { quantity: number }).quantity });
      return HttpResponse.json(serverCart(options.lines ?? []));
    }),
    http.delete(`${API}/api/cart/items/:id`, ({ params }) => {
      calls.deletes.push(String(params.id));
      return HttpResponse.json(serverCart([]));
    }),
    http.post(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.wishlistAdds.push(String(params.id));
      return HttpResponse.json({});
    }),
    http.delete(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.wishlistRemoves.push(String(params.id));
      return HttpResponse.json({});
    })
  );
  return calls;
}

const asUser = (lines: Line[], options: { backend?: Parameters<typeof backend>[0]; locale?: "vi" | "en"; cart?: Partial<ReturnType<typeof cartState>>; wishlist?: ReturnType<typeof wishlistItem>[] } = {}) => {
  const calls = backend({ lines, ...options.backend });
  return renderApp(<CartContent />, {
    as: "user",
    locale: options.locale,
    store: { cart: cartState(lines, options.cart), wishlist: wishlistState(options.wishlist ?? []) },
  }).then((view) => ({ ...view, calls }));
};

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const rowOf = (name: string) => screen.getByRole("checkbox", { name: msgf("private.cart.item.select", { name }) }).closest("li") as HTMLElement;
const selectAll = () => screen.getByRole("checkbox", { name: new RegExp(msg("private.cart.bulk.selectAll")) });
const counter = (selected: number, total: number) => msgf("private.cart.bulk.selectedCount", { selected, total });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("CART-9 a visitor who is not signed in", () => {
  it("sees the sign-in wall and none of the cart, even when this browser still holds lines", async () => {
    backend();
    await renderApp(<CartContent />, { as: "guest", store: { cart: cartState([A()]) } });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: msg("private.cart.header.title") })).not.toBeInTheDocument();
    expect(screen.queryByText("Dress")).not.toBeInTheDocument();
  });
});

describe("CART-9E while the session is being worked out", () => {
  it("shows only a placeholder: no cart, no wall; then the cart", async () => {
    backend({ lines: [A()] });
    await renderApp(<CartContent />, { as: "user", waitForAuth: false, store: { cart: cartState([A()]) } });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("Dress")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 1, name: msg("private.cart.header.title") })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).not.toBeInTheDocument();
  });
});

describe("CART-10 an empty cart", () => {
  it("says so and points to the shop, with nothing to select or buy", async () => {
    await asUser([]);

    expect(screen.getByRole("heading", { level: 2, name: msg("private.cart.empty.title") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: msg("private.cart.empty.browse") })).toHaveAttribute("href", "/shop");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(msgf("private.cart.header.itemCount", { count: 0 }))).not.toBeInTheDocument();
    expect(screen.queryByText(msg("private.cart.checkout.action"))).not.toBeInTheDocument();
  });
});

describe("CART-11 a cart with lines", () => {
  it("shows the title, the number of items, and for each line its name, size, colour, unit price and line total", async () => {
    await asUser([A({ quantity: 2, lineTotalVnd: 700_000 }), B({ priceVnd: 500_000, lineTotalVnd: 500_000, size: "L", color: "Blue" })]);

    expect(screen.getByRole("heading", { level: 1, name: msg("private.cart.header.title") })).toBeInTheDocument();
    expect(screen.getByText(msgf("private.cart.header.itemCount", { count: 3 }))).toBeInTheDocument();
    const first = within(rowOf("Dress"));
    expect(first.getByText(msgf("private.cart.item.size", { size: "M" }))).toBeInTheDocument();
    expect(first.getByText("Red")).toBeInTheDocument();
    expect(first.getByText("350.000 VNĐ")).toBeInTheDocument();
    expect(first.getByText("700.000 VNĐ")).toBeInTheDocument();
    const second = within(rowOf("Skirt"));
    expect(second.getByText(msgf("private.cart.item.size", { size: "L" }))).toBeInTheDocument();
    expect(second.getAllByText("500.000 VNĐ")).toHaveLength(2);
  });

  it("shows dollars in English", async () => {
    await asUser([A({ priceUsd: 13.46, lineTotalUsd: 13.46 })], { locale: "en" });

    expect(screen.getAllByText("$13.46")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 1, name: msg("private.cart.header.title", "en") })).toBeInTheDocument();
  });

  it("shows … for a line total the BE has not priced yet, and never works one out from the unit price", async () => {
    await asUser([A({ quantity: 3, lineTotalVnd: null, lineTotalUsd: null })]);

    const row = within(rowOf("Dress"));
    expect(row.getByText("…")).toBeInTheDocument();
    expect(row.queryByText("1.050.000 VNĐ")).not.toBeInTheDocument();
  });

  it("links the picture and the name to the product page", async () => {
    await asUser([A()]);

    const links = within(rowOf("Dress")).getAllByRole("link", { name: "Dress" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/shop/tops/shirts/p1");
  });

  it("looks the product up on click when the line has no category (saved before the BE sent it) and goes there", async () => {
    server.use(http.get(`${API}/api/products/p1`, () => HttpResponse.json({ data: { id: "p1", category: { slug: "dresses" }, subcategory: { slug: "midi" } } })));
    await asUser([A({ category: "", subcategory: "" })]);
    const [link] = within(rowOf("Dress")).getAllByRole("link", { name: "Dress" });
    expect(link).toHaveAttribute("href", "/shop");

    await userEvent.click(link);

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/dresses/midi/p1"));
  });

  it("goes to the shop when that lookup finds nothing", async () => {
    server.use(http.get(`${API}/api/products/p1`, () => HttpResponse.json({ message: "nope" }, { status: 404 })));
    await asUser([A({ category: "", subcategory: "" })]);

    await userEvent.click(within(rowOf("Dress")).getAllByRole("link", { name: "Dress" })[0]);

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop"));
  });
});

describe("CART-11E lines that cannot be bought", () => {
  const lines = () => [A(), B({ badge: "sold_out" }), cartLine({ productId: "p3", name: "Gown", serverItemId: "srv-c", badge: "custom_order", priceVnd: 900_000, lineTotalVnd: 900_000 })];

  it("locks the tick box of a sold-out line and says why", async () => {
    await asUser(lines());

    expect(screen.getByRole("checkbox", { name: msgf("private.cart.item.select", { name: "Skirt" }) })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: msgf("private.cart.item.select", { name: "Skirt" }) })).not.toBeChecked();
    expect(within(rowOf("Skirt")).getByText(new RegExp(msg("private.cart.item.unavailable.soldOut").slice(0, 20)))).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: msgf("private.cart.item.select", { name: "Dress" }) })).toBeEnabled();
  });

  it("tells a custom-order line apart: no price, no total, a link to ask for it", async () => {
    await asUser(lines());

    const row = within(rowOf("Gown"));
    expect(row.getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
    expect(row.queryByText("900.000 VNĐ")).not.toBeInTheDocument();
    expect(row.getByText(new RegExp(msg("private.cart.item.unavailable.customOrder").slice(0, 20)))).toBeInTheDocument();
    expect(row.getByRole("link", { name: msg("private.cart.item.unavailable.orderCta") })).toHaveAttribute("href", "/contact?product=p3");
  });

  it("counts only the lines that can be bought, and 'select all' ignores the others", async () => {
    await asUser(lines());

    expect(screen.getByText(counter(1, 1))).toBeInTheDocument();
    expect(selectAll()).toBeChecked();
    expect(screen.getByText(msgf("private.cart.checkout.subtotal", { count: 1 }))).toBeInTheDocument();
  });

  it("with nothing that can be bought, select-all is locked and checkout is closed", async () => {
    await asUser([B({ badge: "sold_out" })]);

    expect(selectAll()).toBeDisabled();
    expect(selectAll()).not.toBeChecked();
    expect(screen.getByText(msg("private.cart.checkout.selectToCheckout"))).toBeInTheDocument();
    expect(button(msg("private.cart.checkout.action"))).toBeDisabled();
  });
});

describe("CART-12 choosing the lines to buy", () => {
  it("starts with every line chosen", async () => {
    const { store } = await asUser([A(), B()]);

    expect(screen.getByText(counter(2, 2))).toBeInTheDocument();
    expect(selectAll()).toBeChecked();
    expect(store.getState().cart.deselectedKeys).toEqual([]);
  });

  it("unchoosing one line leaves 'select all' half-ticked, and choosing it again restores", async () => {
    const { store } = await asUser([A(), B()]);

    await userEvent.click(screen.getByRole("checkbox", { name: msgf("private.cart.item.select", { name: "Skirt" }) }));

    expect(screen.getByText(counter(1, 2))).toBeInTheDocument();
    expect((selectAll() as HTMLInputElement).indeterminate).toBe(true);
    expect(store.getState().cart.deselectedKeys).toEqual(["p2|M|Red"]);

    await userEvent.click(screen.getByRole("checkbox", { name: msgf("private.cart.item.select", { name: "Skirt" }) }));
    expect(screen.getByText(counter(2, 2))).toBeInTheDocument();
    expect((selectAll() as HTMLInputElement).indeterminate).toBe(false);
  });

  it("'select all' on a half-ticked list chooses everything, and once more chooses nothing", async () => {
    await asUser([A(), B()], { cart: { deselectedKeys: ["p2|M|Red"] } });
    expect(screen.getByText(counter(1, 2))).toBeInTheDocument();

    await userEvent.click(selectAll());
    expect(screen.getByText(counter(2, 2))).toBeInTheDocument();

    await userEvent.click(selectAll());
    expect(screen.getByText(counter(0, 2))).toBeInTheDocument();
    expect(selectAll()).not.toBeChecked();
  });
});

describe("CART-13 changing a quantity", () => {
  it("changes at once on screen and sends one PATCH after the shopper stops clicking", async () => {
    const { store, calls } = await asUser([A({ quantity: 1 })]);
    const row = within(rowOf("Dress"));

    await userEvent.click(row.getByRole("button", { name: msg("private.cart.quantity.increase") }));
    await userEvent.click(row.getByRole("button", { name: msg("private.cart.quantity.increase") }));
    await userEvent.click(row.getByRole("button", { name: msg("private.cart.quantity.increase") }));

    expect(store.getState().cart.items[0].quantity).toBe(4);
    expect(row.getByText("4")).toBeInTheDocument();
    expect(calls.patches).toEqual([]);
    await waitFor(() => expect(calls.patches).toEqual([{ id: "srv-a", quantity: 4 }]), { timeout: 2000 });
    await wait(700);
    expect(calls.patches).toHaveLength(1);
  });

  it("goes down as well, and the line total waits for the BE (…)", async () => {
    const { store, calls } = await asUser([A({ quantity: 3 })]);
    const row = within(rowOf("Dress"));

    await userEvent.click(row.getByRole("button", { name: msg("private.cart.quantity.decrease") }));

    expect(store.getState().cart.items[0]).toMatchObject({ quantity: 2, lineTotalVnd: null });
    await waitFor(() => expect(calls.patches).toEqual([{ id: "srv-a", quantity: 2 }]), { timeout: 2000 });
  });

  it("cannot go below 1 or above 10", async () => {
    await asUser([A({ quantity: 1 }), B({ quantity: 10 })]);

    expect(within(rowOf("Dress")).getByRole("button", { name: msg("private.cart.quantity.decrease") })).toBeDisabled();
    expect(within(rowOf("Dress")).getByRole("button", { name: msg("private.cart.quantity.increase") })).toBeEnabled();
    expect(within(rowOf("Skirt")).getByRole("button", { name: msg("private.cart.quantity.increase") })).toBeDisabled();
    expect(within(rowOf("Skirt")).getByRole("button", { name: msg("private.cart.quantity.decrease") })).toBeEnabled();
  });
});

/** A line whose "add" request is still in flight: no id from the BE yet, and no quote is asked until it is answered. */
const BEING_ADDED = { pendingSync: 1, pendingAddKeys: ["p1|M|Red"] };

describe("CART-13E a quantity the BE does not hear about", () => {
  it("a line the BE has not confirmed yet changes only here and sends nothing (see the spec, section 7)", async () => {
    const { store, calls } = await asUser([A({ serverItemId: undefined })], { cart: BEING_ADDED });

    await userEvent.click(within(rowOf("Dress")).getByRole("button", { name: msg("private.cart.quantity.increase") }));

    expect(store.getState().cart.items[0].quantity).toBe(2);
    await wait(800);
    expect(calls.patches).toEqual([]);
  });

  it("a PATCH the BE refuses leaves the page as it is", async () => {
    const { store } = await asUser([A()]);
    server.use(http.patch(`${API}/api/cart/items/:id`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    await userEvent.click(within(rowOf("Dress")).getByRole("button", { name: msg("private.cart.quantity.increase") }));

    await waitFor(() => expect(store.getState().cart.pendingSync).toBe(0), { timeout: 2000 });
    await wait(700);
    expect(store.getState().cart.items[0].quantity).toBe(2);
    expect(screen.getByRole("heading", { level: 1, name: msg("private.cart.header.title") })).toBeInTheDocument();
  });
});

describe("CART-14 taking lines out", () => {
  const confirmButton = () => within(screen.getByRole("alertdialog")).getByRole("button", { name: msg("private.cart.bulk.confirmRemove.confirm") });

  it("asks first, then removes the line here and on the BE", async () => {
    const { store, calls } = await asUser([A(), B()]);

    await userEvent.click(within(rowOf("Dress")).getByRole("button", { name: msgf("private.cart.item.remove", { name: "Dress" }) }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(msgf("private.cart.item.confirmRemove", { name: "Dress" }));
    await userEvent.click(confirmButton());

    await waitFor(() => expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["p2"]));
    await waitFor(() => expect(calls.deletes).toEqual(["srv-a"]));
    expect(screen.queryByRole("checkbox", { name: msgf("private.cart.item.select", { name: "Dress" }) })).not.toBeInTheDocument();
  });

  it("removes the chosen lines in one go: one question, every line, a toast with the count", async () => {
    const { store, calls } = await asUser([A(), B(), cartLine({ productId: "p3", name: "Coat", serverItemId: "srv-c" })], { cart: { deselectedKeys: ["p3|M|Red"] } });

    await userEvent.click(button(msg("private.cart.bulk.remove")));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(msgf("private.cart.bulk.confirmRemove.message", { count: 2 }));
    await userEvent.click(confirmButton());

    await waitFor(() => expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["p3"]));
    await waitFor(() => expect([...calls.deletes].sort()).toEqual(["srv-a", "srv-b"]));
    expect(await screen.findByText(msgf("private.cart.toast.removed", { count: 2 }))).toBeInTheDocument();
  });
});

describe("CART-14E taking lines out that should stay or that the BE does not know", () => {
  it("does nothing when the shopper says no", async () => {
    const { store, calls } = await asUser([A()]);

    await userEvent.click(within(rowOf("Dress")).getByRole("button", { name: msgf("private.cart.item.remove", { name: "Dress" }) }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(store.getState().cart.items).toHaveLength(1);
    expect(calls.deletes).toEqual([]);
  });

  it("does nothing for the bulk remove when the shopper says no, and the button is locked when nothing is chosen", async () => {
    const { store } = await asUser([A(), B()]);

    await userEvent.click(button(msg("private.cart.bulk.remove")));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));
    expect(store.getState().cart.items).toHaveLength(2);

    await userEvent.click(selectAll());
    expect(button(msg("private.cart.bulk.remove"))).toBeDisabled();
    expect(screen.getAllByRole("button", { name: msg("private.cart.bulk.addToWishlist") })[0]).toBeDisabled();
  });

  it("removes a line the BE has not confirmed yet only here (it will come back from the BE: see the spec, section 7)", async () => {
    const { store, calls } = await asUser([A({ serverItemId: undefined })], { cart: BEING_ADDED });

    await userEvent.click(within(rowOf("Dress")).getByRole("button", { name: msgf("private.cart.item.remove", { name: "Dress" }) }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("private.cart.bulk.confirmRemove.confirm") }));

    await waitFor(() => expect(store.getState().cart.items).toEqual([]));
    await wait(300);
    expect(calls.deletes).toEqual([]);
  });
});

describe("CART-15 the wishlist", () => {
  it("the heart on a line adds the product, says so, tells the BE, and turns into a 'remove' heart", async () => {
    const { store, calls } = await asUser([A()]);

    await userEvent.click(within(rowOf("Dress")).getByRole("button", { name: msg("private.cart.item.addToWishlist") }));

    expect(store.getState().wishlist.items.map((i) => i.productId)).toEqual(["p1"]);
    expect(await screen.findByText(msgf("private.cart.item.wishlistAdded", { name: "Dress" }))).toBeInTheDocument();
    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p1"]));
    const heart = within(rowOf("Dress")).getByRole("button", { name: msg("private.cart.item.removeFromWishlist") });
    expect(heart).toHaveAttribute("aria-pressed", "true");
  });

  it("the heart on a saved product removes it from the wishlist, and keeps it in the bag", async () => {
    const { store, calls } = await asUser([A()], { wishlist: [wishlistItem()] });

    await userEvent.click(within(rowOf("Dress")).getByRole("button", { name: msg("private.cart.item.removeFromWishlist") }));

    expect(store.getState().wishlist.items).toEqual([]);
    expect(store.getState().cart.items).toHaveLength(1);
    expect(await screen.findByText(msgf("private.cart.item.wishlistRemoved", { name: "Dress" }))).toBeInTheDocument();
    await waitFor(() => expect(calls.wishlistRemoves).toEqual(["p1"]));
  });

  it("saves the chosen lines in one go: each product once even if it is in the bag in two sizes, nothing leaves the bag", async () => {
    const { store, calls } = await asUser([A(), A({ size: "L", serverItemId: "srv-a2" }), B()]);

    await userEvent.click(screen.getAllByRole("button", { name: msg("private.cart.bulk.addToWishlist") })[0]);

    expect(store.getState().wishlist.items.map((i) => i.productId)).toEqual(["p1", "p2"]);
    expect(store.getState().cart.items).toHaveLength(3);
    expect(await screen.findByText(msgf("private.cart.toast.addedToWishlist", { count: 2 }))).toBeInTheDocument();
    await waitFor(() => expect([...calls.wishlistAdds].sort()).toEqual(["p1", "p2"]));
  });

  it("saves only the chosen lines, and only those not saved yet", async () => {
    const { store, calls } = await asUser([A(), B(), cartLine({ productId: "p3", name: "Coat", serverItemId: "srv-c" })], { wishlist: [wishlistItem({ productId: "p2" })], cart: { deselectedKeys: ["p3|M|Red"] } });

    await userEvent.click(screen.getAllByRole("button", { name: msg("private.cart.bulk.addToWishlist") })[0]);

    expect(store.getState().wishlist.items.map((i) => i.productId).sort()).toEqual(["p1", "p2"]);
    expect(await screen.findByText(msgf("private.cart.toast.addedToWishlist", { count: 1 }))).toBeInTheDocument();
    await waitFor(() => expect(calls.wishlistAdds).toEqual(["p1"]));
  });
});

describe("CART-15E the wishlist when there is nothing new to save", () => {
  it("says the products are already there, changes nothing and does not call the BE", async () => {
    const { store, calls } = await asUser([A(), B()], { wishlist: [wishlistItem(), wishlistItem({ productId: "p2" })] });

    await userEvent.click(screen.getAllByRole("button", { name: msg("private.cart.bulk.addToWishlist") })[0]);

    expect(await screen.findByText(msg("private.cart.toast.alreadyInWishlist"))).toBeInTheDocument();
    expect(store.getState().wishlist.items).toHaveLength(2);
    await wait(200);
    expect(calls.wishlistAdds).toEqual([]);
  });
});

describe("CART-16 the bottom bar", () => {
  it("shows the BE's subtotal for the chosen lines and a link to checkout", async () => {
    const { calls } = await asUser([A({ quantity: 2 }), B()], { backend: { quote: quote({ subtotalVnd: 777_000 }) } });

    expect(await screen.findByText("777.000 VNĐ")).toBeInTheDocument();
    expect(screen.getByText(msgf("private.cart.checkout.subtotal", { count: 3 }))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(msg("private.cart.checkout.action")) })).toHaveAttribute("href", "/checkout");
    expect(calls.quotes).toEqual([["srv-a", "srv-b"]]);
  });

  it("shows dollars in English", async () => {
    await asUser([A()], { locale: "en", backend: { quote: quote({ subtotalUsd: 21.5 }) } });

    expect(await screen.findByText("$21.50")).toBeInTheDocument();
  });

  it("asks again, for the lines left, when the shopper unchooses one", async () => {
    const { calls } = await asUser([A(), B()]);
    await waitFor(() => expect(calls.quotes).toEqual([["srv-a", "srv-b"]]));

    await userEvent.click(screen.getByRole("checkbox", { name: msgf("private.cart.item.select", { name: "Skirt" }) }));

    await waitFor(() => expect(calls.quotes.at(-1)).toEqual(["srv-a"]));
    expect(screen.getByText(msgf("private.cart.checkout.subtotal", { count: 1 }))).toBeInTheDocument();
  });

  it("reads the BE cart for fresh ids when the lines have none yet, then asks for the quote", async () => {
    const { calls } = await asUser([A({ serverItemId: undefined })], { backend: { lines: [A({ serverItemId: "srv-from-be" })], quote: quote({ subtotalVnd: 555_000 }) } });

    expect(await screen.findByText("555.000 VNĐ")).toBeInTheDocument();
    expect(new Set(calls.quotes.map((ids) => ids.join()))).toEqual(new Set(["srv-from-be"]));
  });
});

describe("CART-16E the bottom bar when there is nothing to total", () => {
  it("with no line chosen: a hint, a locked button, no question to the BE", async () => {
    const { calls } = await asUser([A(), B()]);
    await userEvent.click(selectAll());

    expect(screen.getByText(msg("private.cart.checkout.selectToCheckout"))).toBeInTheDocument();
    expect(button(msg("private.cart.checkout.action"))).toBeDisabled();
    expect(screen.queryByRole("link", { name: new RegExp(msg("private.cart.checkout.action")) })).not.toBeInTheDocument();
    const asked = calls.quotes.length;
    await wait(200);
    expect(calls.quotes).toHaveLength(asked);
  });

  it("shows … and no amount when the BE cannot price it", async () => {
    await asUser([A()], { backend: { quote: "error" } });

    await waitFor(() => expect(screen.getByText(msgf("private.cart.checkout.subtotal", { count: 1 }))).toBeInTheDocument());
    await wait(300);
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
    expect(screen.queryByText(/VNĐ$/, { selector: "span.font-display" })).not.toBeInTheDocument();
  });

  it("does not ask while a cart write is still waiting for the BE, and shows … until it is answered", async () => {
    const { calls } = await asUser([A()], { cart: { pendingSync: 1 } });

    await wait(300);

    expect(calls.quotes).toEqual([]);
    expect(screen.getByText(msgf("private.cart.checkout.subtotal", { count: 1 }))).toBeInTheDocument();
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
  });
});
