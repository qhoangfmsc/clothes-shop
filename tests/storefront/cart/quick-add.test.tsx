import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { track } from "@vercel/analytics";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { QuickAddProvider, useQuickAdd } from "@/src/app/[locale]/_components/QuickAddDrawer";
import type { Product } from "@/src/types/product";
import { API } from "@/tests/_support/api";
import { cartLine, cartState, product, serverCart } from "@/tests/_support/fixtures";
import { msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

/* The quick-add drawer (specs/storefront/cart.md, flows CART-17 to CART-18E). */

const Q = (key: string) => msg(`shared.cart.quickAdd.${key}`);

function Shelf({ item }: { item: Product }) {
  const { openQuickAdd } = useQuickAdd();
  return <button onClick={() => openQuickAdd(item)}>open the drawer</button>;
}

/** Fake BE: records the lines posted to the cart. */
function fakeCart(status = 200) {
  const posted: unknown[] = [];
  server.use(
    http.post(`${API}/api/cart/items`, async ({ request }) => {
      posted.push(await request.json());
      return status === 200 ? HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-new" })])) : HttpResponse.json({ message: "Unauthorized" }, { status });
    })
  );
  return posted;
}

async function open(item: Product = product(), options: { as?: "guest" | "user"; locale?: "vi" | "en" } = {}) {
  const view = await renderApp(
    <QuickAddProvider>
      <Shelf item={item} />
    </QuickAddProvider>,
    { as: options.as ?? "user", locale: options.locale }
  );
  await userEvent.click(screen.getByRole("button", { name: "open the drawer" }));
  return view;
}

const size = (name: string) => screen.getByRole("button", { name });
const colour = (name: string) => screen.getByTitle(name);
const addButton = () => screen.getByRole("button", { name: new RegExp(`${Q("addToBag")}|${Q("added")}`) });
const drawerEdge = () => addButton().closest("div.fixed") as HTMLElement;
const gone = () => waitFor(() => expect(screen.queryByRole("button", { name: Q("close") })).not.toBeInTheDocument(), { timeout: 3000 });

describe("CART-17 adding from the drawer", () => {
  it("opens with the product's name (a link to its page), price, sizes and colours", async () => {
    await open(product({ originalPriceVnd: 450_000, originalPriceUsd: 17.31 }));

    expect(screen.getByRole("link", { name: "Dress" })).toHaveAttribute("href", "/shop/tops/shirts/p1");
    expect(screen.getByText("350.000 VNĐ")).toBeInTheDocument();
    expect(screen.getByText("450.000 VNĐ")).toBeInTheDocument();
    for (const s of ["S", "M", "L"]) expect(size(s)).toBeInTheDocument();
    expect(colour("Red")).toBeInTheDocument();
    expect(colour("Blue")).toBeInTheDocument();
  });

  it("adds the chosen size, colour and quantity: the line appears at once, the BE is told, the event is tracked", async () => {
    const posted = fakeCart();
    const { store } = await open();

    await userEvent.click(size("M"));
    await userEvent.click(colour("Blue"));
    await userEvent.click(screen.getByRole("button", { name: Q("increase") }));
    await userEvent.click(addButton());

    expect(store.getState().cart.items).toEqual([
      { productId: "p1", name: "Dress", priceVnd: 350_000, priceUsd: 13.46, image: "/a.jpg", size: "M", color: "Blue", colorHex: "#00f", category: "tops", subcategory: "shirts", badge: null, quantity: 2, lineTotalVnd: null, lineTotalUsd: null },
    ]);
    await waitFor(() => expect(posted).toEqual([{ productId: "p1", size: "M", color: "Blue", quantity: 2 }]));
    expect(track).toHaveBeenCalledWith("add_to_cart", { productId: "p1", vnd: 350_000 });
  });

  it("tracks the price in dollars on the English site", async () => {
    fakeCart();
    vi.mocked(track).mockClear();
    await open(product(), { locale: "en" });

    await userEvent.click(size("L"));
    await userEvent.click(colour("Red"));
    await userEvent.click(screen.getByRole("button", { name: msg("shared.cart.quickAdd.addToBag", "en") }));

    expect(track).toHaveBeenCalledWith("add_to_cart", { productId: "p1", usd: 13.46 });
  });

  it("says it was added with a link to the cart, turns the button into 'added' and closes by itself", async () => {
    fakeCart();
    await open();
    await userEvent.click(size("M"));
    await userEvent.click(colour("Red"));

    await userEvent.click(addButton());

    expect(await screen.findByText(/Dress \(M, Red\)/)).toBeInTheDocument();
    const linkText = msg("shared.cart.quickAdd.toastAdded").match(/<link>(.*)<\/link>/)![1];
    expect(screen.getByRole("link", { name: linkText })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("button", { name: Q("added") })).toBeInTheDocument();
    await gone();
    expect(document.body.style.overflow).toBe("");
  });

  it("names the quantity in the message when it is more than one", async () => {
    fakeCart();
    await open();
    await userEvent.click(size("M"));
    await userEvent.click(colour("Red"));
    await userEvent.click(screen.getByRole("button", { name: Q("increase") }));

    await userEvent.click(addButton());

    expect(await screen.findByText(/Dress \(M, Red, ×2\)/)).toBeInTheDocument();
  });
});

describe("CART-17E what the drawer will not do", () => {
  it.each([
    ["sold out", "sold_out"],
    ["a custom order", "custom_order"],
  ] as const)("does not open for a product that is %s", async (_what, badge) => {
    await renderApp(
      <QuickAddProvider>
        <Shelf item={product({ badge })} />
      </QuickAddProvider>,
      { as: "user" }
    );

    await userEvent.click(screen.getByRole("button", { name: "open the drawer" }));

    expect(screen.queryByRole("button", { name: Q("close") })).not.toBeInTheDocument();
  });

  it("keeps the add button locked and says what is missing, until both a size and a colour are chosen", async () => {
    await open();
    expect(addButton()).toBeDisabled();
    expect(screen.getByText(Q("hintBoth"))).toBeInTheDocument();

    await userEvent.click(size("M"));
    expect(addButton()).toBeDisabled();
    expect(screen.getByText(Q("hintColor"))).toBeInTheDocument();

    await userEvent.click(colour("Red"));
    expect(addButton()).toBeEnabled();
    expect(screen.queryByText(Q("hintColor"))).not.toBeInTheDocument();
  });

  it("asks for the size when only a colour is chosen", async () => {
    await open();

    await userEvent.click(colour("Red"));

    expect(screen.getByText(Q("hintSize"))).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it("cannot add a product that has no colours: there is nothing to choose (see the spec, section 7)", async () => {
    const { store } = await open(product({ colors: [] }));

    await userEvent.click(size("M"));

    expect(screen.queryByText(Q("color"))).not.toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(store.getState().cart.items).toEqual([]);
  });

  it("adds once even when the button is pressed twice", async () => {
    const posted = fakeCart();
    const { store } = await open();
    await userEvent.click(size("M"));
    await userEvent.click(colour("Red"));

    await userEvent.click(addButton());
    await userEvent.click(addButton());

    expect(store.getState().cart.items[0].quantity).toBe(1);
    await waitFor(() => expect(posted).toHaveLength(1));
  });
});

describe("CART-18 closing, scrolling and quantity", () => {
  it.each([
    ["the close button", async () => userEvent.click(screen.getByRole("button", { name: Q("close") }))],
    ["a click outside", async () => userEvent.click(document.querySelector("div.fixed.inset-0") as HTMLElement)],
    ["the Escape key", async () => userEvent.keyboard("{Escape}")],
    ["a long swipe down", async () => {
      fireEvent.touchStart(drawerEdge(), { touches: [{ clientY: 100 }] });
      fireEvent.touchEnd(drawerEdge(), { changedTouches: [{ clientY: 200 }] });
    }],
  ])("closes with %s, and gives the page its scrolling back", async (_how, close) => {
    await open();
    expect(document.body.style.overflow).toBe("hidden");

    await close();

    await gone();
    expect(document.body.style.overflow).toBe("");
  });

  it("stays open for a short swipe, and for a swipe upward", async () => {
    await open();

    fireEvent.touchStart(drawerEdge(), { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(drawerEdge(), { changedTouches: [{ clientY: 170 }] });
    fireEvent.touchStart(drawerEdge(), { touches: [{ clientY: 300 }] });
    fireEvent.touchEnd(drawerEdge(), { changedTouches: [{ clientY: 100 }] });

    /* A closing drawer stays in the page while it slides out, so give it longer than that before saying it is still open */
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(screen.getByRole("button", { name: Q("close") })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("keeps the quantity between 1 and 10", async () => {
    await open();
    const less = () => screen.getByRole("button", { name: Q("decrease") });
    const more = () => screen.getByRole("button", { name: Q("increase") });
    expect(less()).toBeDisabled();

    for (let i = 0; i < 12; i++) if (!(more() as HTMLButtonElement).disabled) await userEvent.click(more());
    expect(more()).toBeDisabled();
    expect(screen.getByText("10")).toBeInTheDocument();

    await userEvent.click(less());
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(more()).toBeEnabled();
  });

  it("loads the size table only when it is asked for", async () => {
    let asked = 0;
    server.use(
      http.get(`${API}/api/size-guides/tops`, () => {
        asked += 1;
        return HttpResponse.json({ data: { category: "tops", title: "Tops", description: "", unit: "cm", columns: ["Size", "Bust"], rows: [{ size: "M", bust: "88" }], tips: [] } });
      })
    );
    await open();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(asked).toBe(0);

    await userEvent.click(screen.getByRole("button", { name: Q("sizeGuide") }));

    expect(await screen.findByRole("columnheader", { name: "Bust" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "88" })).toBeInTheDocument();
    expect(asked).toBe(1);
  });
});

describe("CART-18E a visitor, and using the drawer in the wrong place", () => {
  it("a visitor can still fill the bag here; the BE refuses, and the line stays on screen until the next sync clears it", async () => {
    const posted = fakeCart(401);
    const { store } = await open(product(), { as: "guest" });

    await userEvent.click(size("M"));
    await userEvent.click(colour("Red"));
    await userEvent.click(addButton());

    await waitFor(() => expect(posted).toHaveLength(1));
    await waitFor(() => expect(store.getState().cart.pendingSync).toBe(0));
    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0].serverItemId).toBeUndefined();
    expect(store.getState().cart.pendingAddKeys).toEqual([]);
  });

  it("adds to a line that is already in the bag instead of making a second one", async () => {
    fakeCart();
    const { store } = await renderApp(
      <QuickAddProvider>
        <Shelf item={product()} />
      </QuickAddProvider>,
      { as: "user", store: { cart: cartState([cartLine({ quantity: 2, serverItemId: "srv-1" })]) } }
    );
    await userEvent.click(screen.getByRole("button", { name: "open the drawer" }));

    await userEvent.click(size("M"));
    await userEvent.click(colour("Red"));
    await userEvent.click(addButton());

    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0].quantity).toBe(3);
  });

  it("throws a clear error when the drawer is used outside its provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Lonely() {
      useQuickAdd();
      return null;
    }

    expect(() => render(<Lonely />)).toThrow("useQuickAdd must be used within a <QuickAddProvider>");
  });
});
