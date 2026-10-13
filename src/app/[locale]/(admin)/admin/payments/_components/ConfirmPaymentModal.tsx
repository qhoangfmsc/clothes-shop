"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import {
  ModalShell,
  ModalBody,
  FormSection,
  FormField,
  FormActions,
  inputClass,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { confirmOrderPayment } from "../_common/moduleSlice";
import {
  AMOUNT_MISMATCH_CODE,
  CONFIRM_NOTE_MAX,
  CONFIRM_REFERENCE_MAX,
  CONFIRM_TRANSFER_CONTENT_MAX,
} from "../_common/constants";
import {
  MANUAL_CONFIRM_PROVIDERS,
  type ConfirmPaymentInput,
  type ManualConfirmProvider,
  type PaymentTransaction,
} from "../_common/types";
import OrderPicker from "./OrderPicker";
import VerificationBadge from "./VerificationBadge";

interface ConfirmPaymentModalProps {
  /** A bank transaction to attach to an order. Absent = record one the webhook never delivered. */
  transaction?: PaymentTransaction;
  /** The order is already known (opened from the order itself): no picker */
  fixedOrderId?: string;
  /** The code is known (opened from a row of the lookup): it is filled in and cannot be edited */
  lockedTransferCode?: string;
  /** Suggested amount in VND (the amount of the session that carries the code) */
  defaultAmount?: number;
  onClose: () => void;
  onConfirmed: () => void;
}

type FieldErrors = Partial<Record<"order" | "transferCode" | "amount" | "note", string>>;

/** The BE turns a wrong amount into error 1710 whose message says what was received and what was expected */
function isAmountMismatch(err: unknown): err is { message: string } {
  const { code, errorCode } = (err ?? {}) as { code?: string; errorCode?: number };
  return code === String(AMOUNT_MISMATCH_CODE) || errorCode === AMOUNT_MISMATCH_CODE;
}

