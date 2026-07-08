"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Heart, Package, LogOut, ChevronRight, ShoppingBag, Sparkles } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useWishlistStore } from "@/src/store/wishlist";
import UnauthenticatedState from "@/src/app/_components/UnauthenticatedState";
import { UserAvatar } from "@/src/app/_components/UserMenu";
import "./account.css";

interface OrderPreview {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
    size: string;
    color: string;
  }>;
}

const ease = [0.25, 0.1, 0.25, 1] as const;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ═══════════════════════════════════════════════
   Profile Header
   ═══════════════════════════════════════════════ */
function ProfileHeader({
  user,
}: {
  user: { name: string | null; email: string; image: string | null; createdAt: string };
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease] }}
      className="account-profile-header"
    >
      <div className="account-profile-header__avatar-wrap">
        <UserAvatar user={user} size={80} className="account-profile-header__avatar" />
        <div className="account-profile-header__badge">
          <Sparkles size={10} />
        </div>
      </div>

      <div className="account-profile-header__info">
        <h1 className="account-profile-header__name">{user.name ?? "Welcome"}</h1>
        <p className="account-profile-header__email">{user.email}</p>
        <p className="account-profile-header__member-since">
          Member since {formatDate(user.createdAt)}
        </p>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════
   Wishlist Section
   ═══════════════════════════════════════════════ */
