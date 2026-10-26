import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CartFAB from "@/src/app/[locale]/_components/CartFAB";
import { addItem } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { cartLine, cartState } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The round bag button that floats over every page (specs/platform/site-chrome.md, flows CHR-6 to CHR-7E). */

const bag = (lines = [cartLine({ quantity: 2 }), cartLine({ productId: "p2", quantity: 3 })], pathname = "/shop", locale?: "vi" | "en") => {
  navigation.pathname = pathname;
  return renderApp(<CartFAB />, { as: "user", locale, store: { cart: cartState(lines) } });
};
const button = () => screen.queryByRole("link", { name: /Xem giỏ hàng|View bag/ });

describe("CHR-6 the bag button", () => {
  it("shows how many pieces are in the bag, and goes to the bag", async () => {
    await bag();

    const link = await screen.findByRole("link", { name: msg("shared.cart.fab.viewBag").replace("{count}", "5") });
    expect(link).toHaveAttribute("href", "/cart");
    expect(link).toHaveTextContent("5");
  });

  it("counts pieces, not lines", async () => {
    await bag([cartLine({ quantity: 7 })]);

    expect(await screen.findByText("7")).toBeInTheDocument();
  });

  it("is not there when the bag is empty", async () => {
    await bag([]);

    expect(button()).toBeNull();
  });

  it("comes when the first piece is put in the bag, and goes when the bag is emptied", async () => {
    const { store } = await bag([]);
    expect(button()).toBeNull();

    act(() => void store.dispatch(addItem({ productId: "p9", name: "Dress", priceVnd: 1, priceUsd: 1, image: "/a.jpg", size: "M", color: "Red", colorHex: "#f00", category: "tops", subcategory: "shirts", badge: null }, 2)));
    expect(await screen.findByText("2")).toBeInTheDocument();
    act(() => void store.dispatch({ type: "cart/clearCart" }));

    await waitFor(() => expect(button()).toBeNull());
  });

  it("follows the count as it changes", async () => {
    const { store } = await bag([cartLine({ quantity: 1 })]);
    await screen.findByText("1");

    act(() => void store.dispatch(addItem({ productId: "p9", name: "Dress", priceVnd: 1, priceUsd: 1, image: "/a.jpg", size: "M", color: "Red", colorHex: "#f00", category: "tops", subcategory: "shirts", badge: null }, 3)));

    expect(await screen.findByText("4")).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await bag([cartLine({ quantity: 1 })], "/shop", "en");

    expect(await screen.findByRole("link", { name: "View bag (1 item)" })).toBeInTheDocument();
  });
});

describe("CHR-7 where it hides", () => {
  it.each([["/cart"], ["/checkout"], ["/checkout/payment"], ["/checkout/anything/else"], ["/checkouts-info"]])("is hidden on %s, which (and anything under or starting with them) have their own buttons to pay", async (pathname) => {
    await bag(undefined, pathname);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(button()).toBeNull();
  });

  it.each([["/"], ["/shop"], ["/cartoons"], ["/account"], ["/admin/orders"]])("is shown on %s", async (pathname) => {
    await bag(undefined, pathname);

    expect(await screen.findByRole("link", { name: /Xem giỏ hàng/ })).toBeInTheDocument();
  });
});
