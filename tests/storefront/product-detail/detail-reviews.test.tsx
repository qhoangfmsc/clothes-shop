import { act, fireEvent, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_REVIEW_FILTERS, hasActiveReviewFilters } from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_common/reviews";
import { useReviewList } from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_common/use-product-reviews";
import ReviewsSection from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/ReviewsSection";
import { observers } from "@/tests/_support/browser-apis";
import { media } from "@/tests/_support/media-query";
import { dateText, msg } from "@/tests/_support/messages";
import { publicReview, renderDetail, reviewSummary, reviews, type RenderDetailOptions } from "./detail-kit";

/* The reviews block of a product page: the totals, the folded and opened list, the chips and the sorting (specs/storefront/product-detail.md, flows PD-18 to PD-24E). */

const R = (key: string, locale: "vi" | "en" = "vi") => msg(`public.product.reviews.${key}`, locale);
const scrollIntoView = vi.fn();

/* `history.replaceState` changes the address without the `hashchange` event that setting `location.hash` sends */
const setHash = (hash: string) => window.history.replaceState(null, "", `${window.location.pathname}${hash}`);

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  setHash("");
});
afterEach(() => {
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  setHash("");
});

const SUMMARY = reviewSummary({ ratingCount: 12, ratingAverage: 4.3, withImages: 2, distribution: { "1": 0, "2": 1, "3": 2, "4": 3, "5": 6 } });
const section = (options: RenderDetailOptions = {}) => renderDetail(<ReviewsSection productId="p1" />, { summary: SUMMARY, reviews: reviews(12), ...options });
const openAll = () => userEvent.click(screen.getByRole("button", { name: R("summary.openAll") }));
const chip = (name: string | RegExp) => screen.getByRole("button", { name });
const moreButton = () => screen.queryByRole("button", { name: R("list.loadMore") });
const articles = () => screen.queryAllByRole("article");
const lastList = (calls: { reviews: URLSearchParams[] }) => Object.fromEntries(calls.reviews[calls.reviews.length - 1]);
const opened = async (options: RenderDetailOptions = {}) => {
  const view = await section(options);
  await openAll();
  await waitFor(() => expect(articles().length).toBeGreaterThan(0));
  return view;
};

