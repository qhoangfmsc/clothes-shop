"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { ArrowLeft, CheckCircle, MapPin, PenLine, QrCode, Undo2 } from "lucide-react";
import { Link, useRouter } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useOrderStatusLabel } from "@/src/i18n/use-labels";
import { useShippingMethodName } from "@/src/hooks/use-api";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import type { OrderStatus } from "@/src/types/enums";
import { SHIPPING_METHOD_IDS, type ShippingMethodId } from "@/src/types/shipping";
import { CONTACT_ADDRESS, CONTACT_MAPS_URL } from "@/src/lib/contact";
import { STATUS_CONFIG } from "../_common/constants";
import type { Order } from "../_common/types";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import OrderThumb from "../_components/OrderThumb";
import OrderReturnCard from "../../returns/_components/OrderReturnCard";
import ReviewFormModal from "../../reviews/_components/ReviewFormModal";
import { useDeadlineLabel } from "../../reviews/_common/use-deadline-label";
import { usePendingReviews, useRefreshReviewData } from "../../reviews/_common/use-pending-reviews";
import type { PendingReviewItem } from "@/src/types/review";

const ease = [0.25, 0.1, 0.25, 1] as const;

const SHELL_CLASS = "min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]";
const WRAP_CLASS = "max-w-[1080px] mx-auto px-4 sm:px-6";
const CARD_CLASS =
  "p-5 sm:p-6 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]";
const CARD_TITLE_CLASS =
  "m-0 mb-4 flex items-center gap-2 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium";

