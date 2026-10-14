"use client";

import { useRef } from "react";
import { CircleAlert, ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { REVIEW_LIMITS } from "@/src/types/review";
import { REVIEW_IMAGE_ACCEPT, REVIEW_IMAGE_MAX_MB } from "../_common/constants";
import type { ImageSlot } from "../_common/types";

interface ReviewImageUploaderProps {
  slots: ImageSlot[];
  /** Why the last picked files were refused (type, size, count) */
  notice: string | null;
  disabled?: boolean;
  onPick: (files: File[]) => void;
  onRemove: (id: string) => void;
}

/** Photo area of the review form: thumbnails with a spinner while uploading, remove / retry per photo, and the add button */
export default function ReviewImageUploader({ slots, notice, disabled = false, onPick, onRemove }: ReviewImageUploaderProps) {
  const t = useTranslations("shared.reviews.form.images");
  const toErrorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const full = slots.length >= REVIEW_LIMITS.imagesMax;
  const failed = slots.find((slot) => slot.status === "error");

  return (
    <div className="flex flex-col gap-2">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {slots.map((slot, index) => (
          <li key={slot.id} className="relative size-20">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL or /media proxy, no optimisation needed */}
            <img src={slot.preview} alt="" className="size-full rounded-md border border-[var(--border-subtle)] object-cover" />
            {slot.status === "uploading" && (
              <span
                role="status"
                aria-label={t("uploading")}
                className="absolute inset-0 flex items-center justify-center rounded-md bg-[rgba(10,10,8,0.45)] text-white"
              >
                <Loader2 size={22} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              </span>
            )}
            {slot.status === "error" && (
              <span
                role="img"
                aria-label={t("failedPhoto", { index: index + 1 })}
                className="absolute inset-0 flex items-center justify-center rounded-md border-2 border-[var(--accent-rose)] bg-[rgba(10,10,8,0.55)] text-white"
              >
                <CircleAlert size={20} aria-hidden="true" />
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(slot.id)}
              disabled={disabled}
              aria-label={t("remove", { index: index + 1 })}
              className="absolute -right-2 -top-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] shadow-[var(--shadow-sm)] pointer-coarse:size-8"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}

        {!full && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[var(--border-light)] bg-transparent font-primary text-[11px] text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              <ImagePlus size={20} aria-hidden="true" />
              {t("add")}
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept={REVIEW_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          /* Lets the same file be chosen again after removing it */
          e.target.value = "";
        }}
      />

      <p className="m-0 font-primary text-xs leading-[150%] text-[var(--text-muted)] tracking-[-0.02em]">
        {t("hint", { count: slots.length, max: REVIEW_LIMITS.imagesMax, size: REVIEW_IMAGE_MAX_MB })}
      </p>
      {notice && (
        <p role="alert" className="m-0 font-primary text-xs text-[var(--accent-rose)]">
          {notice}
        </p>
      )}
      {failed && (
        <p role="alert" className="m-0 font-primary text-xs text-[var(--accent-rose)]">
          {toErrorMessage({ errorCode: failed.errorCode }, t("failed"))}
        </p>
      )}
    </div>
  );
}
