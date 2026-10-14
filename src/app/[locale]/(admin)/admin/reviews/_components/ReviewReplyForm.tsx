"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { inputClass } from "@/src/app/[locale]/_components/AdminFormKit";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { REVIEW_LIMITS, type AdminReview } from "@/src/types/review";
import { deleteReviewReply, replyToReview } from "../_common/moduleSlice";

interface ReviewReplyFormProps {
  review: AdminReview;
  onChanged: (review: AdminReview) => void;
  /** The BE refused: the caller may refresh the review (it can be gone) */
  onFailed?: (err: unknown) => void;
}

/** The store's public reply under a review: write it, replace it, or remove it */
export default function ReviewReplyForm({ review, onChanged, onFailed }: ReviewReplyFormProps) {
  const t = useTranslations("admin.reviews.reply");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.reviews.isUpdating);
  const [content, setContent] = useState(review.reply?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const hasReply = review.reply !== null;
  const unchanged = content.trim() === (review.reply?.content ?? "");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;
    if (!content.trim()) {
      setError(t("errors.content"));
      return;
    }
    setError(null);
    try {
      const updated = await dispatch(replyToReview({ reviewId: review.id, content: content.trim() })).unwrap();
      toast.success(hasReply ? t("toast.updated") : t("toast.created"));
      onChanged(updated);
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.saveFailed")));
      onFailed?.(err);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("confirmDelete.title"),
      message: t("confirmDelete.message"),
      confirmLabel: t("confirmDelete.confirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      const updated = await dispatch(deleteReviewReply(review.id)).unwrap();
      setContent("");
      toast.success(t("toast.deleted"));
      onChanged(updated);
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.deleteFailed")));
      onFailed?.(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-secondary)] font-primary">{t("label")}</span>
        <textarea
          className={`${inputClass} resize-y`}
          rows={4}
          value={content}
          maxLength={REVIEW_LIMITS.replyMax}
          placeholder={t("placeholder")}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-muted)] font-primary">{t("publicNote")}</span>
        <span className="text-xs text-[var(--text-muted)] font-primary tabular-nums">
          {t("counter", { count: content.length, max: REVIEW_LIMITS.replyMax })}
        </span>
      </div>
      {error && <span className="text-xs text-[var(--accent-rose)] font-primary">{error}</span>}
      <div className="flex flex-wrap justify-end gap-3">
        {hasReply && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isUpdating}
            className="py-2 px-4 pointer-coarse:min-h-11 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--accent-rose)] cursor-pointer disabled:opacity-50"
          >
            {t("delete")}
          </button>
        )}
        <button
          type="submit"
          disabled={isUpdating || unchanged}
          className="py-2 px-5 pointer-coarse:min-h-11 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer disabled:opacity-50"
        >
          {hasReply ? t("update") : t("save")}
        </button>
      </div>
    </form>
  );
}
