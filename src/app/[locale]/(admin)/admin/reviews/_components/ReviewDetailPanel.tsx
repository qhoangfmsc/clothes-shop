"use client";

import { useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { ModalShell, ModalBody, FormSection } from "@/src/app/[locale]/_components/AdminFormKit";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import ReviewContent from "@/src/app/[locale]/_components/ReviewContent";
import ReviewAvatar from "@/src/app/[locale]/_components/ReviewAvatar";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { ApiError } from "@/src/lib/api";
import { PERMISSIONS } from "@/src/lib/permissions";
import { toMediaUrl } from "@/src/lib/media-url";
import { useAppDispatch } from "@/src/store/hooks";
import type { AdminReview } from "@/src/types/review";
import { fetchReviewDetail, publishReview } from "../_common/moduleSlice";
import HideReviewModal from "./HideReviewModal";
import ReviewReplyForm from "./ReviewReplyForm";
import ReviewStatusBadge from "./ReviewStatusBadge";

/** BE codes answered here */
const CODE_NOT_FOUND = 1901;
const CODE_INVALID_STATE = 1906;

interface ReviewDetailPanelProps {
  review: AdminReview;
  onClose: () => void;
  /** An action succeeded (or the row was refreshed): the review as the BE now has it; the list should refresh too */
  onChanged: (review: AdminReview) => void;
  /** The review no longer exists: the list should refresh and the panel closes */
  onGone: () => void;
}

const ACTION_BUTTON =
  "py-2 px-4 pointer-coarse:min-h-11 text-sm font-semibold font-primary rounded-sm border-0 cursor-pointer hover:opacity-90 disabled:opacity-50";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3 py-1.5">
      <span className="shrink-0 text-xs text-[var(--text-muted)] font-primary font-medium">{label}</span>
      <span className="min-w-0 text-sm text-[var(--text-primary)] font-primary text-right break-words">{children}</span>
    </div>
  );
}

