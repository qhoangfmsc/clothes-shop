"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Link } from "@/src/i18n/navigation";
import { cartItemKey } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import type { CartItem } from "@/src/app/[locale]/(private)/cart/_common/types";
import { useMoney } from "@/src/hooks/use-money";
import type { ShippingMethod } from "@/src/types/shipping";
import { CARD_CLASS, type OrderQuote } from "../_common/checkout";
import type { PaymentMethod } from "../_common/payment";

interface OrderSummaryProps {
  items: CartItem[];
  totalItems: number;
  /** The BE's price for the chosen shipping method; `null` until the first answer */
  quote: OrderQuote | null;
  quoteLoading: boolean;
  quoteFailed: boolean;
  /** The chosen shipping method (its base fee decides whether the free-shipping hint is relevant) */
  method: ShippingMethod | undefined;
  paymentMethod: PaymentMethod;
  isSubmitting: boolean;
  onPlaceOrder: () => void;
}

const LEGAL_LINK = "underline underline-offset-2 hover:text-[var(--text-primary)]";

/** The ticked bag lines, the BE's shipping fee and total, and the place-order button. Read-only: quantities
 *  are edited in the bag, because the order is built from the synced server cart. */
export default function OrderSummary({
  items,
  totalItems,
  quote,
  quoteLoading,
  quoteFailed,
  method,
  paymentMethod,
  isSubmitting,
  onPlaceOrder,
}: OrderSummaryProps) {
  const t = useTranslations("private.checkout.summary");
  const { fmt, fmtOrNull } = useMoney();
  /* On phones the list starts folded so the form stays first; from lg it is always shown */
  const [showItems, setShowItems] = useState(false);

  /* Both halves are `null` together when free shipping is switched off */
  const threshold = quote?.freeShippingThresholdVnd ?? null;
  const thresholdText = quote ? fmtOrNull(quote, "freeShippingThreshold") : null;
  const unlocked = quote?.freeShipping ?? false;
  /* Nothing to unlock when the method is free anyway (store pickup) */
  const showProgress = threshold !== null && thresholdText !== null && method !== undefined && method.priceVnd > 0;

  let shippingText: string;
  if (quoteLoading) shippingText = "…";
  else if (!quote || quoteFailed) shippingText = t("shipping.unavailable");
  else shippingText = quote.shippingFeeVnd === 0 ? t("shipping.free") : fmt(quote, "shippingFee");

  return (
    <aside className={`${CARD_CLASS} flex flex-col gap-3.5`}>
      <h2 className="m-0 font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">
        {t("title")}
      </h2>

      <button
        type="button"
        onClick={() => setShowItems((prev) => !prev)}
        aria-expanded={showItems}
        aria-controls="checkout-summary-items"
        className="lg:hidden flex items-center justify-between min-h-11 -my-2 bg-transparent border-none p-0 font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em] cursor-pointer"
      >
        <span>
          {t("showItems")} ({t("items", { count: totalItems })})
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-150 motion-reduce:transition-none ${showItems ? "rotate-180" : ""}`}
        />
      </button>

      <ul
        id="checkout-summary-items"
        className={`m-0 p-0 list-none flex-col gap-3 lg:flex lg:max-h-[12.5rem] lg:overflow-y-auto lg:pt-2 lg:pr-2 ${
          showItems ? "flex" : "hidden"
        }`}
      >
        {items.map((item) => (
          <li key={cartItemKey(item)} className="flex items-center gap-3">
            <div className="relative w-14 h-[4.5rem] rounded-sm bg-[var(--color-champagne-cream)] shrink-0">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="56px"
                className="rounded-sm object-cover"
              />
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-[var(--text-heading)] text-[var(--bg-primary)] font-primary text-[0.6875rem] font-medium flex items-center justify-center">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] font-medium line-clamp-2">
                {item.name}
              </span>
              <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                {t("itemMeta", { size: item.size, color: item.color })}
              </span>
            </div>
            <span className="font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em] shrink-0">
              {/* The BE's line total; empty until it has priced the quantity */}
              {fmtOrNull(item, "lineTotal") ?? "…"}
            </span>
          </li>
        ))}
      </ul>

      {/* Free shipping progress */}
      {showProgress && threshold !== null && thresholdText !== null && quote && (
        <div
          className={`py-3 px-4 rounded-md border transition-colors duration-150 motion-reduce:transition-none ${
            unlocked
              ? "bg-[var(--color-sage-cream)] border-[var(--accent-sage)]"
              : "bg-[var(--color-champagne-cream)] border-[var(--border-subtle)]"
          }`}
        >
          <p
            className={`m-0 mb-2 font-primary text-xs tracking-[-0.02em] leading-[140%] text-center ${
              unlocked ? "text-[var(--accent-sage)] font-medium" : "text-[var(--text-secondary)]"
            }`}
          >
            {unlocked
              ? t("shipping.unlocked")
              : t("shipping.remaining", { amount: thresholdText })}
          </p>
          <div className="h-1 rounded-sm bg-[var(--border-light)] overflow-hidden">
            <div
              className={`h-full rounded-sm transition-[width] duration-[400ms] motion-reduce:transition-none ${
                unlocked ? "bg-[var(--accent-sage)]" : "bg-[var(--accent-primary)]"
              }`}
              /* Share of the threshold reached: a ratio of the BE's two VND figures, not an amount */
              style={{ width: `${Math.min((quote.subtotalVnd / threshold) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <dl className="m-0 pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-2 font-primary tracking-[-0.02em]">
        <div className="flex justify-between gap-3 text-sm text-[var(--text-secondary)]">
          <dt>
            {t("subtotal")} ({t("items", { count: totalItems })})
          </dt>
          <dd className="m-0">{quoteLoading || !quote ? "…" : fmt(quote, "subtotal")}</dd>
        </div>
        <div className="flex justify-between gap-3 text-sm text-[var(--text-secondary)]">
          <dt>{method ? `${t("shipping.label")} · ${method.name}` : t("shipping.label")}</dt>
          <dd
            className={`m-0 text-right ${
              quote && !quoteLoading && quote.shippingFeeVnd === 0
                ? "text-[var(--accent-sage)] font-medium"
                : ""
            } ${!quote || quoteFailed ? "text-xs text-[var(--text-muted)]" : ""}`}
          >
            {shippingText}
          </dd>
        </div>
        <div className="flex justify-between items-baseline gap-3 pt-2 border-t border-[var(--border-subtle)] text-[var(--text-heading)] font-medium">
          <dt className="text-sm">{t("total")}</dt>
          <dd className="m-0 text-xl">
            {quoteLoading || !quote ? "…" : fmt(quote, "total")}
          </dd>
        </div>
        {thresholdText !== null && (
          <p className="m-0 text-xs text-[var(--text-muted)] leading-[150%]">
            {t("shipping.freeNote", { amount: thresholdText })}
          </p>
        )}
      </dl>

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={isSubmitting}
        className="flex items-center justify-center w-full min-h-12 py-3.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase border-none cursor-pointer shadow-[var(--shadow-gold-sm)] transition-all duration-150 enabled:hover:opacity-90 enabled:hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none"
      >
        {isSubmitting ? t("placing") : paymentMethod === "vietqr" ? t("placeAndPay") : t("place")}
      </button>

      {/* Links open in a new tab so the form is not lost */}
      <p className="m-0 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[150%] text-center">
        {t.rich("legalNote", {
          terms: (chunks) => (
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className={LEGAL_LINK}>
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={LEGAL_LINK}>
              {chunks}
            </Link>
          ),
          shipping: (chunks) => (
            <Link
              href="/shipping-returns"
              target="_blank"
              rel="noopener noreferrer"
              className={LEGAL_LINK}
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </aside>
  );
}
