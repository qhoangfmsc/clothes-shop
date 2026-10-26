import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import AccountContent from "@/src/app/[locale]/(private)/account/AccountContent";
import { generateMetadata } from "@/src/app/[locale]/(private)/account/layout";
import type { Order } from "@/src/app/[locale]/(private)/orders/_common/types";
import { API, ACCESS_KEY } from "@/tests/_support/api";
import { order, orderItem, product, wishlistItem, wishlistState } from "@/tests/_support/fixtures";
import { IDENTITIES, type IdentityName } from "@/tests/_support/identities";
import { dateText, msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The account page: the profile, the latest orders and the latest saved products (specs/storefront/account.md, flows ACC-1 to ACC-8E). */

const A = (key: string, locale: "vi" | "en" = "vi") => msg(`private.account.${key}`, locale);

interface Options {
  as?: IdentityName | typeof IDENTITIES.user;
  locale?: "vi" | "en";
  orders?: Order[] | number;
  delay?: number;
  wishlist?: ReturnType<typeof wishlistItem>[];
  waitForAuth?: boolean;
}
async function account(options: Options = {}) {
  const { as = "user", locale, orders = [], delay = 0, wishlist = [], waitForAuth } = options;
  const calls = { orders: 0, products: [] as string[] };
  server.use(
    http.get(`${API}/api/orders`, async () => {
      calls.orders += 1;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      return typeof orders === "number" ? HttpResponse.json({}, { status: orders }) : HttpResponse.json({ data: orders, total: orders.length });
    }),
    http.get(`${API}/api/products/:id`, ({ params }) => {
      calls.products.push(String(params.id));
      return HttpResponse.json({ data: product({ id: String(params.id) }) });
    })
  );
  navigation.pathname = "/account";
  const view = await renderApp(<AccountContent />, { as, locale, waitForAuth, store: { wishlist: wishlistState(wishlist) } });
  return Object.assign(view, { calls });
}
const sectionOf = (title: string) => screen.getByRole("heading", { level: 2, name: title }).closest("section") as HTMLElement;
const ordersOf = (locale: "vi" | "en" = "vi") => sectionOf(A("orders.title", locale));
const wishlistOf = (locale: "vi" | "en" = "vi") => sectionOf(A("wishlist.title", locale));
const orderRows = (locale: "vi" | "en" = "vi") => within(ordersOf(locale)).queryAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/orders/"));

describe("ACC-1 who may look", () => {
  it("asks a visitor to sign in and asks the BE for nothing", async () => {
    const { calls } = await account({ as: "guest" });

    expect(await screen.findByText(msg("shared.feedback.unauthenticated.title"))).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(calls.orders).toBe(0);
  });

  it("shows grey boxes while it is not known who is looking", async () => {
    const { container } = await account({ waitForAuth: false });

    expect(container.querySelector("main")).not.toBeNull();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText(msg("shared.feedback.unauthenticated.title"))).not.toBeInTheDocument();
  });
});

