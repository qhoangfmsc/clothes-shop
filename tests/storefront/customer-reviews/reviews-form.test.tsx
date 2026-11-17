import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReviewFormTarget } from "@/src/app/[locale]/(private)/reviews/_common/types";
import { msg } from "@/tests/_support/messages";
import { F, contentField, fit, form as formOf, pick, removeButtons, send, star, titleField, stubObjectUrls, user } from "./form-kit";
import { pendingReview, photo, type RenderReviewsOptions } from "./reviews-kit";

/* The review form, to write a review or make the one allowed edit (specs/storefront/customer-reviews.md, flows REV-7 to REV-12E). */

const CREATE: ReviewFormTarget = { mode: "create", item: pendingReview({ orderItemId: "oi-9", productName: "Silk dress", size: "M", color: "Red" }) };

stubObjectUrls();

describe("REV-7 writing a review", () => {
  it("shows the product being reviewed: its picture, name as a link that opens in a new tab, and the size and colour", async () => {
    await formOf(CREATE);

    expect(screen.getByRole("heading", { name: F("titleCreate") })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Silk dress" });
    expect(link).toHaveAttribute("href", "/shop/tops/shirts/p1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("M · Red")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("asks for the stars first: pressing send with none says so and sends nothing", async () => {
    const { calls, onSaved } = await formOf(CREATE);
    expect(screen.queryByText(F("errors.rating"))).not.toBeInTheDocument();

    await send();

    expect(await screen.findByText(F("errors.rating"))).toBeInTheDocument();
    expect(calls.saved).toEqual([]);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("says what the stars mean as they are chosen", async () => {
    await formOf(CREATE);

    await user.click(star(4));
    expect(screen.getByText(msg("shared.reviews.form.rating.hint.4"))).toBeInTheDocument();
    await user.click(star(1));

    expect(screen.getByText(msg("shared.reviews.form.rating.hint.1"))).toBeInTheDocument();
    expect(star(1)).toBeChecked();
  });

  it("sends just the line and the stars when nothing else is written, thanks the customer and hands the saved review over", async () => {
    const { calls, onSaved } = await formOf(CREATE);
    await user.click(star(5));

    await send();

    await waitFor(() => expect(calls.saved).toEqual([{ method: "POST", id: null, body: { orderItemId: "oi-9", rating: 5 } }]));
    expect(await screen.findByText(msg("shared.reviews.toast.created"))).toBeInTheDocument();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "saved-1" })));
  });

  it("sends the title and the words trimmed, and the fit", async () => {
    const { calls } = await formOf(CREATE);
    await user.click(star(4));
    await user.type(titleField(), "  Nice fabric  ");
    await user.type(contentField(), "  Soft and warm.  ");
    await user.click(fit(msg("shared.reviews.fit.true_to_size")));

    await send();

    await waitFor(() => expect(calls.saved[0].body).toEqual({ orderItemId: "oi-9", rating: 4, title: "Nice fabric", content: "Soft and warm.", fit: "true_to_size" }));
  });

  it("leaves out a title or words that are only spaces", async () => {
    const { calls } = await formOf(CREATE);
    await user.click(star(3));
    await user.type(titleField(), "   ");
    await user.type(contentField(), "   ");

    await send();

    await waitFor(() => expect(calls.saved[0].body).toEqual({ orderItemId: "oi-9", rating: 3 }));
  });

  it("counts the letters of the words against the limit, and stops at the limits", async () => {
    await formOf(CREATE);

    await user.type(contentField(), "Hello");

    expect(screen.getByText("5/2000")).toBeInTheDocument();
    expect(titleField()).toHaveAttribute("maxlength", "255");
    expect(contentField()).toHaveAttribute("maxlength", "2000");
  });

  it("chooses a fit and takes it back with a second press", async () => {
    await formOf(CREATE);

    await user.click(fit(msg("shared.reviews.fit.large")));
    expect(fit(msg("shared.reviews.fit.large"))).toHaveAttribute("aria-pressed", "true");
    await user.click(fit(msg("shared.reviews.fit.large")));

    expect(fit(msg("shared.reviews.fit.large"))).toHaveAttribute("aria-pressed", "false");
  });

  it("changes the fit to another with one press", async () => {
    await formOf(CREATE);
    await user.click(fit(msg("shared.reviews.fit.large")));

    await user.click(fit(msg("shared.reviews.fit.small")));

    expect(fit(msg("shared.reviews.fit.small"))).toHaveAttribute("aria-pressed", "true");
    expect(fit(msg("shared.reviews.fit.large"))).toHaveAttribute("aria-pressed", "false");
  });
});

