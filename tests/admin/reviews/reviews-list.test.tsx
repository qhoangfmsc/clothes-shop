import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { productSummary } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { adminReview, renderReviews } from "./reviews-kit";

/* The review queue and how a review is opened (specs/admin/reviews.md, flows ARV-1 to ARV-4E). */

const R = (key: string) => msg(`admin.reviews.${key}`);
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const tab = (name: string | RegExp) => screen.getByRole("button", { name });
const last = <T,>(items: T[]) => items[items.length - 1];
const detailTitle = () => screen.findByRole("heading", { level: 2, name: R("detail.title") });
const hideModal = () => screen.getByRole("heading", { level: 2, name: R("hide.title") }).closest(".fixed") as HTMLElement;
const labelOf = (control: HTMLElement) => control.closest("label")?.firstElementChild?.textContent;
const filter = (key: string) => screen.getByRole("combobox", { name: R(`table.filters.${key}`) });

describe("ARV-1 the queue", () => {
  it("opens on the published reviews with no reply, newest first, with the total", async () => {
    const { calls } = await renderReviews({ pages: [{ data: [adminReview()], total: 9 }] });

    await screen.findByText("Silk dress");

    expect(calls.lists[0].get("status")).toBe("PUBLISHED");
    expect(calls.lists[0].get("replied")).toBe("false");
    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(screen.getByText("9 đánh giá")).toBeInTheDocument();
  });

  it("shows each review with its product, author, stars, text, photos, helpful count, state and date", async () => {
    await renderReviews({ pages: [{ data: [adminReview({ images: ["/i1.jpg", "/i2.jpg"], helpfulCount: 7 })], total: 1 }] });
    await screen.findByText("Silk dress");
    const row = rowOf("Silk dress");

    expect(row.querySelector("img")).toHaveAttribute("src", expect.stringContaining("a.jpg"));
    expect(within(row).getByText("Linh Pham")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "u-1" })).toHaveAttribute("href", "/admin/reviews?userId=u-1");
    expect(within(row).getByText("Lovely")).toBeInTheDocument();
    expect(within(row).getByText("Fits well")).toBeInTheDocument();
    expect(within(row).getByText("2")).toBeInTheDocument();
    expect(within(row).getByText("7")).toBeInTheDocument();
    expect(within(row).getByText(R("status.PUBLISHED"))).toBeInTheDocument();
    expect(within(row).getByText(R("table.replied.no"))).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: R("table.view") })).toBeInTheDocument();
  });

  it("marks a replied review as replied, in the quiet colour", async () => {
    await renderReviews({ query: { tab: "all" }, pages: [{ data: [adminReview({ reply: { content: "Thanks", repliedAt: "2026-03-06T05:00:00.000Z" } })], total: 1 }] });
    await screen.findByText("Silk dress");

    const mark = within(rowOf("Silk dress")).getByText(R("table.replied.yes"));

    expect(mark.className).toContain("text-[var(--text-muted)]");
    expect(within(rowOf("Silk dress")).queryByText(R("table.replied.no"))).not.toBeInTheDocument();
  });

  it("shows a waiting review in the accent colour", async () => {
    await renderReviews({ pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");

    expect(within(rowOf("Silk dress")).getByText(R("table.replied.no")).className).toContain("text-[var(--text-accent)]");
  });

  it("shows dashes and a placeholder when the product, the user, the photos or the text are missing", async () => {
    await renderReviews({ pages: [{ data: [adminReview({ product: null, userId: null, images: [], title: "", content: "" })], total: 1 }] });
    await screen.findByText("Linh Pham");
    const row = rowOf("Linh Pham");

    expect(row.querySelector("img")).toBeNull();
    expect(within(row).getAllByText("—")).toHaveLength(3);
    expect(within(row).queryByRole("link")).not.toBeInTheDocument();
    expect(row.querySelector(".truncate")).toBeNull();
  });

  it("shows the placeholder, not a picture, for a product without an image", async () => {
    await renderReviews({ pages: [{ data: [adminReview({ product: productSummary({ name: "Plain", image: "" }) })], total: 1 }] });
    await screen.findByText("Plain");

    expect(rowOf("Plain").querySelector("img")).toBeNull();
    expect(rowOf("Plain").querySelector("svg")).not.toBeNull();
  });

  it("makes the user id safe in its link", async () => {
    await renderReviews({ pages: [{ data: [adminReview({ userId: "u 1/2" })], total: 1 }] });
    await screen.findByText("Silk dress");

    expect(within(rowOf("Silk dress")).getByRole("link", { name: "u 1/2" })).toHaveAttribute("href", "/admin/reviews?userId=u%201%2F2");
  });

  it("searches, sorts five ways, and hides the narrow-screen columns", async () => {
    const { calls } = await renderReviews({ pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");

    expect(within(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") })).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["-createdAt", "createdAt", "-rating", "rating", "-helpfulCount"]);
    await userEvent.type(screen.getByPlaceholderText(R("table.searchPlaceholder")), "silk");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("silk"));
    const hidden = (key: string) => screen.getByRole("columnheader", { name: R(`table.columns.${key}`), hidden: true }).className;
    expect(hidden("content")).toContain("hidden lg:table-cell");
    expect(hidden("images")).toContain("hidden md:table-cell");
    expect(hidden("helpful")).toContain("hidden lg:table-cell");
    expect(hidden("createdAt")).toContain("hidden sm:table-cell");
    expect(hidden("product")).not.toContain("hidden");
  });

  it("reads in English in English", async () => {
    await renderReviews({ locale: "en", pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");

    expect(within(rowOf("Silk dress")).getByText(msg("admin.reviews.status.PUBLISHED", "en"))).toBeInTheDocument();
  });
});

describe("ARV-2 the tabs", () => {
  it("shows the waiting count on the first tab, the menu badge's own number", async () => {
    await renderReviews({ counts: { reviews: 3 }, pages: [{ data: [adminReview()], total: 1 }] });

    expect(await screen.findByRole("button", { name: "Chờ phản hồi (3)" })).toBeInTheDocument();
    expect(tab(R("tabs.all")).className).not.toContain("border-[var(--accent-primary)]");
    expect(tab(/^Chờ phản hồi/).className).toContain("border-[var(--accent-primary)]");
  });

  it("shows the first tab without a number when the count is not known", async () => {
    await renderReviews({ counts: { orders: 5 }, pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");

    expect(tab(R("tabs.pendingNoCount"))).toBeInTheDocument();
  });

  it("shows a zero count as zero", async () => {
    await renderReviews({ counts: { reviews: 0 }, pages: [{ data: [adminReview()], total: 1 }] });

    expect(await screen.findByRole("button", { name: "Chờ phản hồi (0)" })).toBeInTheDocument();
  });

  it("goes to a tab by the address, the waiting tab removing it, keeping the other filters", async () => {
    await renderReviews({ query: { product: "silk-dress" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.pending"));

    await userEvent.click(tab(R("tabs.all")));
    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/reviews?product=silk-dress&tab=all", { scroll: false });
  });

  it("goes back to the waiting tab, taking `tab` out and leaving the bare page when nothing else is left", async () => {
    await renderReviews({ query: { tab: "all" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.none"));

    await userEvent.click(tab(/^Chờ phản hồi/));

    expect(navigation.router.replace).toHaveBeenLastCalledWith("/admin/reviews", { scroll: false });
  });

  it("asks for everything on the 'all' tab, and for the waiting ones on a made-up tab", async () => {
    const all = await renderReviews({ query: { tab: "all" }, pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    expect(all.calls.lists[0].has("status")).toBe(false);
    expect(all.calls.lists[0].has("replied")).toBe(false);
    all.unmount();

    const junk = await renderReviews({ query: { tab: "junk" }, pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    expect(junk.calls.lists[0].get("status")).toBe("PUBLISHED");
    expect(junk.calls.lists[0].get("replied")).toBe("false");
  });

  it("starts the table fresh when the tab, the product or the author changes in the address", async () => {
    const { calls, rerender } = await renderReviews({ pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    navigation.searchParams = new URLSearchParams({ tab: "all", product: "dress", userId: "u-8" });
    const { default: ReviewsContent } = await import("@/src/app/[locale]/(admin)/admin/reviews/ReviewsContent");

    rerender(<ReviewsContent />);

    await waitFor(() => expect(calls.lists).toHaveLength(2));
    expect(calls.lists[1].get("product")).toBe("dress");
    expect(calls.lists[1].get("userId")).toBe("u-8");
    expect(calls.lists[1].has("status")).toBe(false);
  });

  it("starts the table fresh when only the tab changes in the address", async () => {
    const { calls, rerender } = await renderReviews({ pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    navigation.searchParams = new URLSearchParams({ tab: "all" });
    const { default: ReviewsContent } = await import("@/src/app/[locale]/(admin)/admin/reviews/ReviewsContent");

    rerender(<ReviewsContent />);

    await waitFor(() => expect(calls.lists).toHaveLength(2));
    expect(calls.lists[1].has("status")).toBe(false);
  });

  it("starts the table fresh when only the product changes, and when only the author changes", async () => {
    const { calls, rerender } = await renderReviews({ pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    const { default: ReviewsContent } = await import("@/src/app/[locale]/(admin)/admin/reviews/ReviewsContent");

    navigation.searchParams = new URLSearchParams({ product: "dress" });
    rerender(<ReviewsContent />);
    await waitFor(() => expect(calls.lists).toHaveLength(2));
    navigation.searchParams = new URLSearchParams({ product: "dress", userId: "u-8" });
    rerender(<ReviewsContent />);

    await waitFor(() => expect(calls.lists).toHaveLength(3));
    expect(calls.lists[2].get("userId")).toBe("u-8");
  });

  it("shows a chip for the product and for the author in the address, each with a way to clear it, and none otherwise", async () => {
    const view = await renderReviews({ query: { product: "silk-dress", userId: "u-9" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.pending"));
    expect(screen.getByRole("link", { name: /Sản phẩm: silk-dress/ })).toHaveAttribute("href", "/admin/reviews?userId=u-9");
    expect(screen.getByRole("link", { name: /Người viết: u-9/ })).toHaveAttribute("href", "/admin/reviews?product=silk-dress");
    expect(view.calls.lists[0].get("product")).toBe("silk-dress");
    expect(view.calls.lists[0].get("userId")).toBe("u-9");
    view.unmount();

    const none = await renderReviews({ pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.pending"));
    expect(screen.queryByRole("link", { name: /Sản phẩm:|Người viết:/ })).not.toBeInTheDocument();
    expect(none.calls.lists[0].has("product")).toBe(false);
    expect(none.calls.lists[0].has("userId")).toBe(false);
  });

  it("leaves the bare page when the only filter is cleared", async () => {
    await renderReviews({ query: { product: "silk-dress" }, pages: [{ data: [], total: 0 }] });
    await screen.findByText(R("table.empty.pending"));

    expect(screen.getByRole("link", { name: /Sản phẩm: silk-dress/ })).toHaveAttribute("href", "/admin/reviews");
  });
});

describe("ARV-2F the filters", () => {
  it("offers stars, fit and photos on the waiting tab, and also state and reply on the 'all' tab", async () => {
    const waiting = await renderReviews({ pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    expect(screen.getAllByRole("combobox").map((c) => labelOf(c))).toEqual([
      R("table.filters.rating"),
      R("table.filters.fit"),
      R("table.filters.hasImages"),
      msg("admin.components.dataTable.sort.label"),
    ]);
    waiting.unmount();

    await renderReviews({ query: { tab: "all" }, pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    expect(screen.getAllByRole("combobox").map((c) => labelOf(c))).toEqual([
      R("table.filters.status"),
      R("table.filters.replied"),
      R("table.filters.rating"),
      R("table.filters.fit"),
      R("table.filters.hasImages"),
      msg("admin.components.dataTable.sort.label"),
    ]);
  });

  it("offers five to one star, the three fits and with or without photos", async () => {
    await renderReviews({ pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    const options = (key: string) => within(filter(key)).getAllByRole("option").map((o) => o.getAttribute("value"));

    expect(options("rating")).toEqual(["", "5", "4", "3", "2", "1"]);
    expect(options("fit")).toEqual(["", "small", "true_to_size", "large"]);
    expect(options("hasImages")).toEqual(["", "true", "false"]);
    expect(within(filter("rating")).getByRole("option", { name: "5 sao" })).toBeInTheDocument();
    expect(within(filter("hasImages")).getByRole("option", { name: R("table.filterOptions.withPhotos") })).toBeInTheDocument();
    expect(within(filter("hasImages")).getByRole("option", { name: R("table.filterOptions.withoutPhotos") })).toBeInTheDocument();
  });

  it("sends the stars, the fit and the photos filter on the waiting tab, and no others", async () => {
    const { calls } = await renderReviews({ pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");
    expect(calls.lists[0].has("rating")).toBe(false);
    expect(calls.lists[0].has("fit")).toBe(false);
    expect(calls.lists[0].has("hasImages")).toBe(false);

    await userEvent.selectOptions(filter("rating"), "2");
    await waitFor(() => expect(last(calls.lists).get("rating")).toBe("2"));
    await userEvent.selectOptions(filter("fit"), "large");
    await waitFor(() => expect(last(calls.lists).get("fit")).toBe("large"));
    await userEvent.selectOptions(filter("hasImages"), "false");
    await waitFor(() => expect(last(calls.lists).get("hasImages")).toBe("false"));

    expect(last(calls.lists).get("status")).toBe("PUBLISHED");
    expect(last(calls.lists).get("replied")).toBe("false");
  });

  it("sends the state and the reply filter on the 'all' tab", async () => {
    const { calls } = await renderReviews({ query: { tab: "all" }, pages: [{ data: [adminReview()], total: 1 }] });
    await screen.findByText("Silk dress");

    await userEvent.selectOptions(filter("status"), "HIDDEN");
    await waitFor(() => expect(last(calls.lists).get("status")).toBe("HIDDEN"));
    await userEvent.selectOptions(filter("replied"), "true");
    await waitFor(() => expect(last(calls.lists).get("replied")).toBe("true"));
    expect(within(filter("status")).getByRole("option", { name: R("status.HIDDEN") })).toBeInTheDocument();
    expect(within(filter("replied")).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "true", "false"]);
  });
});

describe("ARV-3 opening a review", () => {
  const review = adminReview({ id: "rv-1", content: "Row text" });

  it("opens the panel at once with the row's data, names it in the address, then shows the fuller data", async () => {
    const fuller = adminReview({ id: "rv-1", content: "Row text", moderationNote: null, repliedBy: "staff-7" });
    const { calls } = await renderReviews({ pages: [{ data: [review], total: 1 }], detail: fuller });
    await screen.findByText("Silk dress");

    await userEvent.click(within(rowOf("Silk dress")).getByRole("button", { name: R("table.view") }));

    expect(await detailTitle()).toBeInTheDocument();
    expect(navigation.router.push).toHaveBeenCalledWith("/admin/reviews?reviewId=rv-1", { scroll: false });
    expect(await screen.findByText("staff-7")).toBeInTheDocument();
    expect(calls.details).toEqual(["rv-1"]);
  });

  it("keeps the row's data when the fuller data cannot be loaded", async () => {
    await renderReviews({ pages: [{ data: [review], total: 1 }], detail: 500 });
    await screen.findByText("Silk dress");

    await userEvent.click(within(rowOf("Silk dress")).getByRole("button", { name: R("table.view") }));

    expect(await detailTitle()).toBeInTheDocument();
    expect(screen.getAllByText("Row text").length).toBeGreaterThan(0);
  });

  it("closes by taking the review out of the address, keeping the other filters", async () => {
    await renderReviews({ query: { tab: "all" }, pages: [{ data: [review], total: 1 }], detail: review });
    await screen.findByText("Silk dress");
    await userEvent.click(within(rowOf("Silk dress")).getByRole("button", { name: R("table.view") }));
    await detailTitle();

    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.formKit.close") }));

    expect(navigation.router.push).toHaveBeenLastCalledWith("/admin/reviews?tab=all", { scroll: false });
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: R("detail.title") })).not.toBeInTheDocument());
  });

  it("opens the review named in the address on arrival, once", async () => {
    const { calls } = await renderReviews({ query: { reviewId: "rv-9" }, pages: [{ data: [], total: 0 }], detail: adminReview({ id: "rv-9", content: "From the link" }) });

    expect(await screen.findAllByText("From the link")).not.toHaveLength(0);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(calls.details).toEqual(["rv-9"]);
  });

  it("shows no panel when the review in the address cannot be found", async () => {
    const { calls } = await renderReviews({ query: { reviewId: "zzz" }, pages: [{ data: [], total: 0 }], detail: 404 });
    await waitFor(() => expect(calls.details).toEqual(["zzz"]));
    await screen.findByText(R("table.empty.pending"));

    expect(screen.queryByRole("heading", { level: 2, name: R("detail.title") })).not.toBeInTheDocument();
  });

  it("closes the panel when the address no longer names a review", async () => {
    const { rerender } = await renderReviews({ query: { reviewId: "rv-9" }, pages: [{ data: [], total: 0 }], detail: adminReview({ id: "rv-9", content: "From the link" }) });
    await screen.findAllByText("From the link");
    navigation.searchParams = new URLSearchParams();
    const { default: ReviewsContent } = await import("@/src/app/[locale]/(admin)/admin/reviews/ReviewsContent");

    rerender(<ReviewsContent />);

    await waitFor(() => expect(screen.queryByText("From the link")).not.toBeInTheDocument());
  });

  it("does not fetch a review again when its own click has just put it in the address", async () => {
    const { calls, rerender } = await renderReviews({ pages: [{ data: [review], total: 1 }], detail: review });
    await screen.findByText("Silk dress");
    await userEvent.click(within(rowOf("Silk dress")).getByRole("button", { name: R("table.view") }));
    await detailTitle();
    navigation.searchParams = new URLSearchParams({ reviewId: "rv-1" });
    const { default: ReviewsContent } = await import("@/src/app/[locale]/(admin)/admin/reviews/ReviewsContent");

    rerender(<ReviewsContent />);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(calls.details).toEqual(["rv-1"]);
  });

  it("reloads the list after an action on the open review", async () => {
    const { calls } = await renderReviews({ pages: [{ data: [review], total: 1 }], action: adminReview({ id: "rv-1", status: "HIDDEN" }) });
    await screen.findByText("Silk dress");
    await userEvent.click(within(rowOf("Silk dress")).getByRole("button", { name: R("table.view") }));
    await detailTitle();
    const before = calls.lists.length;

    await userEvent.click(screen.getByRole("button", { name: R("detail.actions.hide") }));
    await screen.findByRole("heading", { level: 2, name: R("hide.title") });
    await userEvent.type(hideModal().querySelector("textarea")!, "Spam");
    await userEvent.click(within(hideModal()).getByRole("button", { name: R("hide.submit") }));

    await waitFor(() => expect(calls.hides).toHaveLength(1));
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("closes the panel and reloads the list when the review turns out to be gone", async () => {
    const { calls } = await renderReviews({ pages: [{ data: [review], total: 1 }], action: { status: 404, body: { message: "gone", errorCode: 1901 } } });
    await screen.findByText("Silk dress");
    await userEvent.click(within(rowOf("Silk dress")).getByRole("button", { name: R("table.view") }));
    await detailTitle();
    const before = calls.lists.length;

    await userEvent.click(screen.getByRole("button", { name: R("detail.actions.hide") }));
    await screen.findByRole("heading", { level: 2, name: R("hide.title") });
    await userEvent.type(hideModal().querySelector("textarea")!, "Spam");
    await userEvent.click(within(hideModal()).getByRole("button", { name: R("hide.submit") }));

    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: R("detail.title") })).not.toBeInTheDocument());
    expect(navigation.router.push).toHaveBeenLastCalledWith("/admin/reviews", { scroll: false });
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });
});

describe("ARV-4E nothing to show, or no way to load it", () => {
  it("says what an empty queue means, in each tab, and that nothing matches a search", async () => {
    const waiting = await renderReviews({ pages: [{ data: [], total: 0 }] });
    expect(await screen.findByText(R("table.empty.pending"))).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(R("table.searchPlaceholder")), "zzz");
    expect(await screen.findByText(R("table.empty.filtered"))).toBeInTheDocument();
    waiting.unmount();

    await renderReviews({ query: { tab: "all" }, pages: [{ data: [], total: 0 }] });
    expect(await screen.findByText(R("table.empty.none"))).toBeInTheDocument();
  });

  it("says it could not load instead of saying there are no reviews", async () => {
    await renderReviews({ failListFrom: 1 });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText(R("table.empty.pending"))).not.toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s nothing, only that the data could not be loaded", async (_label, as, deny) => {
    await renderReviews({ as, deny, pages: [{ data: [adminReview()], total: 1 }] });

    expect(await screen.findByText(msg("admin.components.dataTable.error.message"))).toBeInTheDocument();
    expect(screen.queryByText("Silk dress")).not.toBeInTheDocument();
  });
});
