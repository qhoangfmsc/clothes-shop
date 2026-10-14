"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, MessageSquareText, X } from "lucide-react";
import { Link, useRouter } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import type { AuthorReview, PendingReviewItem } from "@/src/types/review";
import {
  MY_REVIEW_STATUS_FILTERS,
  REVIEW_TABS,
  type MyReviewStatusFilter,
  type ReviewTab,
} from "./_common/constants";
import type { ReviewFormTarget } from "./_common/types";
import { useMyReviews } from "./_common/use-my-reviews";
import { usePendingReviews, useRefreshReviewData } from "./_common/use-pending-reviews";
import MyReviewCard from "./_components/MyReviewCard";
import PendingReviewCard from "./_components/PendingReviewCard";
import ReviewFormModal from "./_components/ReviewFormModal";

const ease = [0.25, 0.1, 0.25, 1] as const;

const SHELL_CLASS = "min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]";
const WRAP_CLASS = "max-w-[720px] mx-auto px-4 sm:px-6";
const SKELETON_CLASS =
  "h-[140px] rounded-lg bg-[var(--color-champagne-cream)] animate-[checkout-shimmer_1.5s_ease_infinite] motion-reduce:animate-none";
const GHOST_BUTTON_CLASS =
  "inline-flex min-h-11 cursor-pointer items-center justify-center self-center rounded-full border border-[var(--border-light)] bg-transparent px-6 py-2.5 font-primary text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-accent)] hover:bg-[var(--color-champagne-cream)] disabled:cursor-wait disabled:opacity-60";