describe("PD-18 the totals", () => {
  it("shows the average out of five with its stars, how many reviews there are, and a chip for each choice with the BE's counts", async () => {
    await section();

    expect(await screen.findByText("4,3")).toBeInTheDocument();
    expect(screen.getByText(R("summary.outOf"))).toBeInTheDocument();
    expect(screen.getByText("12 đánh giá")).toBeInTheDocument();
    expect(chip(R("summary.chip.all"))).toHaveAttribute("aria-pressed", "true");
    for (const [stars, count] of [[5, 6], [4, 3], [3, 2], [2, 1]]) expect(chip(`${stars} sao (${count})`)).toBeEnabled();
    expect(chip("1 sao (0)")).toBeDisabled();
    expect(chip("Có hình ảnh (2)")).toBeEnabled();
  });

  it("writes the average with a point in English", async () => {
    await section({ locale: "en" });

    expect(await screen.findByText("4.3")).toBeInTheDocument();
    expect(screen.getByText("12 reviews")).toBeInTheDocument();
  });

  it("switches off the photo chip when no review has a photo", async () => {
    await section({ summary: { ...SUMMARY, withImages: 0 } });

    expect(await screen.findByRole("button", { name: "Có hình ảnh (0)" })).toBeDisabled();
  });

  it("shows grey boxes while the totals are on their way", async () => {
    await section({ summaryDelay: 150 });

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await screen.findByText("4,3");
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("says there are no reviews yet, and offers no list, for a product nobody has reviewed", async () => {
    await section({ summary: reviewSummary({ ratingCount: 0, ratingAverage: null, withImages: 0 }) });

    expect(await screen.findByText(R("empty.title"))).toBeInTheDocument();
    expect(screen.getByText(R("empty.description"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: R("summary.openAll") })).not.toBeInTheDocument();
  });

  it("shows a dash instead of an average, and no stars, when the BE sends a count without an average", async () => {
    const { container } = await section({ summary: reviewSummary({ ratingCount: 3, ratingAverage: null }) });

    expect(await screen.findByText("3 đánh giá")).toBeInTheDocument();
    expect(screen.getByText("–")).toBeInTheDocument();
    expect(screen.queryByText(R("empty.title"))).not.toBeInTheDocument();
    expect(container.querySelector('[role="img"]')).toBeNull();
  });

  it("says there are no reviews when the count is zero, even if an average is sent", async () => {
    await section({ summary: reviewSummary({ ratingCount: 0, ratingAverage: 4.5 }) });

    expect(await screen.findByText(R("empty.title"))).toBeInTheDocument();
  });

  it("shows the same empty state when the totals cannot be read", async () => {
    await section({ summary: 500 });

    expect(await screen.findByText(R("empty.title"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: R("summary.openAll") })).not.toBeInTheDocument();
  });

  it("has a title, an explanation of who may review, and the anchor the rating link goes to", async () => {
    const { container } = await section();

    expect(await screen.findByRole("heading", { level: 2, name: R("title") })).toBeInTheDocument();
    expect(container.querySelector("section#reviews")).not.toBeNull();
  });
});

describe("PD-19 opening the list", () => {
  it("does not ask for any review while it is folded", async () => {
    const { calls } = await section();
    await screen.findByText("4,3");

    expect(calls.summary).toBe(1);
    expect(calls.reviews).toEqual([]);
    expect(articles()).toEqual([]);
    expect(screen.getByRole("button", { name: R("summary.openAll") })).toHaveAttribute("aria-expanded", "false");
  });

  it("asks for the five newest when 'see all' is pressed, and shows them with a way to see more", async () => {
    const { calls } = await section();
    await screen.findByText("4,3");

    await openAll();

    await waitFor(() => expect(articles()).toHaveLength(5));
    expect(calls.reviews).toHaveLength(1);
    expect(lastList(calls)).toEqual({ sort: "-createdAt", limit: "5" });
    expect(screen.getByText("Review text 1")).toBeInTheDocument();
    expect(moreButton()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: R("summary.openAll") })).not.toBeInTheDocument();
  });

  it("shows grey boxes while the first five are on their way", async () => {
    await section({ listDelay: () => 150 });
    await screen.findByText("4,3");

    await openAll();

    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
    await waitFor(() => expect(articles()).toHaveLength(5));
  });

  it("opens by itself when the rating under the product's name is pressed", async () => {
    const { calls } = await section();
    await screen.findByText("4,3");

    act(() => void window.dispatchEvent(new Event("reviews:open")));

    await waitFor(() => expect(articles()).toHaveLength(5));
    expect(calls.reviews).toHaveLength(1);
  });

  it("opens by itself when the address ends in #reviews", async () => {
    setHash("#reviews");

    const { calls } = await section();

    await waitFor(() => expect(articles()).toHaveLength(5));
    expect(calls.reviews).toHaveLength(1);
  });

  it("opens when the address changes to #reviews, but not to another one", async () => {
    const { calls } = await section();
    await screen.findByText("4,3");

    act(() => {
      window.location.hash = "#other";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(calls.reviews).toEqual([]);
    act(() => {
      window.location.hash = "#reviews";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    await waitFor(() => expect(articles()).toHaveLength(5));
  });

  it("stops listening for the signs to open once the block is gone", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = await section();
    await screen.findByText("4,3");

    unmount();

    expect(remove).toHaveBeenCalledWith("reviews:open", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("hashchange", expect.any(Function));
  });

  it("does not open for a product with no reviews, whatever asks", async () => {
    const { calls } = await section({ summary: reviewSummary({ ratingCount: 0, ratingAverage: null }) });
    await screen.findByText(R("empty.title"));

    act(() => void window.dispatchEvent(new Event("reviews:open")));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(articles()).toEqual([]);
    expect(calls.reviews.length).toBeLessThanOrEqual(1);
  });
});

describe("PD-20 a review", () => {
  it("shows who wrote it, when, how many stars, the title and the words, what they bought and how it fit", async () => {
    await opened({
      reviews: [publicReview({ id: "r1", author: "Lan", rating: 4, title: "Nice fabric", content: "Soft and warm", size: "M", color: "Red", fit: "true_to_size", createdAt: "2026-03-05T05:00:00.000Z" })],
      summary: SUMMARY,
    });

    const card = articles()[0];
    expect(within(card).getByText("Lan")).toBeInTheDocument();
    expect(within(card).getByText("L")).toBeInTheDocument();
    expect(within(card).getByRole("heading", { name: "Nice fabric" })).toBeInTheDocument();
    expect(within(card).getByText("Soft and warm")).toBeInTheDocument();
    expect(within(card).getByText(dateText("2026-03-05T05:00:00.000Z", "short"))).toBeInTheDocument();
    expect(within(card).getByText(/M · Red/)).toBeInTheDocument();
    expect(within(card).getByText(/Đúng size/)).toBeInTheDocument();
  });

  it("shows the shop's reply under the review, and that it was edited", async () => {
    await opened({ reviews: [publicReview({ edited: true, reply: { content: "Thank you!", repliedAt: "2026-03-06T05:00:00.000Z" } })], summary: SUMMARY });

    const card = articles()[0];
    expect(within(card).getByText("Thank you!")).toBeInTheDocument();
    expect(within(card).getByText(msg("shared.reviews.storeReply"))).toBeInTheDocument();
    expect(within(card).getByText(msg("shared.reviews.edited"))).toBeInTheDocument();
  });

  it("shows a review with no title, no words, no photos and no fit as just stars and a date", async () => {
    await opened({ reviews: [publicReview({ title: "", content: "", fit: null, size: "", color: "", images: [] })], summary: SUMMARY });

    const card = articles()[0];
    expect(within(card).queryByRole("heading")).not.toBeInTheDocument();
    expect(within(card).queryByText(/Đã mua/)).not.toBeInTheDocument();
    expect(within(card).getByText("Lan")).toBeInTheDocument();
  });

  it("shows the helpful count the BE sent", async () => {
    await opened({ reviews: [publicReview({ helpfulCount: 7 })], summary: SUMMARY });

    expect(within(articles()[0]).getByRole("button", { name: "Hữu ích (7)" })).toBeInTheDocument();
  });
});

describe("PD-21 more reviews", () => {
  it("asks only for the next page of five each time, and adds it below", async () => {
    const { calls } = await opened();

    await userEvent.click(moreButton()!);

    await waitFor(() => expect(articles()).toHaveLength(10));
    expect(lastList(calls)).toEqual({ sort: "-createdAt", page: "2", limit: "5" });
    expect(calls.reviews).toHaveLength(2);

    await userEvent.click(moreButton()!);

    await waitFor(() => expect(articles()).toHaveLength(12));
    expect(lastList(calls)).toEqual({ sort: "-createdAt", page: "3", limit: "5" });
    expect(screen.getByText("Review text 12")).toBeInTheDocument();
  });

  it("takes the button away when everything is shown", async () => {
    await opened({ reviews: reviews(12) });
    await userEvent.click(moreButton()!);
    await waitFor(() => expect(articles()).toHaveLength(10));
    await userEvent.click(moreButton()!);

    await waitFor(() => expect(articles()).toHaveLength(12));
    expect(moreButton()).not.toBeInTheDocument();
  });

  it("offers no 'more' when there are five or fewer", async () => {
    await opened({ reviews: reviews(5), summary: { ...SUMMARY, ratingCount: 5 } });

    expect(articles()).toHaveLength(5);
    expect(moreButton()).not.toBeInTheDocument();
  });

  it("says it is loading while the next page is on its way, and cannot be pressed twice", async () => {
    const { calls } = await opened({ listDelay: (params) => (params.get("page") ? 150 : 0) });

    await userEvent.click(moreButton()!);

    const busy = screen.getByRole("button", { name: R("list.loadingMore") });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    await waitFor(() => expect(articles()).toHaveLength(10));
    expect(calls.reviews).toHaveLength(2);
  });

  it("keeps what is shown and offers 'try again' when the next page fails, and gets it on the second try", async () => {
    let failNext = true;
    const { calls } = await opened({ answer: (params) => (params.get("page") === "2" && failNext ? 500 : { data: reviews(5, params.get("page") === "2" ? 6 : 1), total: 12 }) });

    await userEvent.click(moreButton()!);

    const retry = await screen.findByRole("button", { name: R("list.retry") });
    expect(articles()).toHaveLength(5);
    failNext = false;
    await userEvent.click(retry);
    await waitFor(() => expect(articles()).toHaveLength(10));
    expect(calls.reviews).toHaveLength(3);
  });
});

describe("PD-22 the chips, the fit and the sorting", () => {
  it("opens the list already filtered when a star chip is pressed on the folded block", async () => {
    const { calls } = await section();
    await screen.findByText("4,3");

    await userEvent.click(chip("5 sao (6)"));

    await waitFor(() => expect(calls.reviews).toHaveLength(1));
    expect(lastList(calls)).toEqual({ rating: "5", sort: "-createdAt", limit: "5" });
    expect(chip("5 sao (6)")).toHaveAttribute("aria-pressed", "true");
    expect(chip(R("summary.chip.all"))).toHaveAttribute("aria-pressed", "false");
  });

  it("takes the star filter off when the same chip is pressed again", async () => {
    const { calls } = await opened();
    await userEvent.click(chip("5 sao (6)"));
    await waitFor(() => expect(lastList(calls)).toMatchObject({ rating: "5" }));

    await userEvent.click(chip("5 sao (6)"));

    await waitFor(() => expect(lastList(calls)).toEqual({ sort: "-createdAt", limit: "5" }));
  });

  it("changes the star filter to another when another chip is pressed", async () => {
    const { calls } = await opened();
    await userEvent.click(chip("5 sao (6)"));

    await userEvent.click(chip("3 sao (2)"));

    await waitFor(() => expect(lastList(calls)).toMatchObject({ rating: "3" }));
  });

  it("does not call 'all' pressed while only the photo filter is on", async () => {
    await opened();

    await userEvent.click(chip("Có hình ảnh (2)"));

    expect(chip(R("summary.chip.all"))).toHaveAttribute("aria-pressed", "false");
    expect(chip("Có hình ảnh (2)")).toHaveAttribute("aria-pressed", "true");
  });

  it("filters to reviews with photos, on top of the stars, and back", async () => {
    const { calls } = await opened();
    await userEvent.click(chip("4 sao (3)"));

    await userEvent.click(chip("Có hình ảnh (2)"));
    await waitFor(() => expect(lastList(calls)).toEqual({ rating: "4", hasImages: "true", sort: "-createdAt", limit: "5" }));
    expect(chip("Có hình ảnh (2)")).toHaveAttribute("aria-pressed", "true");
    expect(chip(R("summary.chip.all"))).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(chip("Có hình ảnh (2)"));
    await waitFor(() => expect(lastList(calls)).toEqual({ rating: "4", sort: "-createdAt", limit: "5" }));
  });

  it("clears the stars and the photos with 'all'", async () => {
    const { calls } = await opened();
    await userEvent.click(chip("4 sao (3)"));
    await userEvent.click(chip("Có hình ảnh (2)"));
    await waitFor(() => expect(lastList(calls)).toMatchObject({ rating: "4", hasImages: "true" }));

    await userEvent.click(chip(R("summary.chip.all")));

    await waitFor(() => expect(lastList(calls)).toEqual({ sort: "-createdAt", limit: "5" }));
    expect(chip(R("summary.chip.all"))).toHaveAttribute("aria-pressed", "true");
  });

  it("filters by fit, and sorts, and starts again from the first page each time", async () => {
    const { calls } = await opened();
    await userEvent.click(screen.getByRole("button", { name: R("list.loadMore") }));
    await waitFor(() => expect(articles()).toHaveLength(10));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: R("filters.fit") }), "small");
    await waitFor(() => expect(lastList(calls)).toEqual({ fit: "small", sort: "-createdAt", limit: "5" }));
    expect(screen.getByRole("combobox", { name: R("filters.fit") })).toHaveValue("small");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: R("filters.sort") }), "-rating");
    await waitFor(() => expect(lastList(calls)).toEqual({ fit: "small", sort: "-rating", limit: "5" }));
    expect(articles()).toHaveLength(5);
  });

  it("offers the four sortings and the three fits, newest first", async () => {
    await opened();

    const sort = screen.getByRole("combobox", { name: R("filters.sort") });
    expect(within(sort).getAllByRole("option").map((o) => o.textContent)).toEqual([R("sort.newest"), R("sort.ratingHigh"), R("sort.ratingLow"), R("sort.helpful")]);
    expect(sort).toHaveValue("-createdAt");
    const fit = screen.getByRole("combobox", { name: R("filters.fit") });
    expect(within(fit).getAllByRole("option").map((o) => o.textContent)).toEqual([R("filters.anyFit"), "Nhỏ", "Đúng size", "Rộng"]);
    expect(fit).toHaveValue("");
  });

  it("lets go of the fit when 'any fit' is chosen again", async () => {
    const { calls } = await opened();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: R("filters.fit") }), "large");
    await waitFor(() => expect(lastList(calls)).toMatchObject({ fit: "large" }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: R("filters.fit") }), "");

    await waitFor(() => expect(lastList(calls)).toEqual({ sort: "-createdAt", limit: "5" }));
  });

  it("offers 'clear filters' only while a filter is on, and clears the stars, the photos and the fit but keeps the sorting", async () => {
    const { calls } = await opened();
    expect(screen.queryByRole("button", { name: R("filters.clear") })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: R("filters.sort") }), "-helpfulCount");
    expect(screen.queryByRole("button", { name: R("filters.clear") })).not.toBeInTheDocument();
    await userEvent.click(chip("5 sao (6)"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: R("filters.fit") }), "large");
    await waitFor(() => expect(lastList(calls)).toMatchObject({ rating: "5", fit: "large" }));

    await userEvent.click(screen.getByRole("button", { name: R("filters.clear") }));

    await waitFor(() => expect(lastList(calls)).toEqual({ sort: "-createdAt", limit: "5" }));
    expect(screen.getByRole("combobox", { name: R("filters.sort") })).toHaveValue("-createdAt");
  });

  it("drops the answer of an earlier choice that arrives after a later one", async () => {
    const slowFirst = (params: URLSearchParams) => (params.get("rating") === "5" ? 250 : 0);
    const { calls } = await section({
      listDelay: slowFirst,
      answer: (params) => ({ data: reviews(5, params.get("rating") === "5" ? 100 : 1), total: 5 }),
    });
    await screen.findByText("4,3");

    await userEvent.click(chip("5 sao (6)"));
    await waitFor(() => expect(calls.reviews).toHaveLength(1));
    await userEvent.click(chip("3 sao (2)"));
    await waitFor(() => expect(calls.reviews).toHaveLength(2));

    await waitFor(() => expect(screen.getByText("Review text 1")).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.queryByText("Review text 100")).not.toBeInTheDocument();
    expect(articles()).toHaveLength(5);
  });
});

