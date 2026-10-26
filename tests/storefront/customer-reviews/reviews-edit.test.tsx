import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReviewFormTarget } from "@/src/app/[locale]/(private)/reviews/_common/types";
import { dateText, msg } from "@/tests/_support/messages";
import { F, contentField, fit, form, pick, removeButtons, send, star, titleField, useObjectUrls, user } from "./form-kit";
import { authorReview, photo, productSummary } from "./reviews-kit";

/* The one edit a review allows (specs/storefront/customer-reviews.md, flows REV-12 to REV-12E). */

const REVIEW = authorReview({
  id: "r 7",
  rating: 3,
  title: "Fine",
  content: "It is fine",
  fit: "large",
  images: ["/media/reviews/one.jpg", "/media/reviews/two.jpg"],
  size: "M",
  color: "Red",
  product: productSummary({ name: "Silk dress" }),
  canEdit: true,
  editableUntil: "2026-04-01T05:00:00.000Z",
});
const EDIT: ReviewFormTarget = { mode: "edit", review: REVIEW };
const bodyOf = (calls: { saved: { body: Record<string, unknown> }[] }) => calls.saved[0].body;

useObjectUrls();

describe("REV-12 editing a review", () => {
  it("shows what was written, the product, the warning that it can be done once and until when", async () => {
    await form(EDIT);

    expect(screen.getByRole("heading", { name: F("titleEdit") })).toBeInTheDocument();
    expect(screen.getByText("Silk dress")).toBeInTheDocument();
    expect(screen.getByText("M · Red")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(F("editWarning"));
    expect(screen.getByRole("note")).toHaveTextContent(`Bạn có thể sửa đến hết ${dateText("2026-04-01T05:00:00.000Z", "short")}.`);
    expect(star(3)).toBeChecked();
    expect(titleField()).toHaveValue("Fine");
    expect(contentField()).toHaveValue("It is fine");
    expect(fit(msg("shared.reviews.fit.large"))).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: F("submitEdit") })).toBeInTheDocument();
  });

  it("leaves out the end date of the warning when there is none", async () => {
    await form({ mode: "edit", review: { ...REVIEW, editableUntil: null } });

    expect(screen.getByRole("note")).not.toHaveTextContent("Bạn có thể sửa đến hết");
  });

  it("shows the photos it has", async () => {
    await form(EDIT);

    expect(removeButtons()).toHaveLength(2);
  });

  it("refuses to send while nothing has changed, and says so after the button is pressed", async () => {
    const { calls } = await form(EDIT);
    const button = screen.getByRole("button", { name: F("submitEdit") });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText(F("noChanges"))).not.toBeInTheDocument();

    await send();

    expect(await screen.findByText(F("noChanges"))).toBeInTheDocument();
    expect(calls.saved).toEqual([]);
  });

  it("sends only the stars when only the stars changed, to the review's own address, and says it was updated", async () => {
    const { calls, onSaved } = await form(EDIT, { save: authorReview({ id: "r 7", rating: 5 }) });
    await user.click(star(5));

    await send();

    await waitFor(() => expect(calls.saved).toHaveLength(1));
    expect(calls.saved[0]).toMatchObject({ method: "PATCH", id: "r 7", body: { rating: 5 } });
    expect(bodyOf(calls)).toEqual({ rating: 5 });
    expect(await screen.findByText(msg("shared.reviews.toast.updated"))).toBeInTheDocument();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "r 7", rating: 5 })));
  });

  it("sends the title and the words trimmed when they changed", async () => {
    const { calls } = await form(EDIT);
    await user.clear(titleField());
    await user.type(titleField(), "  Better  ");
    await user.clear(contentField());
    await user.type(contentField(), "  Much better  ");

    await send();

    await waitFor(() => expect(bodyOf(calls)).toEqual({ title: "Better", content: "Much better" }));
  });

  it("does not count spaces around the same words as a change", async () => {
    const { calls } = await form(EDIT);
    await user.type(titleField(), "   ");

    await send();

    expect(await screen.findByText(F("noChanges"))).toBeInTheDocument();
    expect(calls.saved).toEqual([]);
  });

  it("changes the fit to another, and keeps the fit that was chosen: it cannot be taken back", async () => {
    const { calls } = await form(EDIT);
    await user.click(fit(msg("shared.reviews.fit.large")));
    expect(fit(msg("shared.reviews.fit.large"))).toHaveAttribute("aria-pressed", "true");

    await user.click(fit(msg("shared.reviews.fit.small")));
    await send();

    await waitFor(() => expect(bodyOf(calls)).toEqual({ fit: "small" }));
  });

  it("can give a fit to a review that had none, and take it back before sending", async () => {
    const { calls } = await form({ mode: "edit", review: { ...REVIEW, fit: null } });
    await user.click(fit(msg("shared.reviews.fit.large")));
    await user.click(fit(msg("shared.reviews.fit.large")));

    await send();
    expect(await screen.findByText(F("noChanges"))).toBeInTheDocument();
    await user.click(fit(msg("shared.reviews.fit.true_to_size")));
    await send();

    await waitFor(() => expect(bodyOf(calls)).toEqual({ fit: "true_to_size" }));
  });

  it("sends the photos that are left when one was taken away", async () => {
    const { calls } = await form(EDIT);
    await user.click(removeButtons()[0]);

    await send();

    await waitFor(() => expect(bodyOf(calls)).toEqual({ images: ["/media/reviews/two.jpg"] }));
  });

  it("uploads a new photo and sends all the addresses, the old ones first", async () => {
    const { calls } = await form(EDIT, { upload: (name) => `/media/reviews/${name}.jpg` });
    await pick([photo("new")]);

    await send();

    await waitFor(() => expect(bodyOf(calls)).toEqual({ images: ["/media/reviews/one.jpg", "/media/reviews/two.jpg", "/media/reviews/new.jpg"] }));
    expect(calls.uploads).toEqual(["new"]);
  });

  it("counts a picked photo as a change even though nothing else differs", async () => {
    const { calls } = await form({ mode: "edit", review: { ...REVIEW, images: [] } }, { upload: () => "/media/reviews/x.jpg" });
    await pick([photo("x")]);

    await send();

    await waitFor(() => expect(bodyOf(calls)).toEqual({ images: ["/media/reviews/x.jpg"] }));
  });

  it("can take away every photo", async () => {
    const { calls } = await form(EDIT);
    await user.click(removeButtons()[0]);
    await user.click(removeButtons()[0]);

    await send();

    await waitFor(() => expect(bodyOf(calls)).toEqual({ images: [] }));
  });

  it("does not take the stars from a link in the words: a link blocks sending", async () => {
    const { calls } = await form(EDIT);
    await user.type(contentField(), " www.x.com");

    await send();

    expect(calls.saved).toEqual([]);
    expect(within(screen.getByRole("dialog")).getAllByText(F("errors.link")).length).toBeGreaterThan(0);
  });
});

describe("REV-12E the BE does not take the edit", () => {
  it("says the edit is no longer allowed (1904), tells the page and closes", async () => {
    const { onStale, onClose, calls } = await form(EDIT, { save: { status: 409, errorCode: 1904 } });
    await user.click(star(5));

    await send();

    expect(await screen.findByText(msg("shared.errors.byCode.1904"))).toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onStale).toHaveBeenCalledTimes(1);
    expect(calls.saved).toHaveLength(1);
  });

  it("keeps the form when the failure is any other", async () => {
    const { onClose } = await form(EDIT, { save: { status: 500 } });
    await user.click(star(5));

    await send();

    expect(await screen.findByText(msg("shared.reviews.toast.saveFailed"))).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(star(5)).toBeChecked();
  });
});
