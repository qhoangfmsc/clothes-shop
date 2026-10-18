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
import { receiveReturn } from "../_common/moduleSlice";
import { RETURN_NOTE_MAX } from "../_common/constants";
import type { ReturnRequest } from "../_common/types";

interface ReceiveReturnModalProps {
  request: ReturnRequest;
  onClose: () => void;
  onDone: (request: ReturnRequest) => void;
}

/** The parcel arrived: the admin sets how many of each line passed the check, and whether the shipping fee goes back too.
 *  The BE prices the refund from this and opens the refund request. */
export default function ReceiveReturnModal({ request, onClose, onDone }: ReceiveReturnModalProps) {
  const t = useTranslations("admin.returns.receive");
  const { format: formatMoney } = useMoney();
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.returns.isUpdating);

  /* Text while typing; each line starts at everything the customer asked to return */
  const [accepted, setAccepted] = useState<Record<string, string>>(() =>
    Object.fromEntries(request.items.map((item) => [item.id, String(item.quantity)]))
  );
  const [refundShipping, setRefundShipping] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ items?: string; note?: string }>({});

  const parsed = request.items.map((item) => {
    const text = accepted[item.id]?.trim() ?? "";
    const value = /^\d+$/.test(text) ? Number(text) : NaN;
    return { item, value, valid: Number.isInteger(value) && value >= 0 && value <= item.quantity };
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: { items?: string } = {};
    if (parsed.some((line) => !line.valid)) found.items = t("errors.invalid");
    else if (parsed.every((line) => line.value === 0)) found.items = t("errors.allZero");
    setErrors(found);
    if (found.items) return;

    try {
      const updated = await dispatch(
        receiveReturn({
          returnId: request.id,
          items: parsed.map((line) => ({ returnItemId: line.item.id, acceptedQuantity: line.value })),
          ...(refundShipping ? { refundShipping: true } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        })
      ).unwrap();
      toast.success(
        updated.refund
          ? t("toast.doneWithAmount", { id: request.id, amount: formatMoney(moneyOf(updated.refund, "amount")) })
          : t("toast.done", { id: request.id })
      );
      onDone(updated);
    } catch (err) {
      /* 1805 (bad data, or the shipping fee was already refunded) and 1712 (another refund is waiting) carry the BE's own text */
      toast.error(toErrorMessage(err, t("toast.failed")));
    }
  };

  return (
    <ModalShell title={t("title")} onClose={onClose} maxWidthClass="max-w-150">
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <ModalBody>
          <p className="m-0 text-sm font-primary text-[var(--text-secondary)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
            {t("warning")}
          </p>

          <FormSection title={t("items.section")}>
            <ul className="m-0 p-0 list-none flex flex-col gap-3">
              {parsed.map(({ item, valid }) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-semibold font-primary text-[var(--text-primary)] break-words">
                      {item.productName}
                    </span>
                    <span className="text-xs font-primary text-[var(--text-muted)]">
                      {[item.size, item.color].filter(Boolean).join(" · ")} · {t("items.asked", { quantity: item.quantity })}
                    </span>
                  </div>
                  <input
                    className={`${inputClass} !w-20 text-center ${valid ? "" : "!border-[var(--accent-rose)]"}`}
                    inputMode="numeric"
                    aria-label={t("items.accepted", { name: item.productName ?? "" })}
                    value={accepted[item.id] ?? ""}
                    onChange={(e) => setAccepted((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                </li>
              ))}
            </ul>
            {errors.items && <span className="text-xs text-[var(--accent-rose)] font-primary">{errors.items}</span>}
          </FormSection>

          <FormSection>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={refundShipping}
                onChange={(e) => setRefundShipping(e.target.checked)}
                className="mt-0.5 w-4 h-4 pointer-coarse:w-5 pointer-coarse:h-5 accent-[var(--accent-primary)]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold font-primary text-[var(--text-primary)]">
                  {t("shipping.label")}
                  {request.order && (
                    <span className="font-normal text-[var(--text-muted)]">
                      {" "}
                      ({formatMoney(moneyOf(request.order, "shippingFee"))})
                    </span>
                  )}
                </span>
                <span className="text-xs font-primary text-[var(--text-muted)]">{t("shipping.info")}</span>
              </span>
            </label>
            <FormField label={t("note.label")} info={t("note.info")}>
              <textarea
                className={`${inputClass} resize-y`}
                rows={3}
                value={note}
                maxLength={RETURN_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
              />
            </FormField>
          </FormSection>
        </ModalBody>
        <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("submit")} />
      </form>
    </ModalShell>
  );
}
