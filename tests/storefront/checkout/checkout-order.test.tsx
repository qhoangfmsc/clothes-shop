import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { track } from "@vercel/analytics";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@/tests/_support/api";
import { cartState } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { A, B, renderCheckout } from "./checkout-kit";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

/* Placing the order (specs/storefront/checkout.md, flows CHK-9 to CHK-10E). */

const label = (field: string, required = false) => `${msg(`common.addressField.${field}`)}${required ? " *" : ""}`;
const input = (field: string, required = false) => screen.getByRole("textbox", { name: label(field, required) }) as HTMLInputElement;
const radio = (name: string) => screen.getByRole("radio", { name });
const ship = (name: string) => screen.findByRole("radio", { name: new RegExp(name) });
const placeOrder = () => screen.getByRole("button", { name: new RegExp(`^(${msg("private.checkout.summary.placeAndPay")}|${msg("private.checkout.summary.place")}|${msg("private.checkout.summary.placing")})$`) });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const T = (key: string) => msg(`private.checkout.toast.${key}`);

async function fillDelivery() {
  await userEvent.type(input("phone", true), "0901234567");
  await userEvent.type(input("addressLine1", true), "1 Le Loi");
  await userEvent.type(input("city", true), "Ho Chi Minh");
}

beforeEach(() => vi.mocked(track).mockClear());

