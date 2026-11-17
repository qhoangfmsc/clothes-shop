import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import ReviewDetailPanel from "@/src/app/[locale]/(admin)/admin/reviews/_components/ReviewDetailPanel";
import ReviewStatusBadge from "@/src/app/[locale]/(admin)/admin/reviews/_components/ReviewStatusBadge";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";
import { PERMISSIONS } from "@/src/lib/permissions";
import { productSummary } from "@/tests/_support/fixtures";
import { adminWith } from "@/tests/_support/identities";
import { dateText, msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { adminReview, reviewsApi, type ReviewsApiOptions } from "./reviews-kit";

/* One review: what the panel shows and what each permission allows (specs/admin/reviews.md, flows ARV-5 to ARV-6P). */

const D = (key: string) => msg(`admin.reviews.detail.${key}`);
type Identity = Parameters<typeof renderApp>[1] extends infer O ? (O extends { as?: infer A } ? A : never) : never;

async function open(review = adminReview(), as: Identity = "adminFull", api: ReviewsApiOptions = {}, locale: "vi" | "en" = "vi") {
  const calls = reviewsApi(api);
  const onClose = vi.fn();
  const onChanged = vi.fn();
  const onGone = vi.fn();
  const view = await renderApp(<ReviewDetailPanel review={review} onClose={onClose} onChanged={onChanged} onGone={onGone} />, { as, locale });
  return { calls, onClose, onChanged, onGone, ...view };
}
const section = (title: string) => screen.getByText(title, { selector: "legend" }).closest("fieldset") as HTMLElement;
const STAMP_TEXT = dateText("2026-03-05T05:00:00.000Z", "dateTime");

describe("ARV-5 what the panel shows", () => {
  it("shows the product with its picture and two links: all its reviews (the slug made safe) and the shop page in a new tab", async () => {
    await open(adminReview({ product: productSummary({ id: "p9", name: "Silk dress", slug: "silk dress", image: "/a.jpg" }) }));
    const box = within(section(D("product.section")));

    expect(box.getByText("Silk dress")).toBeInTheDocument();
    expect(section(D("product.section")).querySelector("img")).toHaveAttribute("src", expect.stringContaining("a.jpg"));
    expect(box.getByRole("link", { name: D("product.allReviews") })).toHaveAttribute("href", "/admin/reviews?product=silk%20dress");
    const store = box.getByRole("link", { name: D("product.viewOnStore") });
    expect(store).toHaveAttribute("href", "/shop/tops/shirts/p9");
    expect(store).toHaveAttribute("target", "_blank");
    expect(store).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows a dash and no links when the product is gone", async () => {
    await open(adminReview({ product: null }));
    const box = within(section(D("product.section")));

    expect(box.getByText("—")).toBeInTheDocument();
    expect(box.queryByRole("link")).not.toBeInTheDocument();
    expect(section(D("product.section")).querySelector("img")).toBeNull();
  });

  it("keeps the link to its reviews but not the shop link when the product has no category", async () => {
    await open(adminReview({ product: productSummary({ category: null, image: "" }) }));
    const box = within(section(D("product.section")));

    expect(box.getByRole("link", { name: D("product.allReviews") })).toBeInTheDocument();
    expect(box.queryByRole("link", { name: D("product.viewOnStore") })).not.toBeInTheDocument();
    expect(section(D("product.section")).querySelector("img")).toBeNull();
  });

  it("shows the author, a link to all their reviews (the id made safe), the state and the review as the public sees it", async () => {
    await open(adminReview({ userId: "u 1", author: "Linh Pham", rating: 2, title: "Too tight", content: "Runs small", reply: { content: "So sorry", repliedAt: "2026-03-06T05:00:00.000Z" } }));
    const box = within(section(D("review.section")));

    expect(box.getByText("Linh Pham")).toBeInTheDocument();
    expect(box.getByRole("link", { name: D("review.byAuthor") })).toHaveAttribute("href", "/admin/reviews?userId=u%201");
    expect(box.getByText(msg("admin.reviews.status.PUBLISHED"))).toBeInTheDocument();
    expect(box.getByText("Too tight")).toBeInTheDocument();
    expect(box.getByText("Runs small")).toBeInTheDocument();
    expect(box.getByText("So sorry")).toBeInTheDocument();
  });

  it("has no link to the author's reviews for a review with no user", async () => {
    await open(adminReview({ userId: null }));

    expect(screen.queryByRole("link", { name: D("review.byAuthor") })).not.toBeInTheDocument();
  });

  it("lists the trail: when it was written and which order line it is for; nothing else for a fresh review", async () => {
    await open(adminReview({ orderItemId: "oi-77" }));
    const trail = within(section(D("trail.section")));

    expect(trail.getByText(D("trail.createdAt")).nextElementSibling).toHaveTextContent(STAMP_TEXT);
    expect(trail.getByText(D("trail.orderItem")).nextElementSibling).toHaveTextContent("oi-77");
    for (const key of ["editedAt", "moderatedAt", "moderatedBy", "moderationNote", "repliedBy"]) expect(trail.queryByText(D(`trail.${key}`))).not.toBeInTheDocument();
  });

  it("adds when it was edited, who moderated it and when, and who replied", async () => {
    await open(adminReview({ editedAt: "2026-03-07T05:00:00.000Z", moderatedAt: "2026-03-08T05:00:00.000Z", moderatedBy: "staff-1", repliedBy: "staff-2" }));
    const trail = within(section(D("trail.section")));

    expect(trail.getByText(D("trail.editedAt")).nextElementSibling).toHaveTextContent(dateText("2026-03-07T05:00:00.000Z", "dateTime"));
    expect(trail.getByText(D("trail.moderatedAt")).nextElementSibling).toHaveTextContent(dateText("2026-03-08T05:00:00.000Z", "dateTime"));
    expect(trail.getByText(D("trail.moderatedBy")).nextElementSibling).toHaveTextContent("staff-1");
    expect(trail.getByText(D("trail.repliedBy")).nextElementSibling).toHaveTextContent("staff-2");
  });

  it("leaves out who moderated it when the BE does not say", async () => {
    await open(adminReview({ moderatedAt: "2026-03-08T05:00:00.000Z", moderatedBy: null }));
    const trail = within(section(D("trail.section")));

    expect(trail.getByText(D("trail.moderatedAt"))).toBeInTheDocument();
    expect(trail.queryByText(D("trail.moderatedBy"))).not.toBeInTheDocument();
  });

  it("gives the hide reason only while the review is hidden", async () => {
    const hidden = await open(adminReview({ status: "HIDDEN", moderationNote: "Contains a link" }));
    expect(within(section(D("trail.section"))).getByText(D("trail.moderationNote")).nextElementSibling).toHaveTextContent("Contains a link");
    hidden.unmount();

    const noReason = await open(adminReview({ status: "HIDDEN", moderationNote: null }));
    expect(screen.queryByText(D("trail.moderationNote"))).not.toBeInTheDocument();
    noReason.unmount();

    await open(adminReview({ status: "PUBLISHED", moderationNote: "Old reason" }));
    expect(screen.queryByText(D("trail.moderationNote"))).not.toBeInTheDocument();
    expect(screen.queryByText("Old reason")).not.toBeInTheDocument();
  });

  it("closes with the X button", async () => {
    const { onClose } = await open();

    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.formKit.close") }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reads in English in English", async () => {
    await open(adminReview(), "adminFull", {}, "en");

    expect(screen.getByRole("heading", { level: 2, name: msg("admin.reviews.detail.title", "en") })).toBeInTheDocument();
    expect(screen.getByText(msg("admin.reviews.detail.trail.createdAt", "en"))).toBeInTheDocument();
  });
});

describe("ARV-5B the badge", () => {
  it.each(["PUBLISHED", "HIDDEN"])("names a %s review in words", async (status) => {
    await renderApp(<ReviewStatusBadge status={status} />);

    expect(screen.getByText(msg(`admin.reviews.status.${status}`))).toBeInTheDocument();
  });

  it("shows a state it does not know as it is, in the quiet colour; published is green and hidden rose", async () => {
    const unknown = await renderApp(<ReviewStatusBadge status="MYSTERY" />);
    expect(screen.getByText("MYSTERY").className).toContain("bg-[rgba(107,101,96,0.08)]");
    unknown.unmount();
    const published = await renderApp(<ReviewStatusBadge status="PUBLISHED" />);
    expect(screen.getByText(msg("admin.reviews.status.PUBLISHED")).className).toContain("accent-sage");
    published.unmount();
    await renderApp(<ReviewStatusBadge status="HIDDEN" />);
    expect(screen.getByText(msg("admin.reviews.status.HIDDEN")).className).toContain("accent-rose");
  });
});

describe("ARV-6 what each permission allows", () => {
  const hideButton = () => screen.queryByRole("button", { name: D("actions.hide") });
  const publishButton = () => screen.queryByRole("button", { name: D("actions.publish") });
  const replyBox = () => screen.queryByText(D("reply.section"));

  it("a published review can be hidden, with the reminder; it cannot be shown again", async () => {
    await open(adminReview({ status: "PUBLISHED" }));

    expect(hideButton()).toBeInTheDocument();
    expect(publishButton()).not.toBeInTheDocument();
    expect(screen.getByText(D("hide.reminder"))).toBeInTheDocument();
  });

  it("a hidden review can be shown again, without the reminder; it cannot be hidden again", async () => {
    await open(adminReview({ status: "HIDDEN" }));

    expect(publishButton()).toBeInTheDocument();
    expect(hideButton()).not.toBeInTheDocument();
    expect(screen.queryByText(D("hide.reminder"))).not.toBeInTheDocument();
  });

  it("gives the buttons and the reply to an admin who may moderate and reply", async () => {
    await open(adminReview(), "adminFull");

    expect(hideButton()).toBeInTheDocument();
    expect(replyBox()).toBeInTheDocument();
  });

  it("gives an admin who may only moderate the buttons but no reply", async () => {
    await open(adminReview(), adminWith(PERMISSIONS.REVIEW_ADMIN_MODERATE));

    expect(hideButton()).toBeInTheDocument();
    expect(replyBox()).not.toBeInTheDocument();
  });

  it("gives an admin who may only reply the reply but no buttons", async () => {
    await open(adminReview(), adminWith(PERMISSIONS.REVIEW_ADMIN_REPLY));

    expect(replyBox()).toBeInTheDocument();
    expect(hideButton()).not.toBeInTheDocument();
    expect(screen.queryByText(D("hide.reminder"))).not.toBeInTheDocument();
  });

  it("gives an admin who may only view neither", async () => {
    await open(adminReview({ status: "HIDDEN" }), adminWith(PERMISSIONS.REVIEW_ADMIN_VIEW));

    expect(replyBox()).not.toBeInTheDocument();
    expect(hideButton()).not.toBeInTheDocument();
    expect(publishButton()).not.toBeInTheDocument();
  });

  it("opens the hide form, and Cancel closes it", async () => {
    await open();

    await userEvent.click(hideButton()!);
    const modal = (await screen.findByRole("heading", { level: 2, name: msg("admin.reviews.hide.title") })).closest(".fixed") as HTMLElement;
    await userEvent.click(within(modal).getByRole("button", { name: msg("admin.components.formKit.cancel") }));

    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: msg("admin.reviews.hide.title") })).not.toBeInTheDocument());
  });
});

