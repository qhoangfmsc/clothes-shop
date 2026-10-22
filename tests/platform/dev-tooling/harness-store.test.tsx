import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { notFound, redirect, useParams, useSearchParams } from "next/navigation";
import { describe, expect, it } from "vitest";
import { addItem } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The Redux store and `next/navigation` in the render harness (specs/platform/dev-tooling.md, flows QG-13, QG-14, QG-14E). */

const LINE = { productId: "p1", name: "Dress", priceVnd: 350_000, priceUsd: 13.46, image: "/a.jpg", size: "M", color: "Red", colorHex: "#f00", category: "tops", subcategory: "shirts" };
const CART = (quantity: number) => ({ items: [{ ...LINE, quantity, lineTotalVnd: null, lineTotalUsd: null }], deselectedKeys: [], pendingAddKeys: [], pendingSync: 0, isOpen: false, isSyncing: false });

function Lines() {
  const lines = useAppSelector((state) => state.cart.items);
  const dispatch = useAppDispatch();
  return (
    <div>
      <p>{`lines ${lines.length} qty ${lines.reduce((sum, l) => sum + l.quantity, 0)}`}</p>
      <button onClick={() => dispatch(addItem(LINE, 1))}>add</button>
    </div>
  );
}

describe("QG-13 a store of its own in every render", () => {
  it("starts empty by default", async () => {
    const { store } = await renderApp(<Lines />);

    expect(screen.getByText("lines 0 qty 0")).toBeInTheDocument();
    expect(store.getState().cart.items).toEqual([]);
  });

  it("starts from the state the test gives", async () => {
    await renderApp(<Lines />, { store: { cart: CART(3) } });

    expect(screen.getByText("lines 1 qty 3")).toBeInTheDocument();
  });

  it("returns the store the component uses: a click shows up in both", async () => {
    const { store } = await renderApp(<Lines />);

    await userEvent.click(screen.getByRole("button", { name: "add" }));

    expect(screen.getByText("lines 1 qty 1")).toBeInTheDocument();
    expect(store.getState().cart.items).toHaveLength(1);
  });

  it("does not share state between two renders in one test", async () => {
    const first = await renderApp(<Lines />);
    await userEvent.click(screen.getByRole("button", { name: "add" }));
    first.unmount();

    const second = await renderApp(<Lines />);

    expect(second.store.getState().cart.items).toEqual([]);
    expect(second.store).not.toBe(first.store);
  });

  it("saves the cart in localStorage like the app does", async () => {
    await renderApp(<Lines />);

    await userEvent.click(screen.getByRole("button", { name: "add" }));

    expect(JSON.parse(localStorage.getItem("doovan-cart") ?? "null").state.items).toHaveLength(1);
  });

  it("keeps the same store when the component is rendered again", async () => {
    const result = await renderApp(<Lines />, { store: { cart: CART(2) } });

    result.rerender(<Lines />);

    expect(screen.getByText("lines 1 qty 2")).toBeInTheDocument();
  });

  it("works next to a signed-in user", async () => {
    const { store, user } = await renderApp(<Lines />, { as: "user", store: { cart: CART(1) } });

    expect(user?.role).toBe("user");
    expect(store.getState().cart.items).toHaveLength(1);
  });
});

function Query() {
  const search = useSearchParams();
  const params = useParams<{ orderId?: string }>();
  return <p>{`q=${search.get("q") ?? "-"} order=${params.orderId ?? "-"}`}</p>;
}

describe("QG-14 next/navigation in the harness", () => {
  it("gives useSearchParams the query the test set", async () => {
    navigation.searchParams = new URLSearchParams("q=red");

    await renderApp(<Query />);

    expect(screen.getByText("q=red order=-")).toBeInTheDocument();
  });

  it("gives useParams the route parameters the test set", async () => {
    navigation.params = { orderId: "o-9" };

    await renderApp(<Query />);

    expect(screen.getByText("q=- order=o-9")).toBeInTheDocument();
  });

  it("notFound throws like Next does", () => {
    expect(() => notFound()).toThrow("NEXT_NOT_FOUND");
  });

  it("reset clears the query, the parameters and the redirects", () => {
    navigation.searchParams = new URLSearchParams("q=red");
    navigation.params = { orderId: "o-9" };

    navigation.reset();

    expect(navigation.searchParams.toString()).toBe("");
    expect(navigation.params).toEqual({});
  });
});

describe("QG-14E defaults and redirects", () => {
  it("shows an empty query and no parameters when the test sets nothing", async () => {
    await renderApp(<Query />);

    expect(screen.getByText("q=- order=-")).toBeInTheDocument();
  });

  it("redirect records where to and throws", () => {
    expect(() => redirect("/login")).toThrow("NEXT_REDIRECT:/login");
    expect(navigation.redirects).toEqual(["/login"]);
  });
});