describe("ACC-2 the profile", () => {
  it("shows the name, the email, since when the customer is a member and the initials", async () => {
    await account({ as: "user" });

    expect(await screen.findByRole("heading", { level: 1, name: "Mai" })).toBeInTheDocument();
    expect(screen.getByText("mai@example.com")).toBeInTheDocument();
    expect(screen.getByText(`Thành viên từ ${new Intl.DateTimeFormat("vi", { dateStyle: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date("2026-01-01T00:00:00.000Z"))}`)).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("greets a customer without a name, with a question mark for the picture", async () => {
    await account({ as: { ...IDENTITIES.user!, name: null } });

    expect(await screen.findByRole("heading", { level: 1, name: A("profile.welcome") })).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await account({ locale: "en" });

    expect(await screen.findByRole("heading", { level: 1, name: "Mai" })).toBeInTheDocument();
    expect(screen.getByText(/Member since/)).toBeInTheDocument();
  });

  it("asks before signing out, and keeps the session when the customer says no", async () => {
    await account();
    await userEvent.click(await screen.findByRole("button", { name: msg("shared.header.account.signOut") }));

    expect(await screen.findByText(msg("shared.header.account.signOutConfirm.title"))).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.cancel") }));

    await waitFor(() => expect(screen.queryByText(msg("shared.header.account.signOutConfirm.title"))).not.toBeInTheDocument());
    expect(localStorage.getItem(ACCESS_KEY)).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Mai" })).toBeInTheDocument();
  });

  it("signs out when the customer confirms: the session ends and the sign-in wall appears", async () => {
    await account();
    await userEvent.click(await screen.findByRole("button", { name: msg("shared.header.account.signOut") }));

    await screen.findByText(msg("shared.header.account.signOutConfirm.title"));
    await userEvent.click(screen.getAllByRole("button", { name: msg("shared.header.account.signOutConfirm.confirm") }).at(-1)!);

    expect(await screen.findByText(msg("shared.feedback.unauthenticated.title"))).toBeInTheDocument();
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
  });
});

describe("ACC-3 the latest orders", () => {
  const orders = [
    order({ id: "o-1", status: "delivered", paymentStatus: "paid", totalVnd: 380_000, totalUsd: 14.61, createdAt: "2026-03-05T05:00:00.000Z", items: [orderItem({ id: "a", productImage: "/one.jpg" }), orderItem({ id: "b" })] }),
    order({ id: "o-2", status: "cancelled", totalVnd: 100_000, createdAt: "2026-03-04T05:00:00.000Z" }),
    order({ id: "o-3", status: "pending", createdAt: "2026-03-03T05:00:00.000Z" }),
    order({ id: "o-4", status: "pending", createdAt: "2026-03-02T05:00:00.000Z" }),
  ];

  it("shows the first three orders, each a link to its page, with the date, the number of items, the state and the total", async () => {
    await account({ orders });

    await waitFor(() => expect(orderRows()).toHaveLength(3));
    expect(orderRows().map((a) => a.getAttribute("href"))).toEqual(["/orders/o-1", "/orders/o-2", "/orders/o-3"]);
    const first = orderRows()[0];
    expect(within(first).getByText(dateText("2026-03-05T05:00:00.000Z", "short"))).toBeInTheDocument();
    expect(within(first).getByText("2 sản phẩm")).toBeInTheDocument();
    expect(within(first).getByText(msg("common.orderStatus.delivered"))).toBeInTheDocument();
    expect(within(first).getByText(msg("common.orderPaymentStatus.paid"))).toBeInTheDocument();
    expect(within(first).getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(within(ordersOf()).getByText("3")).toBeInTheDocument();
  });

  it("shows the first picture it finds as the thumbnail, and a parcel when none of the lines has one", async () => {
    await account({ orders: [orders[0], order({ id: "o-9", items: [orderItem({ productImage: "" })] })] });

    await waitFor(() => expect(orderRows()).toHaveLength(2));
    expect(orderRows()[0].querySelector("img")?.getAttribute("src")).toContain(encodeURIComponent("/one.jpg"));
    expect(orderRows()[1].querySelector("img")).toBeNull();
    expect(orderRows()[1].querySelector("svg")).not.toBeNull();
  });

  it("takes the first line that has a picture as the thumbnail, even when the first line has none", async () => {
    await account({ orders: [order({ id: "o-8", items: [orderItem({ id: "a", productImage: "" }), orderItem({ id: "b", productImage: "/second.jpg" })] })] });

    await waitFor(() => expect(orderRows()).toHaveLength(1));
    expect(orderRows()[0].querySelector("img")?.getAttribute("src")).toContain(encodeURIComponent("/second.jpg"));
  });

  it("colours each state, and treats an unknown state like a pending one", async () => {
    await account({ orders: [orders[0], orders[1], order({ id: "o-7", status: "weird" as never })] });

    await waitFor(() => expect(orderRows()).toHaveLength(3));
    const color = (row: HTMLElement, text: string) => (within(row).getByText(text) as HTMLElement).style.color;
    expect(color(orderRows()[0], msg("common.orderStatus.delivered"))).toBe("var(--accent-sage)");
    expect(color(orderRows()[1], msg("common.orderStatus.cancelled"))).toBe("var(--color-deep-rose)");
    expect(orderRows()[2].querySelector<HTMLElement>("span[style*='color']")!.style.color).toBe("var(--accent-primary)");
  });

  it("shows no payment line for an order without a payment state", async () => {
    await account({ orders: [order({ id: "o-5", paymentStatus: undefined as never })] });

    await waitFor(() => expect(orderRows()).toHaveLength(1));
    expect(within(orderRows()[0]).queryByText(msg("common.orderPaymentStatus.unpaid"))).not.toBeInTheDocument();
    expect(orderRows()[0].querySelectorAll("span.hidden")).toHaveLength(0);
  });

  it("shows totals in dollars and counts in English", async () => {
    await account({ orders, locale: "en" });

    await waitFor(() => expect(orderRows("en")).toHaveLength(3));
    expect(within(orderRows("en")[0]).getByText("$14.61")).toBeInTheDocument();
    expect(within(orderRows("en")[0]).getByText("2 items")).toBeInTheDocument();
  });

  it("links to all orders", async () => {
    await account({ orders });

    expect(await within(ordersOf()).findByRole("link", { name: new RegExp(A("orders.viewAll")) })).toHaveAttribute("href", "/orders");
  });

  it("shows grey boxes while the orders are on their way", async () => {
    await account({ orders, delay: 150 });

    expect(await screen.findByRole("heading", { level: 2, name: A("orders.title") })).toBeInTheDocument();
    expect(within(ordersOf()).queryAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/orders/"))).toHaveLength(0);
    expect(within(ordersOf()).queryByText(A("orders.emptyTitle"))).not.toBeInTheDocument();
    await waitFor(() => expect(orderRows()).toHaveLength(3));
  });

  it("invites to the first purchase when there are no orders", async () => {
    await account({ orders: [] });

    expect(await within(ordersOf()).findByText(A("orders.emptyTitle"))).toBeInTheDocument();
    expect(within(ordersOf()).getByText(A("orders.emptyDescription"))).toBeInTheDocument();
    expect(within(ordersOf()).getByRole("link", { name: new RegExp(A("orders.startShopping")) })).toHaveAttribute("href", "/shop");
    expect(within(ordersOf()).getByRole("link", { name: new RegExp(A("orders.goTo")) })).toHaveAttribute("href", "/orders");
  });
});

describe("ACC-3E the orders cannot be read", () => {
  it("says so instead of saying there are no orders, with a button that reads them again", async () => {
    const { calls } = await account({ orders: 500 });

    const alert = await within(ordersOf()).findByRole("alert");
    expect(within(alert).getByText(A("orders.loadFailed"))).toBeInTheDocument();
    expect(within(ordersOf()).queryByText(A("orders.emptyTitle"))).not.toBeInTheDocument();
    await userEvent.click(within(alert).getByRole("button", { name: A("orders.retry") }));

    await waitFor(() => expect(calls.orders).toBe(2));
  });

  it("shows grey boxes, not the message, while the second try is on its way", async () => {
    await account({ orders: 500, delay: 150 });
    const alert = await within(ordersOf()).findByRole("alert");

    await userEvent.click(within(alert).getByRole("button", { name: A("orders.retry") }));

    expect(within(ordersOf()).queryByRole("alert")).not.toBeInTheDocument();
    expect(await within(ordersOf()).findByRole("alert")).toBeInTheDocument();
  });

  it("shows the orders once the second try works", async () => {
    let ok = false;
    server.use(
      http.get(`${API}/api/orders`, () => (ok ? HttpResponse.json({ data: [order({ id: "o-1" })], total: 1 }) : HttpResponse.json({}, { status: 500 })))
    );
    navigation.pathname = "/account";
    await renderApp(<AccountContent />, { as: "user" });
    const alert = await within(ordersOf()).findByRole("alert");
    ok = true;

    await userEvent.click(within(alert).getByRole("button", { name: A("orders.retry") }));

    await waitFor(() => expect(orderRows()).toHaveLength(1));
    expect(within(ordersOf()).queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ACC-4 the latest saved products", () => {
  const saved = Array.from({ length: 6 }, (_, i) => wishlistItem({ productId: `p${i + 1}`, name: `Item ${i + 1}`, priceVnd: 100_000 * (i + 1), priceUsd: 5 * (i + 1) }));

  it("shows the four saved last, the newest first, each a link to its page with its picture, name and price", async () => {
    await account({ wishlist: saved });

    const section = wishlistOf();
    const links = within(section).getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/shop/"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/shop/tops/shirts/p6", "/shop/tops/shirts/p5", "/shop/tops/shirts/p4", "/shop/tops/shirts/p3"]);
    expect(within(links[0]).getByText("Item 6")).toBeInTheDocument();
    expect(within(links[0]).getByText("600.000 VNĐ")).toBeInTheDocument();
    expect(within(links[0]).getByAltText("Item 6")).toBeInTheDocument();
  });

  it("counts every saved product, not just the four", async () => {
    await account({ wishlist: saved });

    expect(within(wishlistOf()).getByText("6")).toBeInTheDocument();
    expect(within(wishlistOf()).getByRole("link", { name: new RegExp(A("wishlist.viewAll")) })).toHaveAttribute("href", "/wishlist");
    expect(within(wishlistOf()).getByRole("region", { name: A("wishlist.carouselAria") })).toBeInTheDocument();
  });

  it("shows 'price on request' for a custom order, and dollars in English", async () => {
    await account({ wishlist: [wishlistItem({ productId: "p1", name: "Made to order", badge: "custom_order" }), wishlistItem({ productId: "p2", name: "Ready", priceUsd: 13.46 })], locale: "en" });

    expect(within(wishlistOf("en")).getByText(msg("common.priceOnRequest", "en"))).toBeInTheDocument();
    expect(within(wishlistOf("en")).getByText("$13.46")).toBeInTheDocument();
  });

  it("looks the address of a saved product up when it has no category, and goes there", async () => {
    const { calls } = await account({ wishlist: [wishlistItem({ productId: "p9", name: "Loose", category: "", subcategory: "" })] });
    const link = within(wishlistOf()).getByRole("link", { name: /Loose/ });
    expect(link).toHaveAttribute("href", "/shop");

    await userEvent.click(link);

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/tops/shirts/p9"));
    expect(calls.products).toEqual(["p9"]);
  });

  it("invites to save the first product when there are none, with two ways on", async () => {
    await account({ wishlist: [] });

    const section = wishlistOf();
    expect(within(section).getByText(A("wishlist.emptyTitle"))).toBeInTheDocument();
    expect(within(section).getByText(A("wishlist.emptyDescription"))).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: new RegExp(A("wishlist.browse")) })).toHaveAttribute("href", "/shop");
    expect(within(section).getByRole("link", { name: new RegExp(A("wishlist.goTo")) })).toHaveAttribute("href", "/wishlist");
    expect(within(section).queryByRole("link", { name: new RegExp(A("wishlist.viewAll")) })).not.toBeInTheDocument();
  });
});

describe("ACC-5 title and description of the page", () => {
  it("has a title with the brand and a description", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "vi" }) });

    expect(meta.title).toBe(`${A("meta.title")} — DOOVAN`);
    expect(meta.description).toBe(A("meta.description"));
  });

  it("speaks English in English", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(meta.description).toBe(A("meta.description", "en"));
  });
});
