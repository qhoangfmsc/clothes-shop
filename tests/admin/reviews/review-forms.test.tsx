import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HideReviewModal from "@/src/app/[locale]/(admin)/admin/reviews/_components/HideReviewModal";
import ReviewDetailPanel from "@/src/app/[locale]/(admin)/admin/reviews/_components/ReviewDetailPanel";
import ReviewReplyForm from "@/src/app/[locale]/(admin)/admin/reviews/_components/ReviewReplyForm";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { adminReview, reviewsApi, type ReviewsApiOptions } from "./reviews-kit";

/* The two forms that change a review (specs/admin/reviews.md, flows ARV-7 to ARV-9E). */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const REPLY = { content: "Thanks for the kind words", repliedAt: "2026-03-06T05:00:00.000Z" };

describe("ARV-7 hiding", () => {
  const H = (key: string) => msg(`admin.reviews.hide.${key}`);
  const form = () => screen.getByRole("heading", { level: 2, name: H("title") }).closest(".fixed") as HTMLElement;
  const noteBox = () => form().querySelector("textarea") as HTMLTextAreaElement;
  const submit = () => within(form()).getByRole("button", { name: H("submit") });

  async function openModal(api: ReviewsApiOptions = {}) {
    const calls = reviewsApi(api);
    const onClose = vi.fn();
    const onDone = vi.fn();
    const onFailed = vi.fn();
    const view = await renderApp(<HideReviewModal review={adminReview({ id: "rv-3" })} onClose={onClose} onDone={onDone} onFailed={onFailed} />, { as: "adminFull" });
    return { calls, onClose, onDone, onFailed, ...view };
  }

  it("reminds that only rule-breaking content is hidden, and asks for the reason the author will read", async () => {
    await openModal();

    expect(within(form()).getByText(H("reminder"))).toBeInTheDocument();
    expect(within(form()).getByText(H("note.label"))).toBeInTheDocument();
    expect(within(form()).getByRole("button", { name: H("note.info") })).toBeInTheDocument();
  });

  it("offers four reasons, never 'low rating', and one tap fills the note, replacing what was there", async () => {
    await openModal();
    const group = within(form()).getByRole("group", { name: H("reasons.label") });

    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["link", "personal", "language", "spam"].map((k) => H(`reasons.${k}`)));
    await userEvent.type(noteBox(), "my own words");
    await userEvent.click(within(group).getByRole("button", { name: H("reasons.spam") }));
    expect(noteBox()).toHaveValue(H("reasons.spam"));
    await userEvent.click(within(group).getByRole("button", { name: H("reasons.link") }));
    expect(noteBox()).toHaveValue(H("reasons.link"));
  });

  it("counts the letters against the limit of 500", async () => {
    await openModal();

    expect(noteBox()).toHaveAttribute("maxlength", "500");
    expect(within(form()).getByText("0/500")).toBeInTheDocument();
    await userEvent.type(noteBox(), "spam");
    expect(within(form()).getByText("4/500")).toBeInTheDocument();
  });

  it("will not send without a reason, nor with only spaces, and says so under the box", async () => {
    const { calls } = await openModal();

    await userEvent.click(submit());
    expect(within(form()).getByText(H("errors.note"))).toBeInTheDocument();
    await userEvent.type(noteBox(), "   ");
    await userEvent.click(submit());

    expect(within(form()).getByText(H("errors.note"))).toBeInTheDocument();
    expect(calls.hides).toEqual([]);
  });

  it("sends the reason without its spaces, tells the shopper, passes the hidden review on, and clears the error first", async () => {
    const { calls, onDone } = await openModal({ action: adminReview({ id: "rv-3", status: "HIDDEN" }) });
    await userEvent.click(submit());
    expect(within(form()).getByText(H("errors.note"))).toBeInTheDocument();
    await userEvent.type(noteBox(), "  Has a link  ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.hides).toEqual([{ id: "rv-3", body: { note: "Has a link" } }]));
    expect(await screen.findByText(H("toast.done"))).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ status: "HIDDEN" }));
    expect(screen.queryByText(H("errors.note"))).not.toBeInTheDocument();
  });

  it("closes with Cancel without sending", async () => {
    const { onClose, calls } = await openModal();

    await userEvent.click(within(form()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(calls.hides).toEqual([]);
  });

  it("explains a refusal in the BE's words or its own, keeps the words, and tells the caller", async () => {
    const first = await openModal({ action: { status: 409, body: { message: "server", errorCode: 1906 } } });
    await userEvent.type(noteBox(), "Spam");
    await userEvent.click(submit());
    expect(await screen.findByText(msg("shared.errors.byCode.1906"))).toBeInTheDocument();
    expect(first.onDone).not.toHaveBeenCalled();
    expect(first.onFailed).toHaveBeenCalledTimes(1);
    expect(noteBox()).toHaveValue("Spam");
    first.unmount();

    const second = await openModal({ action: { status: 500, body: {} } });
    await userEvent.type(noteBox(), "Spam");
    await userEvent.click(submit());
    expect(await screen.findByText(H("toast.failed"))).toBeInTheDocument();
    expect(second.onFailed).toHaveBeenCalledTimes(1);
  });

  it("works when the caller does not listen for a refusal", async () => {
    reviewsApi({ action: { status: 500, body: {} } });
    await renderApp(<HideReviewModal review={adminReview()} onClose={() => {}} onDone={() => {}} />, { as: "adminFull" });
    await userEvent.type(noteBox(), "Spam");

    await userEvent.click(submit());

    expect(await screen.findByText(H("toast.failed"))).toBeInTheDocument();
  });

  it("reads in English in English", async () => {
    reviewsApi();
    await renderApp(<HideReviewModal review={adminReview()} onClose={() => {}} onDone={() => {}} />, { as: "adminFull", locale: "en" });

    expect(screen.getByRole("heading", { level: 2, name: msg("admin.reviews.hide.title", "en") })).toBeInTheDocument();
  });
});

