"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, ChevronRight, PackageX } from "lucide-react";
import { Link } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import type { ReturnRequest } from "./_common/types";
import ReturnStatusBadge from "./_components/ReturnStatusBadge";

const ease = [0.25, 0.1, 0.25, 1] as const;

/** Lines named on a card; the rest collapse into "+n more" */
const PREVIEW_ITEMS = 2;

const SHELL_CLASS = "min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]";
const WRAP_CLASS = "max-w-[720px] mx-auto px-4 sm:px-6";
const SKELETON_CLASS =
  "h-[140px] rounded-lg bg-[var(--color-champagne-cream)] animate-[checkout-shimmer_1.5s_ease_infinite] motion-reduce:animate-none";

export default function ReturnsContent() {
  const t = useTranslations("private.returns.list");
  const tReason = useTranslations("private.returns.reason");
  const { toast } = useToast();
  const toErrorMessage = useErrorMessage();
  const format = useFormatter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { apiFetch } = useApiAuth();
  /* `?orderId=` narrows the list to one order's requests */
  const orderId = searchParams.get("orderId") || undefined;
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadPage = useCallback(
    async (nextPage: number) => {
      try {
        const qs = buildListQuery({ page: nextPage, limit: LIST_DEFAULT_LIMIT, sort: "-createdAt" }, { orderId });
        const res = await apiFetch<{ data: ReturnRequest[]; total: number }>(`/api/returns?${qs}`);
        setReturns((prev) => (nextPage === 1 ? (res.data ?? []) : [...prev, ...(res.data ?? [])]));
        setTotal(res.total ?? 0);
        setPage(nextPage);
      } catch (err) {
        toast.error(toErrorMessage(err, t("toast.loadFailed")));
      }
    },
    [apiFetch, orderId, t, toast, toErrorMessage]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
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
            href={orderId ? `/orders/${encodeURIComponent(orderId)}` : "/orders"}
            className="inline-flex items-center gap-2 min-h-11 self-start font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-primary)] motion-reduce:transition-none"
          >
            <ArrowLeft size={16} />
            {orderId ? t("backToOrder") : t("back")}
          </Link>
          <h1 className="m-0 font-display font-normal text-2xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            {t("title")}
          </h1>
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className={SKELETON_CLASS} />
            <div className={SKELETON_CLASS} />
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 px-6 text-center bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)]">
            <PackageX size={40} style={{ color: "var(--text-disabled)" }} />
            <h2 className="m-0 font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">
              {t("empty.title")}
            </h2>
            <p className="m-0 max-w-[380px] font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
              {t("empty.description")}
            </p>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 min-h-11 py-3 px-6 rounded-full border border-[var(--border-light)] font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium hover:bg-[var(--color-champagne-cream)]"
            >
              {t("empty.cta")}
            </Link>
          </div>
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col gap-4">
            {returns.map((request, idx) => {
              const preview = request.items.slice(0, PREVIEW_ITEMS);
              const hidden = request.items.length - preview.length;
              return (
                <motion.li
                  key={request.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [...ease], delay: Math.min(idx * 0.05, 0.3) }}
                >
                  <Link
                    href={`/returns/${encodeURIComponent(request.id)}`}
                    className="flex flex-col gap-3 p-4 sm:p-5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] no-underline transition-colors duration-150 hover:border-[var(--border-light)] motion-reduce:transition-none"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <ReturnStatusBadge status={request.status} />
                      <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                        {format.dateTime(new Date(request.createdAt), "short")}
                      </span>
                    </div>

                    <ul className="m-0 p-0 list-none flex flex-col gap-1">
                      {preview.map((item) => (
                        <li
                          key={item.id}
                          className="font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] line-clamp-1"
                        >
                          {item.productName}
                          <span className="text-[var(--text-muted)]">
                            {" "}
                            · {[item.size, item.color].filter(Boolean).join(" · ")} · {t("card.quantity", { quantity: item.quantity })}
                          </span>
                        </li>
                      ))}
                      {hidden > 0 && (
                        <li className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                          {t("card.more", { count: hidden })}
                        </li>
                      )}
                    </ul>

                    <div className="flex items-end justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                      <span className="font-primary text-[11px] text-[var(--text-disabled)] tracking-[0.02em] break-all">
                        {t("card.orderNumber", { id: request.orderId })} · {tReason(request.reason)}
                      </span>
                      <span className="flex items-center gap-1 font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em]">
                        {request.refund ? format.number(request.refund.amount, "vnd") : null}
                        <ChevronRight size={16} className="text-[var(--text-muted)]" />
                      </span>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}

        {!isLoading && returns.length < total && (
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
