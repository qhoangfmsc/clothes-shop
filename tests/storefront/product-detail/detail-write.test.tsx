import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ReviewsSection from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/ReviewsSection";
import { msg } from "@/tests/_support/messages";
import { authorReview, pendingReview, renderDetail, reviewSummary, type RenderDetailOptions } from "./detail-kit";

/* Writing or editing a review without leaving the product page (specs/storefront/product-detail.md, flows PD-28 to PD-30E). */

const W = (key: string) => msg(`public.product.reviews.write.${key}`);
const F = (key: string) => msg(`shared.reviews.form.${key}`);
const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY - 60_000).toISOString();

const bar = (options: RenderDetailOptions = {}) => renderDetail(<ReviewsSection productId="p1" />, { summary: reviewSummary({ ratingCount: 0, ratingAverage: null }), ...options });
const writeButton = () => screen.queryByRole("button", { name: W("cta") });
const editButton = () => screen.queryByRole("button", { name: W("edit") });
const dialog = () => screen.queryByRole("dialog");

describe("PD-28 who is offered what", () => {
  it("offers a guest the button with a line about signing in, and asks to sign in when it is pressed", async () => {
    await bar({ as: "guest" });

    expect(await screen.findByText(W("signInHint"))).toBeInTheDocument();
    await userEvent.click(writeButton()!);

    expect(await screen.findByText(msg("shared.feedback.loginPrompt.subtitle.continue"))).toBeInTheDocument();
    expect(dialog()?.getAttribute("aria-labelledby")).not.toBe("review-form-title");
  });

  it("offers a signed-in shopper nothing, and no explanation, when they have nothing to review here", async () => {
    const { calls } = await bar({ as: "user" });
    await waitFor(() => expect(calls.pending).toBe(1));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(writeButton()).not.toBeInTheDocument();
    expect(editButton()).not.toBeInTheDocument();
    expect(screen.queryByText(W("alreadyReviewed"))).not.toBeInTheDocument();
    expect(screen.queryByText(W("signInHint"))).not.toBeInTheDocument();
  });

  it("offers 'write a review' with the days left, for a delivered line of this product", async () => {
    await bar({ as: "user", pending: [pendingReview({ productId: "p1", reviewDeadline: inDays(5) })] });

    expect(await screen.findByRole("button", { name: W("cta") })).toBeInTheDocument();
    expect(screen.getByText("Còn 5 ngày để đánh giá")).toBeInTheDocument();
  });

  it("counts a part of a day as a whole one", async () => {
    await bar({ as: "user", pending: [pendingReview({ reviewDeadline: new Date(Date.now() + 3_600_000).toISOString() })] });

    expect(await screen.findByText("Còn 1 ngày để đánh giá")).toBeInTheDocument();
  });

  it("ignores lines of other products", async () => {
    const { calls } = await bar({ as: "user", pending: [pendingReview({ productId: "p2" })] });
    await waitFor(() => expect(calls.pending).toBe(1));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(writeButton()).not.toBeInTheDocument();
  });

  it("offers the line that is closest to expiring when there are several", async () => {
    await bar({
      as: "user",
      pending: [
        pendingReview({ orderItemId: "late", size: "L", color: "Blue", reviewDeadline: inDays(20) }),
        pendingReview({ orderItemId: "soon", size: "S", color: "Red", reviewDeadline: inDays(2) }),
        pendingReview({ orderItemId: "mid", size: "M", color: "Green", reviewDeadline: inDays(9) }),
      ],
    });

    expect(await screen.findByText("Còn 2 ngày để đánh giá")).toBeInTheDocument();
    await userEvent.click(writeButton()!);

    expect(await screen.findByText("S · Red")).toBeInTheDocument();
  });

  it("offers to edit a review that can still be edited, with a line saying it can be done once", async () => {
    await bar({ as: "user", own: [authorReview({ canEdit: true, status: "PUBLISHED" })] });

    expect(await screen.findByRole("button", { name: W("edit") })).toBeInTheDocument();
    expect(screen.getByText(W("editHint"))).toBeInTheDocument();
    expect(writeButton()).not.toBeInTheDocument();
  });

  it("only says thank you when the review can no longer be edited", async () => {
    await bar({ as: "user", own: [authorReview({ canEdit: false })] });

    expect(await screen.findByText(W("alreadyReviewed"))).toBeInTheDocument();
    expect(editButton()).not.toBeInTheDocument();
    expect(writeButton()).not.toBeInTheDocument();
  });

  it("does not offer to edit a review the shop has hidden, and says thank you", async () => {
    await bar({ as: "user", own: [authorReview({ canEdit: true, status: "HIDDEN" })] });

    expect(await screen.findByText(W("alreadyReviewed"))).toBeInTheDocument();
    expect(editButton()).not.toBeInTheDocument();
  });

  it("offers to write rather than edit when both are possible", async () => {
    await bar({ as: "user", pending: [pendingReview()], own: [authorReview({ canEdit: true })] });

    expect(await screen.findByRole("button", { name: W("cta") })).toBeInTheDocument();
    expect(editButton()).not.toBeInTheDocument();
  });

  it("offers a shopper who cannot be asked about reviews nothing at all", async () => {
    await bar({ as: "user", pending: 500, own: 403 });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(writeButton()).not.toBeInTheDocument();
    expect(editButton()).not.toBeInTheDocument();
  });
});