describe("REV-8 no links in a review", () => {
  it.each([["http://shop.example"], ["https://shop.example"], ["www.shop.example"], ["HTTPS://SHOP.EXAMPLE"]])("refuses %s in the words as soon as it is typed, and sends nothing", async (text) => {
    const { calls } = await formOf(CREATE);
    await user.click(star(5));

    await user.type(contentField(), `see ${text}`);
    expect(await screen.findByText(F("errors.link"))).toBeInTheDocument();
    await send();

    expect(calls.saved).toEqual([]);
  });

  it("refuses a link in the title the same way", async () => {
    const { calls } = await formOf(CREATE);
    await user.click(star(5));

    await user.type(titleField(), "go to www.x.com");
    await send();

    expect(await screen.findByText(F("errors.link"))).toBeInTheDocument();
    expect(titleField()).toHaveAttribute("aria-invalid", "true");
    expect(calls.saved).toEqual([]);
  });

  it("lets the customer send again after the link is taken out", async () => {
    const { calls } = await formOf(CREATE);
    await user.click(star(5));
    await user.type(contentField(), "see www.x.com");
    expect(await screen.findByText(F("errors.link"))).toBeInTheDocument();

    await user.clear(contentField());
    await user.type(contentField(), "see the shop");
    await send();

    await waitFor(() => expect(calls.saved).toHaveLength(1));
  });

  it("shows the BE's refusal of a link under the words, keeps the form, and clears it when the words change", async () => {
    const { calls, onClose } = await formOf(CREATE, { save: { status: 400, errorCode: 1905 } });
    await user.click(star(5));
    await user.type(contentField(), "ok words");

    await send();

    expect(await screen.findByText(F("errors.link"))).toBeInTheDocument();
    expect(contentField()).toHaveAttribute("aria-invalid", "true");
    expect(calls.saved).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
    await user.type(contentField(), "!");
    expect(screen.queryByText(F("errors.link"))).not.toBeInTheDocument();
  });
});

describe("REV-9 closing and sending", () => {
  it("closes with Escape, with the cross and with Cancel", async () => {
    const { onClose } = await formOf(CREATE);

    fireEvent.keyDown(document, { key: "Escape" });
    await user.click(screen.getByRole("button", { name: F("close") }));
    await user.click(screen.getByRole("button", { name: F("cancel") }));

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("stops listening for Escape once the form is gone", async () => {
    const { onClose, unmount } = await formOf(CREATE);

    unmount();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores other keys", async () => {
    const { onClose } = await formOf(CREATE);

    fireEvent.keyDown(document, { key: "Enter" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("holds the page still while open and lets it scroll again after", async () => {
    document.body.style.overflow = "auto";
    const view = await formOf(CREATE);
    expect(document.body.style.overflow).toBe("hidden");

    view.unmount();

    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("sends once however often the button is pressed, says it is sending, and cannot be closed meanwhile", async () => {
    const { calls, onClose } = await formOf(CREATE, { saveDelay: 150 });
    await user.click(star(5));

    await send();
    const busy = screen.getByRole("button", { name: F("submitting") });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    fireEvent.submit(busy.closest("form")!);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: F("close") })).toBeDisabled();
    expect(screen.getByRole("button", { name: F("cancel") })).toBeDisabled();

    await waitFor(() => expect(screen.queryByRole("button", { name: F("submitting") })).not.toBeInTheDocument());
    expect(calls.saved).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("speaks English in English", async () => {
    await formOf(CREATE, { locale: "en" });

    expect(screen.getByRole("heading", { name: F("titleCreate", "en") })).toBeInTheDocument();
  });
});

describe("REV-9E the BE does not take the review", () => {
  const fails = async (failure: { status: number; errorCode?: number }) => {
    const view = await formOf(CREATE, { save: failure });
    await user.click(star(5));
    await send();
    await waitFor(() => expect(view.calls.saved).toHaveLength(1));
    return view;
  };

  it("says it could not be saved for any other failure, keeps the form and the words, and lets the customer try again", async () => {
    const { onClose, onSaved } = await fails({ status: 500 });

    expect(await screen.findByText(msg("shared.reviews.toast.saveFailed"))).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(star(5)).toBeChecked();
    expect(screen.getByRole("button", { name: F("submitCreate") })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("says the line was reviewed already (1903), tells the page and closes", async () => {
    const { onAlreadyReviewed, onClose, onStale } = await fails({ status: 409, errorCode: 1903 });

    expect(await screen.findByText(msg("shared.errors.byCode.1903"))).toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onAlreadyReviewed).toHaveBeenCalledTimes(1);
    expect(onStale).not.toHaveBeenCalled();
  });

  it.each([[1902], [1904]])("says the line can no longer be reviewed or edited (%i), tells the page and closes", async (code) => {
    const { onStale, onClose, onAlreadyReviewed } = await fails({ status: 409, errorCode: code });

    expect(await screen.findByText(msg(`shared.errors.byCode.${code}`))).toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onStale).toHaveBeenCalledTimes(1);
    expect(onAlreadyReviewed).not.toHaveBeenCalled();
  });

  it("drops all the photos when the BE says one is no longer valid (1908), and says so", async () => {
    const view = await formOf(CREATE, { save: { status: 400, errorCode: 1908 } });
    await user.click(star(5));
    await pick([photo("a"), photo("b")]);
    expect(removeButtons()).toHaveLength(2);

    await send();

    expect(await screen.findByText(msg("shared.errors.byCode.1908"))).toBeInTheDocument();
    await waitFor(() => expect(removeButtons()).toHaveLength(0));
    expect(view.onClose).not.toHaveBeenCalled();
  });
});