describe("ARV-8 replying", () => {
  const Y = (key: string) => msg(`admin.reviews.reply.${key}`);
  const box = () => screen.getByRole("textbox") as HTMLTextAreaElement;

  async function openForm(review = adminReview({ id: "rv-5" }), api: ReviewsApiOptions = {}) {
    const calls = reviewsApi(api);
    const onChanged = vi.fn();
    const onFailed = vi.fn();
    const view = await renderApp(<ReviewReplyForm review={review} onChanged={onChanged} onFailed={onFailed} />, { as: "adminFull" });
    return { calls, onChanged, onFailed, ...view };
  }

  it("starts empty for a review with no reply, with a hint that everyone sees it, a counter, and no delete button", async () => {
    await openForm();

    expect(box()).toHaveValue("");
    expect(box()).toHaveAttribute("placeholder", Y("placeholder"));
    expect(box()).toHaveAttribute("maxlength", "1000");
    expect(screen.getByText(Y("publicNote"))).toBeInTheDocument();
    expect(screen.getByText("0/1000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: Y("save") })).toBeDisabled();
    expect(screen.queryByRole("button", { name: Y("delete") })).not.toBeInTheDocument();
  });

  it("starts with the stored reply, offers Update and Delete, and turns Update on only after a change", async () => {
    await openForm(adminReview({ id: "rv-5", reply: REPLY }));

    expect(box()).toHaveValue(REPLY.content);
    expect(screen.getByText(`${REPLY.content.length}/1000`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: Y("update") })).toBeDisabled();
    expect(screen.getByRole("button", { name: Y("delete") })).toBeInTheDocument();
    await userEvent.type(box(), "!");
    expect(screen.getByRole("button", { name: Y("update") })).toBeEnabled();
    await userEvent.keyboard("{Backspace}");
    expect(screen.getByRole("button", { name: Y("update") })).toBeDisabled();
  });

  it("treats a stored reply typed again with extra spaces as unchanged", async () => {
    await openForm(adminReview({ reply: REPLY }));

    await userEvent.type(box(), "   ");

    expect(screen.getByRole("button", { name: Y("update") })).toBeDisabled();
  });

  it("keeps Post off while only spaces are typed", async () => {
    await openForm();

    await userEvent.type(box(), "    ");

    expect(screen.getByRole("button", { name: Y("save") })).toBeDisabled();
  });

  it("posts a new reply without its spaces, says it was posted, and passes the review on", async () => {
    const { calls, onChanged } = await openForm(adminReview({ id: "rv-5" }), { action: adminReview({ id: "rv-5", reply: REPLY }) });
    await userEvent.type(box(), "  Thank you  ");

    await userEvent.click(screen.getByRole("button", { name: Y("save") }));

    await waitFor(() => expect(calls.replies).toEqual([{ id: "rv-5", body: { content: "Thank you" } }]));
    expect(await screen.findByText(Y("toast.created"))).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ reply: REPLY }));
  });

  it("replaces a reply and says it was updated", async () => {
    const { calls } = await openForm(adminReview({ id: "rv-5", reply: REPLY }));
    await userEvent.clear(box());
    await userEvent.type(box(), "New words");

    await userEvent.click(screen.getByRole("button", { name: Y("update") }));

    await waitFor(() => expect(calls.replies).toEqual([{ id: "rv-5", body: { content: "New words" } }]));
    expect(await screen.findByText(Y("toast.updated"))).toBeInTheDocument();
  });

  it("will not replace a reply with nothing: it asks to write something and sends nothing", async () => {
    const { calls } = await openForm(adminReview({ reply: REPLY }));
    await userEvent.clear(box());

    await userEvent.click(screen.getByRole("button", { name: Y("update") }));

    expect(screen.getByText(Y("errors.content"))).toBeInTheDocument();
    expect(calls.replies).toEqual([]);
  });

  it("will not replace a reply with only spaces either", async () => {
    const { calls } = await openForm(adminReview({ reply: REPLY }));
    await userEvent.clear(box());
    await userEvent.type(box(), "   ");

    await userEvent.click(screen.getByRole("button", { name: Y("update") }));

    expect(screen.getByText(Y("errors.content"))).toBeInTheDocument();
    expect(calls.replies).toEqual([]);
  });

  it("clears the error when the next attempt is fine", async () => {
    await openForm(adminReview({ reply: REPLY }));
    await userEvent.clear(box());
    await userEvent.click(screen.getByRole("button", { name: Y("update") }));
    expect(screen.getByText(Y("errors.content"))).toBeInTheDocument();

    await userEvent.type(box(), "Back again");
    await userEvent.click(screen.getByRole("button", { name: Y("update") }));

    await waitFor(() => expect(screen.queryByText(Y("errors.content"))).not.toBeInTheDocument());
  });

  it("explains a refusal in the BE's words or its own, keeps the text, and tells the caller", async () => {
    const first = await openForm(adminReview({ id: "rv-5" }), { action: { status: 404, body: { message: "gone", errorCode: 1901 } } });
    await userEvent.type(box(), "Hello");
    await userEvent.click(screen.getByRole("button", { name: Y("save") }));
    await waitFor(() => expect(first.onFailed).toHaveBeenCalledTimes(1));
    expect(box()).toHaveValue("Hello");
    expect(first.onChanged).not.toHaveBeenCalled();
    first.unmount();

    const second = await openForm(adminReview({ id: "rv-5" }), { action: { status: 500, body: {} } });
    await userEvent.type(box(), "Hello");
    await userEvent.click(screen.getByRole("button", { name: Y("save") }));
    expect(await screen.findByText(Y("toast.saveFailed"))).toBeInTheDocument();
    expect(second.onFailed).toHaveBeenCalledTimes(1);
  });

  it("works when the caller does not listen for a refusal", async () => {
    reviewsApi({ action: { status: 500, body: {} } });
    await renderApp(<ReviewReplyForm review={adminReview()} onChanged={() => {}} />, { as: "adminFull" });
    await userEvent.type(box(), "Hello");

    await userEvent.click(screen.getByRole("button", { name: Y("save") }));

    expect(await screen.findByText(Y("toast.saveFailed"))).toBeInTheDocument();
  });
});

