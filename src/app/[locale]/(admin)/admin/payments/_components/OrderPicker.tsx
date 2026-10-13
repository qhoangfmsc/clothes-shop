"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useAppDispatch } from "@/src/store/hooks";
import { inputClass } from "@/src/app/[locale]/_components/AdminFormKit";
import { searchUnpaidOrders } from "../_common/moduleSlice";
import type { UnpaidOrderOption } from "../_common/types";

interface OrderPickerProps {
  value: string | null;
  onChange: (order: UnpaidOrderOption) => void;
}

/** Search the unpaid orders (by id, customer name or phone) and pick one */
export default function OrderPicker({ value, onChange }: OrderPickerProps) {
  const t = useTranslations("admin.payments.picker");
  const format = useFormatter();
  const toErrorMessage = useErrorMessage();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const [orders, setOrders] = useState<UnpaidOrderOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    setIsLoading(true);
    dispatch(searchUnpaidOrders(debounced.trim()))
      .unwrap()
      .then((data) => {
        if (stale) return;
        /* A cancelled order cannot be paid: the BE would refuse it */
        setOrders(data.filter((order) => order.status !== "cancelled"));
        setError(null);
      })
      .catch((err) => {
        if (!stale) setError(toErrorMessage(err, t("loadFailed")));
      })
      .finally(() => {
        if (!stale) setIsLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [debounced, dispatch, toErrorMessage, t]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          className={`${inputClass} pl-9`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
      </div>

      <div
        role="radiogroup"
        aria-label={t("title")}
        className="flex flex-col border border-[var(--border-subtle)] rounded-lg max-h-56 overflow-y-auto"
      >
        {error ? (
          <p className="m-0 p-3 text-xs text-[var(--accent-rose)] font-primary">{error}</p>
        ) : isLoading && orders.length === 0 ? (
          <p className="m-0 p-3 text-xs text-[var(--text-muted)] font-primary">{t("loading")}</p>
        ) : orders.length === 0 ? (
          <p className="m-0 p-3 text-xs text-[var(--text-muted)] font-primary">{t("empty")}</p>
        ) : (
          orders.map((order) => {
            const selected = order.id === value;
            return (
              <button
                key={order.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(order)}
                className={`flex items-center justify-between gap-3 py-2.5 px-3 pointer-coarse:min-h-11 text-left border-0 border-b border-[var(--border-subtle)] last:border-b-0 cursor-pointer font-primary ${
                  selected ? "bg-[rgba(201,169,110,0.15)]" : "bg-transparent hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <span className="min-w-0 flex flex-col">
                  <code className="text-xs font-mono font-semibold text-[var(--text-primary)]">#{order.id}</code>
                  <span className="text-xs text-[var(--text-muted)] truncate">
                    {String(order.shippingAddress?.fullName ?? "—")} ·{" "}
                    {format.dateTime(new Date(order.createdAt), "short")}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                  {format.number(Number(order.total), "priceFixed")}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
