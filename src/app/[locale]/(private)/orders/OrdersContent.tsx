"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { ArrowLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Link } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import type { Order } from "./_common/types";
import OrderStatusBadge from "./_components/OrderStatusBadge";
import OrderThumb from "./_components/OrderThumb";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import { usePendingReviews } from "../reviews/_common/use-pending-reviews";

const ease = [0.25, 0.1, 0.25, 1] as const;

/** Lines shown on a card; the rest collapse into "+n more" */
const PREVIEW_ITEMS = 2;

const SHELL_CLASS = "min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]";
const WRAP_CLASS = "max-w-[720px] mx-auto px-4 sm:px-6";
const SKELETON_CLASS =
  "h-[180px] rounded-lg bg-[var(--color-champagne-cream)] animate-[checkout-shimmer_1.5s_ease_infinite] motion-reduce:animate-none";

export default function OrdersContent() {
  const t = useTranslations("private.orders.list");
  const { toast } = useToast();
  const toErrorMessage = useErrorMessage();
  const format = useFormatter();
  const { fmt } = useMoney();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { apiFetch } = useApiAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pendingReviews = usePendingReviews();

  /* The BE lists 25 orders per page: the first page loads on mount, "load more" appends the next one */
  const loadPage = useCallback(
    async (nextPage: number) => {
      try {
        const qs = buildListQuery({ page: nextPage, limit: LIST_DEFAULT_LIMIT, sort: "-createdAt" });
        const res = await apiFetch<{ data: Order[]; total: number }>(`/api/orders?${qs}`);
        setOrders((prev) => (nextPage === 1 ? (res.data ?? []) : [...prev, ...(res.data ?? [])]));
        setTotal(res.total ?? 0);
        setPage(nextPage);
      } catch (err) {
        toast.error(toErrorMessage(err, t("toast.loadFailed")));
      }
    },
    [apiFetch, t, toast, toErrorMessage]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    loadPage(1).finally(() => setIsLoading(false));
  }, [isAuthenticated, loadPage]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadPage(page + 1);
    setIsLoadingMore(false);
  };

  if (authLoading) {
    return (
      <main className={SHELL_CLASS}>
        <div className={`${WRAP_CLASS} flex flex-col gap-4`}>
          <div className={SKELETON_CLASS} />
          <div className={SKELETON_CLASS} />
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

  return (
    <main className={SHELL_CLASS}>
      <div className={`${WRAP_CLASS} flex flex-col gap-6`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [...ease] }}
          className="flex flex-col gap-3"
        >
          <Link
            href="/account"
            className="inline-flex items-center gap-2 min-h-11 self-start font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-primary)] motion-reduce:transition-none"
          >
            <ArrowLeft size={16} />
            {t("back")}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h1 className="m-0 font-display font-normal text-2xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              {t("title")}
            </h1>
            <span className="flex flex-wrap items-center gap-x-5">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 min-h-11 font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium hover:underline"
              >
                {t("reviewsLink")}
                {pendingReviews.total > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] px-1.5 text-[10px] font-semibold text-[var(--text-on-gold)]">
                    {pendingReviews.total}
                  </span>
                )}
              </Link>
              <Link
                href="/returns"
                className="inline-flex items-center min-h-11 font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium hover:underline"
              >
                {t("returnsLink")}
              </Link>
            </span>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className={SKELETON_CLASS} />
            <div className={SKELETON_CLASS} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 px-6 text-center bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)]">
            <ShoppingBag size={40} style={{ color: "var(--text-disabled)" }} />
            <h2 className="m-0 font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">
              {t("empty.title")}
            </h2>
            <p className="m-0 max-w-[380px] font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
              {t("empty.description")}
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 min-h-11 py-3 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90"
            >
              <ShoppingBag size={16} />
              {t("empty.cta")}
            </Link>
          </div>
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col gap-4">
            {orders.map((order, idx) => {
              const lines = order.items ?? [];
              const preview = lines.slice(0, PREVIEW_ITEMS);
              const hidden = lines.length - preview.length;
              return (
                <motion.li
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [...ease], delay: Math.min(idx * 0.05, 0.3) }}
                >
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex flex-col gap-4 p-4 sm:p-5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] no-underline transition-colors duration-150 hover:border-[var(--border-light)] motion-reduce:transition-none"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <OrderStatusBadge status={order.status} />
                        <OrderPaymentBadge status={order.paymentStatus} />
                      </span>
                      <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                        {format.dateTime(new Date(order.createdAt), "short")}
                      </span>
                    </div>

                    <ul className="m-0 p-0 list-none flex flex-col gap-3">
                      {preview.map((item) => (
                        <li key={item.id} className="flex items-center gap-3">
                          <OrderThumb src={item.productImage} alt={item.productName} />
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <span className="font-primary text-sm text-[var(--text-primary)] font-medium tracking-[-0.02em] line-clamp-2">
                              {item.productName}
                            </span>
                            <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                              {[item.size, item.color].filter(Boolean).join(" · ")}
                              {item.quantity > 1 && ` · ${t("card.quantity", { quantity: item.quantity })}`}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {hidden > 0 && (
                      <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                        {t("card.more", { count: hidden })}
                      </span>
                    )}

                    <div className="flex items-end justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                      <span className="font-primary text-[11px] text-[var(--text-disabled)] tracking-[0.02em] break-all">
                        {t("card.orderNumber", { id: order.id })}
                      </span>
                      <span className="flex items-center gap-1 font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em]">
                        <span className="text-xs text-[var(--text-muted)] font-normal">{t("card.total")}</span>
                        {fmt(order, "total")}
                        <ChevronRight size={16} className="text-[var(--text-muted)]" />
                      </span>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}

        {!isLoading && orders.length < total && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="self-center inline-flex items-center justify-center min-h-11 py-2.5 px-6 rounded-full border border-[var(--border-light)] bg-transparent font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase font-medium cursor-pointer hover:bg-[var(--color-champagne-cream)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? t("loadingMore") : t("loadMore")}
          </button>
        )}
      </div>
    </main>
  );
}
