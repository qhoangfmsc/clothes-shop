"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { ArrowLeft, MessageSquare, Package, Undo2 } from "lucide-react";
import { Link } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import OrderThumb from "../../orders/_components/OrderThumb";
import { CUSTOMER_CANCELLABLE_STATUSES, type ReturnRequest } from "../_common/types";
import ReturnProgress from "../_components/ReturnProgress";
import ReturnStatusBadge from "../_components/ReturnStatusBadge";

const ease = [0.25, 0.1, 0.25, 1] as const;

const SHELL_CLASS = "min-h-screen pt-[7.5rem] pb-16 bg-[var(--bg-primary)]";
const WRAP_CLASS = "max-w-[45rem] mx-auto px-4 sm:px-6";
const CARD_CLASS =
  "p-5 sm:p-6 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]";
const CARD_TITLE_CLASS =
  "m-0 mb-4 flex items-center gap-2 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium";

export default function ReturnDetailContent() {
  const t = useTranslations("private.returns.detail");
  const tReason = useTranslations("private.returns.reason");
  const { toast } = useToast();
  const toErrorMessage = useErrorMessage();
  const confirm = useConfirm();
  const format = useFormatter();
  const { fmt } = useMoney();
  const params = useParams<{ returnId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { apiFetch } = useApiAuth();
  const [request, setRequest] = useState<ReturnRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!params.returnId) return;
    try {
      const res = await apiFetch<{ data: ReturnRequest }>(`/api/returns/${encodeURIComponent(params.returnId)}`);
      setRequest(res.data ?? null);
    } catch (err) {
      /* 1801 (not found) is translated by `useErrorMessage`; the page then shows its own "not found" state */
      toast.error(toErrorMessage(err, t("toast.loadFailed")));
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, params.returnId, t, toast, toErrorMessage]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  if (authLoading || isLoading) {
    return (
      <main className={SHELL_CLASS}>
        <div className={WRAP_CLASS}>
          <div className="h-[20rem] rounded-lg bg-[var(--color-champagne-cream)] animate-[checkout-shimmer_1.5s_ease_infinite] motion-reduce:animate-none" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={SHELL_CLASS}>
        <UnauthenticatedState />
      </main>
    );
  }

  if (!request) {
    return (
      <main className={SHELL_CLASS}>
        <div className={`${WRAP_CLASS} flex flex-col items-center gap-4 py-16`}>
          <p className="m-0 font-primary text-[var(--text-muted)]">{t("notFound")}</p>
          <Link
            href="/returns"
            className="inline-flex items-center min-h-11 font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium"
          >
            {t("back")}
          </Link>
        </div>
      </main>
    );
  }

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(request.status);
  const received = request.status === "RECEIVED" || request.status === "REFUNDED";
  /* The shop's reply means "how to send the parcel" while approved and "why not" when rejected */
  const noteTitle =
    request.status === "APPROVED"
      ? t("adminNote.approved")
      : request.status === "REJECTED"
        ? t("adminNote.rejected")
        : t("adminNote.other");

  const handleCancel = async () => {
    const ok = await confirm({
      title: t("cancel.confirm.title"),
      message: t("cancel.confirm.message"),
      confirmLabel: t("cancel.confirm.confirm"),
      danger: true,
    });
    if (!ok) return;
    setIsCancelling(true);
    try {
      const res = await apiFetch<{ data: ReturnRequest }>(`/api/returns/${encodeURIComponent(request.id)}/cancel`, {
        method: "PATCH",
      });
      if (res.data) setRequest(res.data);
      toast.success(t("cancel.done"));
    } catch (err) {
      /* 1804: the state changed meanwhile (the shop approved or received it): show the real state */
      toast.error(toErrorMessage(err, t("cancel.failed")));
      load();
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <main className={SHELL_CLASS}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [...ease] }}
        className={`${WRAP_CLASS} flex flex-col gap-6`}
      >
        <Link
          href="/returns"
          className="inline-flex items-center gap-2 min-h-11 self-start font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-primary)] motion-reduce:transition-none"
        >
          <ArrowLeft size={16} />
          {t("back")}
        </Link>

        {/* Status + progress */}
        <section className={`${CARD_CLASS} flex flex-col gap-5`}>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="m-0 font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em] leading-tight">
                {t("title")}
              </h1>
              <ReturnStatusBadge status={request.status} />
            </div>
            <p className="m-0 font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em] leading-[150%]">
              {t(`hint.${request.status}`)}
            </p>
            <p className="m-0 font-primary text-[0.6875rem] text-[var(--text-disabled)] tracking-[0.02em] break-all">
              {format.dateTime(new Date(request.createdAt), "dateTime")} · {t("returnNumber", { id: request.id })} ·{" "}
              <Link href={`/orders/${encodeURIComponent(request.orderId)}`} className="text-inherit underline underline-offset-2">
                {t("orderNumber", { id: request.orderId })}
              </Link>
            </p>
          </div>
          <ReturnProgress status={request.status} />
        </section>

        {/* The shop's reply */}
        {request.adminNote && (
          <section className={CARD_CLASS}>
            <h2 className={CARD_TITLE_CLASS}>
              <MessageSquare size={16} /> {noteTitle}
            </h2>
            <p className="m-0 font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] leading-[160%] whitespace-pre-line break-words">
              {request.adminNote}
            </p>
          </section>
        )}

        {/* Lines */}
        <section className={CARD_CLASS}>
          <h2 className={CARD_TITLE_CLASS}>
            <Package size={16} /> {t("items")}
          </h2>
          <ul className="m-0 p-0 list-none flex flex-col gap-4">
            {request.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <OrderThumb src={item.productImage ?? ""} alt={item.productName ?? ""} />
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="font-primary text-sm text-[var(--text-primary)] font-medium tracking-[-0.02em] line-clamp-2">
                    {item.productName}
                  </span>
                  <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                    {[item.size, item.color].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className="shrink-0 text-right font-primary text-xs text-[var(--text-secondary)] tracking-[-0.02em]">
                  {t("quantity", { quantity: item.quantity })}
                  {received && item.acceptedQuantity !== null && (
                    <>
                      <br />
                      <span className="text-[var(--text-heading)] font-medium">
                        {t("accepted", { quantity: item.acceptedQuantity })}
                      </span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <dl className="m-0 mt-5 pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-1.5 font-primary text-sm tracking-[-0.02em]">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">{t("reason")}</dt>
              <dd className="m-0 text-right text-[var(--text-primary)]">{tReason(request.reason)}</dd>
            </div>
            {request.note && (
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--text-muted)]">{t("note")}</dt>
                <dd className="m-0 text-right text-[var(--text-primary)] break-words min-w-0">{request.note}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Refund */}
        {request.refund && (
          <section className={CARD_CLASS}>
            <h2 className={CARD_TITLE_CLASS}>
              <Undo2 size={16} /> {t("refund.title")}
            </h2>
            <div className="flex flex-col gap-1">
              <span
                className={`font-primary text-sm font-medium tracking-[-0.02em] ${
                  request.refund.status === "COMPLETED"
                    ? "text-[var(--accent-sage)]"
                    : request.refund.status === "REJECTED"
                      ? "text-[var(--color-deep-rose)]"
                      : "text-[var(--text-primary)]"
                }`}
              >
                {request.refund.status === "COMPLETED"
                  ? t("refund.COMPLETED", { amount: fmt(request.refund, "amount") })
                  : request.refund.status === "REQUESTED"
                    ? t("refund.REQUESTED", { amount: fmt(request.refund, "amount") })
                    : t("refund.REJECTED")}
              </span>
              {request.refund.status === "COMPLETED" && request.refund.bankReference && (
                <span className="inline-flex items-center gap-1 font-primary text-xs text-[var(--text-secondary)] tracking-[-0.02em]">
                  {t("refund.reference", { ref: request.refund.bankReference })}
                  <CopyButton value={request.refund.bankReference} label={t("refund.referenceLabel")} />
                </span>
              )}
              {request.refund.processedAt && (
                <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                  {t("refund.processedAt", { date: format.dateTime(new Date(request.refund.processedAt), "dateTime") })}
                </span>
              )}
            </div>
          </section>
        )}

        {canCancel && (
          <section className={`${CARD_CLASS} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
            <p className="m-0 font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em] leading-[150%]">
              {t("cancel.hint")}
            </p>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="shrink-0 inline-flex items-center justify-center min-h-11 py-2.5 px-6 rounded-full border border-[var(--color-deep-rose)] bg-transparent text-[var(--color-deep-rose)] font-primary text-xs font-medium tracking-[0.08em] uppercase cursor-pointer hover:bg-[var(--color-rose-milk)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCancelling ? t("cancel.cancelling") : t("cancel.action")}
            </button>
          </section>
        )}
      </motion.div>
    </main>
  );
}