/** One review in full: the text and photos as the public sees them, the moderation trail, hide / show and the store's reply */
export default function ReviewDetailPanel({ review, onClose, onChanged, onGone }: ReviewDetailPanelProps) {
  const t = useTranslations("admin.reviews.detail");
  const format = useFormatter();
  const confirm = useConfirm();
  const { toast } = useToast();
  const toErrorMessage = useErrorMessage();
  const dispatch = useAppDispatch();
  const [hiding, setHiding] = useState(false);
  const [busy, setBusy] = useState(false);

  const date = (iso: string) => format.dateTime(new Date(iso), "dateTime");
  const hidden = review.status === "HIDDEN";

  /** After a failed action: 1906 (already in that state) → show the row as it is now; 1901 → it is gone */
  const refreshAfterError = async (err: unknown) => {
    const code = err instanceof ApiError ? err.errorCode : undefined;
    if (code === CODE_NOT_FOUND) {
      onGone();
    } else if (code === CODE_INVALID_STATE) {
      setHiding(false);
      try {
        onChanged(await dispatch(fetchReviewDetail(review.id)).unwrap());
      } catch {
        /* keep what is on screen: the list refresh will show the truth */
      }
    }
  };

  const handlePublish = async () => {
    const ok = await confirm({
      title: t("publish.confirm.title"),
      message: t("publish.confirm.message"),
      confirmLabel: t("publish.confirm.confirm"),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const updated = await dispatch(publishReview(review.id)).unwrap();
      toast.success(t("publish.toast.done"));
      onChanged(updated);
    } catch (err) {
      toast.error(toErrorMessage(err, t("publish.toast.failed")));
      await refreshAfterError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ModalShell title={t("title")} onClose={onClose} maxWidthClass="max-w-160">
        <ModalBody>
          <FormSection title={t("product.section")}>
            <div className="flex items-center gap-3">
              {review.product?.image && (
                // eslint-disable-next-line @next/next/no-img-element -- small thumbnail from the media library
                <img src={toMediaUrl(review.product.image)} alt="" className="h-16 w-12 shrink-0 rounded-sm object-cover" />
              )}
              <div className="min-w-0 flex flex-col gap-1">
                <span className="text-sm font-semibold font-primary text-[var(--text-primary)] break-words">
                  {review.product?.name ?? "—"}
                </span>
                {review.product && (
                  <Link
                    href={`/admin/reviews?product=${encodeURIComponent(review.product.slug)}`}
                    className="text-xs text-[var(--accent-primary)] no-underline hover:underline pointer-coarse:min-h-11 inline-flex items-center"
                  >
                    {t("product.allReviews")}
                  </Link>
                )}
              </div>
            </div>
          </FormSection>

          <FormSection title={t("review.section")}>
            <div className="flex items-center gap-3">
              <ReviewAvatar avatar={review.avatar} author={review.author} />
              <div className="min-w-0 flex flex-col">
                <span className="text-sm font-semibold font-primary text-[var(--text-primary)] break-words">{review.author}</span>
                {review.userId && (
                  <Link
                    href={`/admin/reviews?userId=${encodeURIComponent(review.userId)}`}
                    className="text-xs text-[var(--accent-primary)] no-underline hover:underline pointer-coarse:min-h-11 inline-flex items-center"
                  >
                    {t("review.byAuthor")}
                  </Link>
                )}
              </div>
              <span className="ml-auto shrink-0">
                <ReviewStatusBadge status={review.status} />
              </span>
            </div>
            <ReviewContent review={review} />
          </FormSection>

          <FormSection title={t("trail.section")}>
            <Row label={t("trail.createdAt")}>{date(review.createdAt)}</Row>
            <Row label={t("trail.orderItem")}>
              <span className="font-mono text-xs">{review.orderItemId}</span>
            </Row>
            {review.editedAt && <Row label={t("trail.editedAt")}>{date(review.editedAt)}</Row>}
            {review.moderatedAt && (
              <>
                <Row label={t("trail.moderatedAt")}>{date(review.moderatedAt)}</Row>
                {review.moderatedBy && (
                  <Row label={t("trail.moderatedBy")}>
                    <span className="font-mono text-xs">{review.moderatedBy}</span>
                  </Row>
                )}
              </>
            )}
            {hidden && review.moderationNote && <Row label={t("trail.moderationNote")}>{review.moderationNote}</Row>}
            {review.repliedBy && (
              <Row label={t("trail.repliedBy")}>
                <span className="font-mono text-xs">{review.repliedBy}</span>
              </Row>
            )}
          </FormSection>

          <RoleGuard permission={PERMISSIONS.REVIEW_ADMIN_REPLY}>
            <FormSection title={t("reply.section")}>
              {/* Keyed by the stored reply so the field restarts from what the BE holds after a save or a refresh */}
              <ReviewReplyForm
                key={`${review.id}:${review.reply?.repliedAt ?? "none"}`}
                review={review}
                onChanged={onChanged}
                onFailed={refreshAfterError}
              />
            </FormSection>
          </RoleGuard>
        </ModalBody>

        <RoleGuard permission={PERMISSIONS.REVIEW_ADMIN_MODERATE}>
          <div className="shrink-0 flex flex-col gap-2 py-3 px-4 sm:py-4 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--border-subtle)]">
            {!hidden && <p className="m-0 text-xs font-primary text-[var(--text-muted)]">{t("hide.reminder")}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              {hidden ? (
                <button
                  type="button"
                  disabled={busy}
                  className={`${ACTION_BUTTON} bg-[var(--accent-primary)] text-[var(--text-on-gold)]`}
                  onClick={() => void handlePublish()}
                >
                  {t("actions.publish")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className={`${ACTION_BUTTON} bg-[var(--bg-elevated)] text-[var(--accent-rose)]`}
                  onClick={() => setHiding(true)}
                >
                  {t("actions.hide")}
                </button>
              )}
            </div>
          </div>
        </RoleGuard>
      </ModalShell>

      {hiding && (
        <HideReviewModal
          review={review}
          onClose={() => setHiding(false)}
          onFailed={refreshAfterError}
          onDone={(updated) => {
            setHiding(false);
            onChanged(updated);
          }}
        />
      )}
    </>
  );
}
