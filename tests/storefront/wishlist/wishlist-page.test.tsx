import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import WishlistContent from "@/src/app/[locale]/(private)/wishlist/WishlistContent";
import { FORMATS, TIME_ZONE } from "@/src/i18n/formats";
import { API } from "@/tests/_support/api";
import { serverWishlist, wishlistItem, wishlistState } from "@/tests/_support/fixtures";
import { msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The wishlist page, as a visitor and as a signed-in customer (specs/storefront/wishlist.md, flows WL-5 to WL-8E). */

type Item = ReturnType<typeof wishlistItem>;
const DRESS = (over: Partial<Item> = {}) => wishlistItem({ productId: "p1", name: "Dress", addedAt: "2026-02-01T05:00:00.000Z", ...over });
const SKIRT = (over: Partial<Item> = {}) => wishlistItem({ productId: "p2", name: "Skirt", priceVnd: 500_000, priceUsd: 19.23, addedAt: "2026-02-03T05:00:00.000Z", ...over });
const COAT = (over: Partial<Item> = {}) => wishlistItem({ productId: "p3", name: "Coat", priceVnd: 900_000, priceUsd: 34.62, addedAt: "2026-02-05T05:00:00.000Z", ...over });

/** The fake BE behind the page: serves the list it is given and records the removals. */
function backend(list: Item[] = [], options: { fail?: boolean } = {}) {
  const calls = { fetches: 0, deletes: [] as string[] };
  server.use(
    http.get(`${API}/api/wishlist`, () => {
      calls.fetches += 1;
      return options.fail ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json(serverWishlist(list));
    }),
    http.delete(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.deletes.push(String(params.id));
      return HttpResponse.json({});
    })
  );
  return calls;
}

const asUser = async (local: Item[], remote: Item[] = local, options: { locale?: "vi" | "en"; fail?: boolean } = {}) => {
  const calls = backend(remote, options);
  const view = await renderApp(<WishlistContent />, { as: "user", locale: options.locale, store: { wishlist: wishlistState(local) } });
  return { ...view, calls };
};

const shownNames = () => screen.getAllByRole("img").map((img) => (img as HTMLImageElement).alt);
const cardOf = (name: string) => screen.getByRole("button", { name: msgf("private.wishlist.card.remove", { name }) }).parentElement as HTMLElement;
const dateText = (iso: string, locale = "vi") => new Intl.DateTimeFormat(locale, { ...FORMATS.dateTime.short, timeZone: TIME_ZONE }).format(new Date(iso));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("WL-5 a visitor who is not signed in", () => {
  it("sees the sign-in wall and none of the list, and nothing is asked of the BE", async () => {
    const calls = backend([DRESS()]);

    await renderApp(<WishlistContent />, { as: "guest", store: { wishlist: wishlistState([DRESS()]) } });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: msg("private.wishlist.header.title") })).not.toBeInTheDocument();
    expect(screen.queryByText("Dress")).not.toBeInTheDocument();
    await wait(150);
    expect(calls.fetches).toBe(0);
  });
});

describe("WL-5E while the session is being worked out", () => {
  it("shows only a placeholder and asks nothing, then the list", async () => {
    const calls = backend([DRESS()]);
    await renderApp(<WishlistContent />, { as: "user", waitForAuth: false, store: { wishlist: wishlistState([DRESS()]) } });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("Dress")).not.toBeInTheDocument();
    expect(calls.fetches).toBe(0);

    expect(await screen.findByRole("heading", { level: 1, name: msg("private.wishlist.header.title") })).toBeInTheDocument();
    await waitFor(() => expect(calls.fetches).toBe(1));
  });
});

describe("WL-6 a list of saved products", () => {
  it("shows the title, the count, and the products newest first with name, price and the day they were saved", async () => {
    await asUser([DRESS(), SKIRT(), COAT()]);

    expect(screen.getByRole("heading", { level: 1, name: msg("private.wishlist.header.title") })).toBeInTheDocument();
    expect(screen.getByText(msgf("private.wishlist.header.itemCount", { count: 3 }))).toBeInTheDocument();
    expect(shownNames()).toEqual(["Coat", "Skirt", "Dress"]);
    const skirt = within(cardOf("Skirt"));
    expect(skirt.getByText("500.000 VNĐ")).toBeInTheDocument();
    expect(skirt.getByText(msgf("private.wishlist.card.added", { date: dateText(SKIRT().addedAt) }))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(msg("private.wishlist.continueShopping")) })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: msg("private.wishlist.header.back") })).toHaveAttribute("href", "/account");
  });

  it("shows dollars and English dates in English", async () => {
    await asUser([SKIRT()], undefined, { locale: "en" });

    const card = within(screen.getByRole("button", { name: msgf("private.wishlist.card.remove", { name: "Skirt" }, "en") }).parentElement as HTMLElement);
    expect(card.getByText("$19.23")).toBeInTheDocument();
    expect(card.getByText(msgf("private.wishlist.card.added", { date: dateText(SKIRT().addedAt, "en") }, "en"))).toBeInTheDocument();
  });

  it("links the picture and the name to the product page", async () => {
    await asUser([DRESS()]);

    const links = within(cardOf("Dress")).getAllByRole("link", { name: "Dress" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute("href", "/shop/tops/shirts/p1");
  });

  it("asks the BE for the list when the page opens and shows the BE's list instead of what the browser had", async () => {
    const { calls, store } = await asUser([DRESS({ name: "Old name" })], [SKIRT()]);

    await waitFor(() => expect(shownNames()).toEqual(["Skirt"]));
    expect(calls.fetches).toBe(1);
    expect(store.getState().wishlist.items.map((i) => i.productId)).toEqual(["p2"]);
  });
});

