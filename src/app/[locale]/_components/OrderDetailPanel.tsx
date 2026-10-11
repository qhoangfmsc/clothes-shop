"use client";

import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { X, Package, MapPin, CreditCard } from "lucide-react";
import type { AdminOrder } from "@/src/hooks/use-admin-api";
import { useAddressFieldLabel, useOrderStatusLabel } from "@/src/i18n/use-labels";

/* ── Status style helper ── */
function statusStyle(s: string): string {
  const m: Record<string, string> = {
    pending: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
    confirmed: "bg-[rgba(143,163,180,0.15)] text-[var(--accent-blue)]",
    shipping: "bg-[rgba(184,165,200,0.15)] text-[var(--accent-lavender)]",
    delivered: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
    completed: "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]",
    cancelled: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
  };
  return m[s] ?? "bg-[rgba(107,101,96,0.05)] text-[var(--text-muted)]";
}

/* ── Props ── */
interface OrderDetailPanelProps {
  order: AdminOrder;
  loading?: boolean;
  onClose: () => void;
}

/* ═══════════════════════════════ Component ═══════════════════════════════ */

export default function OrderDetailPanel({ order, loading, onClose }: OrderDetailPanelProps) {
  const t = useTranslations("admin.components.orderDetailPanel");
  const format = useFormatter();
  const statusLabel = useOrderStatusLabel();
  const addressFieldLabel = useAddressFieldLabel();
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-primary)] z-1">
        <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
          {t("title", { id: order.id })}
        </h2>
        <button
          className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
          onClick={onClose}
          aria-label={t("close")}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-[var(--border-light)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-6">
        <div className="flex justify-between items-center py-2">
          <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("status")}</span>
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${statusStyle(order.status)}`}
          >
            {statusLabel(order.status)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("date")}</span>
          <span className="text-sm text-[var(--text-primary)] font-primary">
            {format.dateTime(new Date(order.createdAt), "dateTime")}
          </span>
        </div>

        {/* Items */}
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] font-primary mt-6 mb-3 pt-4 border-t border-[var(--border-subtle)]">
          <Package size={14} /> {t("items", { count: order.items?.length ?? 0 })}
        </h3>
        <div className="flex flex-col gap-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {item.productImage && (
                <div className="relative w-10 h-12 shrink-0">
                  <Image
                    src={item.productImage}
                    alt=""
                    fill
                    className="object-cover rounded-sm"
                    sizes="40px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.productName}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.size && t("size", { size: item.size })}
                  {item.size && item.color && " / "}
                  {item.color && t("color", { color: item.color })}
                  {" — "}
                  {t("quantity", { quantity: item.quantity })}
                </p>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] shrink-0">
                {format.number(Number(item.price) * item.quantity, "priceFixed")}
              </span>
            </div>
          ))}
        </div>

        {/* Shipping */}
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] font-primary mt-6 mb-3 pt-4 border-t border-[var(--border-subtle)]">
          <MapPin size={14} /> {t("shipping.title")}
        </h3>
        <div className="flex justify-between items-center py-2">
          <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("shipping.method")}</span>
          <span className="text-sm text-[var(--text-primary)] font-primary">
            {order.shippingMethod || "—"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("shipping.fee")}</span>
          <span className="text-sm text-[var(--text-primary)] font-primary">
            {format.number(Number(order.shippingFee), "priceFixed")}
          </span>
        </div>
        {order.shippingAddress && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-0.5 mt-2">
            {Object.entries(order.shippingAddress).map(([k, v]) => (
              <div
                key={k}
                className="flex flex-row items-center text-xs text-[var(--text-secondary)] font-primary"
              >
                <div className="w-28 font-bold">{addressFieldLabel(k)}:</div>
                <div>{String(v) ?? "—"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Payment */}
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] font-primary mt-6 mb-3 pt-4 border-t border-[var(--border-subtle)]">
          <CreditCard size={14} /> {t("payment.title")}
        </h3>
        <div className="flex justify-between items-center py-2">
          <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("payment.subtotal")}</span>
          <span className="text-sm text-[var(--text-primary)] font-primary">
            {format.number(Number(order.subtotal), "priceFixed")}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("payment.shipping")}</span>
          <span className="text-sm text-[var(--text-primary)] font-primary">
            {format.number(Number(order.shippingFee), "priceFixed")}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 pt-3 border-t border-[var(--border-subtle)]">
          <span className="text-xs font-semibold text-[var(--text-primary)] font-primary">{t("payment.total")}</span>
          <span className="text-md font-semibold text-[var(--text-primary)] font-primary">
            {format.number(Number(order.total), "priceFixed")}
          </span>
        </div>
        {order.note && (
          <div className="mt-4">
            <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{t("note")}</span>
            <p className="text-sm text-[var(--text-secondary)] font-primary italic mt-1">
              {order.note}
            </p>
          </div>
        )}
        </div>
      )}
    </>
  );
}
