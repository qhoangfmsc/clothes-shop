import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { selectIsWishlisted } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import { useProductWishlist } from "@/src/app/[locale]/(private)/wishlist/_common/use-product-wishlist";
import type { Product } from "@/src/types/product";
import { API } from "@/tests/_support/api";
import { product } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* The heart of one product, shared by the shop card, the product page and the collection page (specs/storefront/wishlist.md, flows WL-10 to WL-10E). */

function fakeWishlist(status = 200) {
  const calls = { adds: [] as string[], removes: [] as string[] };
  server.use(
    http.post(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.adds.push(String(params.id));
      return HttpResponse.json(status === 200 ? { data: null } : {}, { status });
    }),
    http.delete(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.removes.push(String(params.id));
      return HttpResponse.json({ data: null });
    })
  );
  return calls;
}

function Heart({ item, notify }: { item: Product; notify: (added: boolean) => void }) {
  const { isWishlisted, toggle } = useProductWishlist(item, notify);
  return (
    <button type="button" aria-pressed={isWishlisted} onClick={toggle}>
      heart
    </button>
  );
}

async function show(options: { as?: IdentityName; item?: Product; notify?: (added: boolean) => void; status?: number } = {}) {
  const { as = "user", item = product({ id: "p9" }), notify = vi.fn(), status } = options;
  const calls = fakeWishlist(status);
  const view = await renderApp(<Heart item={item} notify={notify} />, { as });
  return { ...view, calls, notify };
}
const heart = () => screen.getByRole("button", { name: "heart" });

describe("WL-10 pressing the heart", () => {
  it("asks a visitor to sign in first, saying why, and saves and tells nothing", async () => {
    const { store, calls, notify } = await show({ as: "guest" });

    await userEvent.click(heart());

    expect(await screen.findByText(msg("shared.feedback.loginPrompt.subtitle.saveToWishlist"))).toBeInTheDocument();
    expect(selectIsWishlisted("p9")(store.getState())).toBe(false);
    expect(calls.adds).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
  });

  it("saves what the wishlist page needs about the product, tells the BE and says it was added", async () => {
    const item = product({ id: "p9", name: "Silk dress", priceVnd: 350_000, priceUsd: 13.46, images: ["/silk.jpg", "/two.jpg"], badge: "new" });
    const { store, calls, notify } = await show({ item });

    await userEvent.click(heart());

    expect(store.getState().wishlist.items).toEqual([
      { productId: "p9", name: "Silk dress", priceVnd: 350_000, priceUsd: 13.46, image: "/silk.jpg", category: "tops", subcategory: "shirts", badge: "new", addedAt: expect.any(String) },
    ]);
    await waitFor(() => expect(calls.adds).toEqual(["p9"]));
    expect(calls.removes).toEqual([]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(true);
    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });

  it("takes the product off on the second press, tells the BE and says it was removed", async () => {
    const { store, calls, notify } = await show();
    await userEvent.click(heart());
    await waitFor(() => expect(calls.adds).toEqual(["p9"]));

    await userEvent.click(heart());

    await waitFor(() => expect(calls.removes).toEqual(["p9"]));
    expect(calls.adds).toEqual(["p9"]);
    expect(selectIsWishlisted("p9")(store.getState())).toBe(false);
    expect(notify).toHaveBeenLastCalledWith(false);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });

  it("starts filled for a product that is on the list", async () => {
    const view = await show({ item: product({ id: "p9" }) });
    view.unmount();

    await renderApp(<Heart item={product({ id: "p9" })} notify={() => {}} />, {
      as: "user",
      store: { wishlist: { items: [{ productId: "p9", name: "Dress", priceVnd: 1, priceUsd: 1, image: "/a.jpg", category: "tops", subcategory: "shirts", badge: null, addedAt: "2026-01-01T00:00:00.000Z" }], isSyncing: false } },
    });

    expect(heart()).toHaveAttribute("aria-pressed", "true");
  });

  it("saves a product without a category or sub-category with empty slugs", async () => {
    const { store } = await show({ item: product({ id: "p9", category: null as never, subcategory: null as never }) });

    await userEvent.click(heart());

    expect(store.getState().wishlist.items[0]).toMatchObject({ category: "", subcategory: "" });
  });
});

describe("WL-10E the BE refuses the save", () => {
  it("takes the heart back", async () => {
    const { store, calls } = await show({ status: 500 });

    await userEvent.click(heart());

    await waitFor(() => expect(calls.adds).toEqual(["p9"]));
    await waitFor(() => expect(selectIsWishlisted("p9")(store.getState())).toBe(false));
    expect(heart()).toHaveAttribute("aria-pressed", "false");
  });
});
