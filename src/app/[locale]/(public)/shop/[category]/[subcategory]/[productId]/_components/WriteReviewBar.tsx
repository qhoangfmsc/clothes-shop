"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/contexts/auth-context";
import { useAuthAction } from "@/src/hooks/use-auth-action";
import type { AuthorReview, PendingReviewItem } from "@/src/types/review";
import { useDeadlineLabel } from "@/src/app/[locale]/(private)/reviews/_common/use-deadline-label";
import { usePendingReviews, useRefreshReviewData } from "@/src/app/[locale]/(private)/reviews/_common/use-pending-reviews";
import type { ReviewFormTarget } from "@/src/app/[locale]/(private)/reviews/_common/types";
import ReviewFormModal from "@/src/app/[locale]/(private)/reviews/_components/ReviewFormModal";

interface WriteReviewBarProps {
  productId: string;
  /** The visitor's own reviews of this product (from `useReviewVotes`) */
  ownReviews: AuthorReview[];
  /** A review was saved: reload this page's own lists and totals */
  onSaved: () => void;
}

const BUTTON_CLASS =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-[var(--accent-primary)] px-6 font-primary text-sm font-medium tracking-[-0.02em] text-[var(--text-on-gold)] shadow-[var(--shadow-gold-sm)] hover:opacity-90";
const GHOST_CLASS =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--accent-primary)] bg-transparent px-6 font-primary text-sm font-medium tracking-[-0.02em] text-[var(--text-accent)] hover:bg-[rgba(201,169,110,0.1)]";

/**
 * Write or edit a review without leaving the product page. What the visitor can do comes from the BE's own lists, never
 * from guesswork: a purchased, delivered line of this product in "to review" → "Write a review"; their review of it
 * that still `canEdit` → "Edit your review"; otherwise nothing (a thank-you line when they already reviewed). Signed out: the button asks
 * for sign-in first, then decides.
 */
export default function WriteReviewBar({ productId, ownReviews, onSaved }: WriteReviewBarProps) {
  const t = useTranslations("public.product.reviews.write");
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthAction();
  const pending = usePendingReviews();
  const refreshReviewData = useRefreshReviewData();
  const deadlineLabel = useDeadlineLabel();
  const [target, setTarget] = useState<ReviewFormTarget | null>(null);

  /* Soonest deadline first, so the line closest to expiring is the one offered */
  const reviewable: PendingReviewItem | undefined = [...pending.items]
    .filter((item) => item.productId === productId)
    .sort((a, b) => new Date(a.reviewDeadline).getTime() - new Date(b.reviewDeadline).getTime())[0];
  const editable = ownReviews.find((review) => review.canEdit && review.status === "PUBLISHED");

  const open = () => {
    if (reviewable) setTarget({ mode: "create", item: reviewable });
    else if (editable) setTarget({ mode: "edit", review: editable });
  };

  /* Signed out: sign in first; the bar then shows what this account can do (write, edit or neither) */
  const handleSignIn = () => requireAuth(() => {}, "continue");

  const handleSaved = () => {
    setTarget(null);
    void refreshReviewData();
    onSaved();
  };

  let action: React.ReactNode;
  if (!isAuthenticated) {
    action = (
      <>
        <button type="button" onClick={handleSignIn} className={BUTTON_CLASS}>
          <PenLine size={15} aria-hidden="true" />
          {t("cta")}
        </button>
        <span className="font-primary text-xs text-[var(--text-muted)]">{t("signInHint")}</span>
      </>
    );
  } else if (reviewable) {
    action = (
      <>
        <button type="button" onClick={open} className={BUTTON_CLASS}>
          <PenLine size={15} aria-hidden="true" />
          {t("cta")}
        </button>
        <span className="font-primary text-xs text-[var(--text-muted)]">{deadlineLabel(reviewable.reviewDeadline)}</span>
      </>
    );
  } else if (editable) {
    action = (
      <>
        <button type="button" onClick={open} className={GHOST_CLASS}>
          <PenLine size={15} aria-hidden="true" />
          {t("edit")}
        </button>
        <span className="font-primary text-xs text-[var(--text-muted)]">{t("editHint")}</span>
      </>
    );
  } else if (ownReviews.length > 0) {
    action = <span className="font-primary text-xs text-[var(--text-muted)]">{t("alreadyReviewed")}</span>;
  } else {
    /* Not bought / not delivered / out of time: nothing to offer and nothing to explain */
    return null;
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
      {action}
      {target && (
        <ReviewFormModal
          target={target}
          onClose={() => setTarget(null)}
          onSaved={handleSaved}
          onAlreadyReviewed={handleSaved}
          onStale={() => {
            void pending.reload();
            onSaved();
          }}
        />
      )}
    </div>
  );
}
