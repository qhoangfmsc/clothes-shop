import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import CartSync from "@/src/app/[locale]/(private)/cart/_components/CartSync";
import { useAuth } from "@/src/contexts/auth-context";
import { API } from "@/tests/_support/api";
import { cartLine, cartState, serverCart } from "@/tests/_support/fixtures";
import { IDENTITIES } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* CartSync follows the session (specs/storefront/cart.md, flows CART-8 and CART-8E). */

function Harness() {
  const { login, logout } = useAuth();
  return (
    <>
      <CartSync />
      <button onClick={() => login("google-id-token")}>sign in as someone else</button>
      <button onClick={() => logout()}>sign out</button>
    </>
  );
}

/** Counts `GET /api/cart` and answers with the cart of whoever's token it carries. */
function fakeCart(byToken: Record<string, ReturnType<typeof cartLine>[]>) {
  const calls: string[] = [];
  server.use(
    http.get(`${API}/api/cart`, ({ request }) => {
      const token = (request.headers.get("authorization") ?? "").replace("Bearer ", "");
      calls.push(token);
      return HttpResponse.json(serverCart(byToken[token] ?? []));
    })
  );
  return calls;
}

describe("CART-8 a signed-in user", () => {
  it("loads the BE cart once the session is known", async () => {
    const calls = fakeCart({ "test-access": [cartLine({ productId: "p7", quantity: 2, serverItemId: "srv-7" })] });

    const { store } = await renderApp(<Harness />, { as: "user" });

    await waitFor(() => expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["p7"]));
    expect(calls).toEqual(["test-access"]);
  });

  it("replaces what the browser had with the user's own cart", async () => {
    fakeCart({ "test-access": [cartLine({ productId: "p7" })] });

    const { store } = await renderApp(<Harness />, { as: "user", store: { cart: cartState([cartLine({ productId: "left-by-someone-else" })]) } });

    await waitFor(() => expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["p7"]));
  });

  it("loads the new user's cart when the account changes", async () => {
    const calls = fakeCart({ "test-access": [cartLine({ productId: "mine" })], "second-access": [cartLine({ productId: "theirs" })] });
    server.use(http.post(`${API}/api/auth/google`, () => HttpResponse.json({ accessToken: "second-access", refreshToken: "second-refresh", user: { ...IDENTITIES.user!, id: "u-2", email: "lan@example.com" } })));
    const { store } = await renderApp(<Harness />, { as: "user" });
    await waitFor(() => expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["mine"]));

    await userEvent.click(screen.getByRole("button", { name: "sign in as someone else" }));

    await waitFor(() => expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["theirs"]));
    expect(calls).toEqual(["test-access", "second-access"]);
  });
});

describe("CART-8E a visitor, or a session that is not known yet", () => {
  it("empties the cart kept in the browser and does not ask the BE", async () => {
    const calls = fakeCart({});

    const { store } = await renderApp(<Harness />, { as: "guest", store: { cart: cartState([cartLine()], { deselectedKeys: ["p1|M|Red"] }) } });

    await waitFor(() => expect(store.getState().cart.items).toEqual([]));
    expect(store.getState().cart.deselectedKeys).toEqual([]);
    expect(calls).toEqual([]);
    expect(JSON.parse(localStorage.getItem("doovan-cart") ?? "null").state.items).toEqual([]);
  });

  it("does nothing while the session is still being worked out, so a signed-in user's cart is not thrown away", async () => {
    let release!: () => void;
    const open = new Promise<void>((resolve) => (release = resolve));
    const calls = fakeCart({ "test-access": [cartLine({ productId: "p7" })] });
    const { store } = await renderApp(<Harness />, { as: "user", waitForAuth: false, store: { cart: cartState([cartLine({ productId: "kept" })]) } });
    server.use(http.get(`${API}/api/auth/me`, async () => (await open, HttpResponse.json({ user: IDENTITIES.user }))));

    expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["kept"]);
    expect(calls).toEqual([]);
    release();

    await waitFor(() => expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["p7"]));
  });

  it("empties the local cart when the user signs out, and asks the BE for nothing more", async () => {
    const calls = fakeCart({ "test-access": [cartLine({ productId: "p7" })] });
    const { store } = await renderApp(<Harness />, { as: "user" });
    await waitFor(() => expect(store.getState().cart.items).toHaveLength(1));

    await userEvent.click(screen.getByRole("button", { name: "sign out" }));

    await waitFor(() => expect(store.getState().cart.items).toEqual([]));
    expect(calls).toHaveLength(1);
  });

  it("keeps the local cart when the BE cannot be reached", async () => {
    let asked = 0;
    server.use(
      http.get(`${API}/api/cart`, () => {
        asked += 1;
        return HttpResponse.json({ message: "boom" }, { status: 500 });
      })
    );

    const { store } = await renderApp(<Harness />, { as: "user", store: { cart: cartState([cartLine({ productId: "kept" })]) } });

    await waitFor(() => expect(asked).toBe(1));
    await waitFor(() => expect(store.getState().cart.isSyncing).toBe(false));
    expect(store.getState().cart.items.map((l) => l.productId)).toEqual(["kept"]);
  });
});
