"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { InfoHint } from "@/src/app/[locale]/_components/InfoHint";
import {
  EMPTY_REVIEW_FILTERS,
  REVIEW_PAGE_SIZE,
  hasActiveReviewFilters,
  type ReviewFilters,
} from "../_common/reviews";
import { useReviewList, useReviewSummary } from "../_common/use-product-reviews";
import { useReviewVotes } from "../_common/use-review-votes";
import ReviewFilterBar from "./ReviewFilterBar";
import ReviewItem from "./ReviewItem";
import ReviewSummaryPanel from "./ReviewSummaryPanel";
import WriteReviewBar from "./WriteReviewBar";

interface ReviewsSectionProps {
  productId: string;
}

const MORE_BUTTON_CLASS =
  "mx-auto block min-h-11 rounded-full border border-[var(--border-light)] bg-transparent px-8 py-3 font-primary text-sm font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)] cursor-pointer transition-all duration-150 hover:border-[var(--accent-primary)] hover:bg-[rgba(201,169,110,0.06)] hover:text-[var(--accent-primary)] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";

/**
 * Reviews of one product. Folded by default: the summary (average, count, star and fit distribution) is always there,
 * the review list only appears — and is only requested — when the visitor asks for it ("See all", a tap on a star bar,
 * or the rating link under the product name). Opened: filters and sort, the list with "Show more", and the "Helpful" vote.
 * Every number shown is the BE's; nothing is averaged here.
 */
export default function ReviewsSection({ productId }: ReviewsSectionProps) {
  const t = useTranslations("public.product.reviews");
  const toErrorMessage = useErrorMessage();
  const [filters, setFilters] = useState<ReviewFilters>(EMPTY_REVIEW_FILTERS);
  const { summary, isLoading: summaryLoading, reload: reloadSummary } = useReviewSummary(productId);
  const [open, setOpen] = useState(false);
  const list = useReviewList(productId, filters, open);
  const { reload: reloadList } = list;

  /* The rating link under the product name (event) and a `#reviews` address both open the list */
  useEffect(() => {
    const openList = () => setOpen(true);
    if (window.location.hash === "#reviews") openList();
    const onHashChange = () => window.location.hash === "#reviews" && openList();
    window.addEventListener("reviews:open", openList);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("reviews:open", openList);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  /* A vote on a review that has since been hidden: start again from the BE's current list and totals */
  const onReviewGone = useCallback(() => {
    if (open) void reloadList();
    void reloadSummary();
  }, [open, reloadList, reloadSummary]);
  const votes = useReviewVotes(productId, onReviewGone);
  const { reloadOwn } = votes;

  /* The visitor wrote or edited a review here: totals, list and "your reviews" all start again from the BE */
  const onReviewSaved = useCallback(() => {
    if (open) void reloadList();
    void reloadSummary();
    void reloadOwn();
  }, [open, reloadList, reloadSummary, reloadOwn]);

  /* "Show fewer" folds the whole list away (back to the summary), forgets the filters, and brings the top of the section into
     view, so nobody is left mid-list. While the opened list is on screen the button floats at the bottom of the viewport, so it
     is reachable from anywhere in it.
     (`position: sticky` cannot do that here: `html` and `body` both hide `overflow-x`, so `body` becomes the scroll container.) */
  const { collapse } = list;
  const [listNode, setListNode] = useState<HTMLDivElement | null>(null);
  const [listInView, setListInView] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!listNode) return;
    const observer = new IntersectionObserver(([entry]) => setListInView(entry.isIntersecting), { threshold: 0 });
    observer.observe(listNode);
    return () => observer.disconnect();
  }, [listNode]);
  const handleCollapse = useCallback(() => {
    collapse();
    setOpen(false);
    setFilters(EMPTY_REVIEW_FILTERS);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("reviews")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [collapse]);

  const clearFilters = useCallback(() => setFilters(EMPTY_REVIEW_FILTERS), []);
  /* A tap on a chip (a star count, photos) is the quickest way to what the visitor wants: open the list already filtered */
  const applyFilters = useCallback((next: ReviewFilters) => {
    setFilters(next);
    setOpen(true);
  }, []);

  const hasReviews = (summary?.ratingCount ?? 0) > 0;
  const filtered = hasActiveReviewFilters(filters);
  /* Only the first load of the totals shows a placeholder for the whole block; opening the list never blanks the summary */
  const initialLoading = summaryLoading;
  const listLoading = list.status === "loading" && list.items.length === 0 && !list.error;

  return (
    <section id="reviews" className="scroll-mt-24 border-t border-[var(--border-subtle)] bg-[var(--bg-section-1)] pb-16 pt-12 sm:pt-16">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2">
          <span className="font-primary text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-accent)]">
            {t("label")}
          </span>
          <div className="flex items-center gap-3">
            <h2 className="m-0 font-display text-[clamp(28px,5vw,48px)] font-normal leading-none tracking-[-0.04em] text-[var(--text-heading)]">
              {t("title")}
            </h2>
            {/* Who may review: hover / focus on a mouse, tap on touch */}
            <InfoHint text={t("info")} size={18} />
          </div>
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
          <div className="flex flex-col gap-5">
            {/* Choosing a chip while folded opens the list already filtered */}
            <ReviewSummaryPanel
              summary={summary}
              filters={filters}
              onChange={applyFilters}
              onOpen={open ? undefined : () => setOpen(true)}
            />

            {open && (
              <div id="review-list" className="flex min-w-0 flex-col gap-5">
                <ReviewFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

                {list.status === "error" && list.items.length === 0 ? (
                  <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-10 text-center">
                    <p className="m-0 font-primary text-sm text-[var(--text-muted)]">
                      {toErrorMessage(list.error, t("list.loadFailed"))}
                    </p>
                    <button type="button" onClick={() => void list.reload()} className={MORE_BUTTON_CLASS}>
                      {t("list.retry")}
                    </button>
                  </div>
                ) : listLoading ? (
                  <div className="flex flex-col gap-4" aria-busy="true">
                    <div className="h-40 rounded-md bg-[var(--bg-elevated)] animate-pulse motion-reduce:animate-none" />
                    <div className="h-40 rounded-md bg-[var(--bg-elevated)] animate-pulse motion-reduce:animate-none" />
                  </div>
                ) : list.items.length === 0 ? (
                  <p className="m-0 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-10 text-center font-primary text-sm text-[var(--text-muted)]">
                    {filtered ? t("list.noMatch") : t("empty.title")}
                  </p>
                ) : (
                  <div ref={setListNode} className="flex flex-col gap-4" aria-live="polite">
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
                        : t("list.loadMore")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {mounted && open && listInView &&
        createPortal(
          <button
            type="button"
            onClick={handleCollapse}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 inline-flex min-h-11 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--bg-primary)] px-5 font-primary text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)] shadow-[var(--shadow-md)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          >
            <ChevronUp size={14} aria-hidden="true" />
            {t("list.collapse")}
          </button>,
          document.body
        )}
    </section>
  );
}
