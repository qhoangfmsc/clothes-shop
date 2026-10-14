"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronRight, Undo2 } from "lucide-react";
import { Link } from "@/src/i18n/navigation";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { buildListQuery } from "@/src/lib/list-query";
import { useReturnEligibility } from "../_common/use-return-eligibility";
import type { ReturnRequest } from "../_common/types";
import ReturnStatusBadge from "./ReturnStatusBadge";

/** Only delivered orders can be returned: other orders have no return card at all */
const RETURNABLE_ORDER_STATUSES = ["delivered", "completed"];

interface OrderReturnCardProps {
  orderId: string;
  orderStatus: string;
  className: string;
  titleClassName: string;
}

/** "Return" card of an order: can it be returned (and until when), the button, and the requests already sent */
export default function OrderReturnCard({ orderId, orderStatus, className, titleClassName }: OrderReturnCardProps) {
  const t = useTranslations("private.returns.orderCard");
  const tIneligible = useTranslations("private.returns.ineligible");
  const format = useFormatter();
  const { apiFetch } = useApiAuth();
  const enabled = RETURNABLE_ORDER_STATUSES.includes(orderStatus);
  const { eligibility, isLoading } = useReturnEligibility(orderId, enabled);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);

  useEffect(() => {
    if (!enabled) return;
    apiFetch<{ data: ReturnRequest[] }>(`/api/returns?${buildListQuery({ sort: "-createdAt", limit: 25 }, { orderId })}`)
      .then((res) => setReturns(res.data ?? []))
      .catch(() => setReturns([]));
  }, [enabled, apiFetch, orderId]);

  if (!enabled || isLoading || (!eligibility && returns.length === 0)) return null;

  return (
    <section className={className}>
      <h2 className={titleClassName}>
        <Undo2 size={16} /> {t("title")}
      </h2>

      {eligibility && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="m-0 font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em] leading-[150%]">
            {eligibility.eligible && eligibility.deadline
              ? t("eligible", { date: format.dateTime(new Date(eligibility.deadline), "dateTime") })
              : eligibility.reason
                ? tIneligible(eligibility.reason)
                : null}
          </p>
          {eligibility.eligible && (
            <Link
              href={`/returns/new?orderId=${encodeURIComponent(orderId)}`}
              className="shrink-0 inline-flex items-center justify-center min-h-11 py-2.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-xs font-medium tracking-[0.08em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90"
            >
              {t("request")}
            </Link>
          )}
        </div>
      )}

      {returns.length > 0 && (
        <ul
          className={`m-0 p-0 list-none flex flex-col gap-2 ${eligibility ? "mt-4 pt-4 border-t border-[var(--border-subtle)]" : ""}`}
        >
          {returns.map((request) => (
            <li key={request.id}>
              <Link
                href={`/returns/${encodeURIComponent(request.id)}`}
                className="flex items-center justify-between gap-3 min-h-11 py-2 px-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] no-underline hover:border-[var(--border-light)]"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <ReturnStatusBadge status={request.status} />
                  <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] truncate">
                    {format.dateTime(new Date(request.createdAt), "short")}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-[var(--text-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
