import { describe, expect, it } from "vitest";
import { HIDE_REASON_KEYS, REVIEW_SORT_OPTIONS, REVIEW_TABS } from "@/src/app/[locale]/(admin)/admin/reviews/_common/constants";
import { clearError, deleteReviewReply, fetchReviewDetail, fetchReviews, hideReview, publishReview, replyToReview } from "@/src/app/[locale]/(admin)/admin/reviews/_common/moduleSlice";
import { makeStore } from "@/src/store";
import { REVIEW_FITS, REVIEW_LIMITS, REVIEW_STATUSES } from "@/src/types/review";
import { adminReview, reviewsApi } from "./reviews-kit";

/* The reviews store and its constants (specs/admin/reviews.md, flow ARV-10). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().reviews;

describe("ARV-10 the reviews store", () => {
  it("asks with the filters it was given and keeps the list and the total", async () => {
    const calls = reviewsApi({ pages: [{ data: [adminReview()], total: 4 }] });
    const store = makeStore();

    await store.dispatch(fetchReviews({ search: "silk", status: "HIDDEN", rating: 2, fit: "small", hasImages: "true", product: "silk-dress", userId: "u-1", replied: "false", sort: "-rating", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "silk", status: "HIDDEN", rating: "2", fit: "small", hasImages: "true", product: "silk-dress", userId: "u-1", replied: "false", sort: "-rating", limit: "25" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "rv-1" })], total: 4, page: 1, limit: 25, isListLoading: false });
  });

  it("leaves out the filters that are not set", async () => {
    const calls = reviewsApi();

    await makeStore().dispatch(fetchReviews({ page: 1, limit: 25 }));

    for (const key of ["status", "rating", "fit", "hasImages", "product", "userId", "replied", "search"]) expect(calls.lists[0].has(key), key).toBe(false);
  });

  it("is loading while it waits and remembers the error when the BE refuses", async () => {
    reviewsApi({ failListFrom: 1 });
    const store = makeStore();

    const pending = store.dispatch(fetchReviews({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("reads one review, the id made safe for the address", async () => {
    const calls = reviewsApi();

    const result = await makeStore().dispatch(fetchReviewDetail("rv/1"));

    expect(calls.details).toEqual(["rv/1"]);
    expect(result.payload).toMatchObject({ id: "rv/1" });
  });

  it("hides with the reason, shows again with no body, replies with the text and deletes the reply, each id made safe", async () => {
    const calls = reviewsApi();
    const store = makeStore();

    const hidden = await store.dispatch(hideReview({ reviewId: "rv/1", note: "Spam" }));
    const shown = await store.dispatch(publishReview("rv/2"));
    const replied = await store.dispatch(replyToReview({ reviewId: "rv/3", content: "Thanks" }));
    const removed = await store.dispatch(deleteReviewReply("rv/4"));

    expect(calls.hides).toEqual([{ id: "rv/1", body: { note: "Spam" } }]);
    expect(calls.publishes).toEqual(["rv/2"]);
    expect(calls.replies).toEqual([{ id: "rv/3", body: { content: "Thanks" } }]);
    expect(calls.replyDeletes).toEqual(["rv/4"]);
    expect([hidden, shown, replied, removed].map((r) => (r.payload as { id: string }).id)).toEqual(["rv/1", "rv/2", "rv/3", "rv/4"]);
  });

  it.each([
    ["hide", () => hideReview({ reviewId: "rv-1", note: "x" })],
    ["show", () => publishReview("rv-1")],
    ["reply", () => replyToReview({ reviewId: "rv-1", content: "x" })],
    ["delete reply", () => deleteReviewReply("rv-1")],
  ] as const)("is busy only while a %s waits, and keeps the error when refused", async (_label, action) => {
    reviewsApi({ action: { status: 400, body: { message: "refused" } } });
    const store = makeStore();

    const pending = store.dispatch(action() as never);
    expect(state(store).isUpdating).toBe(true);
    await pending;

    expect(state(store).isUpdating).toBe(false);
    expect(state(store).error).toBe("refused");
  });

  it("forgets an old error when the next write starts, and is idle after one that worked", async () => {
    reviewsApi({ action: { status: 400, body: { message: "refused" } } });
    const store = makeStore();
    await store.dispatch(publishReview("rv-1") as never);
    expect(state(store).error).toBe("refused");
    reviewsApi();

    const pending = store.dispatch(publishReview("rv-1") as never);
    expect(state(store).error).toBeNull();
    await pending;

    expect(state(store).isUpdating).toBe(false);
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false, isUpdating: false });
  });
});

describe("ARV-10 the constants", () => {
  it("has two tabs, the waiting one first, and four hide reasons with no 'low rating'", () => {
    expect([...REVIEW_TABS]).toEqual(["pending", "all"]);
    expect([...HIDE_REASON_KEYS]).toEqual(["link", "personal", "language", "spam"]);
  });

  it("sorts by date, stars or helpful count, newest first by default", () => {
    expect(REVIEW_SORT_OPTIONS.map((o) => o.value)).toEqual(["-createdAt", "createdAt", "-rating", "rating", "-helpfulCount"]);
  });

  it("knows the fits, the states and the limits the BE enforces", () => {
    expect([...REVIEW_FITS]).toEqual(["small", "true_to_size", "large"]);
    expect([...REVIEW_STATUSES]).toEqual(["PUBLISHED", "HIDDEN"]);
    expect(REVIEW_LIMITS.replyMax).toBe(1000);
    expect(REVIEW_LIMITS.hideNoteMax).toBe(500);
  });
});
