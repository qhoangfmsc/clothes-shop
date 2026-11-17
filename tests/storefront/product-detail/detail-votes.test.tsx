import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ReviewsSection from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/ReviewsSection";
import { msg } from "@/tests/_support/messages";
import { authorReview, renderDetail, reviewSummary, reviews, type RenderDetailOptions } from "./detail-kit";

/* "Helpful" votes on the reviews of a product, for a guest and a signed-in shopper (specs/storefront/product-detail.md, flows PD-25 to PD-27E). */

const R = (key: string) => msg(`public.product.reviews.${key}`);
const SUMMARY = reviewSummary({ ratingCount: 3, ratingAverage: 4.3 });
const LIST = reviews(3).map((review, i) => ({ ...review, helpfulCount: i + 1 }));

async function opened(options: RenderDetailOptions = {}) {
  const view = await renderDetail(<ReviewsSection productId="p1" />, { summary: SUMMARY, reviews: LIST, ...options });
  await userEvent.click(await screen.findByRole("button", { name: R("summary.openAll") }));
  await waitFor(() => expect(screen.queryAllByRole("article")).toHaveLength(3));
  return view;
}
const card = (n: number) => screen.getAllByRole("article")[n - 1];
const helpful = (n: number, count: number) => within(card(n)).getByRole("button", { name: `Hữu ích (${count})` });

describe("PD-25 a guest", () => {
  it("is not asked about votes or own reviews, since nothing is known about a guest", async () => {
    const { calls } = await opened({ as: "guest" });

    expect(calls.votedLookups).toEqual([]);
    expect(calls.own).toEqual([]);
    expect(helpful(1, 1)).toHaveAttribute("aria-pressed", "false");
  });

  it("is asked to sign in first when pressing 'helpful', saying why, and no vote is sent", async () => {
    const { calls } = await opened({ as: "guest" });

    await userEvent.click(helpful(1, 1));

    expect(await screen.findByText(msg("shared.feedback.loginPrompt.subtitle.continue"))).toBeInTheDocument();
    expect(calls.votes).toEqual([]);
    expect(helpful(1, 1)).toHaveAttribute("aria-pressed", "false");
  });
});