describe("PD-29 the form", () => {
  it("opens to write a review about this line, and closes with Escape or Cancel", async () => {
    await bar({ as: "user", pending: [pendingReview({ productName: "Silk dress", size: "M", color: "Red" })] });
    await userEvent.click(await screen.findByRole("button", { name: W("cta") }));

    expect(await screen.findByRole("heading", { name: F("titleCreate") })).toBeInTheDocument();
    expect(screen.getByText("Silk dress")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());

    await userEvent.click(writeButton()!);
    await userEvent.click(await screen.findByRole("button", { name: F("cancel") }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
  });

  it("opens to edit the review, with what was written", async () => {
    await bar({ as: "user", own: [authorReview({ canEdit: true, rating: 4, title: "Nice", content: "Soft fabric", editableUntil: "2099-01-31T00:00:00.000Z" })] });

    await userEvent.click(await screen.findByRole("button", { name: W("edit") }));

    expect(await screen.findByRole("heading", { name: F("titleEdit") })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Nice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Soft fabric")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "4 sao" })).toBeChecked();
  });
});

describe("PD-30 saving a review", () => {
  const send = async () => {
    await userEvent.click(await screen.findByRole("button", { name: W("cta") }));
    await userEvent.click(await screen.findByRole("radio", { name: "5 sao" }));
    await userEvent.click(screen.getByRole("button", { name: F("submitCreate") }));
  };

  it("sends it, thanks the shopper, closes the form and asks for the totals, the list of what is left to review and its own reviews again", async () => {
    const { calls } = await bar({ as: "user", pending: [pendingReview({ orderItemId: "oi-9" })], save: authorReview({ id: "new" }) });
    await waitFor(() => expect(calls.own).toHaveLength(1));
    const before = { summary: calls.summary, pending: calls.pending, own: calls.own.length };

    await send();

    await waitFor(() => expect(calls.saved).toEqual([{ method: "POST", id: null, body: { orderItemId: "oi-9", rating: 5 } }]));
    expect(await screen.findByText(msg("shared.reviews.toast.created"))).toBeInTheDocument();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    await waitFor(() => expect(calls.summary).toBeGreaterThan(before.summary));
    await waitFor(() => expect(calls.pending).toBeGreaterThan(before.pending));
    await waitFor(() => expect(calls.own.length).toBe(before.own + 1));
    expect(calls.reviews).toEqual([]);
  });

  it("asks for the list again too, when it is open", async () => {
    const { calls } = await bar({ as: "user", pending: [pendingReview()], save: authorReview({ id: "new" }), summary: reviewSummary({ ratingCount: 2, ratingAverage: 4 }), reviews: [] });
    await userEvent.click(await screen.findByRole("button", { name: msg("public.product.reviews.summary.openAll") }));
    await waitFor(() => expect(calls.reviews).toHaveLength(1));

    await send();

    await waitFor(() => expect(calls.reviews).toHaveLength(2));
  });

  it("sends the edit of a review and says it was updated", async () => {
    const { calls } = await bar({ as: "user", own: [authorReview({ id: "r7", canEdit: true, rating: 3 })], save: authorReview({ id: "r7" }) });
    await userEvent.click(await screen.findByRole("button", { name: W("edit") }));

    await userEvent.click(await screen.findByRole("radio", { name: "5 sao" }));
    await userEvent.click(screen.getByRole("button", { name: F("submitEdit") }));

    await waitFor(() => expect(calls.saved).toEqual([{ method: "PATCH", id: "r7", body: { rating: 5 } }]));
    expect(await screen.findByText(msg("shared.reviews.toast.updated"))).toBeInTheDocument();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
  });
});

describe("PD-30E a review the BE does not take", () => {
  it("keeps the form open with the shopper's words when the save fails", async () => {
    const { calls } = await bar({ as: "user", pending: [pendingReview()], save: { status: 500 } });
    await userEvent.click(await screen.findByRole("button", { name: W("cta") }));
    await userEvent.click(await screen.findByRole("radio", { name: "5 sao" }));

    await userEvent.click(screen.getByRole("button", { name: F("submitCreate") }));

    expect(await screen.findByText(msg("shared.reviews.toast.saveFailed"))).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
    expect(calls.saved).toHaveLength(1);
  });

  it("closes the form and starts again from the BE's lists when the line can no longer be reviewed (1902)", async () => {
    const { calls } = await bar({ as: "user", pending: [pendingReview()], save: { status: 409, errorCode: 1902 } });
    await waitFor(() => expect(calls.own).toHaveLength(1));
    const before = { pending: calls.pending, own: calls.own.length, summary: calls.summary };
    await userEvent.click(await screen.findByRole("button", { name: W("cta") }));
    await userEvent.click(await screen.findByRole("radio", { name: "5 sao" }));

    await userEvent.click(screen.getByRole("button", { name: F("submitCreate") }));

    expect(await screen.findByText(msg("shared.errors.byCode.1902"))).toBeInTheDocument();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    await waitFor(() => expect(calls.summary).toBe(before.summary + 1));
    await waitFor(() => expect(calls.pending).toBe(before.pending + 1));
    await waitFor(() => expect(calls.own.length).toBe(before.own + 1));
  });

  it("closes the form and reloads as if saved when the line was already reviewed (1903)", async () => {
    const { calls } = await bar({ as: "user", pending: [pendingReview()], save: { status: 409, errorCode: 1903 } });
    await waitFor(() => expect(calls.own).toHaveLength(1));
    const before = calls.summary;
    await userEvent.click(await screen.findByRole("button", { name: W("cta") }));
    await userEvent.click(await screen.findByRole("radio", { name: "5 sao" }));

    await userEvent.click(screen.getByRole("button", { name: F("submitCreate") }));

    expect(await screen.findByText(msg("shared.errors.byCode.1903"))).toBeInTheDocument();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    await waitFor(() => expect(calls.summary).toBeGreaterThan(before));
  });
});