/** Marks an order as paid: attach a bank transaction, or enter one by hand. A wrong amount asks again. */
export default function ConfirmPaymentModal({
  transaction,
  fixedOrderId,
  lockedTransferCode,
  defaultAmount,
  onClose,
  onConfirmed,
}: ConfirmPaymentModalProps) {
  const t = useTranslations("admin.payments.confirm");
  const format = useFormatter();
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.payments.isUpdating);

  const [orderId, setOrderId] = useState<string | null>(fixedOrderId ?? null);
  const [transferCode, setTransferCode] = useState(lockedTransferCode ?? "");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [showMore, setShowMore] = useState(false);
  const [reference, setReference] = useState("");
  /* "" = let the BE choose (sepay with a reference, manual without) */
  const [provider, setProvider] = useState<ManualConfirmProvider | "">("");
  const [transferContent, setTransferContent] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    if (!orderId) found.order = t("errors.order");
    if (!transaction) {
      if (!transferCode.trim()) found.transferCode = t("errors.transferCode");
      if (!/^[1-9]\d*$/.test(amount.trim())) found.amount = t("errors.amount");
    }
    if (!note.trim()) found.note = t("errors.note");
    return found;
  };

  const buildInput = (acceptAmountMismatch: boolean): ConfirmPaymentInput => {
    const common = {
      orderId: orderId as string,
      note: note.trim(),
      ...(acceptAmountMismatch ? { acceptAmountMismatch: true } : {}),
    };
    if (transaction) return { ...common, transactionId: transaction.id };
    return {
      ...common,
      transferCode: transferCode.trim().toUpperCase(),
      amount: Number(amount),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(provider ? { provider } : {}),
      ...(transferContent.trim() ? { transferContent: transferContent.trim() } : {}),
    };
  };

  const submit = async (acceptAmountMismatch: boolean) => {
    try {
      await dispatch(confirmOrderPayment(buildInput(acceptAmountMismatch))).unwrap();
      toast.success(t("toast.confirmed", { id: orderId as string }));
      onConfirmed();
    } catch (err) {
      if (!acceptAmountMismatch && isAmountMismatch(err)) {
        /* The BE message names the amount received and the amount expected: show it as it is */
        const proceed = await confirm({
          title: t("mismatch.title"),
          message: err.message,
          confirmLabel: t("mismatch.confirm"),
          danger: true,
        });
        if (proceed) await submit(true);
        return;
      }
      toast.error(toErrorMessage(err, t("toast.failed")));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await submit(false);
  };

  const fieldError = (key: keyof FieldErrors) =>
    errors[key] ? <span className="text-xs text-[var(--accent-rose)] font-primary">{errors[key]}</span> : null;

  return (
    <ModalShell title={transaction ? t("titleAttach") : t("titleManual")} onClose={onClose} maxWidthClass="max-w-150">
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <ModalBody>
          {transaction && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-1.5 text-xs font-primary text-[var(--text-secondary)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {format.number(transaction.amount, "vnd")}
                </span>
                <VerificationBadge status={transaction.verificationStatus} />
              </div>
              <span className="break-all">{transaction.transferContent || "—"}</span>
              <span className="text-[var(--text-muted)]">
                {transaction.providerTransactionId} · {format.dateTime(new Date(transaction.receivedAt), "dateTime")}
              </span>
            </div>
          )}

          <FormSection title={t("order.section")}>
            {fixedOrderId ? (
              <code className="text-sm font-mono font-semibold text-[var(--text-primary)]">#{fixedOrderId}</code>
            ) : (
              <FormField label={t("order.label")} required info={t("order.info")}>
                <OrderPicker value={orderId} onChange={(order) => setOrderId(order.id)} />
                {fieldError("order")}
              </FormField>
            )}
          </FormSection>

          {!transaction && (
            <FormSection title={t("manual.section")}>
              <FormField label={t("manual.transferCode")} required info={t("manual.transferCodeInfo")}>
                <input
                  className={`${inputClass} font-mono uppercase`}
                  value={transferCode}
                  readOnly={Boolean(lockedTransferCode)}
                  onChange={(e) => setTransferCode(e.target.value)}
                />
                {fieldError("transferCode")}
              </FormField>
              <FormField label={t("manual.amount")} required info={t("manual.amountInfo")}>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {fieldError("amount")}
              </FormField>

              <button
                type="button"
                onClick={() => setShowMore((prev) => !prev)}
                aria-expanded={showMore}
                className="self-start inline-flex items-center gap-1.5 bg-transparent border-0 p-0 pointer-coarse:min-h-11 font-primary text-xs font-semibold text-[var(--accent-primary)] cursor-pointer hover:underline"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-150 ${showMore ? "rotate-180" : ""}`}
                />
                {t("manual.more")}
              </button>
              {showMore && (
                <>
                  <FormField label={t("manual.reference")} info={t("manual.referenceInfo")}>
                    <input
                      className={inputClass}
                      value={reference}
                      maxLength={CONFIRM_REFERENCE_MAX}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </FormField>
                  <FormField label={t("manual.provider")} info={t("manual.providerInfo")}>
                    <select
                      className={inputClass}
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as ManualConfirmProvider | "")}
                    >
                      <option value="">{t("manual.providers.auto")}</option>
                      {MANUAL_CONFIRM_PROVIDERS.map((p) => (
                        <option key={p} value={p}>
                          {t(`manual.providers.${p}`)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={t("manual.transferContent")} info={t("manual.transferContentInfo")}>
                    <input
                      className={inputClass}
                      value={transferContent}
                      maxLength={CONFIRM_TRANSFER_CONTENT_MAX}
                      onChange={(e) => setTransferContent(e.target.value)}
                    />
                  </FormField>
                </>
              )}
            </FormSection>
          )}

          <FormSection>
            <FormField label={t("note.label")} required info={t("note.info")}>
              <textarea
                className={`${inputClass} resize-y`}
                rows={3}
                value={note}
                maxLength={CONFIRM_NOTE_MAX}
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
