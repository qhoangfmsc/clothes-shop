import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ReviewsContent from "@/src/app/[locale]/(private)/reviews/ReviewsContent";
import { generateMetadata } from "@/src/app/[locale]/(private)/reviews/layout";
import { dateText, msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { authorReview, pendingReview, product, productSummary, renderReviews, type RenderReviewsOptions } from "./reviews-kit";

/* The "Reviews" page of a customer: the sign-in wall, the two tabs, the lines still to review and the customer's own reviews (specs/storefront/customer-reviews.md, flows REV-1 to REV-12E). */

const R = (key: string, locale: "vi" | "en" = "vi") => msg(`private.reviews.${key}`, locale);
const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY - 60_000).toISOString();
const page = (options: RenderReviewsOptions = {}) => renderReviews(<ReviewsContent />, options);
const mineOf = (n: number, over = {}) => Array.from({ length: n }, (_, i) => authorReview({ id: `r${i + 1}`, content: `Words ${i + 1}`, createdAt: `2026-03-${String(10 + i).padStart(2, "0")}T05:00:00.000Z`, product: productSummary({ id: "p1", name: `Dress ${i + 1}` }), ...over }));
const cards = () => screen.queryAllByRole("listitem");

describe("REV-1 who may look", () => {
  it("asks a visitor to sign in, and asks the BE for nothing", async () => {
    const { calls } = await page({ as: "guest" });

    expect(await screen.findByText(msg("shared.feedback.unauthenticated.title"))).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(calls.pending).toBe(0);
    expect(calls.mine).toEqual([]);
  });

  it("shows grey boxes while it is not known who is looking", async () => {
    const { container } = await page({ as: "user", waitForAuth: false });

    expect(container.querySelectorAll("main > div > div")).toHaveLength(2);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByText(msg("shared.feedback.unauthenticated.title"))).not.toBeInTheDocument();
  });

  it("has a title, a link back to the account and two tabs, the first one open", async () => {
    await page({ pending: [pendingReview()] });

    expect(await screen.findByRole("heading", { level: 1, name: R("page.title") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: R("page.back") })).toHaveAttribute("href", "/account");
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Chờ đánh giá (1)", R("tabs.mine")]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("speaks English in English", async () => {
    await page({ locale: "en", pending: [pendingReview()] });

    expect(await screen.findByRole("heading", { level: 1, name: R("page.title", "en") })).toBeInTheDocument();
  });
});