describe("PD-22E a filter finds nothing, or the list cannot be read", () => {
  it("says no review matches the filter", async () => {
    await section({ answer: (params) => (params.get("rating") ? { data: [], total: 0 } : { data: reviews(5), total: 12 }) });
    await screen.findByText("4,3");

    await userEvent.click(chip("5 sao (6)"));

    expect(await screen.findByText(R("list.noMatch"))).toBeInTheDocument();
    expect(articles()).toEqual([]);
  });

  it("says there are no reviews when nothing is filtered and the list is empty", async () => {
    await section({ answer: () => ({ data: [], total: 0 }) });
    await screen.findByText("4,3");

    await openAll();

    expect(await screen.findByText(R("empty.title"))).toBeInTheDocument();
    expect(screen.queryByText(R("list.noMatch"))).not.toBeInTheDocument();
  });

  it("says the list could not be loaded, keeps the filters, and shows it after 'try again'", async () => {
    let broken = true;
    const { calls } = await section({ answer: () => (broken ? 500 : { data: reviews(5), total: 12 }) });
    await screen.findByText("4,3");

    await openAll();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(R("list.loadFailed"))).toBeInTheDocument();
    expect(chip(R("summary.chip.all"))).toBeInTheDocument();
    broken = false;
    await userEvent.click(within(alert).getByRole("button", { name: R("list.retry") }));

    await waitFor(() => expect(articles()).toHaveLength(5));
    expect(calls.reviews).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tells the reason when the BE gave a code the site has words for", async () => {
    await section({ answer: () => ({ status: 404, errorCode: 1901 }) });
    await screen.findByText("4,3");

    await openAll();

    expect(await within(await screen.findByRole("alert")).findByText(msg("shared.errors.byCode.1901"))).toBeInTheDocument();
  });
});

