"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { moneyOf } from "@/src/lib/money";
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
import { rejectRefund } from "../_common/moduleSlice";
import { REFUND_NOTE_MAX } from "../_common/constants";
import type { Refund } from "../_common/types";

interface RejectRefundModalProps {
  refund: Refund;
  onClose: () => void;
  onDone: () => void;
}

/** "The shop will not refund this": the reason is required and kept for later checks (the customer does not see it) */
export default function RejectRefundModal({ refund, onClose, onDone }: RejectRefundModalProps) {
  const t = useTranslations("admin.refunds.reject");
  const { format: formatMoney } = useMoney();
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.refunds.isUpdating);

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError(t("errors.note"));
      return;
    }
    setError(null);
    try {
      await dispatch(rejectRefund({ refundId: refund.id, note: note.trim() })).unwrap();
      toast.success(t("toast.done", { id: refund.orderId }));
      onDone();
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.failed")));
    }
  };

  return (
    <ModalShell title={t("title")} onClose={onClose} maxWidthClass="max-w-150">
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <ModalBody>
          <p className="m-0 text-sm font-primary text-[var(--text-secondary)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
            {t("warning", { id: refund.orderId, amount: formatMoney(moneyOf(refund, "amount")) })}
          </p>
          <FormSection>
            <FormField label={t("note.label")} required info={t("note.info")}>
              <textarea
                className={`${inputClass} resize-y`}
                rows={3}
                value={note}
                maxLength={REFUND_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
              />
              {error && <span className="text-xs text-[var(--accent-rose)] font-primary">{error}</span>}
            </FormField>
          </FormSection>
        </ModalBody>

        <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("submit")} />
      </form>
    </ModalShell>
  );
}
