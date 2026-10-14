"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import {
  EMPTY_REVIEW_FILTERS,
  hasActiveReviewFilters,
  type ReviewFilters,
} from "../_common/reviews";
import { useReviewList, useReviewSummary } from "../_common/use-product-reviews";
import { useReviewVotes } from "../_common/use-review-votes";
import ReviewFilterBar from "./ReviewFilterBar";
import ReviewItem from "./ReviewItem";
import ReviewSummary from "./ReviewSummary";
import WriteReviewBar from "./WriteReviewBar";

interface ReviewsSectionProps {
  productId: string;
}

const MORE_BUTTON_CLASS =
  "mx-auto block min-h-11 rounded-full border border-[var(--border-light)] bg-transparent px-8 py-3 font-primary text-sm font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)] cursor-pointer transition-all duration-150 hover:border-[var(--accent-primary)] hover:bg-[rgba(201,169,110,0.06)] hover:text-[var(--accent-primary)] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";

/**
 * Reviews of one product: the summary (average, star and fit distribution), filters and sort, the list with
 * "Show more", and the "Helpful" vote. Every number shown is the BE's; nothing is averaged here.
 */
export default function ReviewsSection({ productId }: ReviewsSectionProps) {
  const t = useTranslations("public.product.reviews");
  const toErrorMessage = useErrorMessage();
  const [filters, setFilters] = useState<ReviewFilters>(EMPTY_REVIEW_FILTERS);
  const { summary, isLoading: summaryLoading, reload: reloadSummary } = useReviewSummary(productId);
  const list = useReviewList(productId, filters);
  const { reload: reloadList } = list;

  /* A vote on a review that has since been hidden: start again from the BE's current list and totals */
  const onReviewGone = useCallback(() => {
    void reloadList();
    void reloadSummary();
  }, [reloadList, reloadSummary]);
  const votes = useReviewVotes(productId, onReviewGone);
  const { reloadOwn } = votes;

  /* The visitor wrote or edited a review here: totals, list and "your reviews" all start again from the BE */
  const onReviewSaved = useCallback(() => {
    void reloadList();
    void reloadSummary();
    void reloadOwn();
  }, [reloadList, reloadSummary, reloadOwn]);

  const clearFilters = useCallback(() => setFilters(EMPTY_REVIEW_FILTERS), []);
  const selectRating = useCallback((rating: number | null) => setFilters((f) => ({ ...f, rating })), []);

  const hasReviews = (summary?.ratingCount ?? 0) > 0;
  const filtered = hasActiveReviewFilters(filters);
  const initialLoading = summaryLoading || (list.status === "loading" && list.items.length === 0 && !list.error);

  return (
    <section id="reviews" className="scroll-mt-24 border-t border-[var(--border-subtle)] bg-[var(--bg-section-1)] pb-16 pt-12 sm:pt-16">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2">
          <span className="font-primary text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-accent)]">
            {t("label")}
          </span>
          <h2 className="m-0 font-display text-[clamp(28px,5vw,48px)] font-normal leading-none tracking-[-0.04em] text-[var(--text-heading)]">
            {t("title")}
          </h2>
        </div>

        <WriteReviewBar productId={productId} ownReviews={votes.ownReviews} onSaved={onReviewSaved} />

        {initialLoading ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            <div className="h-24 rounded-md bg-[var(--bg-elevated)] animate-pulse motion-reduce:animate-none" />
            <div className="h-40 rounded-md bg-[var(--bg-elevated)] animate-pulse motion-reduce:animate-none" />
          </div>
        ) : !summary || !hasReviews ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-12 text-center">
            <h3 className="m-0 font-display text-xl font-normal tracking-[-0.04em] text-[var(--text-heading)]">
              {t("empty.title")}
            </h3>
            <p className="m-0 max-w-[420px] font-primary text-sm leading-[150%] tracking-[-0.02em] text-[var(--text-muted)]">
              {t("empty.description")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <ReviewSummary summary={summary} activeRating={filters.rating} onSelectRating={selectRating} />
            </aside>

            <div className="flex min-w-0 flex-col gap-5">
              <ReviewFilterBar
                filters={filters}
                withImages={summary.withImages}
                onChange={setFilters}
                onClear={clearFilters}
              />

              {list.status === "error" && list.items.length === 0 ? (
                <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-10 text-center">
                  <p className="m-0 font-primary text-sm text-[var(--text-muted)]">
                    {toErrorMessage(list.error, t("list.loadFailed"))}
                  </p>
                  <button type="button" onClick={() => void list.reload()} className={MORE_BUTTON_CLASS}>
                    {t("list.retry")}
                  </button>
                </div>
              ) : list.items.length === 0 ? (
                <p className="m-0 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-10 text-center font-primary text-sm text-[var(--text-muted)]">
                  {filtered ? t("list.noMatch") : t("empty.title")}
                </p>
              ) : (
                <div className="flex flex-col gap-4" aria-live="polite">
                  {list.items.map((review) => (
                    <ReviewItem
                      key={review.id}
                      review={review}
                      helpfulCount={votes.counts[review.id]}
                      voted={votes.votedIds.has(review.id)}
                      busy={votes.busyIds.has(review.id)}
                      own={votes.ownIds.has(review.id)}
                      onToggleHelpful={votes.toggle}
                    />
                  ))}
                </div>
              )}

              {list.hasMore && (
                <button
                  type="button"
                  onClick={() => void list.loadMore()}
                  disabled={list.status === "loadingMore"}
                  className={MORE_BUTTON_CLASS}
                >
                  {list.status === "loadingMore"
                    ? t("list.loadingMore")
                    : list.status === "error"
                      ? t("list.retry")
                      : t("list.loadMore", { remaining: list.total - list.items.length })}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