describe("PD-23 folding the list again", () => {
  const inView = () => act(() => observers.intersection.at(-1)!.trigger(true));

  it("floats a 'show fewer' button while the list is on screen, and not before or after", async () => {
    await opened();
    expect(screen.queryByRole("button", { name: R("list.collapse") })).not.toBeInTheDocument();

    inView();
    expect(await screen.findByRole("button", { name: R("list.collapse") })).toBeInTheDocument();

    act(() => observers.intersection.at(-1)!.trigger(false));
    await waitFor(() => expect(screen.queryByRole("button", { name: R("list.collapse") })).not.toBeInTheDocument());
  });

  it("folds the list, forgets the filters and brings the top of the block into view", async () => {
    const { calls } = await opened();
    await userEvent.click(chip("5 sao (6)"));
    await waitFor(() => expect(lastList(calls)).toMatchObject({ rating: "5" }));
    inView();

    await userEvent.click(await screen.findByRole("button", { name: R("list.collapse") }));

    await waitFor(() => expect(articles()).toEqual([]));
    expect(screen.queryByRole("button", { name: R("list.collapse") })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: R("summary.openAll") })).toBeInTheDocument();
    expect(chip(R("summary.chip.all"))).toHaveAttribute("aria-pressed", "true");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("reviews"));
  });

  it("jumps instead of gliding for a shopper who asked for less motion", async () => {
    media.matching = (query) => query.includes("prefers-reduced-motion");
    await opened();
    inView();

    await userEvent.click(await screen.findByRole("button", { name: R("list.collapse") }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("asks for the first five again when the list is opened a second time", async () => {
    const { calls } = await opened();
    await userEvent.click(moreButton()!);
    await waitFor(() => expect(articles()).toHaveLength(10));
    inView();
    await userEvent.click(await screen.findByRole("button", { name: R("list.collapse") }));
    await waitFor(() => expect(articles()).toEqual([]));

    await openAll();

    await waitFor(() => expect(articles()).toHaveLength(5));
    expect(lastList(calls)).toEqual({ sort: "-createdAt", limit: "5" });
  });
});

describe("PD-24 the list as a hook", () => {
  const hook = (enabled = true, filters = EMPTY_REVIEW_FILTERS) => renderHook(() => useReviewList("p1", filters, enabled));

  it("asks for nothing while it is switched off", async () => {
    const calls = (await renderDetail(<div />, { reviews: reviews(8) })).calls;

    const { result } = hook(false);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.reviews).toEqual([]);
    expect(result.current.items).toEqual([]);
    expect(result.current.status).toBe("loading");
  });

  it("shows five of what it has and knows there are more", async () => {
    await renderDetail(<div />, { reviews: reviews(8) });

    const { result } = hook();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items).toHaveLength(5);
    expect(result.current.total).toBe(8);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.expanded).toBe(false);
  });

  it("shows what it already has, without asking, when it is shown fewer and then more again", async () => {
    const { calls } = await renderDetail(<div />, { reviews: reviews(12) });
    const { result } = hook();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(() => result.current.loadMore());
    await act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(12));
    expect(result.current.expanded).toBe(true);
    const asked = calls.reviews.length;

    act(() => result.current.collapse());
    expect(result.current.items).toHaveLength(5);
    expect(result.current.expanded).toBe(false);
    await act(() => result.current.loadMore());

    expect(result.current.items).toHaveLength(10);
    expect(calls.reviews).toHaveLength(asked);
  });

  it("asks again for everything it has loaded, in one request, when reloaded", async () => {
    const { calls } = await renderDetail(<div />, { reviews: reviews(12) });
    const { result } = hook();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(10));

    await act(() => result.current.reload());

    expect(lastList(calls)).toEqual({ sort: "-createdAt", limit: "10" });
    expect(result.current.items).toHaveLength(10);
  });

  it("asks for at least five when reloaded before anything was loaded", async () => {
    const { calls } = await renderDetail(<div />, { reviews: reviews(3) });
    const { result } = hook();

    await act(() => result.current.reload());

    expect(calls.reviews).toHaveLength(2);
    expect(calls.reviews[1].get("limit")).toBe("5");
  });

  it("keeps the error when a reload fails, and clears it when the next one works", async () => {
    let broken = false;
    await renderDetail(<div />, { answer: () => (broken ? 500 : { data: reviews(3), total: 3 }) });
    const { result } = hook();
    await waitFor(() => expect(result.current.status).toBe("ready"));

    broken = true;
    await act(() => result.current.reload());
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBeTruthy();
    broken = false;
    await act(() => result.current.reload());

    expect(result.current.status).toBe("ready");
    expect(result.current.error).toBeNull();
  });
});

describe("PD-24 the helpers of the filters", () => {
  it("counts stars, fit and photos as filters, and the sorting as not one", () => {
    expect(hasActiveReviewFilters(EMPTY_REVIEW_FILTERS)).toBe(false);
    expect(hasActiveReviewFilters({ ...EMPTY_REVIEW_FILTERS, sort: "-rating" })).toBe(false);
    expect(hasActiveReviewFilters({ ...EMPTY_REVIEW_FILTERS, rating: 3 })).toBe(true);
    expect(hasActiveReviewFilters({ ...EMPTY_REVIEW_FILTERS, fit: "large" })).toBe(true);
    expect(hasActiveReviewFilters({ ...EMPTY_REVIEW_FILTERS, hasImages: true })).toBe(true);
  });
});