describe("WL-6E a list that is thin, stale or cannot be loaded", () => {
  it("keeps the list from this browser when the BE cannot be reached", async () => {
    const { calls } = await asUser([DRESS(), SKIRT()], [], { fail: true });

    await waitFor(() => expect(calls.fetches).toBe(1));
    await wait(100);

    expect(shownNames()).toEqual(["Skirt", "Dress"]);
  });

  it("shows 'price on request' instead of a price for a custom-order product", async () => {
    await asUser([DRESS({ badge: "custom_order" })]);

    const card = within(cardOf("Dress"));
    expect(card.getByText(msg("common.priceOnRequest"))).toBeInTheDocument();
    expect(card.queryByText("350.000 VNĐ")).not.toBeInTheDocument();
  });

  it("looks the product up on click when it was saved without a category, and goes to its page", async () => {
    server.use(http.get(`${API}/api/products/p1`, () => HttpResponse.json({ data: { id: "p1", category: { slug: "dresses" }, subcategory: { slug: "midi" } } })));
    await asUser([DRESS({ category: "", subcategory: "" })], [DRESS({ category: "", subcategory: "" })]);
    const [link] = within(cardOf("Dress")).getAllByRole("link", { name: "Dress" });
    expect(link).toHaveAttribute("href", "/shop");

    await userEvent.click(link);

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/dresses/midi/p1"));
  });

  it("goes to the shop when that lookup finds nothing", async () => {
    server.use(http.get(`${API}/api/products/p1`, () => HttpResponse.json({ message: "nope" }, { status: 404 })));
    await asUser([DRESS({ category: "", subcategory: "" })], [DRESS({ category: "", subcategory: "" })]);

    await userEvent.click(within(cardOf("Dress")).getAllByRole("link", { name: "Dress" })[0]);

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop"));
  });
});

describe("WL-7 an empty list", () => {
  it("says so, offers the shop, lists the three promises and has nothing to clear", async () => {
    await asUser([], []);

    expect(await screen.findByRole("heading", { level: 2, name: msg("private.wishlist.empty.title") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: msg("private.wishlist.empty.browse") })).toHaveAttribute("href", "/shop");
    for (const key of ["save", "priceDrops", "quickAccess"]) expect(screen.getByText(msg(`private.wishlist.empty.features.${key}`))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: msg("private.wishlist.header.clearAll") })).not.toBeInTheDocument();
    expect(screen.queryByText(msgf("private.wishlist.header.itemCount", { count: 0 }))).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: new RegExp(msg("private.wishlist.continueShopping")) })).not.toBeInTheDocument();
  });

  it("shows the empty page when the BE has nothing, even if the browser held products", async () => {
    await asUser([DRESS()], []);

    expect(await screen.findByRole("heading", { level: 2, name: msg("private.wishlist.empty.title") })).toBeInTheDocument();
  });
});

describe("WL-8 taking a product off the list", () => {
  it("removes it at once, tells the BE which product, and says so", async () => {
    const { calls, store } = await asUser([DRESS(), SKIRT()]);
    await waitFor(() => expect(calls.fetches).toBe(1));

    await userEvent.click(screen.getByRole("button", { name: msgf("private.wishlist.card.remove", { name: "Dress" }) }));

    await waitFor(() => expect(shownNames()).toEqual(["Skirt"]));
    expect(store.getState().wishlist.items.map((i) => i.productId)).toEqual(["p2"]);
    await waitFor(() => expect(calls.deletes).toEqual(["p1"]));
    expect(await screen.findByText(msgf("private.wishlist.card.removed", { name: "Dress" }))).toBeInTheDocument();
    expect(screen.getByText(msgf("private.wishlist.header.itemCount", { count: 1 }))).toBeInTheDocument();
  });

  it("goes to the empty page after the last product is removed", async () => {
    await asUser([DRESS()]);

    await userEvent.click(screen.getByRole("button", { name: msgf("private.wishlist.card.remove", { name: "Dress" }) }));

    expect(await screen.findByRole("heading", { level: 2, name: msg("private.wishlist.empty.title") })).toBeInTheDocument();
  });
});

describe("WL-8E removals the BE does not hear about", () => {
  it("a removal the BE refuses is still removed on screen, and no error is shown (see the spec, section 7)", async () => {
    const { calls } = await asUser([DRESS(), SKIRT()]);
    await waitFor(() => expect(calls.fetches).toBe(1));
    server.use(http.delete(`${API}/api/wishlist/:id`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    await userEvent.click(screen.getByRole("button", { name: msgf("private.wishlist.card.remove", { name: "Dress" }) }));

    await waitFor(() => expect(shownNames()).toEqual(["Skirt"]));
    await wait(150);
    expect(screen.getByRole("heading", { level: 1, name: msg("private.wishlist.header.title") })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("'clear all' empties the list here and does not call the BE, so the products come back the next time the page opens", async () => {
    const { calls, store } = await asUser([DRESS(), SKIRT()]);
    await waitFor(() => expect(calls.fetches).toBe(1));

    await userEvent.click(screen.getByRole("button", { name: msg("private.wishlist.header.clearAll") }));

    expect(store.getState().wishlist.items).toEqual([]);
    expect(await screen.findByRole("heading", { level: 2, name: msg("private.wishlist.empty.title") })).toBeInTheDocument();
    await wait(200);
    expect(calls.deletes).toEqual([]);
  });
});
