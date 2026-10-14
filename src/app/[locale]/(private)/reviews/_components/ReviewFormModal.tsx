"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { ApiError } from "@/src/lib/api";
import { toMediaUrl } from "@/src/lib/media-url";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { REVIEW_FITS, REVIEW_LIMITS, type AuthorReview, type ReviewFit } from "@/src/types/review";
import {
  REVIEW_IMAGE_MAX_BYTES,
  REVIEW_IMAGE_MAX_MB,
  REVIEW_LINK_PATTERN,
  isAcceptedReviewImage,
} from "../_common/constants";
import type { ImageSlot, ReviewFormState, ReviewFormTarget } from "../_common/types";
import { uploadReviewImage } from "../_common/upload";
import ReviewImageUploader from "./ReviewImageUploader";
import StarPicker from "./StarPicker";

/** BE codes the form reacts to itself */
const CODE_NOT_ALLOWED = 1902;
const CODE_ALREADY_EXISTS = 1903;
const CODE_EDIT_NOT_ALLOWED = 1904;
const CODE_LINK = 1905;
const CODE_IMAGE_INVALID = 1908;

interface ReviewFormModalProps {
  target: ReviewFormTarget;
  onClose: () => void;
  /** The review the BE saved (`201` / `200`) */
  onSaved: (review: AuthorReview) => void;
  /** The order line was reviewed already (`1903`): the caller can send the customer to "My reviews" */
  onAlreadyReviewed?: () => void;
  /** The order line can no longer be reviewed (`1902`) or the review can no longer be edited (`1904`): the caller refreshes its lists */
  onStale?: () => void;
}

function initialState(target: ReviewFormTarget): ReviewFormState {
  if (target.mode === "create") return { rating: 0, title: "", content: "", fit: null, images: [] };
  const { review } = target;
  return {
    rating: review.rating,
    title: review.title,
    content: review.content,
    fit: review.fit,
    images: review.images.map((url, i) => ({
      id: `existing:${i}:${url}`,
      url,
      preview: toMediaUrl(url),
      status: "done" as const,
    })),
  };
}

const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

const FIELD_LABEL_CLASS = "font-primary text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]";
const INPUT_CLASS =
  "w-full rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2.5 font-primary text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-primary)] pointer-coarse:text-base motion-reduce:transition-none";

/**
 * Write a review of an order line, or make the one edit a review allows.
 * - Rating is required; title ≤ 255; text ≤ 2000 and no links (told while typing); fit optional; up to 5 photos.
 * - Picking a photo only shows a local preview (nothing is sent). On submit the new photos upload together
 *   (`POST /api/reviews/images`, `Promise.allSettled`) and only then the review request goes out with the URLs the BE
 *   answered. A form that is cancelled never spends the daily upload limit, and photos already uploaded are not
 *   uploaded again when a later step fails and the customer submits once more.
 * - Edit sends only what changed, and warns that it can happen once.
 * - Sending is locked while a request runs, so a double tap cannot create the review twice.
 */
