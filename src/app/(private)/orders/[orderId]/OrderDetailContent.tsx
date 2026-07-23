"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, MapPin, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import UnauthenticatedState from "@/src/app/_components/UnauthenticatedState";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingMethod: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress: Record<string, string>;
  note: string;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string;
    productImage: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    createdAt: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "var(--accent-primary)", icon: Clock },
  confirmed: { label: "Confirmed", color: "var(--accent-blue)", icon: CheckCircle },
  shipping: { label: "Shipping", color: "var(--accent-sage)", icon: Truck },
  shipped: { label: "Shipped", color: "var(--accent-sage)", icon: Truck },
  delivered: { label: "Delivered", color: "var(--accent-sage)", icon: CheckCircle },
  completed: { label: "Completed", color: "var(--accent-sage)", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "var(--color-deep-rose)", icon: XCircle },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrderDetailContent() {
  const params = useParams<{ orderId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { apiFetch } = useApiAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !params.orderId) return;

    const fetchOrder = async () => {
      try {
        const res = await apiFetch<{ data: OrderDetail }>(`/api/orders/${params.orderId}`);
        setOrder(res.data ?? null);
      } catch {
        console.warn("[Orders] Failed to fetch order detail");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [isAuthenticated, params.orderId, apiFetch]);

  if (authLoading || isLoading) {
    return (
      <main className="order-detail-page">
        <div className="order-detail-page__inner">
          <div className="order-detail-skeleton" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="order-detail-page">
        <UnauthenticatedState />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="order-detail-page">
        <div className="order-detail-page__inner">
          <p
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              padding: "var(--space-16) 0",
            }}
          >
            Order not found.
          </p>
        </div>
      </main>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <main className="order-detail-page">
      <div className="order-detail-page__inner">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease] }}
        >
          <Link href="/orders" className="order-detail__back">
            <ArrowLeft size={16} />
            All Orders
          </Link>

          {/* Order Header */}
          <div className="order-detail__header">
            <div>
              <h1 className="order-detail__title">Order #{order.id}</h1>
              <p className="order-detail__date">{formatDate(order.createdAt)}</p>
            </div>
            <span
              className="order-status-badge"
              style={{ color: statusConfig.color, borderColor: statusConfig.color }}
            >
              <StatusIcon size={12} />
              {statusConfig.label}
            </span>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && Object.keys(order.shippingAddress).length > 0 && (
            <div className="order-detail__section">
              <h3 className="order-detail__section-title">
                <MapPin size={16} /> Shipping Address
              </h3>
              <div className="order-detail__address">
                <p>
                  <strong>{order.shippingAddress.fullName}</strong>
                </p>
                <p>{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>
                  {order.shippingAddress.city}
                  {order.shippingAddress.province ? `, ${order.shippingAddress.province}` : ""}
                  {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ""}
                </p>
                {order.shippingAddress.country && order.shippingAddress.country !== "Vietnam" && (
                  <p>{order.shippingAddress.country}</p>
                )}
              </div>
            </div>
          )}

          {order.note && (
            <div className="order-detail__notes">
              <strong>Notes:</strong> {order.note}
            </div>
          )}

          {/* Totals breakdown */}
          <div className="order-detail__totals">
            <div className="order-detail__totals-row">
              <span>Subtotal</span>
              <span>${Number(order.subtotal).toLocaleString()}</span>
            </div>
            <div className="order-detail__totals-row">
              <span>
                Shipping
                {order.shippingMethod && (
                  <span className="order-detail__shipping-method">
                    {" "}
                    ({order.shippingMethod === "express" ? "Express" : "Standard"})
                  </span>
                )}
              </span>
              <span className={Number(order.shippingFee) === 0 ? "order-detail__free-badge" : ""}>
                {Number(order.shippingFee) === 0
                  ? "Free"
                  : `$${Number(order.shippingFee).toLocaleString()}`}
              </span>
            </div>
            <div className="order-detail__totals-row order-detail__totals-row--total">
              <span>Total</span>
              <span>${Number(order.total).toLocaleString()}</span>
            </div>
            <div className="order-detail__items">
              {order.items.map((item) => (
                <div key={item.id} className="order-detail__item">
                  <div className="order-detail__item-img">
                    {item.productImage && (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        sizes="56px"
                        style={{ objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div className="order-detail__item-info">
                    <span className="order-detail__item-name">{item.productName}</span>
                    <span className="order-detail__item-meta">
                      {item.size} · {item.color} · Qty {item.quantity}
                    </span>
                  </div>
                  <span className="order-detail__item-price">
                    ${(Number(item.price) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .order-detail-page {
          min-height: 100vh;
          padding-top: 120px;
          padding-bottom: var(--space-16);
          background: var(--bg-primary);
        }

        .order-detail-page__inner {
          max-width: 640px;
          margin: 0 auto;
          padding: 0 var(--space-4);
        }

        @media (min-width: 640px) {
          .order-detail-page__inner { padding: 0 var(--space-6); }
        }

        .order-detail__back {
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
          margin-bottom: var(--space-6);
          transition: color var(--duration-fast) var(--ease-default);
        }
        .order-detail__back:hover { color: var(--text-primary); }

        .order-detail__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-8);
        }

        .order-detail__title {
          font-family: var(--font-display), serif;
          font-weight: var(--font-weight-display);
          font-size: var(--text-2xl);
          color: var(--text-heading);
          letter-spacing: -0.04em;
          line-height: 100%;
          margin-bottom: var(--space-2);
        }

        .order-detail__date {
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-muted);
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

        .order-detail__section {
          padding: var(--space-5) var(--space-6);
          background: var(--bg-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
          margin-bottom: var(--space-4);
        }

        .order-detail__section-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: var(--space-4);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--border-subtle);
        }

        .order-detail__items {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .order-detail__item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .order-detail__item-img {
          position: relative;
          width: 56px;
          height: 74px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--color-champagne-cream);
          flex-shrink: 0;
        }

        .order-detail__item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .order-detail__item-name {
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-primary);
          letter-spacing: -0.02em;
          font-weight: 500;
        }

        .order-detail__item-meta {
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-muted);
          letter-spacing: -0.02em;
        }

        .order-detail__item-price {
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-heading);
          font-weight: 500;
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }

        .order-detail__address {
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 160%;
        }
        .order-detail__address p { margin: 0; }

        .order-detail__totals {
          padding: var(--space-4) var(--space-6);
          background: var(--bg-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
          margin-bottom: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .order-detail__totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-secondary);
          letter-spacing: -0.02em;
        }

        .order-detail__totals-row--total {
          padding-top: var(--space-3);
          border-top: 1px solid var(--border-subtle);
          font-size: var(--text-lg);
          color: var(--text-heading);
          font-weight: 500;
        }

        .order-detail__shipping-method {
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-weight: 400;
        }

        .order-detail__free-badge {
          color: var(--accent-sage);
          font-weight: 500;
        }

        .order-detail__notes {
          padding: var(--space-4) var(--space-6);
          background: var(--color-champagne-cream);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-secondary);
          letter-spacing: -0.02em;
          line-height: 140%;
        }

        .order-detail-skeleton {
          height: 400px;
          border-radius: var(--radius-lg);
          background: var(--color-champagne-cream);
          animation: od-shimmer 1.5s ease infinite;
        }
        @keyframes od-shimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }

        @media (prefers-reduced-motion: reduce) {
          .order-detail__back,
          .order-detail-skeleton {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
