"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
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
import { completeRefund } from "../_common/moduleSlice";
import { REFUND_NOTE_MAX, REFUND_REFERENCE_MAX } from "../_common/constants";
import type { Refund } from "../_common/types";
import RefundPaymentSource from "./RefundPaymentSource";

interface CompleteRefundModalProps {
  refund: Refund;
  onClose: () => void;
  onDone: () => void;
}

type FieldErrors = Partial<Record<"reference" | "note", string>>;

/** "I transferred the money back": records the bank reference. Transfer first, then confirm here. */
export default function CompleteRefundModal({ refund, onClose, onDone }: CompleteRefundModalProps) {
  const t = useTranslations("admin.refunds.complete");
  const format = useFormatter();
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.refunds.isUpdating);

  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: FieldErrors = {};
    if (!reference.trim()) found.reference = t("errors.reference");
    if (!note.trim()) found.note = t("errors.note");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await dispatch(completeRefund({ refundId: refund.id, reference: reference.trim(), note: note.trim() })).unwrap();
      toast.success(t("toast.done", { id: refund.orderId }));
      onDone();
    } catch (err) {
      /* 1713 (already handled by another admin) and 1714 (reference already used) have their own translations */
      toast.error(toErrorMessage(err, t("toast.failed")));
    }
  };

  const fieldError = (key: keyof FieldErrors) =>
    errors[key] ? <span className="text-xs text-[var(--accent-rose)] font-primary">{errors[key]}</span> : null;

  return (
    <ModalShell title={t("title")} onClose={onClose} maxWidthClass="max-w-150">
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <ModalBody>
          <p className="m-0 text-sm font-primary text-[var(--text-secondary)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
            {t("warning")}
          </p>

          <FormSection title={t("refundSection")}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("amount")}</span>
              <span className="text-lg font-semibold text-[var(--text-primary)] font-primary">
                {format.number(refund.amount, "vnd")}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("order")}</span>
              <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">#{refund.orderId}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("customer")}</span>
              <span className="text-sm text-[var(--text-primary)] font-primary text-right">
                {[refund.order.customer?.fullName, refund.order.customer?.phone].filter(Boolean).join(" · ") || "—"}
              </span>
            </div>
          </FormSection>

          <FormSection title={t("sourceSection")}>
            <RefundPaymentSource payment={refund.payment} />
          </FormSection>

          <FormSection>
            <FormField label={t("reference.label")} required info={t("reference.info")}>
              <input
                className={`${inputClass} font-mono`}
                value={reference}
                maxLength={REFUND_REFERENCE_MAX}
                onChange={(e) => setReference(e.target.value)}
              />
              {fieldError("reference")}
            </FormField>
            <FormField label={t("note.label")} required info={t("note.info")}>
              <textarea
                className={`${inputClass} resize-y`}
                rows={3}
                value={note}
                maxLength={REFUND_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
              />
              {fieldError("note")}
            </FormField>
          </FormSection>
        </ModalBody>

        <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("submit")} />
      </form>
    </ModalShell>
  );
}