describe("ARV-8D deleting a reply", () => {
  const Y = (key: string) => msg(`admin.reviews.reply.${key}`);
  const box = () => screen.getByRole("textbox") as HTMLTextAreaElement;

  async function openForm(api: ReviewsApiOptions = {}) {
    const calls = reviewsApi(api);
    const onChanged = vi.fn();
    const onFailed = vi.fn();
    const view = await renderApp(<ReviewReplyForm review={adminReview({ id: "rv-5", reply: REPLY })} onChanged={onChanged} onFailed={onFailed} />, { as: "adminFull" });
    return { calls, onChanged, onFailed, ...view };
  }

  it("asks first, then deletes, clears the box, tells the shopper and passes the review on", async () => {
    const { calls, onChanged } = await openForm({ action: adminReview({ id: "rv-5", reply: null }) });

    await userEvent.click(screen.getByRole("button", { name: Y("delete") }));
    expect(screen.getByText(Y("confirmDelete.title"))).toBeInTheDocument();
    expect(screen.getByText(Y("confirmDelete.message"))).toBeInTheDocument();
    expect(calls.replyDeletes).toEqual([]);
    const confirm = within(await screen.findByRole("alertdialog")).getByRole("button", { name: Y("confirmDelete.confirm") });
    expect(confirm.className).toContain("bg-[var(--accent-rose)]");
    await userEvent.click(confirm);

    await waitFor(() => expect(calls.replyDeletes).toEqual(["rv-5"]));
    expect(await screen.findByText(Y("toast.deleted"))).toBeInTheDocument();
    expect(box()).toHaveValue("");
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ reply: null }));
  });

  it("does nothing when the question is answered No", async () => {
    const { calls, onChanged } = await openForm();

    await userEvent.click(screen.getByRole("button", { name: Y("delete") }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await wait(50);
    expect(calls.replyDeletes).toEqual([]);
    expect(onChanged).not.toHaveBeenCalled();
    expect(box()).toHaveValue(REPLY.content);
  });

  it("says so when it fails, keeps the text and tells the caller", async () => {
    const { onChanged, onFailed } = await openForm({ action: { status: 500, body: {} } });

    await userEvent.click(screen.getByRole("button", { name: Y("delete") }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: Y("confirmDelete.confirm") }));

    expect(await screen.findByText(Y("toast.deleteFailed"))).toBeInTheDocument();
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onChanged).not.toHaveBeenCalled();
    expect(box()).toHaveValue(REPLY.content);
  });

  it("works when the caller does not listen for a refusal", async () => {
    reviewsApi({ action: { status: 500, body: {} } });
    await renderApp(<ReviewReplyForm review={adminReview({ reply: REPLY })} onChanged={() => {}} />, { as: "adminFull" });

    await userEvent.click(screen.getByRole("button", { name: Y("delete") }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: Y("confirmDelete.confirm") }));

    expect(await screen.findByText(Y("toast.deleteFailed"))).toBeInTheDocument();
  });
});