export default function ReviewFormModal({ target, onClose, onSaved, onAlreadyReviewed, onStale }: ReviewFormModalProps) {
  const t = useTranslations("shared.reviews.form");
  const tFit = useTranslations("shared.reviews.fit");
  const tToast = useTranslations("shared.reviews.toast");
  const format = useFormatter();
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const { apiFetch } = useApiAuth();

  const isEdit = target.mode === "edit";
  const original = isEdit ? target.review : null;
  const [form, setForm] = useState<ReviewFormState>(() => initialState(target));
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [serverLinkError, setServerLinkError] = useState(false);
  const submittingRef = useRef(false);
  /** Object URLs created for picked files; released when the form closes */
  const objectUrls = useRef<Set<string>>(new Set());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  /* Lock the page scroll behind the dialog, and close on Escape unless a request is running */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submittingRef.current) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const patchSlot = useCallback((id: string, patch: Partial<ImageSlot>) => {
    setForm((f) => ({ ...f, images: f.images.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)) }));
  }, []);

  const handlePick = (files: File[]) => {
    setNotice(null);
    const room = REVIEW_LIMITS.imagesMax - form.images.length;
    const known = new Set(form.images.map((slot) => slot.id));
    const accepted: File[] = [];
    let message: string | null = null;

    for (const file of files) {
      if (known.has(fileKey(file)) || accepted.some((f) => fileKey(f) === fileKey(file))) continue; // same file twice: ignore
      if (!isAcceptedReviewImage(file)) {
        message = t("images.errors.type", { name: file.name });
      } else if (file.size > REVIEW_IMAGE_MAX_BYTES) {
        message = t("images.errors.size", { name: file.name, size: REVIEW_IMAGE_MAX_MB });
      } else if (accepted.length >= room) {
        message = t("images.errors.limit", { max: REVIEW_LIMITS.imagesMax });
      } else {
        accepted.push(file);
      }
    }
    if (message) setNotice(message);
    if (accepted.length === 0) return;

    const slots: ImageSlot[] = accepted.map((file) => {
      const preview = URL.createObjectURL(file);
      objectUrls.current.add(preview);
      return { id: fileKey(file), url: "", preview, status: "local", file };
    });
    setForm((f) => ({ ...f, images: [...f.images, ...slots] }));
  };

  const handleRemove = (id: string) => {
    setNotice(null);
    setForm((f) => ({ ...f, images: f.images.filter((slot) => slot.id !== id) }));
  };

  /* ── Validation (shown while typing for links, on submit for the rest) ── */
  const titleHasLink = REVIEW_LINK_PATTERN.test(form.title);
  const contentHasLink = REVIEW_LINK_PATTERN.test(form.content);
  const ratingMissing = form.rating < 1;

  /** Photos the BE already holds (existing ones and ones uploaded by an earlier submit) */
  const imageUrls = useMemo(() => form.images.filter((slot) => slot.status === "done").map((slot) => slot.url), [form.images]);
  /** Picked photos that still have to be uploaded: they count as a change of the review's photos */
  const hasPendingPhotos = form.images.some((slot) => slot.status !== "done");

  /** Fields that differ from the saved review (edit only): the PATCH body, with `images` judged against `urls` */
  const changesFor = (urls: string[]): Record<string, unknown> => {
    const body: Record<string, unknown> = {};
    if (!original) return body;
    if (form.rating !== original.rating) body.rating = form.rating;
    if (form.title.trim() !== original.title) body.title = form.title.trim();
    if (form.content.trim() !== original.content) body.content = form.content.trim();
    if (form.fit !== original.fit && form.fit !== null) body.fit = form.fit;
    const sameImages = urls.length === original.images.length && urls.every((url, i) => url === original.images[i]);
    if (!sameImages) body.images = urls;
    return body;
  };

  const nothingChanged = isEdit && !hasPendingPhotos && Object.keys(changesFor(imageUrls)).length === 0;
  const blocked = submitting || titleHasLink || contentHasLink || nothingChanged;

  /**
   * Uploads every photo that is not on the BE yet, all at once. A photo that fails stays in the form marked as failed
   * (the next submit tries it again) and the review is not sent. Returns the final URLs in the order of the form, or
   * `null` when something failed.
   */
  const uploadPendingPhotos = async (): Promise<string[] | null> => {
    const pending = form.images.filter((slot) => slot.status !== "done" && slot.file);
    if (pending.length === 0) return imageUrls;

    const pendingIds = new Set(pending.map((slot) => slot.id));
    setForm((f) => ({
      ...f,
      images: f.images.map((slot) => (pendingIds.has(slot.id) ? { ...slot, status: "uploading", errorCode: undefined } : slot)),
    }));

    const results = await Promise.allSettled(pending.map((slot) => uploadReviewImage(apiFetch, slot.file as File)));
    const urlById = new Map<string, string>();
    let firstError: unknown = null;
    results.forEach((result, i) => {
      const id = pending[i].id;
      if (result.status === "fulfilled") {
        urlById.set(id, result.value);
        patchSlot(id, { url: result.value, status: "done", errorCode: undefined });
      } else {
        firstError ??= result.reason;
        patchSlot(id, { status: "error", errorCode: result.reason instanceof ApiError ? result.reason.errorCode : undefined });
      }
    });
    if (firstError !== null) {
      toast.error(toErrorMessage(firstError, t("images.failed")));
      return null;
    }
    return form.images.map((slot) => (slot.status === "done" ? slot.url : (urlById.get(slot.id) as string)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setShowErrors(true);
    if (ratingMissing || titleHasLink || contentHasLink || nothingChanged) return;

    submittingRef.current = true;
    setSubmitting(true);
    setServerLinkError(false);
    try {
      const urls = await uploadPendingPhotos();
      if (urls === null) return;
      const path = target.mode === "create" ? "/api/reviews" : `/api/reviews/${encodeURIComponent(target.review.id)}`;
      const body =
        target.mode === "create"
          ? {
              orderItemId: target.item.orderItemId,
              rating: form.rating,
              ...(form.title.trim() && { title: form.title.trim() }),
              ...(form.content.trim() && { content: form.content.trim() }),
              ...(form.fit && { fit: form.fit }),
              ...(urls.length > 0 && { images: urls }),
            }
          : changesFor(urls);
      const res = await apiFetch<{ data: AuthorReview }>(path, {
        method: target.mode === "create" ? "POST" : "PATCH",
        body,
        raw: true,
      });
      toast.success(target.mode === "create" ? tToast("created") : tToast("updated"));
      onSaved(res.data);
    } catch (err) {
      const code = err instanceof ApiError ? err.errorCode : undefined;
      const fallback = tToast("saveFailed");
      if (code === CODE_LINK) {
        setServerLinkError(true);
      } else if (code === CODE_IMAGE_INVALID) {
        /* A photo the BE does not know as the customer's own: drop them all so they can be uploaded again */
        setForm((f) => ({ ...f, images: [] }));
        setNotice(null);
        toast.error(toErrorMessage(err, fallback));
      } else if (code === CODE_ALREADY_EXISTS) {
        toast.info(toErrorMessage(err, fallback));
        onAlreadyReviewed?.();
        onClose();
      } else if (code === CODE_NOT_ALLOWED || code === CODE_EDIT_NOT_ALLOWED) {
        toast.error(toErrorMessage(err, fallback));
        onStale?.();
        onClose();
      } else {
        toast.error(toErrorMessage(err, fallback));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  const productName = target.mode === "create" ? target.item.productName : (target.review.product?.name ?? "");
  const productImage = target.mode === "create" ? target.item.productImage : (target.review.product?.image ?? "");
  const variant =
    target.mode === "create" ? [target.item.size, target.item.color] : [target.review.size, target.review.color];
  const linkMessage = t("errors.link");

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(10,10,8,0.5)] backdrop-blur-[2px] sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-form-title"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--bg-primary)] shadow-xl sm:max-h-[90dvh] sm:max-w-[560px] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-6 sm:py-4">
          <h2 id="review-form-title" className="m-0 min-w-0 font-display text-xl font-normal tracking-[-0.04em] text-[var(--text-heading)]">
            {isEdit ? t("titleEdit") : t("titleCreate")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("close")}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-3">
              {productImage && (
                // eslint-disable-next-line @next/next/no-img-element -- small product thumbnail from the /media proxy
                <img src={toMediaUrl(productImage)} alt="" className="h-16 w-12 shrink-0 rounded-sm object-cover" />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="line-clamp-2 font-primary text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                  {productName}
                </span>
                <span className="font-primary text-xs text-[var(--text-muted)]">{variant.filter(Boolean).join(" · ")}</span>
              </div>
            </div>

            {isEdit && original && (
              <div
                role="note"
                className="flex items-start gap-2.5 rounded-md border border-[rgba(201,169,110,0.4)] bg-[rgba(201,169,110,0.08)] p-3 font-primary text-xs leading-[150%] text-[var(--text-secondary)]"
              >
                <Info size={15} className="mt-0.5 shrink-0 text-[var(--text-accent)]" aria-hidden="true" />
                <span>
                  {t("editWarning")}
                  {original.editableUntil && (
                    <>
                      {" "}
                      {t("editableUntil", { date: format.dateTime(new Date(original.editableUntil), "short") })}
                    </>
                  )}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className={FIELD_LABEL_CLASS}>
                {t("rating.label")} <span className="text-[var(--accent-rose)]">*</span>
              </span>
              <StarPicker value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} invalid={showErrors && ratingMissing} />
              {showErrors && ratingMissing && (
                <span role="alert" className="font-primary text-xs text-[var(--accent-rose)]">
                  {t("errors.rating")}
                </span>
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>{t("title.label")}</span>
              <input
                type="text"
                value={form.title}
                maxLength={REVIEW_LIMITS.titleMax}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("title.placeholder")}
                aria-invalid={titleHasLink}
                className={INPUT_CLASS}
              />
              {titleHasLink && (
                <span role="alert" className="font-primary text-xs text-[var(--accent-rose)]">
                  {linkMessage}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>{t("content.label")}</span>
              <textarea
                rows={5}
                value={form.content}
                maxLength={REVIEW_LIMITS.contentMax}
                onChange={(e) => {
                  setServerLinkError(false);
                  setForm((f) => ({ ...f, content: e.target.value }));
                }}
                placeholder={t("content.placeholder")}
                aria-invalid={contentHasLink || serverLinkError}
                className={`${INPUT_CLASS} resize-y`}
              />
              <span className="flex flex-wrap items-start justify-between gap-2 font-primary text-xs">
                {contentHasLink || serverLinkError ? (
                  <span role="alert" className="text-[var(--accent-rose)]">
                    {linkMessage}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-[var(--text-muted)] tabular-nums">
                  {t("content.counter", { count: form.content.length, max: REVIEW_LIMITS.contentMax })}
                </span>
              </span>
            </label>

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className={`${FIELD_LABEL_CLASS} mb-2 p-0`}>
                {t("fit.label")} <span className="font-normal normal-case tracking-normal text-[var(--text-muted)]">{t("fit.optional")}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {REVIEW_FITS.map((fit) => {
                  const selected = form.fit === fit;
                  /* A saved fit can be changed but not cleared: the BE has no way to unset it */
                  const locked = selected && original?.fit != null;
                  return (
                    <button
                      key={fit}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setForm((f) => ({ ...f, fit: selected && !locked ? null : (fit as ReviewFit) }))}
                      className={`min-h-9 cursor-pointer rounded-full border px-4 font-primary text-xs font-medium transition-colors pointer-coarse:min-h-11 motion-reduce:transition-none ${
                        selected
                          ? "border-[var(--accent-primary)] bg-[rgba(201,169,110,0.1)] text-[var(--accent-primary)]"
                          : "border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                      }`}
                    >
                      {tFit(fit)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <span className={FIELD_LABEL_CLASS}>{t("images.label")}</span>
              <ReviewImageUploader
                slots={form.images}
                notice={notice}
                disabled={submitting}
                onPick={handlePick}
                onRemove={handleRemove}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--border-subtle)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
            {nothingChanged && showErrors && (
              <span role="alert" className="font-primary text-xs text-[var(--accent-rose)]">
                {t("noChanges")}
              </span>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="min-h-11 cursor-pointer rounded-full border border-[var(--border-light)] bg-transparent px-5 font-primary text-sm text-[var(--text-secondary)] disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                aria-disabled={blocked}
                className={`min-h-11 cursor-pointer rounded-full border-0 bg-[var(--accent-primary)] px-6 font-primary text-sm font-medium text-[var(--text-on-gold)] shadow-[var(--shadow-gold-sm)] hover:opacity-90 disabled:cursor-wait disabled:opacity-60 ${
                  blocked && !submitting ? "opacity-60" : ""
                }`}
              >
                {submitting ? t("submitting") : isEdit ? t("submitEdit") : t("submitCreate")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