export default function OrderDetailContent() {
  const t = useTranslations("private.orders.detail");
  const { toast } = useToast();
  const toErrorMessage = useErrorMessage();
  const format = useFormatter();
  const { fmt } = useMoney();
  const statusLabel = useOrderStatusLabel();
  const shippingMethodName = useShippingMethodName();
  const params = useParams<{ orderId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { apiFetch } = useApiAuth();
  const confirm = useConfirm();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();
  /* Which lines can still be reviewed comes from the BE's own list, never from the order status alone */
  const pendingReviews = usePendingReviews();
  const refreshReviewData = useRefreshReviewData();
  const deadlineLabel = useDeadlineLabel();
  const [reviewTarget, setReviewTarget] = useState<PendingReviewItem | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !params.orderId) return;

    const fetchOrder = async () => {
      try {
        const res = await apiFetch<{ data: Order }>(`/api/orders/${params.orderId}`);
        setOrder(res.data ?? null);
      } catch (err) {
        toast.error(toErrorMessage(err, t("toast.loadFailed")));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [isAuthenticated, params.orderId, apiFetch, t, toast, toErrorMessage]);

  if (authLoading || isLoading) {
    return (
      <main className={SHELL_CLASS}>
        <div className={WRAP_CLASS}>
          <div className="h-[360px] rounded-lg bg-[var(--color-champagne-cream)] animate-[checkout-shimmer_1.5s_ease_infinite] motion-reduce:animate-none" />
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

  if (!order) {
    return (
      <main className={SHELL_CLASS}>
        <div className={WRAP_CLASS}>
          <p className="py-16 text-center font-primary text-[var(--text-muted)]">{t("notFound")}</p>
        </div>
      </main>
    );
  }

  const status = (order.status in STATUS_CONFIG ? order.status : "pending") as OrderStatus;
  const { color, icon: StatusIcon } = STATUS_CONFIG[status];
  const address = order.shippingAddress ?? {};
  const hasAddress = Object.keys(address).length > 0;
  const methodId = SHIPPING_METHOD_IDS.find((id) => id === order.shippingMethod);
  const isPickup = methodId === "store-pickup";
  /* The name the admin configured; the translated label while the config loads or if the method was removed */
  const methodLabel = (id: ShippingMethodId | undefined) =>
    (id && shippingMethodName(id)) || (id ? t(`shippingMethod.${id}`) : order.shippingMethod);
  const shippingFree = order.shippingFeeVnd === 0;
  /* The order itself says whether it is paid; a cancelled order can no longer be paid */
  const isPaid = order.paymentStatus === "paid";
  /* Only a delivered / completed order has lines to review */
  const reviewable = order.status === "delivered" || order.status === "completed";
  const canPay = order.paymentStatus === "unpaid" && order.status !== "cancelled";
  const attempts = order.paymentAttempts ?? [];
  const refunds = order.refunds ?? [];
  /* Online cancel: only an unpaid pending order. A paid one (or any other open order) goes through the shop, which refunds it. */
  const canCancel = order.paymentStatus === "unpaid" && order.status === "pending";
  const contactShop = !canCancel && (order.status === "pending" || order.status === "confirmed" || order.status === "shipping");

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
      const res = await apiFetch<{ data: Order }>(`/api/orders/${encodeURIComponent(order.id)}/cancel`, { method: "PATCH" });
      if (res.data) setOrder(res.data);
      toast.success(t("cancel.done"));
    } catch (err) {
      /* 1307 (paid and already handed to the carrier): the server's own message is shown */
      toast.error(toErrorMessage(err, t("cancel.failed")));
    } finally {
      setIsCancelling(false);
    }
  };
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className={SHELL_CLASS}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [...ease] }}
        className={`${WRAP_CLASS} flex flex-col gap-6`}
      >
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 min-h-11 self-start font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-primary)] motion-reduce:transition-none"
        >
          <ArrowLeft size={16} />
          {t("back")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
          <div className="flex flex-col gap-6 min-w-0">
            {/* Status */}
            <section className={`${CARD_CLASS} flex items-start gap-4`}>
              <span
                className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-[color-mix(in_srgb,currentColor_12%,transparent)]"
                style={{ color }}
              >
                <StatusIcon size={22} />
              </span>
              <div className="min-w-0 flex flex-col gap-1">
                {/* Two separate facts: where the order is in the shop's process, and whether it is paid */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="m-0 font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em] leading-tight">
                    {statusLabel(order.status)}
                  </h1>
                  <OrderPaymentBadge status={order.paymentStatus} />
                </div>
                <p className="m-0 font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em] leading-[150%]">
                  {t(`statusHint.${status}`)}
                </p>
                <p className="m-0 mt-1 font-primary text-[11px] text-[var(--text-disabled)] tracking-[0.02em] break-all">
                  {format.dateTime(new Date(order.createdAt), "dateTime")} · {t("orderNumber", { id: order.id })}
                </p>
              </div>
            </section>

            {/* Payment (only while a payment is open or just confirmed) */}
            {(canPay || isPaid || attempts.length > 0) && (
              <section className={CARD_CLASS}>
                <h2 className={CARD_TITLE_CLASS}>
                  <QrCode size={16} /> {t("payment.title")}
                </h2>
                {canPay ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="m-0 font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em]">
                      {t("payment.awaiting")}
                    </p>
                    <Link
                      href={`/checkout/payment/${encodeURIComponent(order.id)}`}
                      className="inline-flex items-center justify-center min-h-11 py-2.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90"
                    >
                      {t("payment.pay")}
                    </Link>
                  </div>
                ) : isPaid ? (
                  <p className="m-0 flex items-center gap-2 font-primary text-sm text-[var(--accent-sage)] font-medium tracking-[-0.02em]">
                    <CheckCircle size={16} /> {t("payment.paid")}
                  </p>
                ) : null}

                {/* Every transfer content ever issued: a shopper may have paid one that has since expired */}
                {attempts.length > 0 && (
                  <div className={`flex flex-col gap-2 ${canPay || isPaid ? "mt-4 pt-4 border-t border-[var(--border-subtle)]" : ""}`}>
                    <h3 className="m-0 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium">
                      {t("payment.codes")}
                    </h3>
                    <ul className="m-0 p-0 list-none flex flex-col gap-2">
                      {attempts.map((attempt) => (
                        <li
                          key={attempt.transferCode}
                          className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 flex flex-col gap-0.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <code className="font-mono text-sm font-semibold text-[var(--text-heading)] break-all">
                                {attempt.transferCode}
                              </code>
                              <CopyButton value={attempt.transferCode} label={t("payment.code")} />
                            </span>
                            <span
                              className={`shrink-0 font-primary text-xs font-medium ${
                                attempt.status === "PAID"
                                  ? "text-[var(--accent-sage)]"
                                  : attempt.status === "EXPIRED"
                                    ? "text-[var(--color-deep-rose)]"
                                    : "text-[var(--text-muted)]"
                              }`}
                            >
                              {t(`payment.attempt.${attempt.status}`)}
                            </span>
                          </div>
                          <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                            {fmt(attempt, "amount")} ·{" "}
                            {attempt.paidAt
                              ? t("payment.paidAt", { date: format.dateTime(new Date(attempt.paidAt), "dateTime") })
                              : t("payment.expiresAt", { date: format.dateTime(new Date(attempt.expiresAt), "dateTime") })}
                          </span>
                          {attempt.transactionRef && (
                            <span className="inline-flex items-center gap-1 font-primary text-xs text-[var(--text-secondary)] tracking-[-0.02em]">
                              {t("payment.transactionRef", { ref: attempt.transactionRef })}
                              <CopyButton value={attempt.transactionRef} label={t("payment.transactionRefLabel")} />
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {!isPaid && (
                      <p className="m-0 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
                        {t("payment.codesHint")}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Delivery */}
            {hasAddress && (
              <section className={CARD_CLASS}>
                <h2 className={CARD_TITLE_CLASS}>
                  <MapPin size={16} /> {isPickup ? t("pickupContact") : t("shippingAddress")}
                </h2>
                <div className="font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] leading-[160%]">
                  <p className="m-0">
                    <strong>{address.fullName}</strong>
                    {address.phone && <span className="text-[var(--text-secondary)]"> · {address.phone}</span>}
                  </p>
                  {isPickup && <p className="m-0 text-[var(--text-muted)]">{t("pickupAtStore")}</p>}
                  {isPickup && (
                    <p className="m-0">
                      <a href={CONTACT_MAPS_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] hover:underline">
                        {CONTACT_ADDRESS}
                      </a>
                    </p>
                  )}
                  {address.addressLine1 && <p className="m-0">{address.addressLine1}</p>}
                  {address.addressLine2 && <p className="m-0">{address.addressLine2}</p>}
                  {address.city && (
                    <p className="m-0">
                      {address.city}
                      {address.province ? `, ${address.province}` : ""}
                      {address.postalCode ? ` ${address.postalCode}` : ""}
                    </p>
                  )}
                  {address.country && address.country !== "Vietnam" && <p className="m-0">{address.country}</p>}
                  {order.note && (
                    <p className="m-0 mt-3 text-[var(--text-muted)] italic">
                      {t("notes")} {order.note}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Refund requests of a cancelled paid order */}
            {refunds.length > 0 && (
              <section className={CARD_CLASS}>
                <h2 className={CARD_TITLE_CLASS}>
                  <Undo2 size={16} /> {t("refund.title")}
                </h2>
                <ul className="m-0 p-0 list-none flex flex-col gap-3">
                  {refunds.map((refund) => (
                    <li
                      key={`${refund.createdAt}-${refund.status}`}
                      className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5 flex flex-col gap-1"
                    >
                      {(refund.reason === "RETURN" || refund.reason === "ADMIN_CANCELLED") && (
                        <span className="font-primary text-[11px] text-[var(--text-muted)] tracking-[0.04em] uppercase">
                          {refund.reason === "RETURN" && refund.returnId ? (
                            <Link href={`/returns/${encodeURIComponent(refund.returnId)}`} className="text-inherit underline underline-offset-2">
                              {t("refund.reasonReturn")}
                            </Link>
                          ) : (
                            t(refund.reason === "RETURN" ? "refund.reasonReturn" : "refund.reasonAdminCancelled")
                          )}
                        </span>
                      )}
                      <span
                        className={`font-primary text-sm font-medium tracking-[-0.02em] ${
                          refund.status === "COMPLETED"
                            ? "text-[var(--accent-sage)]"
                            : refund.status === "REJECTED"
                              ? "text-[var(--color-deep-rose)]"
                              : "text-[var(--text-primary)]"
                        }`}
                      >
                        {refund.status === "COMPLETED"
                          ? t("refund.COMPLETED", { amount: fmt(refund, "amount") })
                          : t(`refund.${refund.status}`)}
                      </span>
                      {refund.status === "COMPLETED" && refund.bankReference && (
                        <span className="inline-flex items-center gap-1 font-primary text-xs text-[var(--text-secondary)] tracking-[-0.02em]">
                          {t("refund.reference", { ref: refund.bankReference })}
                          <CopyButton value={refund.bankReference} label={t("refund.referenceLabel")} />
                        </span>
                      )}
                      <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                        {refund.status === "REQUESTED" && `${fmt(refund, "amount")} · `}
                        {refund.processedAt
                          ? t("refund.processedAt", { date: format.dateTime(new Date(refund.processedAt), "dateTime") })
                          : t("refund.requestedAt", { date: format.dateTime(new Date(refund.createdAt), "dateTime") })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Return: delivered orders only */}
            <OrderReturnCard
              orderId={order.id}
              orderStatus={order.status}
              className={CARD_CLASS}
              titleClassName={CARD_TITLE_CLASS}
            />

            {(canCancel || contactShop) && (
              <section className={`${CARD_CLASS} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
                <p className="m-0 font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em] leading-[150%]">
                  {canCancel ? t("cancel.hint") : t("cancel.contactShop")}
                </p>
                {canCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="shrink-0 inline-flex items-center justify-center min-h-11 py-2.5 px-6 rounded-full border border-[var(--color-deep-rose)] bg-transparent text-[var(--color-deep-rose)] font-primary text-xs font-medium tracking-[0.08em] uppercase cursor-pointer hover:bg-[var(--color-rose-milk)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCancelling ? t("cancel.cancelling") : t("cancel.action")}
                  </button>
                )}
              </section>
            )}
          </div>

          {/* Items + totals */}
          <section className={`${CARD_CLASS} min-w-0 flex flex-col gap-5 lg:sticky lg:top-[104px]`}>
            <h2 className={`${CARD_TITLE_CLASS} mb-0`}>{t("items", { count: totalQuantity })}</h2>
            <ul className="m-0 p-0 list-none flex flex-col gap-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <OrderThumb src={item.productImage} alt={item.productName} />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="font-primary text-sm text-[var(--text-primary)] font-medium tracking-[-0.02em] line-clamp-2">
                      {item.productName}
                    </span>
                    <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                      {t("itemMeta", { size: item.size, color: item.color })} · {t("quantity", { quantity: item.quantity })}
                    </span>
                    {reviewable && pendingReviews.byOrderItemId.has(item.id) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => setReviewTarget(pendingReviews.byOrderItemId.get(item.id) ?? null)}
                          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--accent-primary)] bg-transparent px-3.5 font-primary text-xs font-medium text-[var(--text-accent)] hover:bg-[rgba(201,169,110,0.1)] pointer-coarse:min-h-11"
                        >
                          <PenLine size={13} aria-hidden="true" />
                          {t("review.cta")}
                        </button>
                        <span className="font-primary text-[11px] text-[var(--text-muted)]">
                          {deadlineLabel(pendingReviews.byOrderItemId.get(item.id)!.reviewDeadline)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em]">
                    {/* Unit price × quantity: the BE sends no line total for an order */}
                    {fmt(item, "price")} × {item.quantity}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="m-0 pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-2 font-primary tracking-[-0.02em]">
              <div className="flex justify-between gap-3 text-sm text-[var(--text-secondary)]">
                <dt>{t("subtotal")}</dt>
                <dd className="m-0">{fmt(order, "subtotal")}</dd>
              </div>
              <div className="flex justify-between gap-3 text-sm text-[var(--text-secondary)]">
                <dt>
                  {t("shipping")}
                  {order.shippingMethod && (
                    <span className="text-[var(--text-muted)]">
                      {" "}
                      ({methodLabel(methodId)})
                    </span>
                  )}
                </dt>
                <dd className={`m-0 ${shippingFree ? "text-[var(--accent-sage)] font-medium" : ""}`}>
                  {shippingFree ? t("free") : fmt(order, "shippingFee")}
                </dd>
              </div>
              <div className="flex justify-between items-baseline gap-3 text-[var(--text-heading)] font-medium">
                <dt className="text-sm">{t("total")}</dt>
                <dd className="m-0 text-xl">{fmt(order, "total")}</dd>
              </div>
            </dl>

            <Link
              href="/shop"
              className="inline-flex items-center justify-center min-h-11 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-accent)] motion-reduce:transition-none"
            >
              {t("continue")}
            </Link>
          </section>
        </div>
      </motion.div>

      {reviewTarget && (
        <ReviewFormModal
          target={{ mode: "create", item: reviewTarget }}
          onClose={() => setReviewTarget(null)}
          onSaved={() => {
            setReviewTarget(null);
            void refreshReviewData();
          }}
          onAlreadyReviewed={() => router.push("/reviews?tab=mine")}
          onStale={() => void pendingReviews.reload()}
        />
      )}
    </main>
  );
}