describe("ARV-9 the panel around the forms", () => {
  async function panel(review = adminReview({ id: "rv-6" }), api: ReviewsApiOptions = {}) {
    const calls = reviewsApi(api);
    const onChanged = vi.fn();
    const onGone = vi.fn();
    const view = await renderApp(<ReviewDetailPanel review={review} onClose={() => {}} onChanged={onChanged} onGone={onGone} />, { as: "adminFull" });
    return { calls, onChanged, onGone, ...view };
  }
  const hideForm = () => screen.getByRole("heading", { level: 2, name: msg("admin.reviews.hide.title") }).closest(".fixed") as HTMLElement;
  const hideReview = async () => {
    await userEvent.click(screen.getByRole("button", { name: msg("admin.reviews.detail.actions.hide") }));
    await screen.findByRole("heading", { level: 2, name: msg("admin.reviews.hide.title") });
    await userEvent.type(hideForm().querySelector("textarea")!, "Spam");
    await userEvent.click(within(hideForm()).getByRole("button", { name: msg("admin.reviews.hide.submit") }));
  };

  it("closes the hide form and passes the hidden review on when it worked", async () => {
    const { onChanged } = await panel(adminReview({ id: "rv-6" }), { action: adminReview({ id: "rv-6", status: "HIDDEN" }) });

    await hideReview();

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "HIDDEN" })));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: msg("admin.reviews.hide.title") })).not.toBeInTheDocument());
  });

  it("keeps the hide form open when it failed for another reason", async () => {
    const { onChanged, onGone, calls } = await panel(adminReview({ id: "rv-6" }), { action: { status: 500, body: {} } });

    await hideReview();

    expect(await screen.findByText(msg("admin.reviews.hide.toast.failed"))).toBeInTheDocument();
    expect(hideForm()).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
    expect(onGone).not.toHaveBeenCalled();
    expect(calls.details).toEqual([]);
  });

  it("closes the hide form and shows the review as it is now when it was already hidden (code 1906)", async () => {
    const now = adminReview({ id: "rv-6", status: "HIDDEN", moderationNote: "Done by someone else" });
    const { onChanged, calls } = await panel(adminReview({ id: "rv-6" }), { action: { status: 409, body: { message: "same", errorCode: 1906 } }, detail: now });

    await hideReview();

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "HIDDEN" })));
    expect(calls.details).toEqual(["rv-6"]);
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: msg("admin.reviews.hide.title") })).not.toBeInTheDocument());
  });

  it("tells the list the review is gone when hiding finds it deleted (code 1901)", async () => {
    const { onGone, onChanged } = await panel(adminReview({ id: "rv-6" }), { action: { status: 404, body: { message: "gone", errorCode: 1901 } } });

    await hideReview();

    await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("starts the reply box again from what the BE holds after the review is replaced", async () => {
    const view = await panel(adminReview({ id: "rv-6", reply: REPLY }));
    await userEvent.type(screen.getByRole("textbox"), " and more");

    view.rerender(<ReviewDetailPanel review={adminReview({ id: "rv-6", reply: { content: "Edited elsewhere", repliedAt: "2026-03-09T05:00:00.000Z" } })} onClose={() => {}} onChanged={() => {}} onGone={() => {}} />);

    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("Edited elsewhere"));
  });

  it("tells the list the review is gone when replying finds it deleted (code 1901)", async () => {
    const { onGone, onChanged } = await panel(adminReview({ id: "rv-6" }), { action: { status: 404, body: { message: "gone", errorCode: 1901 } } });
    await userEvent.type(screen.getByRole("textbox"), "Thanks");

    await userEvent.click(screen.getByRole("button", { name: msg("admin.reviews.reply.save") }));

    await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("passes a posted reply on to the list", async () => {
    const { onChanged, calls } = await panel(adminReview({ id: "rv-6" }), { action: adminReview({ id: "rv-6", reply: REPLY }) });
    await userEvent.type(screen.getByRole("textbox"), "Thanks");

    await userEvent.click(screen.getByRole("button", { name: msg("admin.reviews.reply.save") }));

    await waitFor(() => expect(calls.replies).toHaveLength(1));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ reply: REPLY })));
  });
});