describe("REV-2 the lines still to review", () => {
  it("explains who may review, and shows each line with its picture, name, size and colour, time left, order and a button", async () => {
    await page({ pending: [pendingReview({ productName: "Silk dress", size: "M", color: "Red", orderId: "o-77", reviewDeadline: inDays(12) })] });

    expect(await screen.findByText(R("pending.info"))).toBeInTheDocument();
    const card = (await screen.findAllByRole("listitem"))[0];
    expect(within(card).getAllByRole("link", { name: /Silk dress/ })[0]).toHaveAttribute("href", "/shop/tops/shirts/p1");
    expect(within(card).getByText("M · Red")).toBeInTheDocument();
    expect(within(card).getByText("Còn 12 ngày để đánh giá")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Đơn #o-77" })).toHaveAttribute("href", "/orders/o-77");
    expect(within(card).getByRole("button", { name: R("pending.card.review") })).toBeInTheDocument();
  });

  it("shows the quantity only when it is more than one", async () => {
    await page({ pending: [pendingReview({ orderItemId: "a", quantity: 1 }), pendingReview({ orderItemId: "b", quantity: 3 })] });

    const [one, three] = await screen.findAllByRole("listitem");
    expect(within(one).queryByText(/SL/)).not.toBeInTheDocument();
    expect(within(three).getByText(/SL 3/)).toBeInTheDocument();
  });

  it("marks a line with three days or fewer left as urgent, and one with more as calm", async () => {
    await page({ pending: [pendingReview({ orderItemId: "a", reviewDeadline: inDays(3) }), pendingReview({ orderItemId: "b", reviewDeadline: inDays(4) })] });

    const [urgent, calm] = await screen.findAllByRole("listitem");
    expect(within(urgent).getByText("Còn 3 ngày để đánh giá").className).toContain("accent-rose");
    expect(within(calm).getByText("Còn 4 ngày để đánh giá").className).not.toContain("accent-rose");
  });

  it("does not link a line whose product is gone, but still shows its name", async () => {
    await page({ pending: [pendingReview({ product: null, productName: "Old dress" })] });

    const card = (await screen.findAllByRole("listitem"))[0];
    expect(within(card).getByText("Old dress")).toBeInTheDocument();
    expect(within(card).queryByRole("link", { name: /Old dress/ })).not.toBeInTheDocument();
  });

  it("asks for up to 200 lines at once", async () => {
    const { calls } = await page({ pending: [] });

    await waitFor(() => expect(calls.pending).toBe(1));
    expect(Object.fromEntries(calls.pendingQueries[0])).toEqual({ limit: "200" });
  });

  it("shows grey boxes, and not the empty message, while the lines are on their way", async () => {
    const { container } = await page({ pending: [pendingReview()], pendingDelay: 150 });

    await waitFor(() => expect(container.querySelectorAll("#reviews-panel-pending [class*='checkout-shimmer']")).toHaveLength(2));
    expect(screen.queryByText(R("pending.empty.title"))).not.toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(await screen.findAllByRole("listitem")).toHaveLength(1);
  });

  it("says there is nothing to review yet, with a way back to the shop", async () => {
    await page({ pending: [] });

    expect(await screen.findByRole("heading", { name: R("pending.empty.title") })).toBeInTheDocument();
    expect(screen.getByText(R("pending.empty.description"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: R("pending.empty.cta") })).toHaveAttribute("href", "/shop");
  });

  it("opens the form to write a review of that line", async () => {
    await page({ pending: [pendingReview({ productName: "Silk dress" })] });

    await userEvent.click(await screen.findByRole("button", { name: R("pending.card.review") }));

    expect(await screen.findByRole("heading", { name: msg("shared.reviews.form.titleCreate") })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("Silk dress");
  });
});

describe("REV-2E the lines cannot be read", () => {
  it("says so, with a button that asks again", async () => {
    const { calls } = await page({ pending: 500 });

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(R("toast.loadFailed"))).toBeInTheDocument();
    await userEvent.click(within(alert).getByRole("button", { name: R("retry") }));

    await waitFor(() => expect(calls.pending).toBe(2));
  });

  it("gives the reason when the BE says the customer may not look", async () => {
    await page({ pending: 403 });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("REV-3 the tabs", () => {
  it("opens 'my reviews' from the address", async () => {
    await page({ search: "tab=mine", mine: mineOf(1) });

    expect(await screen.findByRole("tab", { name: R("tabs.mine") })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Words 1")).toBeInTheDocument();
  });

  it("opens the first tab for a tab it does not know", async () => {
    await page({ search: "tab=whatever", pending: [pendingReview()] });

    expect((await screen.findAllByRole("tab"))[0]).toHaveAttribute("aria-selected", "true");
  });

  it("puts the tab in the address, without scrolling", async () => {
    await page({ pending: [] });

    await userEvent.click(await screen.findByRole("tab", { name: R("tabs.mine") }));

    expect(navigation.router.replace).toHaveBeenCalledWith("/reviews?tab=mine", { scroll: false });
  });

  it("takes the tab out of the address for the first tab, and keeps the rest of it", async () => {
    await page({ search: "tab=mine&productId=p1", mine: [] });

    await userEvent.click(await screen.findByRole("tab", { name: /Chờ đánh giá/ }));

    expect(navigation.router.replace).toHaveBeenCalledWith("/reviews?productId=p1", { scroll: false });
  });

  it("goes to the plain address when nothing is left to say", async () => {
    await page({ search: "tab=mine", mine: [] });

    await userEvent.click(await screen.findByRole("tab", { name: /Chờ đánh giá/ }));

    expect(navigation.router.replace).toHaveBeenCalledWith("/reviews", { scroll: false });
  });

  it("names each panel after its tab", async () => {
    await page({ pending: [] });

    const panel = await screen.findByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", "reviews-tab-pending");
    expect(screen.getByRole("tab", { name: /Chờ đánh giá/ })).toHaveAttribute("aria-controls", "reviews-panel-pending");
  });
});

describe("REV-4 my reviews", () => {
  it("asks for the newest ten, with the photos as the BE sent them, and shows each review with its product and words", async () => {
    const { calls } = await page({ search: "tab=mine", mine: mineOf(3) });

    expect(await screen.findByText("Words 3")).toBeInTheDocument();
    expect(Object.fromEntries(calls.mine[0])).toEqual({ sort: "-createdAt", limit: "10" });
    expect(cards()).toHaveLength(3);
    expect(within(cards()[0]).getByText("Dress 1")).toBeInTheDocument();
    expect(within(cards()[0]).getByRole("link", { name: R("mine.card.viewProduct") })).toHaveAttribute("href", "/shop/tops/shirts/p1");
  });

  it("filters by status, and asks again from the first page", async () => {
    const { calls } = await page({ search: "tab=mine", mine: [...mineOf(2), authorReview({ id: "h1", status: "HIDDEN", content: "Hidden words", product: productSummary() })] });
    await screen.findByText("Words 1");

    await userEvent.click(screen.getByRole("button", { name: R("mine.filters.HIDDEN") }));

    expect(await screen.findByText("Hidden words")).toBeInTheDocument();
    expect(screen.queryByText("Words 1")).not.toBeInTheDocument();
    expect(Object.fromEntries(calls.mine.at(-1)!)).toEqual({ sort: "-createdAt", limit: "10", status: "HIDDEN" });
    expect(screen.getByRole("button", { name: R("mine.filters.HIDDEN") })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: R("mine.filters.all") })).toHaveAttribute("aria-pressed", "false");
  });

  it("sends no status for 'all', and 'published' for the visible ones", async () => {
    const { calls } = await page({ search: "tab=mine", mine: mineOf(1) });
    await screen.findByText("Words 1");

    await userEvent.click(screen.getByRole("button", { name: R("mine.filters.PUBLISHED") }));
    await waitFor(() => expect(calls.mine.at(-1)!.get("status")).toBe("PUBLISHED"));
    await userEvent.click(screen.getByRole("button", { name: R("mine.filters.all") }));

    await waitFor(() => expect(calls.mine.at(-1)!.has("status")).toBe(false));
  });

  it("shows the reviews of one product when the address names it, and lets the customer drop that", async () => {
    const { calls } = await page({ search: "tab=mine&productId=p2", mine: [authorReview({ id: "a", productId: "p1", content: "One" }), authorReview({ id: "b", productId: "p2", content: "Two" })] });

    expect(await screen.findByText("Two")).toBeInTheDocument();
    expect(screen.queryByText("One")).not.toBeInTheDocument();
    expect(calls.mine[0].get("productId")).toBe("p2");
    await userEvent.click(screen.getByRole("button", { name: new RegExp(R("mine.productFilter")) }));

    expect(navigation.router.replace).toHaveBeenCalledWith("/reviews?tab=mine", { scroll: false });
  });

  it("shows no product chip without a product in the address", async () => {
    await page({ search: "tab=mine", mine: mineOf(1) });
    await screen.findByText("Words 1");

    expect(screen.queryByText(R("mine.productFilter"))).not.toBeInTheDocument();
  });

  it("adds the next ten when asked, once at a time, and takes the button away at the end", async () => {
    const { calls } = await page({ search: "tab=mine", mine: mineOf(12) });
    await screen.findByText("Words 10");
    expect(cards()).toHaveLength(10);

    await userEvent.click(screen.getByRole("button", { name: R("loadMore") }));

    await waitFor(() => expect(cards()).toHaveLength(12));
    expect(Object.fromEntries(calls.mine.at(-1)!)).toMatchObject({ page: "2" });
    expect(screen.queryByRole("button", { name: R("loadMore") })).not.toBeInTheDocument();
  });

  it("says it is loading the next page and cannot be pressed twice", async () => {
    const { calls } = await page({ search: "tab=mine", mine: mineOf(12), mineDelay: 100 });
    await screen.findByText("Words 10");

    await userEvent.click(screen.getByRole("button", { name: R("loadMore") }));

    const busy = await screen.findByRole("button", { name: R("loadingMore") });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    await waitFor(() => expect(cards()).toHaveLength(12));
    expect(calls.mine).toHaveLength(2);
  });

  it("shows grey boxes, and not the empty message, while the reviews are on their way", async () => {
    const { container } = await page({ search: "tab=mine", mine: mineOf(2), mineDelay: 150 });

    await waitFor(() => expect(container.querySelectorAll("#reviews-panel-mine [class*='checkout-shimmer']")).toHaveLength(2));
    expect(screen.queryByText(R("mine.empty.title"))).not.toBeInTheDocument();
    expect(await screen.findByText("Words 1")).toBeInTheDocument();
  });

  it("says there are no reviews, with a way to the orders", async () => {
    await page({ search: "tab=mine", mine: [] });

    expect(await screen.findByRole("heading", { name: R("mine.empty.title") })).toBeInTheDocument();
    expect(screen.getByText(R("mine.empty.description"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: R("mine.empty.cta") })).toHaveAttribute("href", "/orders");
  });
});

describe("REV-5 one of my reviews", () => {
  const card = async (review = authorReview({ product: productSummary() }), options: RenderReviewsOptions = {}) => {
    await page({ search: "tab=mine", mine: [review], ...options });
    return (await screen.findAllByRole("listitem"))[0];
  };

  it("says when it can be edited until, and offers the edit once", async () => {
    const view = await card(authorReview({ product: productSummary(), canEdit: true, editableUntil: "2026-04-01T05:00:00.000Z" }));

    expect(within(view).getByText(`Bạn được sửa một lần, đến hết ${dateText("2026-04-01T05:00:00.000Z", "short")}.`)).toBeInTheDocument();
    expect(within(view).getByRole("button", { name: R("mine.card.edit") })).toBeInTheDocument();
  });

  it("says it was edited already, and offers nothing", async () => {
    const view = await card(authorReview({ product: productSummary(), canEdit: false, edited: true }));

    expect(within(view).getByText(R("mine.card.alreadyEdited"))).toBeInTheDocument();
    expect(within(view).queryByRole("button", { name: R("mine.card.edit") })).not.toBeInTheDocument();
  });

  it("says the time to edit is over when it was not edited but cannot be", async () => {
    const view = await card(authorReview({ product: productSummary(), canEdit: false, edited: false }));

    expect(within(view).getByText(R("mine.card.editExpired"))).toBeInTheDocument();
  });

  it("says the time to edit is over when it can be edited but has no end date", async () => {
    const view = await card(authorReview({ product: productSummary(), canEdit: true, editableUntil: null, edited: true }));

    expect(within(view).getByText(R("mine.card.alreadyEdited"))).toBeInTheDocument();
  });

  it("shows a review the store hid with its reason, saying only the customer sees it, and offers no edit", async () => {
    const view = await card(authorReview({ product: productSummary(), status: "HIDDEN", canEdit: true, moderationNote: "Contains an address", editableUntil: "2026-04-01T05:00:00.000Z" }));

    expect(within(view).getAllByText(R("mine.card.hidden")).length).toBeGreaterThan(0);
    expect(within(view).getByText(R("mine.card.hiddenTitle"))).toBeInTheDocument();
    expect(within(view).getByText("Lý do: Contains an address")).toBeInTheDocument();
    expect(within(view).getByText(R("mine.card.hiddenOnlyYou"))).toBeInTheDocument();
    expect(within(view).getByText(R("mine.card.cannotEditHidden"))).toBeInTheDocument();
    expect(within(view).queryByRole("button", { name: R("mine.card.edit") })).not.toBeInTheDocument();
  });

  it("gives no reason line when the store gave none", async () => {
    const view = await card(authorReview({ product: productSummary(), status: "HIDDEN", moderationNote: null }));

    expect(within(view).queryByText(/Lý do/)).not.toBeInTheDocument();
  });

  it("shows no hidden note on a visible review", async () => {
    const view = await card();

    expect(within(view).queryByRole("note")).not.toBeInTheDocument();
  });

  it("says the product is no longer sold when it is gone, and has no link to it", async () => {
    const view = await card(authorReview({ product: null }));

    expect(within(view).getByText(R("mine.card.productRemoved"))).toBeInTheDocument();
    expect(within(view).queryByText(R("mine.card.viewProduct"))).not.toBeInTheDocument();
  });

  it("looks the product's address up when it has no category, and goes there", async () => {
    const view = await card(authorReview({ product: productSummary({ id: "p9", category: null, subcategory: null }) }), { products: { p9: product({ id: "p9" }) } });

    await userEvent.click(within(view).getByRole("button", { name: R("mine.card.viewProduct") }));

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/tops/shirts/p9"));
  });

  it("goes to the shop when the product's address cannot be found", async () => {
    const view = await card(authorReview({ product: productSummary({ id: "p9", category: null, subcategory: null }) }), { products: { p9: 404 } });

    await userEvent.click(within(view).getByRole("button", { name: R("mine.card.viewProduct") }));

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop"));
  });

  it("opens the form to edit it", async () => {
    const view = await card(authorReview({ product: productSummary(), canEdit: true, editableUntil: "2026-04-01T05:00:00.000Z", content: "Soft" }));

    await userEvent.click(within(view).getByRole("button", { name: R("mine.card.edit") }));

    expect(await screen.findByRole("heading", { name: msg("shared.reviews.form.titleEdit") })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Soft")).toBeInTheDocument();
  });
});

describe("REV-5E my reviews cannot be read", () => {
  it("says so with a button that asks again", async () => {
    const { calls } = await page({ search: "tab=mine", mine: 500 });

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(R("toast.loadFailed"))).toBeInTheDocument();
    await userEvent.click(within(alert).getByRole("button", { name: R("retry") }));

    await waitFor(() => expect(calls.mine).toHaveLength(2));
  });

  it("gives the reason the BE gave, by its code", async () => {
    await page({ search: "tab=mine", mineFails: { status: 403, errorCode: 9001 } });

    expect(await within(await screen.findByRole("alert")).findByText(msg("shared.errors.byCode.9001"))).toBeInTheDocument();
  });

  it("keeps what is shown when the next page fails, and offers 'try again' on the button", async () => {
    const { calls } = await page({ search: "tab=mine", mine: mineOf(12), failMinePage: 2 });
    await screen.findByText("Words 10");

    await userEvent.click(screen.getByRole("button", { name: R("loadMore") }));

    const retry = await screen.findByRole("button", { name: R("retry") });
    expect(cards()).toHaveLength(10);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.click(retry);
    await waitFor(() => expect(calls.mine).toHaveLength(3));
  });
});

describe("REV-6 title and description of the page", () => {
  it("has a title with the brand and a description", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "vi" }) });

    expect(meta.title).toBe(`${msg("private.reviews.meta.title")} — DOOVAN`);
    expect(meta.description).toBe(msg("private.reviews.meta.description"));
  });

  it("speaks English in English", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(meta.description).toBe(msg("private.reviews.meta.description", "en"));
  });
});
