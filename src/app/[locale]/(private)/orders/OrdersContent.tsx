"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import Image from "next/image";
import { Package, ArrowLeft, ShoppingBag, ChevronRight } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import OrderStatusBadge from "./_components/OrderStatusBadge";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface Order {
  id: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingMethod: string;
  shippingAddress: Record<string, string>;
  note: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
    size: string;
    color: string;
    createdAt: string;
  }>;
}

export default function OrdersContent() {
  const t = useTranslations("private.orders.list");
  const format = useFormatter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { apiFetch } = useApiAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* Fetch orders on mount */
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      try {
        const res = await apiFetch<{ data: Order[] }>("/api/orders");
        setOrders(res.data ?? []);
      } catch {
        console.warn("[Orders] Failed to fetch orders");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, apiFetch]);

  /* Auth loading */
  if (authLoading) {
    return (
      <main className="orders-page">
        <div className="orders-page__inner">
          <div className="orders-skeleton__header" />
          <div className="orders-skeleton__card" />
          <div className="orders-skeleton__card" />
        </div>
      </main>
    );
  }

  /* Not authenticated */
  if (!isAuthenticated) {
    return (
      <main className="orders-page">
        <UnauthenticatedState />
      </main>
    );
  }

  return (
    <main className="orders-page">
      <div className="orders-page__inner">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease] }}
          className="orders-page__header"
        >
          <Link href="/account" className="orders-page__back">
            <ArrowLeft size={16} />
            {t("back")}
          </Link>

          <h1 className="orders-page__title">
            <Package size={24} style={{ color: "var(--accent-blue)" }} />
            {t("title")}
          </h1>
        </motion.div>

        {/* Loading */}
        {isLoading ? (
          <div>
            <div className="orders-skeleton__card" />
            <div className="orders-skeleton__card" />
          </div>
        ) : orders.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
            className="orders-empty"
          >
            <div className="orders-empty__icon-wrap">
              <ShoppingBag size={40} style={{ color: "var(--text-disabled)" }} />
            </div>
            <h2 className="orders-empty__title">{t("empty.title")}</h2>
            <p className="orders-empty__text">
              {t("empty.description")}
            </p>
            <Link href="/shop" className="orders-empty__cta">
              <ShoppingBag size={16} />
              {t("empty.cta")}
            </Link>

            <div className="orders-empty__features">
              <div className="orders-empty__feature">
                <span
                  className="orders-empty__feature-dot"
                  style={{ background: "var(--accent-blue)" }}
                />
                {t("empty.features.tracking")}
              </div>
              <div className="orders-empty__feature">
                <span
                  className="orders-empty__feature-dot"
                  style={{ background: "var(--accent-sage)" }}
                />
                {t("empty.features.updates")}
              </div>
              <div className="orders-empty__feature">
                <span
                  className="orders-empty__feature-dot"
                  style={{ background: "var(--accent-rose)" }}
                />
                {t("empty.features.returns")}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Orders list */
          <div className="orders-list">
            {orders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [...ease], delay: Math.min(idx * 0.05, 0.3) }}
                className="order-card"
              >
                {/* ── Top Row: Date · Status · Total ── */}
                <div className="order-card__top">
                  <div className="order-card__top-left">
                    <span className="order-card__date">{format.dateTime(new Date(order.createdAt), "short")}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="order-card__total">{format.number(Number(order.total), "price")}</span>
                </div>

                {/* ── Middle Row: Product Preview ── */}
                {order.items?.length > 0 &&
                  (() => {
                    const first = order.items[0];
                    return (
                      <div className="order-card__product">
                        <div className="order-card__product-img">
                          {first.productImage ? (
                            <Image
                              src={first.productImage}
                              alt={first.productName}
                              fill
                              sizes="56px"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <Package size={20} style={{ color: "var(--text-disabled)" }} />
                          )}
                        </div>
                        <div className="order-card__product-info">
                          <span className="order-card__product-name">{first.productName}</span>
                          <span className="order-card__product-meta">
                            {[first.size, first.color].filter(Boolean).join(" · ")}
                            {first.quantity > 1 && ` · ${t("card.quantity", { quantity: first.quantity })}`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                {/* ── Extra items indicator ── */}
                {order.items?.length > 1 && (
                  <span className="order-card__more">
                    {t("card.more", { count: order.items.length - 1 })}
                  </span>
                )}

                {/* ── Bottom Row: Order ID · Action ── */}
                <div className="order-card__footer">
                  <span className="order-card__id">{t("card.orderNumber", { id: order.id })}</span>
                  <Link href={`/orders/${order.id}`} className="order-card__view">
                    {t("card.viewDetails")} <ChevronRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .orders-page {
          min-height: 100vh;
          padding-top: 120px;
          padding-bottom: var(--space-16);
          background: var(--bg-primary);
        }

        .orders-page__inner {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 var(--space-4);
        }

        @media (min-width: 640px) {
          .orders-page__inner { padding: 0 var(--space-6); }
        }

        .orders-page__header {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }

        .orders-page__back {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          font-weight: 500;
          transition: color var(--duration-fast) var(--ease-default);
        }
        .orders-page__back:hover { color: var(--text-primary); }

        .orders-page__title {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-family: var(--font-display), serif;
          font-weight: var(--font-weight-display);
          font-size: var(--text-2xl);
          color: var(--text-heading);
          letter-spacing: -0.04em;
          line-height: 100%;
        }

        @media (min-width: 640px) {
          .orders-page__title { font-size: var(--text-3xl); }
        }

        /* ── Orders List ── */
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .order-card {
          padding: var(--space-5) var(--space-6);
          background: var(--bg-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        /* ── Top Row ── */
        .order-card__top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-card__top-left {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .order-card__date {
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-weight: 500;
          letter-spacing: -0.02em;
        }

        .order-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 10px;
          border-radius: var(--radius-pill);
          border: 1px solid;
          font-family: var(--font-primary);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .order-card__total {
          font-family: var(--font-primary);
          font-size: var(--text-base);
          color: var(--text-heading);
          font-weight: 500;
          letter-spacing: -0.02em;
        }

        /* ── Product Row ── */
        .order-card__product {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-1) 0;
        }

        .order-card__product-img {
          position: relative;
          width: 56px;
          height: 72px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--color-champagne-cream);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .order-card__product-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .order-card__product-name {
          font-family: var(--font-primary);
          font-size: var(--text-base);
          color: var(--text-heading);
          font-weight: 500;
          letter-spacing: -0.02em;
          line-height: 130%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .order-card__product-meta {
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-weight: 500;
          letter-spacing: -0.02em;
        }

        /* ── Extra items ── */
        .order-card__more {
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-weight: 500;
          letter-spacing: -0.02em;
          padding-left: calc(56px + var(--space-3));
        }

        /* ── Footer Row ── */
        .order-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .order-card__id {
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: -0.02em;
        }

        .order-card__view {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-accent);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          font-weight: 500;
          transition: opacity var(--duration-fast) var(--ease-default);
        }
        .order-card__view:hover { opacity: 0.75; }

        /* ── Empty State ── */
        .orders-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-5);
          padding: var(--space-12) var(--space-6);
          background: var(--bg-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-sm);
          text-align: center;
        }

        .orders-empty__icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--color-champagne-cream);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-subtle);
        }

        .orders-empty__title {
          font-family: var(--font-display), serif;
          font-weight: var(--font-weight-display);
          font-size: var(--text-xl);
          color: var(--text-heading);
          letter-spacing: -0.04em;
          line-height: 100%;
        }

        .orders-empty__text {
          font-family: var(--font-primary);
          font-size: var(--text-base);
          color: var(--text-muted);
          letter-spacing: -0.02em;
          line-height: 140%;
          max-width: 360px;
        }

        .orders-empty__cta {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: 12px 28px;
          border-radius: var(--radius-pill);
          background: var(--accent-primary);
          color: var(--text-on-gold);
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          text-decoration: none;
          box-shadow: var(--shadow-gold-sm);
          transition: opacity var(--duration-fast) var(--ease-default),
                      transform var(--duration-fast) var(--ease-default);
        }
        .orders-empty__cta:hover { opacity: 0.9; transform: translateY(-1px); }

        .orders-empty__features {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding-top: var(--space-5);
          border-top: 1px solid var(--border-subtle);
          width: 100%;
          max-width: 280px;
        }

        .orders-empty__feature {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-muted);
          letter-spacing: -0.02em;
        }

        .orders-empty__feature-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ── Skeleton ── */
        .orders-skeleton__header {
          height: 60px;
          border-radius: var(--radius-md);
          background: var(--color-champagne-cream);
          margin-bottom: var(--space-8);
          animation: orders-shimmer 1.5s ease infinite;
        }
        .orders-skeleton__card {
          height: 120px;
          border-radius: var(--radius-lg);
          background: var(--color-champagne-cream);
          margin-bottom: var(--space-4);
          animation: orders-shimmer 1.5s ease infinite;
        }
        @keyframes orders-shimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }

        @media (prefers-reduced-motion: reduce) {
          .orders-page__back,
          .orders-empty__cta,
          .order-card__view,
          .orders-skeleton__header,
          .orders-skeleton__card {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
