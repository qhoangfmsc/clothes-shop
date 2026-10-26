import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReviewsContent from "@/src/app/[locale]/(private)/reviews/ReviewsContent";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { F, send, star, useObjectUrls, user } from "./form-kit";
import { authorReview, pendingReview, productSummary, renderReviews, type RenderReviewsOptions } from "./reviews-kit";

/* Writing and editing a review from the Reviews page, and what the page does with the answer (specs/storefront/customer-reviews.md, flows REV-17 to REV-17E). */

useObjectUrls();

const page = (options: RenderReviewsOptions = {}) => renderReviews(<ReviewsContent />, options);
const open = async (name: string) => user.click(await screen.findByRole("button", { name }));
const dialog = () => screen.queryByRole("dialog");

describe("REV-17 writing a review from the page", () => {
  it("sends it, thanks the customer, closes the form and asks again for what is left to review and for the customer's reviews", async () => {
    const { calls } = await page({ pending: [pendingReview({ orderItemId: "oi-3" })], mine: [], save: authorReview({ id: "new" }) });
    await open(msg("private.reviews.pending.card.review"));
    await user.click(star(4));
    const before = { pending: calls.pending, mine: calls.mine.length };

    await send();

    await waitFor(() => expect(calls.saved).toEqual([{ method: "POST", id: null, body: { orderItemId: "oi-3", rating: 4 } }]));
    expect(await screen.findByText(msg("shared.reviews.toast.created"))).toBeInTheDocument();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    await waitFor(() => expect(calls.pending).toBeGreaterThan(before.pending));
    await waitFor(() => expect(calls.mine.length).toBeGreaterThan(before.mine));
  });

  it("closes the form with Escape without sending anything", async () => {
    const { calls } = await page({ pending: [pendingReview()] });
    await open(msg("private.reviews.pending.card.review"));

    await user.keyboard("{Escape}");

    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(calls.saved).toEqual([]);
  });
});

describe("REV-17 editing a review from the page", () => {
  const before = authorReview({ id: "r1", content: "Old words", canEdit: true, editableUntil: "2026-04-01T05:00:00.000Z", product: productSummary() });
  const after = { ...before, rating: 2, title: "Changed title", edited: true, canEdit: false };

  it("sends the edit, closes the form and reads the list again, which then shows what the BE holds", async () => {
    const stored = [before];
    const { calls } = await page({ search: "tab=mine", mine: stored, save: after });
    await user.click(await screen.findByRole("button", { name: msg("private.reviews.mine.card.edit") }));
    await user.click(star(2));
    const reads = calls.mine.length;
    stored[0] = after;

    await send();

    await waitFor(() => expect(calls.saved[0]).toMatchObject({ method: "PATCH", id: "r1", body: { rating: 2 } }));
    expect(await screen.findByText("Changed title")).toBeInTheDocument();
    expect(calls.mine.length).toBeGreaterThan(reads);
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
  });
});

describe("REV-17E the BE says the line cannot be reviewed", () => {
  it("shows the review where it now lives when it was reviewed already (1903): the other tab, with both lists read again", async () => {
    const { calls } = await page({ pending: [pendingReview()], save: { status: 409, errorCode: 1903 } });
    await open(msg("private.reviews.pending.card.review"));
    await user.click(star(5));
    const before = { pending: calls.pending, mine: calls.mine.length };

    await send();

    expect(await screen.findByText(msg("shared.errors.byCode.1903"))).toBeInTheDocument();
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/reviews?tab=mine", { scroll: false }));
    await waitFor(() => expect(calls.pending).toBeGreaterThan(before.pending));
    await waitFor(() => expect(calls.mine.length).toBeGreaterThan(before.mine));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
  });

  it.each([[1902], [1904]])("reads both lists again and stays where it is when the BE says no more (%i)", async (code) => {
    const { calls } = await page({ pending: [pendingReview()], save: { status: 409, errorCode: code } });
    await open(msg("private.reviews.pending.card.review"));
    await user.click(star(5));
    const before = { pending: calls.pending, mine: calls.mine.length };

    await send();

    expect(await screen.findByText(msg(`shared.errors.byCode.${code}`))).toBeInTheDocument();
    await waitFor(() => expect(calls.pending).toBeGreaterThan(before.pending));
    await waitFor(() => expect(calls.mine.length).toBeGreaterThan(before.mine));
    expect(navigation.router.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
  });

  it("keeps the form and the lists when the save fails for any other reason", async () => {
    const { calls } = await page({ pending: [pendingReview()], save: { status: 500 } });
    await open(msg("private.reviews.pending.card.review"));
    await user.click(star(5));
    const before = { pending: calls.pending, mine: calls.mine.length };

    await send();

    expect(await screen.findByText(msg("shared.reviews.toast.saveFailed"))).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
    expect(calls.pending).toBe(before.pending);
    expect(calls.mine).toHaveLength(before.mine);
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: F("submitCreate") })).toBeEnabled();
  });
});