function WishlistSection() {
  const items = useWishlistStore((s) => s.items);
  const latestItems = items.slice(-4).reverse();

  return (
    <motion.section
      id="wishlist"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
      className="account-section"
    >
      <div className="account-section__header">
        <div className="account-section__header-left">
          <Heart size={18} style={{ color: "var(--accent-rose)" }} />
          <h2 className="account-section__title">Wishlist</h2>
          {items.length > 0 && <span className="account-section__count">{items.length}</span>}
        </div>
        {items.length > 0 && (
          <Link href="/wishlist" className="account-section__view-all">
            View All <ChevronRight size={14} />
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="account-empty-state">
          <Heart size={32} style={{ color: "var(--text-disabled)" }} />
          <p className="account-empty-state__text">Your wishlist is empty</p>
          <p className="account-empty-state__subtext">
            Tap the heart icon on any product to save it here
          </p>
          <div className="account-empty-state__actions">
            <Link href="/shop" className="account-empty-state__cta">
              Browse Shop <ChevronRight size={14} />
            </Link>
            <Link href="/wishlist" className="account-empty-state__cta-secondary">
              Go to Wishlist <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="account-wishlist-grid">
          {latestItems.map((item, idx) => (
            <motion.div
              key={item.productId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                ease: [...ease],
                delay: 0.15 + idx * 0.05,
              }}
              className="account-wishlist-card"
            >
              <Link
                href={`/shop/${item.category}/${item.subcategory}/${item.productId}`}
                className="account-wishlist-card__link"
              >
                <div className="account-wishlist-card__image-wrap">
                  <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="account-wishlist-card__image" />
                </div>
                <div className="account-wishlist-card__info">
                  <span className="account-wishlist-card__name">{item.name}</span>
                  <span className="account-wishlist-card__price">
                    ${item.price.toLocaleString()}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════
   Orders Section — Live Data
   ═══════════════════════════════════════════════ */
function OrdersSection() {
  const { isAuthenticated } = useAuth();
  const { apiFetch } = useApiAuth();
  const [orders, setOrders] = useState<OrderPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchOrders = async () => {
      try {
        const res = await apiFetch<{
          data: OrderPreview[];
        }>("/api/orders");
        setOrders((res.data ?? []).slice(0, 3));
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [isAuthenticated, apiFetch]);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "var(--accent-primary)" },
    confirmed: { label: "Confirmed", color: "var(--accent-blue)" },
    shipping: { label: "Shipping", color: "var(--accent-sage)" },
    shipped: { label: "Shipped", color: "var(--accent-sage)" },
    delivered: { label: "Delivered", color: "var(--accent-sage)" },
    completed: { label: "Completed", color: "var(--accent-sage)" },
    cancelled: { label: "Cancelled", color: "var(--color-deep-rose)" },
  };

  return (
    <motion.section
      id="orders"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
      className="account-section"
    >
      <div className="account-section__header">
        <div className="account-section__header-left">
          <Package size={18} style={{ color: "var(--accent-blue)" }} />
          <h2 className="account-section__title">Order History</h2>
          {orders.length > 0 && <span className="account-section__count">{orders.length}</span>}
        </div>
        <Link href="/orders" className="account-section__view-all">
          View All <ChevronRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="account-orders-skeleton">
          <div className="account-orders-skeleton__row" />
          <div className="account-orders-skeleton__row" />
        </div>
      ) : orders.length === 0 ? (
        <div className="account-empty-state">
          <ShoppingBag size={32} style={{ color: "var(--text-disabled)" }} />
          <p className="account-empty-state__text">No orders yet</p>
          <p className="account-empty-state__subtext">
            When you place your first order, it will appear here
          </p>
          <div className="account-empty-state__actions">
            <Link href="/shop" className="account-empty-state__cta">
              Start Shopping <ChevronRight size={14} />
            </Link>
            <Link href="/orders" className="account-empty-state__cta-secondary">
              Go to Orders <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="account-orders-list">
          {orders.map((order, idx) => {
            const sc = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
            const thumbs = order.items
              .map((i) => i.productImage)
              .filter(Boolean)
              .slice(0, 3);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [...ease],
                  delay: 0.15 + idx * 0.06,
                }}
              >
                <Link href={`/orders/${order.id}`} className="account-order-card">
                  {/* Thumbnail stack */}
                  <div className="account-order-card__thumbs">
                    {thumbs.map((src, i) => (
                      <div
                        key={i}
                        className="account-order-card__thumb"
                        style={{ zIndex: thumbs.length - i }}
                      >
                        <Image src={src} alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
                      </div>
                    ))}
                    {thumbs.length === 0 && (
                      <div className="account-order-card__thumb account-order-card__thumb--empty">
                        <Package size={16} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="account-order-card__info">
                    <span className="account-order-card__id">#{order.id}</span>
                    <span className="account-order-card__meta">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""} ·{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Status + Total */}
                  <div className="account-order-card__right">
                    <span className="account-order-card__status" style={{ color: sc.color }}>
                      {sc.label}
                    </span>
                    <span className="account-order-card__total">
                      ${Number(order.total).toLocaleString()}
                    </span>
                  </div>

                  <ChevronRight size={14} className="account-order-card__arrow" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════
   Sign Out Section
   ═══════════════════════════════════════════════ */
function SignOutSection({ onSignOut }: { onSignOut: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.3 }}
      className="account-signout-section"
    >
      <button onClick={onSignOut} className="account-signout-btn">
        <LogOut size={16} />
        Sign Out
      </button>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════════ */
function AccountSkeleton() {
  return (
    <main className="account-page">
      <div className="account-page__inner">
        <div className="account-skeleton">
          <div className="account-skeleton__avatar" />
          <div className="account-skeleton__lines">
            <div className="account-skeleton__line account-skeleton__line--lg" />
            <div className="account-skeleton__line account-skeleton__line--sm" />
          </div>
        </div>
        <div className="account-skeleton__card" />
        <div className="account-skeleton__card" />
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════
   Main Account Content
   ═══════════════════════════════════════════════ */
export default function AccountContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  /* Loading state */
  if (isLoading) {
    return <AccountSkeleton />;
  }

  /* Not logged in — show inline unauthenticated state */
  if (!isAuthenticated || !user) {
    return (
      <main className="account-page">
        <UnauthenticatedState />
      </main>
    );
  }

  /* Logged in — full account page */
  return (
    <main className="account-page">
      <div className="account-page__inner">
        <ProfileHeader user={user} />
        <WishlistSection />
        <OrdersSection />
        <SignOutSection onSignOut={logout} />
      </div>
    </main>
  );
}
