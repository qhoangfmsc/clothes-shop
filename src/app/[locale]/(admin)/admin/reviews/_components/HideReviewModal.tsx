"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import {
  ModalShell,
  ModalBody,
  FormSection,
  FormField,
  FormActions,
  inputClass,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { REVIEW_LIMITS, type AdminReview } from "@/src/types/review";
import { hideReview } from "../_common/moduleSlice";
import { HIDE_REASON_KEYS } from "../_common/constants";

interface HideReviewModalProps {
  review: AdminReview;
  onClose: () => void;
  onDone: (review: AdminReview) => void;
  /** The BE refused: the caller may refresh the review (it can already be hidden, or gone) */
  onFailed?: (err: unknown) => void;
}

/**
 * Hides a review that breaks the content rules. The reason is required and the author reads it, so the field says so.
 * Suggested reasons fill the note in one tap; "low rating" is not one of them on purpose.
 */
export default function HideReviewModal({ review, onClose, onDone, onFailed }: HideReviewModalProps) {
  const t = useTranslations("admin.reviews.hide");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.reviews.isUpdating);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;
    if (!note.trim()) {
      setError(t("errors.note"));
      return;
    }
    setError(null);
    try {
      const updated = await dispatch(hideReview({ reviewId: review.id, note: note.trim() })).unwrap();
      toast.success(t("toast.done"));
      onDone(updated);
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.failed")));
      onFailed?.(err);
    }
  };

  return (
    <ModalShell title={t("title")} onClose={onClose} maxWidthClass="max-w-150">
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <ModalBody>
          <p className="m-0 text-sm font-primary text-[var(--text-secondary)] rounded-lg border border-[var(--accent-primary)] bg-[var(--bg-secondary)] p-3">
            {t("reminder")}
          </p>
          <FormSection>
            <FormField label={t("note.label")} required info={t("note.info")}>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("reasons.label")}>
                {HIDE_REASON_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNote(t(`reasons.${key}`))}
                    className="py-1 px-3 pointer-coarse:min-h-11 rounded-full border border-[var(--border-light)] bg-transparent text-xs font-primary text-[var(--text-secondary)] cursor-pointer hover:border-[var(--accent-primary)]"
                  >
                    {t(`reasons.${key}`)}
                  </button>
                ))}
              </div>
              <textarea
                className={`${inputClass} resize-y`}
                rows={4}
                value={note}
                maxLength={REVIEW_LIMITS.hideNoteMax}
                onChange={(e) => setNote(e.target.value)}
              />
              <span className="text-xs text-[var(--text-muted)] font-primary tabular-nums text-right">
                {t("note.counter", { count: note.length, max: REVIEW_LIMITS.hideNoteMax })}
              </span>
              {error && <span className="text-xs text-[var(--accent-rose)] font-primary">{error}</span>}
            </FormField>
          </FormSection>
        </ModalBody>
        <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("submit")} />
      </form>
    </ModalShell>
  );
}