/** "To review" and "My reviews" of the signed-in customer, with the review form opened over them */
export default function ReviewsContent() {
  const t = useTranslations("private.reviews");
  const toErrorMessage = useErrorMessage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const refreshReviewData = useRefreshReviewData();

  const tabParam = searchParams.get("tab");
  const tab: ReviewTab = REVIEW_TABS.find((id) => id === tabParam) ?? "pending";
  const productId = searchParams.get("productId") || undefined;
  const [statusFilter, setStatusFilter] = useState<MyReviewStatusFilter>("all");
  const [target, setTarget] = useState<ReviewFormTarget | null>(null);

  const pending = usePendingReviews();
  const mine = useMyReviews(statusFilter, productId);
  const { reload: reloadMine, replace: replaceMine } = mine;
  const { reload: reloadPending } = pending;

  const setTab = (next: ReviewTab) => {
    const qs = new URLSearchParams(searchParams.toString());
    if (next === "pending") qs.delete("tab");
    else qs.set("tab", next);
    const text = qs.toString();
    router.replace(text ? `/reviews?${text}` : "/reviews", { scroll: false });
  };

  const clearProductFilter = () => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete("productId");
    const text = qs.toString();
    router.replace(text ? `/reviews?${text}` : "/reviews", { scroll: false });
  };

  const closeForm = useCallback(() => setTarget(null), []);

  const handleSaved = (review: AuthorReview) => {
    if (target?.mode === "edit") replaceMine(review);
    setTarget(null);
    /* A new review leaves "to review"; either way the product summaries are stale */
    void refreshReviewData();
    void reloadMine();
  };

  /* 1903: the line was reviewed already (for example in another tab) → show it where it now lives */
  const handleAlreadyReviewed = () => {
    void reloadPending();
    void reloadMine();
    setTab("mine");
  };

  /* 1902 / 1904: the BE says the line can no longer be reviewed or the review edited → refresh what depends on it */
  const handleStale = () => {
    void reloadPending();
    void reloadMine();
  };

  if (authLoading) {
    return (
      <main className={SHELL_CLASS}>
        <div className={`${WRAP_CLASS} flex flex-col gap-4`}>
          <div className={SKELETON_CLASS} />
          <div className={SKELETON_CLASS} />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={SHELL_CLASS}>
        <UnauthenticatedState />
      </main>
    );
  }

  const openCreate = (item: PendingReviewItem) => setTarget({ mode: "create", item });
  const openEdit = (review: AuthorReview) => setTarget({ mode: "edit", review });

  return (
    <main className={SHELL_CLASS}>
      <div className={`${WRAP_CLASS} flex flex-col gap-6`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [...ease] }}
          className="flex flex-col gap-3"
        >
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center gap-2 self-start font-primary text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] no-underline transition-colors duration-150 hover:text-[var(--text-primary)] motion-reduce:transition-none"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t("page.back")}
          </Link>
          <h1 className="m-0 font-display text-2xl font-normal leading-none tracking-[-0.04em] text-[var(--text-heading)]">
            {t("page.title")}
          </h1>
        </motion.div>

        <div role="tablist" aria-label={t("page.title")} className="flex gap-1 border-b border-[var(--border-subtle)]">
          {REVIEW_TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`reviews-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`reviews-panel-${id}`}
              onClick={() => setTab(id)}
              className={`-mb-px min-h-11 cursor-pointer border-0 border-b-2 bg-transparent px-4 font-primary text-sm font-medium transition-colors motion-reduce:transition-none ${
                tab === id
                  ? "border-[var(--accent-primary)] text-[var(--text-heading)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {id === "pending" ? t("tabs.pending", { count: pending.total }) : t("tabs.mine")}
            </button>
          ))}
        </div>

        {tab === "pending" ? (
          <section id="reviews-panel-pending" role="tabpanel" aria-labelledby="reviews-tab-pending" className="flex flex-col gap-4">
            <p className="m-0 font-primary text-sm leading-[150%] tracking-[-0.02em] text-[var(--text-muted)]">{t("pending.info")}</p>
            {pending.isLoading ? (
              <div className="flex flex-col gap-4">
                <div className={SKELETON_CLASS} />
                <div className={SKELETON_CLASS} />
              </div>
            ) : pending.error ? (
              <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-10 text-center">
                <p className="m-0 font-primary text-sm text-[var(--text-muted)]">{toErrorMessage(pending.error, t("toast.loadFailed"))}</p>
                <button type="button" onClick={() => void reloadPending()} className={GHOST_BUTTON_CLASS}>
                  {t("retry")}
                </button>
              </div>
            ) : pending.items.length === 0 ? (
              <EmptyState title={t("pending.empty.title")} description={t("pending.empty.description")} action={{ href: "/shop", label: t("pending.empty.cta") }} />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {pending.items.map((item) => (
                  <PendingReviewCard key={item.orderItemId} item={item} onReview={openCreate} />
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section id="reviews-panel-mine" role="tabpanel" aria-labelledby="reviews-tab-mine" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {MY_REVIEW_STATUS_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                  className={`min-h-9 cursor-pointer rounded-full border px-4 font-primary text-xs font-medium transition-colors pointer-coarse:min-h-11 motion-reduce:transition-none ${
                    statusFilter === value
                      ? "border-[var(--accent-primary)] bg-[rgba(201,169,110,0.1)] text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                  }`}
                >
                  {t(`mine.filters.${value}`)}
                </button>
              ))}
              {productId && (
                <button
                  type="button"
                  onClick={clearProductFilter}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-[var(--bg-elevated)] px-3 font-primary text-xs font-semibold text-[var(--text-secondary)] pointer-coarse:min-h-11"
                >
                  {t("mine.productFilter")}
                  <X size={12} aria-label={t("mine.clearProductFilter")} />
                </button>
              )}
            </div>

            {mine.status === "loading" ? (
              <div className="flex flex-col gap-4">
                <div className={SKELETON_CLASS} />
                <div className={SKELETON_CLASS} />
              </div>
            ) : mine.status === "error" && mine.items.length === 0 ? (
              <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-10 text-center">
                <p className="m-0 font-primary text-sm text-[var(--text-muted)]">{toErrorMessage(mine.error, t("toast.loadFailed"))}</p>
                <button type="button" onClick={() => void mine.reload()} className={GHOST_BUTTON_CLASS}>
                  {t("retry")}
                </button>
              </div>
            ) : mine.items.length === 0 ? (
              <EmptyState title={t("mine.empty.title")} description={t("mine.empty.description")} action={{ href: "/orders", label: t("mine.empty.cta") }} />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {mine.items.map((review) => (
                  <MyReviewCard key={review.id} review={review} onEdit={openEdit} />
                ))}
              </ul>
            )}

            {mine.hasMore && (
              <button type="button" onClick={() => void mine.loadMore()} disabled={mine.status === "loadingMore"} className={GHOST_BUTTON_CLASS}>
                {mine.status === "loadingMore" ? t("loadingMore") : mine.status === "error" ? t("retry") : t("loadMore")}
              </button>
            )}
          </section>
        )}
      </div>

      {target && (
        <ReviewFormModal
          target={target}
          onClose={closeForm}
          onSaved={handleSaved}
          onAlreadyReviewed={handleAlreadyReviewed}
          onStale={handleStale}
        />
      )}
    </main>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-16 text-center">
      <MessageSquareText size={40} aria-hidden="true" style={{ color: "var(--text-disabled)" }} />
      <h2 className="m-0 font-display text-xl font-normal tracking-[-0.04em] text-[var(--text-heading)]">{title}</h2>
      <p className="m-0 max-w-[380px] font-primary text-sm leading-[150%] tracking-[-0.02em] text-[var(--text-muted)]">{description}</p>
      <Link
        href={action.href}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-6 py-3 font-primary text-sm font-medium uppercase tracking-[-0.02em] text-[var(--text-on-gold)] no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90"
      >
        {action.label}
      </Link>
    </div>
  );
}