describe("ARV-6S showing a hidden review again", () => {
  const confirmButton = () => screen.findByRole("button", { name: D("publish.confirm.confirm") });

  it("asks first, then shows it again, tells the shopper and passes the new review on", async () => {
    const { calls, onChanged } = await open(adminReview({ id: "rv-4", status: "HIDDEN" }), "adminFull", { action: adminReview({ id: "rv-4", status: "PUBLISHED" }) });

    await userEvent.click(screen.getByRole("button", { name: D("actions.publish") }));
    expect(screen.getByText(D("publish.confirm.title"))).toBeInTheDocument();
    expect(calls.publishes).toEqual([]);
    await userEvent.click(await confirmButton());

    await waitFor(() => expect(calls.publishes).toEqual(["rv-4"]));
    expect(await screen.findByText(D("publish.toast.done"))).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "PUBLISHED" }));
  });

  it("keeps the button off while the request is on its way", async () => {
    await open(adminReview({ status: "HIDDEN" }));
    server.use(http.post(`${API}/api/admin/reviews/:id/publish`, async () => {
      await delay(300);
      return HttpResponse.json({ data: adminReview({ status: "PUBLISHED" }) });
    }));

    await userEvent.click(screen.getByRole("button", { name: D("actions.publish") }));
    await userEvent.click(await confirmButton());

    await waitFor(() => expect(screen.getByRole("button", { name: D("actions.publish") })).toBeDisabled());
    await waitFor(() => expect(screen.getByRole("button", { name: D("actions.publish") })).toBeEnabled());
  });

  it("does nothing when the question is answered No", async () => {
    const { calls, onChanged } = await open(adminReview({ status: "HIDDEN" }));

    await userEvent.click(screen.getByRole("button", { name: D("actions.publish") }));
    await userEvent.click(await screen.findByRole("button", { name: msg("common.actions.cancel") }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.publishes).toEqual([]);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("says so when it fails for another reason, and leaves the panel as it is", async () => {
    const { onChanged, onGone, calls } = await open(adminReview({ status: "HIDDEN" }), "adminFull", { action: { status: 500, body: {} } });

    await userEvent.click(screen.getByRole("button", { name: D("actions.publish") }));
    await userEvent.click(await confirmButton());

    expect(await screen.findByText(D("publish.toast.failed"))).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
    expect(onGone).not.toHaveBeenCalled();
    expect(calls.details).toEqual([]);
    expect(screen.getByRole("button", { name: D("actions.publish") })).toBeEnabled();
  });

  it("shows the review as it is now when it was already shown (code 1906)", async () => {
    const now = adminReview({ id: "rv-1", status: "PUBLISHED" });
    const { onChanged, calls } = await open(adminReview({ status: "HIDDEN" }), "adminFull", { action: { status: 409, body: { message: "same", errorCode: 1906 } }, detail: now });

    await userEvent.click(screen.getByRole("button", { name: D("actions.publish") }));
    await userEvent.click(await confirmButton());

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "PUBLISHED" })));
    expect(calls.details).toEqual(["rv-1"]);
  });

  it("keeps what is on screen when even the refresh fails (code 1906)", async () => {
    const { onChanged, calls } = await open(adminReview({ status: "HIDDEN" }), "adminFull", { action: { status: 409, body: { message: "same", errorCode: 1906 } }, detail: 500 });

    await userEvent.click(screen.getByRole("button", { name: D("actions.publish") }));
    await userEvent.click(await confirmButton());

    await waitFor(() => expect(calls.details).toEqual(["rv-1"]));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("tells the list the review is gone (code 1901)", async () => {
    const { onGone, onChanged, calls } = await open(adminReview({ status: "HIDDEN" }), "adminFull", { action: { status: 404, body: { message: "gone", errorCode: 1901 } } });

    await userEvent.click(screen.getByRole("button", { name: D("actions.publish") }));
    await userEvent.click(await confirmButton());

    await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1));
    expect(onChanged).not.toHaveBeenCalled();
    expect(calls.details).toEqual([]);
  });
});