describe("CHK-9 placing an order for delivery, paid by bank transfer", () => {
  it("reads the BE cart, saves the address, creates the order with the BE's line ids, and goes to the payment page", async () => {
    const { calls, store } = await renderCheckout([A(), B()]);
    await fillDelivery();

    await userEvent.click(placeOrder());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/checkout/payment/o-1"));
    expect(calls.carts).toBe(1);
    expect(calls.addresses).toEqual([{ fullName: "Mai", phone: "0901234567", addressLine1: "1 Le Loi", city: "Ho Chi Minh", country: "Vietnam" }]);
    expect(calls.orders).toEqual([{ addressId: "addr-1", shippingMethod: "standard", cartItemIds: ["srv-a", "srv-b"] }]);
    expect(store.getState().cart.items).toEqual([]);
    expect(await screen.findByText(T("placed"))).toBeInTheDocument();
  });

  it("sends the optional fields and the note too, and the chosen shipping method", async () => {
    const { calls } = await renderCheckout([A()]);
    await userEvent.click(await ship("Giao nhanh"));
    await fillDelivery();
    await userEvent.type(input("province"), "HCM");
    await userEvent.click(screen.getByRole("button", { name: msg("private.checkout.form.moreDetails") }));
    await userEvent.type(input("addressLine2"), "Apt 5");
    await userEvent.type(input("postalCode"), "700000");
    await userEvent.type(screen.getByRole("textbox", { name: msg("private.checkout.note.title") }), "Gate code 1234");

    await userEvent.click(placeOrder());

    await waitFor(() => expect(calls.orders).toHaveLength(1));
    expect(calls.addresses[0]).toEqual({ fullName: "Mai", phone: "0901234567", addressLine1: "1 Le Loi", addressLine2: "Apt 5", city: "Ho Chi Minh", province: "HCM", postalCode: "700000", country: "Vietnam" });
    expect(calls.orders[0]).toEqual({ addressId: "addr-1", shippingMethod: "express", note: "Gate code 1234", cartItemIds: ["srv-a"] });
  });

  it("sends Vietnam as the country when the country box was emptied", async () => {
    const { calls } = await renderCheckout([A()]);
    await fillDelivery();
    await userEvent.click(screen.getByRole("button", { name: msg("private.checkout.form.moreDetails") }));
    await userEvent.clear(input("country"));

    await userEvent.click(placeOrder());

    await waitFor(() => expect(calls.addresses).toHaveLength(1));
    expect(calls.addresses[0].country).toBe("Vietnam");
  });

  it("removes only the lines that were ordered from the bag; unticked lines stay", async () => {
    const { store } = await renderCheckout([A(), B()], { store: { cart: cartState([A(), B()], { deselectedKeys: ["b|L|Blue"] }) } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalled());
    expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["b"]);
  });

  it("orders only the ticked lines", async () => {
    const { calls } = await renderCheckout([A(), B()], { store: { cart: cartState([A(), B()], { deselectedKeys: ["b|L|Blue"] }) } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    await waitFor(() => expect(calls.orders).toHaveLength(1));
    expect(calls.orders[0].cartItemIds).toEqual(["srv-a"]);
  });

  it("records the purchase with the order total of the BE, in the currency of the language", async () => {
    await renderCheckout([A()], { order: { data: { id: "o-1", totalVnd: 380_000, totalUsd: 14.61 } } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    await waitFor(() => expect(track).toHaveBeenCalledWith("purchase", { orderId: "o-1", vnd: 380_000 }));
  });

  it("records the purchase in dollars on the English site", async () => {
    await renderCheckout([A()], { locale: "en", order: { data: { id: "o-2", totalVnd: 380_000, totalUsd: 14.61 } } });
    await userEvent.type(screen.getByRole("textbox", { name: `${msg("common.addressField.phone", "en")} *` }), "0901234567");
    await userEvent.type(screen.getByRole("textbox", { name: `${msg("common.addressField.addressLine1", "en")} *` }), "1 Le Loi");
    await userEvent.type(screen.getByRole("textbox", { name: `${msg("common.addressField.city", "en")} *` }), "Ho Chi Minh");

    await userEvent.click(screen.getByRole("button", { name: msg("private.checkout.summary.placeAndPay", "en") }));

    await waitFor(() => expect(track).toHaveBeenCalledWith("purchase", { orderId: "o-2", usd: 14.61 }));
  });

  it("holds the page still while leaving: no 'empty bag' flash after the bag was emptied", async () => {
    await renderCheckout([A()]);
    await fillDelivery();

    await userEvent.click(placeOrder());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: msg("private.checkout.empty.title") })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("sends the address as typed, spaces included (the shop-pick-up contact is trimmed; see the spec, section 7)", async () => {
    const { calls } = await renderCheckout([A()]);
    await userEvent.type(input("phone", true), " 0901234567 ");
    await userEvent.type(input("addressLine1", true), "1 Le Loi");
    await userEvent.type(input("city", true), "HCM");

    await userEvent.click(placeOrder());

    await waitFor(() => expect(calls.addresses).toHaveLength(1));
    expect(calls.addresses[0].phone).toBe(" 0901234567 ");
  });
});

describe("CHK-9E other ways to place an order", () => {
  it("pay later goes to the order page instead of the payment page", async () => {
    await renderCheckout([A()]);
    await fillDelivery();
    await userEvent.click(radio(msg("private.checkout.method.options.later.title")));

    await userEvent.click(placeOrder());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/orders/o-1"));
  });

  it("puts the order id in the address safely", async () => {
    await renderCheckout([A()], { order: { data: { id: "a/b c", totalVnd: 1, totalUsd: 1 } } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/checkout/payment/a%2Fb%20c"));
  });

  it("goes to the list of orders when the BE did not give an id, and records no purchase", async () => {
    await renderCheckout([A()], { order: { data: {} } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/orders"));
    expect(track).not.toHaveBeenCalledWith("purchase", expect.anything());
  });

  it("collecting at the shop creates no address and sends who collects, without extra spaces", async () => {
    const { calls } = await renderCheckout([A()]);
    await userEvent.click(await ship("Nhận tại cửa hàng"));
    await userEvent.clear(input("fullName", true));
    await userEvent.type(input("fullName", true), "  Lan  ");
    await userEvent.type(input("phone", true), " 0909 ");

    await userEvent.click(placeOrder());

    await waitFor(() => expect(calls.orders).toHaveLength(1));
    expect(calls.addresses).toEqual([]);
    expect(calls.orders[0]).toEqual({ pickupContact: { fullName: "Lan", phone: "0909" }, shippingMethod: "store-pickup", cartItemIds: ["srv-a"] });
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/checkout/payment/o-1"));
  });
});

describe("CHK-10 the start of checkout is tracked", () => {
  it("sends begin_checkout once, with the item count and the BE's subtotal", async () => {
    await renderCheckout([A({ quantity: 2 }), B()], { subtotalVnd: 1_500_000 });

    await waitFor(() => expect(track).toHaveBeenCalledWith("begin_checkout", { items: 3, vnd: 1_500_000 }));
    expect(vi.mocked(track).mock.calls.filter(([name]) => name === "begin_checkout")).toHaveLength(1);
  });

  it("does not send it again when the shipping method changes and a new quote comes", async () => {
    const { calls } = await renderCheckout([A()]);
    await waitFor(() => expect(track).toHaveBeenCalledWith("begin_checkout", expect.anything()));

    await userEvent.click(await ship("Giao nhanh"));
    await waitFor(() => expect(calls.quotes).toHaveLength(2));
    await wait(100);

    expect(vi.mocked(track).mock.calls.filter(([name]) => name === "begin_checkout")).toHaveLength(1);
  });

  it("sends it in dollars on the English site", async () => {
    await renderCheckout([A()], { locale: "en", subtotalVnd: 520_000 });

    await waitFor(() => expect(track).toHaveBeenCalledWith("begin_checkout", { items: 1, usd: 20 }));
  });

  it("sends nothing when there is no quote", async () => {
    await renderCheckout([A()], { quote: () => "error" });
    await wait(200);

    expect(track).not.toHaveBeenCalledWith("begin_checkout", expect.anything());
  });
});

describe("CHK-10E an order that cannot be placed", () => {
  const stillThere = async (calls: Awaited<ReturnType<typeof renderCheckout>>["calls"]) => {
    await wait(100);
    expect(navigation.router.replace).not.toHaveBeenCalled();
    expect(placeOrder()).toBeEnabled();
    expect(calls.orders.length <= 1).toBe(true);
  };

  it("stops with a message when the BE cart no longer has a line, and sends no address and no order", async () => {
    const { calls, store } = await renderCheckout([A(), B()], { cart: [A()] });
    await fillDelivery();

    await userEvent.click(placeOrder());

    expect(await screen.findByText(T("itemsNotSynced"))).toBeInTheDocument();
    expect(calls.addresses).toEqual([]);
    expect(calls.orders).toEqual([]);
    expect(store.getState().cart.items.length).toBeGreaterThan(0);
    await stillThere(calls);
  });

  it("shows the BE's message when the address cannot be saved, and creates no order", async () => {
    const { calls } = await renderCheckout([A()], { addressStatus: 422, addressBody: { message: "Địa chỉ không hợp lệ" } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    expect(await screen.findByText("Địa chỉ không hợp lệ")).toBeInTheDocument();
    expect(calls.orders).toEqual([]);
    await stillThere(calls);
  });

  it("says the address could not be saved when the BE answers without an id", async () => {
    const { calls } = await renderCheckout([A()], { addressBody: { data: {} } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    expect(await screen.findByText(T("addressFailed"))).toBeInTheDocument();
    expect(calls.orders).toEqual([]);
    await stillThere(calls);
  });

  it("shows the translated message for a BE error code (a sold-out or custom-order product), and keeps the bag", async () => {
    const { calls, store } = await renderCheckout([A()], { order: { status: 400, body: { message: "Product not purchasable", errorCode: 1303 } } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    expect(await screen.findByText(msg("shared.errors.byCode.1303"))).toBeInTheDocument();
    expect(store.getState().cart.items).toHaveLength(1);
    await stillThere(calls);
  });

  it("shows the BE's text when the error has no translation", async () => {
    await renderCheckout([A()], { order: { status: 409, body: { message: "Out of stock today" } } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    expect(await screen.findByText("Out of stock today")).toBeInTheDocument();
  });

  it("shows the translated 'order failed' when the BE says nothing else", async () => {
    await renderCheckout([A()], { order: { status: 500, body: {} } });
    await fillDelivery();

    await userEvent.click(placeOrder());

    expect(await screen.findByText(T("failed"))).toBeInTheDocument();
  });

  it("shows the translated 'order failed', not the browser's words, when the bag cannot be read (no network), and sends nothing", async () => {
    const { calls } = await renderCheckout([A()], { cartFails: true });
    await fillDelivery();

    await userEvent.click(placeOrder());

    expect(await screen.findByText(T("failed"))).toBeInTheDocument();
    expect(screen.queryByText(/fetch/i)).not.toBeInTheDocument();
    expect(calls.addresses).toEqual([]);
    await stillThere(calls);
  });

  it("an address saved before a refused order stays saved, and the next try saves another one (see the spec, section 7)", async () => {
    const { calls } = await renderCheckout([A()], { order: { status: 400, body: { message: "no", errorCode: 1303 } } });
    await fillDelivery();

    await userEvent.click(placeOrder());
    await screen.findByText(msg("shared.errors.byCode.1303"));
    await userEvent.click(placeOrder());

    await waitFor(() => expect(calls.addresses).toHaveLength(2));
  });

  it("locks the button while the order is being sent, and a second press sends nothing more", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    const { calls } = await renderCheckout([A()]);
    server.use(
      http.post(`${API}/api/orders`, async ({ request }) => {
        calls.orders.push((await request.json()) as Record<string, unknown>);
        await open;
        return HttpResponse.json({ data: { id: "o-1", totalVnd: 1, totalUsd: 1 } });
      })
    );
    await fillDelivery();

    await userEvent.click(placeOrder());
    await waitFor(() => expect(calls.orders).toHaveLength(1));
    const busy = screen.getByRole("button", { name: msg("private.checkout.summary.placing") });
    expect(busy).toBeDisabled();
    await userEvent.click(busy);
    release();

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledTimes(1));
    expect(calls.orders).toHaveLength(1);
    expect(calls.addresses).toHaveLength(1);
  });
});
