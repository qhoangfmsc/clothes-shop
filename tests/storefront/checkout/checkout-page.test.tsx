import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONTACT_ADDRESS, CONTACT_MAPS_URL } from "@/src/lib/contact";
import { API } from "@/tests/_support/api";
import { updateQuantity } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { cartState, shippingInfo } from "@/tests/_support/fixtures";
import { msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { A, B, defaultQuote, renderCheckout } from "./checkout-kit";

/* The checkout page before an order is placed (specs/storefront/checkout.md, flows CHK-4 to CHK-8E). */

const label = (field: string, required = false) => `${msg(`common.addressField.${field}`)}${required ? " *" : ""}`;
const input = (field: string, required = false) => screen.getByRole("textbox", { name: label(field, required) }) as HTMLInputElement;
const radio = (name: string) => screen.getByRole("radio", { name }) as HTMLInputElement;
/** A shipping method: its row loads from the BE and its name holds the time and fee too */
const ship = (name: string) => screen.findByRole("radio", { name: new RegExp(name) }) as Promise<HTMLInputElement>;
const placeOrder = () => screen.getByRole("button", { name: new RegExp(`^(${msg("private.checkout.summary.placeAndPay")}|${msg("private.checkout.summary.place")}|${msg("private.checkout.summary.placing")})$`) });
const S = (key: string) => msg(`private.checkout.summary.${key}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("CHK-4 a visitor who is not signed in", () => {
  it("sees the sign-in wall, not the form, and nothing about the bag is asked of the BE", async () => {
    const { calls } = await renderCheckout([A()], { as: "guest" });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: msg("private.checkout.page.title") })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await wait(150);
    expect(calls.quotes).toEqual([]);
    expect(calls.carts).toBe(0);
  });
});

describe("CHK-4E while the session is being worked out, and with nothing to order", () => {
  it("shows only a placeholder first, then the form", async () => {
    await renderCheckout([A()], { waitForAuth: false });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 1, name: msg("private.checkout.page.title") })).toBeInTheDocument();
  });

  it.each([
    ["an empty bag", () => cartState([])],
    ["every line unticked", () => cartState([A(), B()], { deselectedKeys: ["a|M|Red", "b|L|Blue"] })],
    ["only sold-out and custom-order lines", () => cartState([A({ badge: "sold_out" }), B({ badge: "custom_order" })])],
  ])("says there is nothing to pay for, and points to the shop, for %s", async (_what, cart) => {
    await renderCheckout([A(), B()], { store: { cart: cart() } });

    expect(screen.getByRole("heading", { level: 1, name: msg("private.checkout.empty.title") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(msg("private.checkout.empty.browse")) })).toHaveAttribute("href", "/shop");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Đặt hàng/ })).not.toBeInTheDocument();
  });

  it("orders only the ticked lines: the summary lists those and not the others", async () => {
    await renderCheckout([A(), B()], { store: { cart: cartState([A(), B()], { deselectedKeys: ["b|L|Blue"] }) } });

    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    expect(within(summary).getByText("Dress")).toBeInTheDocument();
    expect(within(summary).queryByText("Skirt")).not.toBeInTheDocument();
  });
});

describe("CHK-5 the address form", () => {
  it("has the title, the way back to the bag and the core fields with * on the required ones", async () => {
    await renderCheckout([A()]);

    expect(screen.getByRole("heading", { level: 1, name: msg("private.checkout.page.title") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: msg("private.checkout.page.back") })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("heading", { level: 2, name: msg("private.checkout.form.title") })).toBeInTheDocument();
    expect(input("fullName", true)).toBeInTheDocument();
    expect(input("phone", true)).toHaveAttribute("type", "tel");
    expect(input("addressLine1", true)).toBeInTheDocument();
    expect(input("city", true)).toBeInTheDocument();
    expect(input("province")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: label("postalCode") })).not.toBeInTheDocument();
  });

  it("fills in the name of the signed-in user", async () => {
    await renderCheckout([A()]);

    expect(input("fullName", true).value).toBe("Mai");
  });

  it("fills in the name when the session is worked out after the first render", async () => {
    await renderCheckout([A()], { waitForAuth: false });

    await waitFor(() => expect(input("fullName", true).value).toBe("Mai"));
  });

  it("types into a field", async () => {
    await renderCheckout([A()]);

    await userEvent.type(input("phone", true), "0901234567");

    expect(input("phone", true).value).toBe("0901234567");
  });

  it("keeps the less common fields and the note behind 'more details', with the country filled in as Vietnam", async () => {
    await renderCheckout([A()]);
    const toggle = screen.getByRole("button", { name: msg("private.checkout.form.moreDetails") });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(input("addressLine2").value).toBe("");
    expect(input("postalCode").value).toBe("");
    expect(input("country").value).toBe("Vietnam");
    expect(screen.getByRole("textbox", { name: msg("private.checkout.note.title") })).toHaveAttribute("placeholder", msg("private.checkout.note.placeholder"));
  });

  it("keeps what was typed in 'more details' when it is folded away and opened again", async () => {
    await renderCheckout([A()]);
    const toggle = screen.getByRole("button", { name: msg("private.checkout.form.moreDetails") });
    await userEvent.click(toggle);
    await userEvent.type(input("postalCode"), "700000");
    await userEvent.type(screen.getByRole("textbox", { name: msg("private.checkout.note.title") }), "Gate code 1234");

    await userEvent.click(toggle);
    expect(screen.queryByRole("textbox", { name: label("postalCode") })).not.toBeInTheDocument();
    await userEvent.click(toggle);

    expect(input("postalCode").value).toBe("700000");
    expect((screen.getByRole("textbox", { name: msg("private.checkout.note.title") }) as HTMLTextAreaElement).value).toBe("Gate code 1234");
  });
});

describe("CHK-5E submitting an incomplete form", () => {
  it("shows the error under every missing field, moves focus to the first one, and asks the BE for nothing", async () => {
    const { calls } = await renderCheckout([A()]);
    await waitFor(() => expect(calls.quotes.length).toBeGreaterThan(0));
    const asked = calls.quotes.length;

    await userEvent.click(placeOrder());

    for (const field of ["phone", "addressLine1", "city"]) expect(screen.getByText(msg(`private.checkout.form.errors.${field}`))).toBeInTheDocument();
    expect(screen.queryByText(msg("private.checkout.form.errors.fullName"))).not.toBeInTheDocument();
    expect(input("phone", true)).toHaveFocus();
    expect(input("phone", true)).toHaveAttribute("aria-invalid", "true");
    expect(input("fullName", true)).toHaveAttribute("aria-invalid", "false");
    expect(calls.carts).toBe(0);
    expect(calls.addresses).toEqual([]);
    expect(calls.orders).toEqual([]);
    expect(calls.quotes).toHaveLength(asked);
  });

  it("focuses the name when that is the first thing missing", async () => {
    await renderCheckout([A()]);
    await userEvent.clear(input("fullName", true));

    await userEvent.click(placeOrder());

    expect(input("fullName", true)).toHaveFocus();
    expect(screen.getByText(msg("private.checkout.form.errors.fullName"))).toBeInTheDocument();
  });

  it("takes the error of a field away as soon as it is edited, and leaves the others", async () => {
    await renderCheckout([A()]);
    await userEvent.click(placeOrder());
    expect(screen.getByText(msg("private.checkout.form.errors.phone"))).toBeInTheDocument();

    await userEvent.type(input("phone", true), "0");

    expect(screen.queryByText(msg("private.checkout.form.errors.phone"))).not.toBeInTheDocument();
    expect(input("phone", true)).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByText(msg("private.checkout.form.errors.city"))).toBeInTheDocument();
  });

  it("counts spaces as nothing", async () => {
    await renderCheckout([A()]);
    await userEvent.type(input("phone", true), "   ");

    await userEvent.click(placeOrder());

    expect(screen.getByText(msg("private.checkout.form.errors.phone"))).toBeInTheDocument();
  });
});

describe("CHK-6 collecting the order at the shop", () => {
  it("asks only who collects it, says where, and links to the map", async () => {
    await renderCheckout([A()]);

    await userEvent.click(await ship("Nhận tại cửa hàng"));

    expect(screen.getByRole("heading", { level: 2, name: msg("private.checkout.form.pickupTitle") })).toBeInTheDocument();
    expect(input("fullName", true)).toBeInTheDocument();
    expect(input("phone", true)).toBeInTheDocument();
    for (const field of ["addressLine1", "city", "province"]) expect(screen.queryByRole("textbox", { name: new RegExp(label(field)) })).not.toBeInTheDocument();
    const where = screen.getByRole("link", { name: new RegExp(CONTACT_ADDRESS) });
    expect(where).toHaveAttribute("href", CONTACT_MAPS_URL);
    expect(where).toHaveTextContent(msg("private.checkout.form.pickupAt"));
    expect(screen.getByRole("button", { name: msg("private.checkout.form.moreNote") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: msg("private.checkout.form.moreDetails") })).not.toBeInTheDocument();
  });

  it("keeps the delivery address typed before, for when delivery is chosen again", async () => {
    await renderCheckout([A()]);
    await userEvent.type(input("addressLine1", true), "1 Le Loi");
    await userEvent.type(input("city", true), "Ho Chi Minh");

    await userEvent.click(await ship("Nhận tại cửa hàng"));
    await userEvent.click(await ship("Giao tiêu chuẩn"));

    expect(input("addressLine1", true).value).toBe("1 Le Loi");
    expect(input("city", true).value).toBe("Ho Chi Minh");
    expect(screen.queryByText(CONTACT_ADDRESS)).not.toBeInTheDocument();
  });

  it("only offers the note under 'more' (no address parts)", async () => {
    await renderCheckout([A()]);
    await userEvent.click(await ship("Nhận tại cửa hàng"));

    await userEvent.click(screen.getByRole("button", { name: msg("private.checkout.form.moreNote") }));

    expect(screen.getByRole("textbox", { name: msg("private.checkout.note.title") })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: label("postalCode") })).not.toBeInTheDocument();
  });
});

describe("CHK-6E collecting at the shop without a name or phone", () => {
  it("asks for those two and nothing else", async () => {
    const { calls } = await renderCheckout([A()]);
    await userEvent.click(await ship("Nhận tại cửa hàng"));
    await userEvent.clear(input("fullName", true));

    await userEvent.click(placeOrder());

    expect(screen.getByText(msg("private.checkout.form.errors.fullName"))).toBeInTheDocument();
    expect(screen.getByText(msg("private.checkout.form.errors.phone"))).toBeInTheDocument();
    expect(screen.queryByText(msg("private.checkout.form.errors.addressLine1"))).not.toBeInTheDocument();
    expect(screen.queryByText(msg("private.checkout.form.errors.city"))).not.toBeInTheDocument();
    expect(input("fullName", true)).toHaveFocus();
    expect(calls.orders).toEqual([]);
  });
});

describe("CHK-7 delivery and payment choices", () => {
  it("lists the BE's methods with their wording, time and fee, standard chosen first and pick-up free", async () => {
    await renderCheckout([A()]);

    const standard = await ship("Giao tiêu chuẩn");
    expect(standard).toBeChecked();
    const row = (radioInput: HTMLInputElement) => radioInput.closest("label") as HTMLElement;
    expect(within(row(standard)).getByText("3-5 ngày")).toBeInTheDocument();
    expect(within(row(standard)).getByText("30.000 VNĐ")).toBeInTheDocument();
    expect(within(row(await ship("Giao nhanh"))).getByText("60.000 VNĐ")).toBeInTheDocument();
    expect(within(row(await ship("Nhận tại cửa hàng"))).getByText(msg("private.checkout.delivery.free"))).toBeInTheDocument();
  });

  it("shows the fees in dollars in English", async () => {
    await renderCheckout([A()], { locale: "en" });

    const row = (await screen.findByRole("radio", { name: /Giao nhanh/ })).closest("label") as HTMLElement;
    expect(within(row).getByText("$2.31")).toBeInTheDocument();
  });

  it("says Free for every method once the quote says the subtotal reached the threshold", async () => {
    await renderCheckout([A()], { subtotalVnd: 1_200_000 });

    const standard = (await ship("Giao tiêu chuẩn")).closest("label") as HTMLElement;
    const express = (await ship("Giao nhanh")).closest("label") as HTMLElement;
    await waitFor(() => expect(within(standard).getByText(msg("private.checkout.delivery.free"))).toBeInTheDocument());
    expect(within(express).getByText(msg("private.checkout.delivery.free"))).toBeInTheDocument();
  });

  it("offers bank transfer first, and the button says to place the order and pay", async () => {
    await renderCheckout([A()]);

    expect(radio(msg("private.checkout.method.options.vietqr.title"))).toBeChecked();
    expect(radio(msg("private.checkout.method.options.later.title"))).not.toBeChecked();
    expect(placeOrder()).toHaveTextContent(S("placeAndPay"));
  });

  it("changes the button to a plain 'place order' when paying later is chosen", async () => {
    await renderCheckout([A()]);

    await userEvent.click(radio(msg("private.checkout.method.options.later.title")));

    expect(placeOrder()).toHaveTextContent(new RegExp(`^${S("place")}$`));
  });

  it("asks the BE for the price of the method that is chosen", async () => {
    const { calls } = await renderCheckout([A()]);
    await waitFor(() => expect(calls.quotes.map((q) => q.shippingMethod)).toEqual(["standard"]));

    await userEvent.click(await ship("Giao nhanh"));

    await waitFor(() => expect(calls.quotes.map((q) => q.shippingMethod)).toEqual(["standard", "express"]));
    expect(calls.quotes[1].cartItemIds).toEqual(["srv-a"]);
  });
});

describe("CHK-7E delivery choices that are late, missing or changing", () => {
  it("says the methods are loading, then shows them", async () => {
    let release!: () => void;
    const shippingGate = new Promise<void>((resolve) => (release = resolve));
    await renderCheckout([A()], { shippingGate });

    expect(await screen.findByText(msg("private.checkout.delivery.loading"))).toBeInTheDocument();
    release();

    expect(await ship("Giao nhanh")).toBeInTheDocument();
    expect(screen.queryByText(msg("private.checkout.delivery.loading"))).not.toBeInTheDocument();
  });

  it("tells the shopper to reload when the methods cannot be loaded", async () => {
    await renderCheckout([A()], { shipping: "error" });

    expect(await screen.findByText(msg("private.checkout.delivery.loadFailed"))).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Giao tiêu chuẩn/ })).not.toBeInTheDocument();
  });

  it("does not show the old method's price for the new one: … until the new quote comes", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    await renderCheckout([A()], {
      quote: (method) => (method === "express" ? "error" : defaultQuote(method)),
    });
    server.use(
      http.post(`${API}/api/orders/quote`, async ({ request }) => {
        const { shippingMethod } = (await request.json()) as { shippingMethod: "standard" | "express" };
        if (shippingMethod === "express") await open;
        return HttpResponse.json({ data: defaultQuote(shippingMethod) });
      })
    );
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    await waitFor(() => expect(within(summary).getByText("380.000 VNĐ")).toBeInTheDocument());

    await userEvent.click(await ship("Giao nhanh"));

    await waitFor(() => expect(within(summary).queryByText("380.000 VNĐ")).not.toBeInTheDocument());
    expect(within(summary).getAllByText("…").length).toBeGreaterThan(0);
    release();
    expect(await within(summary).findByText("410.000 VNĐ")).toBeInTheDocument();
  });
});

describe("CHK-8 the order summary", () => {
  it("lists the ticked lines with picture, name, size and colour, quantity badge and the BE's line total", async () => {
    await renderCheckout([A({ quantity: 2, lineTotalVnd: 700_000 }), B()]);

    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    const dress = within(summary).getByText("Dress").closest("li") as HTMLElement;
    expect(within(dress).getByText("M · Red")).toBeInTheDocument();
    expect(within(dress).getByText("2")).toBeInTheDocument();
    expect(within(dress).getByText("700.000 VNĐ")).toBeInTheDocument();
    expect(within(summary).getByText("L · Blue")).toBeInTheDocument();
    expect(within(summary).getByText("500.000 VNĐ")).toBeInTheDocument();
  });

  it("shows … for a line the BE has not priced yet, never working one out from the unit price", async () => {
    await renderCheckout([A({ quantity: 3, lineTotalVnd: null, lineTotalUsd: null })]);

    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    const dress = within(summary).getByText("Dress").closest("li") as HTMLElement;
    expect(within(dress).getByText("…")).toBeInTheDocument();
    expect(within(dress).queryByText("1.050.000 VNĐ")).not.toBeInTheDocument();
  });

  it("shows the subtotal, the fee and the total the BE quoted", async () => {
    await renderCheckout([A({ quantity: 2 })], { subtotalVnd: 777_000 });

    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    expect(await within(summary).findByText("807.000 VNĐ")).toBeInTheDocument();
    expect(within(summary).getAllByText("777.000 VNĐ").length).toBeGreaterThan(0);
    expect(within(summary).getAllByText("30.000 VNĐ").length).toBeGreaterThan(0);
    expect(within(summary).getByText(new RegExp(`${S("subtotal")} \\(2 sản phẩm\\)`))).toBeInTheDocument();
    expect(within(summary).getByText(new RegExp(`${msg("private.checkout.summary.shipping.label")} · Giao tiêu chuẩn`))).toBeInTheDocument();
  });

  it("shows dollars in English", async () => {
    await renderCheckout([A()], { locale: "en", subtotalVnd: 520_000 });

    const summary = screen.getByRole("heading", { name: msg("private.checkout.summary.title", "en") }).closest("aside") as HTMLElement;
    expect(await within(summary).findByText("$20.00")).toBeInTheDocument();
  });

  it("shows how far the subtotal is from free shipping, as a bar and a sentence", async () => {
    await renderCheckout([A()], { subtotalVnd: 777_000 });

    const note = await screen.findByText(msgf("private.checkout.summary.shipping.remaining", { amount: "1.000.000 VNĐ" }));
    const bar = note.parentElement?.querySelector(":scope > div > div") as HTMLElement;
    expect(bar.style.width).toBe("77.7%");
    expect(screen.getByText(msgf("private.checkout.summary.shipping.freeNote", { amount: "1.000.000 VNĐ" }))).toBeInTheDocument();
  });

  it("says the shipping is free, and fills the bar, once the threshold is reached", async () => {
    await renderCheckout([A()], { subtotalVnd: 1_200_000 });

    const note = await screen.findByText(msg("private.checkout.summary.shipping.unlocked"));
    expect((note.parentElement?.querySelector(":scope > div > div") as HTMLElement).style.width).toBe("100%");
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    expect(within(summary).getAllByText(S("shipping.free")).length).toBeGreaterThan(0);
    expect(within(summary).getAllByText("1.200.000 VNĐ").length).toBeGreaterThan(1);
  });

  it("links to the terms, privacy and shipping policies, opening in a new tab", async () => {
    await renderCheckout([A()]);

    for (const [name, href] of [["Điều khoản sử dụng", "/terms"], ["Chính sách bảo mật", "/privacy"], ["Giao hàng & đổi trả", "/shipping-returns"]] as const) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("folds the list of lines on small screens and opens it on request", async () => {
    await renderCheckout([A()]);
    const toggle = screen.getByRole("button", { name: new RegExp(S("showItems")) });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});

describe("CHK-8E a summary without a price", () => {
  it("shows … for the subtotal, the fee and the total until the first quote arrives", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    await renderCheckout([A()], { quote: () => "error" });
    server.use(
      http.post(`${API}/api/orders/quote`, async () => {
        await open;
        return HttpResponse.json({ data: defaultQuote("standard") });
      })
    );
    await userEvent.click(await ship("Giao nhanh"));
    await userEvent.click(await ship("Giao tiêu chuẩn"));
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;

    expect(within(summary).getAllByText("…").length).toBeGreaterThanOrEqual(3);
    release();

    expect(await within(summary).findByText("380.000 VNĐ")).toBeInTheDocument();
  });

  it("says the fee cannot be loaded and keeps … for the totals when the quote fails", async () => {
    await renderCheckout([A()], { quote: () => "error" });

    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    expect(await within(summary).findByText(S("shipping.unavailable"))).toBeInTheDocument();
    expect(within(summary).getAllByText("…").length).toBeGreaterThanOrEqual(2);
    expect(within(summary).queryByText(/VNĐ$/, { selector: "dd" })).not.toBeInTheDocument();
  });

  it("does not let the shopper place the order while the price is unknown", async () => {
    await renderCheckout([A()], { quote: () => "error" });

    await screen.findByText(S("shipping.unavailable"));

    expect(placeOrder()).toBeDisabled();
  });

  it("offers to try the price again, and opens the order button when it works", async () => {
    let asked = 0;
    await renderCheckout([A()], { quote: (method) => (++asked === 1 ? "error" : defaultQuote(method)) });
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    await within(summary).findByText(S("shipping.unavailable"));

    await userEvent.click(within(summary).getByRole("button", { name: S("shipping.retry") }));

    expect(await within(summary).findByText("380.000 VNĐ")).toBeInTheDocument();
    expect(within(summary).queryByRole("button", { name: S("shipping.retry") })).not.toBeInTheDocument();
    expect(placeOrder()).toBeEnabled();
  });

  it("shows no retry button while the price is fine or still coming", async () => {
    await renderCheckout([A()]);
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    await within(summary).findByText("380.000 VNĐ");

    expect(within(summary).queryByRole("button", { name: S("shipping.retry") })).not.toBeInTheDocument();
  });

  it("does not show the standard price for express when the express quote fails", async () => {
    await renderCheckout([A()], { quote: (method) => (method === "express" ? "error" : defaultQuote(method)) });
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    await within(summary).findByText("380.000 VNĐ");

    await userEvent.click(await ship("Giao nhanh"));

    expect(await within(summary).findByText(S("shipping.unavailable"))).toBeInTheDocument();
    expect(within(summary).queryByText("380.000 VNĐ")).not.toBeInTheDocument();
    expect(within(summary).getAllByText("…").length).toBeGreaterThanOrEqual(2);
  });

  it("shows … for the subtotal and the total while the lines are being priced again", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    const { store } = await renderCheckout([A()]);
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    await within(summary).findByText("380.000 VNĐ");
    server.use(
      http.post(`${API}/api/orders/quote`, async () => {
        await open;
        return HttpResponse.json({ data: defaultQuote("standard", 700_000) });
      })
    );

    act(() => void store.dispatch(updateQuantity({ productId: "a", size: "M", color: "Red", quantity: 2 })));

    await waitFor(() => expect(within(summary).queryByText("380.000 VNĐ")).not.toBeInTheDocument());
    expect(within(summary).getAllByText("…").length).toBeGreaterThanOrEqual(2);
    release();
    expect(await within(summary).findByText("730.000 VNĐ")).toBeInTheDocument();
  });

  it("when pricing the same method again fails, says the fee cannot be loaded and no longer shows the old total", async () => {
    let asked = 0;
    const { store } = await renderCheckout([A()], { quote: (method) => (++asked === 1 ? defaultQuote(method) : "error") });
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    await within(summary).findByText("380.000 VNĐ");

    act(() => void store.dispatch(updateQuantity({ productId: "a", size: "M", color: "Red", quantity: 2 })));

    expect(await within(summary).findByText(S("shipping.unavailable"))).toBeInTheDocument();
    expect(within(summary).queryByText("380.000 VNĐ")).not.toBeInTheDocument();
  });

  it("has no bar when the chosen method is free anyway (pick-up)", async () => {
    await renderCheckout([A()], { subtotalVnd: 400_000 });
    await screen.findByText(msgf("private.checkout.summary.shipping.remaining", { amount: "1.000.000 VNĐ" }));

    await userEvent.click(await ship("Nhận tại cửa hàng"));

    await waitFor(() => expect(screen.queryByText(msgf("private.checkout.summary.shipping.remaining", { amount: "1.000.000 VNĐ" }))).not.toBeInTheDocument());
  });

  it("has no bar and no free-shipping note when the store switched free shipping off", async () => {
    await renderCheckout([A()], {
      quote: (method) => ({ ...defaultQuote(method), freeShippingThresholdVnd: null, freeShippingThresholdUsd: null }),
    });
    const summary = screen.getByRole("heading", { name: S("title") }).closest("aside") as HTMLElement;
    await within(summary).findByText("380.000 VNĐ");

    expect(within(summary).queryByText(/Miễn phí vận chuyển cho đơn hàng/)).not.toBeInTheDocument();
    expect(within(summary).queryByText(/Mua đủ/)).not.toBeInTheDocument();
  });
});