describe("PD-26 a signed-in shopper", () => {
  it("is asked which of this product's reviews it has marked and which are its own, once", async () => {
    const { calls } = await opened({ as: "user" });

    await waitFor(() => expect(calls.own).toHaveLength(1));
    expect(calls.votedLookups).toEqual(["p1"]);
    expect(Object.fromEntries(calls.own[0])).toEqual({ productId: "p1", limit: "200" });
  });

  it("sees the reviews it marked as pressed", async () => {
    await opened({ as: "user", voted: ["r2"] });

    await waitFor(() => expect(helpful(2, 2)).toHaveAttribute("aria-pressed", "true"));
    expect(helpful(1, 1)).toHaveAttribute("aria-pressed", "false");
  });

  it("marks a review: the BE is told, the count is the BE's own, the button shows it is pressed", async () => {
    const { calls } = await opened({ as: "user", vote: () => ({ helpfulCount: 42, voted: true }) });

    await userEvent.click(helpful(1, 1));

    await waitFor(() => expect(calls.votes).toEqual([{ id: "r1", method: "POST" }]));
    await waitFor(() => expect(within(card(1)).getByRole("button", { name: "Hữu ích (42)" })).toHaveAttribute("aria-pressed", "true"));
  });

  it("takes the mark back on the second press, and shows the count the BE sent", async () => {
    const { calls } = await opened({ as: "user", voted: ["r1"], vote: (_id, method) => (method === "DELETE" ? { helpfulCount: 0, voted: false } : { helpfulCount: 5, voted: true }) });
    await waitFor(() => expect(helpful(1, 1)).toHaveAttribute("aria-pressed", "true"));

    await userEvent.click(helpful(1, 1));

    await waitFor(() => expect(calls.votes).toEqual([{ id: "r1", method: "DELETE" }]));
    await waitFor(() => expect(within(card(1)).getByRole("button", { name: "Hữu ích (0)" })).toHaveAttribute("aria-pressed", "false"));
  });

  it("marks, takes back and marks again", async () => {
    const { calls } = await opened({ as: "user", vote: (_id, method) => ({ helpfulCount: method === "POST" ? 2 : 1, voted: method === "POST" }) });

    await userEvent.click(helpful(1, 1));
    await waitFor(() => expect(within(card(1)).getByRole("button", { name: "Hữu ích (2)" })).toHaveAttribute("aria-pressed", "true"));
    await userEvent.click(within(card(1)).getByRole("button", { name: "Hữu ích (2)" }));
    await waitFor(() => expect(within(card(1)).getByRole("button", { name: "Hữu ích (1)" })).toHaveAttribute("aria-pressed", "false"));
    await userEvent.click(within(card(1)).getByRole("button", { name: "Hữu ích (1)" }));

    await waitFor(() => expect(calls.votes.map((v) => v.method)).toEqual(["POST", "DELETE", "POST"]));
  });

  it("cannot press twice while a vote is on its way", async () => {
    const { calls } = await opened({ as: "user", voteDelay: 150 });

    await userEvent.click(helpful(1, 1));
    expect(helpful(1, 1)).toBeDisabled();
    fireEvent.click(helpful(1, 1));

    await waitFor(() => expect(within(card(1)).getByRole("button", { name: "Hữu ích (1)" })).toBeEnabled());
    expect(calls.votes).toHaveLength(1);
  });

  it("shows a note instead of a button on its own review, with the count", async () => {
    await opened({ as: "user", own: [authorReview({ id: "r2" })] });

    await waitFor(() => expect(within(card(2)).queryByRole("button")).not.toBeInTheDocument());
    expect(within(card(2)).getByText("Đánh giá của bạn · 2 hữu ích")).toBeInTheDocument();
    expect(within(card(1)).getByRole("button", { name: "Hữu ích (1)" })).toBeInTheDocument();
  });

  it("keeps quiet, and shows every button, when the votes and own reviews cannot be read", async () => {
    await opened({ as: "user", voted: 500, own: 403 });

    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Hữu ích/ })).toHaveLength(3));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(helpful(2, 2)).toHaveAttribute("aria-pressed", "false");
  });
});

describe("PD-27E a vote the BE refuses", () => {
  it("says gently that one cannot mark one's own review, and from then on shows the note instead of the button", async () => {
    const { calls } = await opened({ as: "user", vote: () => ({ status: 409, errorCode: 1907 }) });

    await userEvent.click(helpful(1, 1));

    expect(await screen.findByText(msg("shared.errors.byCode.1907"))).toBeInTheDocument();
    await waitFor(() => expect(within(card(1)).queryByRole("button")).not.toBeInTheDocument());
    expect(within(card(1)).getByText("Đánh giá của bạn · 1 hữu ích")).toBeInTheDocument();
    expect(calls.votes).toHaveLength(1);
  });

  it("says the review is gone and starts the list and the totals again, when it was hidden meanwhile", async () => {
    const { calls } = await opened({ as: "user", vote: () => ({ status: 404, errorCode: 1901 }) });
    const before = { summary: calls.summary, lists: calls.reviews.length };

    await userEvent.click(helpful(2, 2));

    expect(await screen.findByText(msg("shared.errors.byCode.1901"))).toBeInTheDocument();
    await waitFor(() => expect(calls.summary).toBe(before.summary + 1));
    await waitFor(() => expect(calls.reviews.length).toBe(before.lists + 1));
    expect(Object.fromEntries(calls.reviews.at(-1)!)).toEqual({ sort: "-createdAt", limit: "5" });
  });

  it("says the vote could not be saved for any other failure, and lets the shopper try again", async () => {
    const { calls } = await opened({ as: "user", vote: () => ({ status: 500 }) });

    await userEvent.click(helpful(1, 1));

    expect(await screen.findByText(R("toast.voteFailed"))).toBeInTheDocument();
    expect(helpful(1, 1)).toBeEnabled();
    expect(helpful(1, 1)).toHaveAttribute("aria-pressed", "false");
    expect(calls.summary).toBe(1);
  });
});
