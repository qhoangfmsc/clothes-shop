"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { hasPublicPrice } from "@/src/lib/product-purchase";
import { Link } from "@/src/i18n/navigation";
import Image from "next/image";
import { Heart, Package, LogOut, ChevronRight, ShoppingBag, Sparkles } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useAppSelector } from "@/src/store/hooks";
import { selectWishlistItems } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import { UserAvatar } from "@/src/app/[locale]/_components/UserMenu";
import { useOrderPaymentStatusLabel, useOrderStatusLabel } from "@/src/i18n/use-labels";

interface OrderPreview {
  id: string;
  status: string;
  paymentStatus?: string;
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

/* ═══════════════════════════════════════════════
   Profile Header
   ═══════════════════════════════════════════════ */
function ProfileHeader({
  user,
}: {
  user: { name: string | null; email: string; image: string | null; createdAt: string };
}) {
  const t = useTranslations("private.account.profile");
  const format = useFormatter();
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease] }}
      className="flex flex-col items-center gap-5 px-6 py-8 text-center sm:flex-row sm:text-left sm:gap-6"
    >
      <div className="relative">
        <UserAvatar user={user} size={80} className="!border-2 !border-[var(--border-default)]" />
        <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-[var(--text-on-gold)] border-2 border-[var(--bg-primary)]">
          <Sparkles size={10} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-display font-normal text-2xl sm:text-3xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
          {user.name ?? t("welcome")}
        </h1>
        <p className="font-primary text-base text-[var(--text-secondary)] tracking-[-0.02em] leading-[140%]">
          {user.email}
        </p>
        <p className="font-primary text-xs text-[var(--text-muted)] tracking-[0.04em] uppercase mt-1">
          {t("memberSince", { date: format.dateTime(new Date(user.createdAt), "long") })}
        </p>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════
   Wishlist Section
   ═══════════════════════════════════════════════ */
function WishlistSection() {
  const t = useTranslations("private.account.wishlist");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const items = useAppSelector(selectWishlistItems);
  const latestItems = items.slice(-4).reverse();

  return (
    <motion.section
      id="wishlist"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
      className="bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Heart size={18} style={{ color: "var(--accent-rose)" }} />
          <h2 className="font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            {t("title")}
          </h2>
          {items.length > 0 && (
            <span className="font-primary text-xs text-[var(--text-on-gold)] bg-[var(--accent-primary)] rounded-full py-0.5 px-2 font-medium tracking-[-0.02em] leading-[140%]">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <Link
            href="/wishlist"
            className="inline-flex items-center gap-1 font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium transition-opacity duration-150 hover:opacity-75 motion-reduce:transition-none"
          >
            {t("viewAll")} <ChevronRight size={14} />
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
          <Heart size={32} style={{ color: "var(--text-disabled)" }} />
          <p className="font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            {t("emptyTitle")}
          </p>
          <p className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] max-w-[280px]">
            {t("emptyDescription")}
          </p>
          <div className="flex flex-col items-center gap-2 mt-2 sm:flex-row sm:gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium py-2 px-5 rounded-full border border-[var(--border-light)] transition-colors duration-150 hover:bg-[var(--color-champagne-cream)] hover:border-[var(--accent-primary)] motion-reduce:transition-none"
            >
              {t("browse")} <ChevronRight size={14} />
            </Link>
            <Link
              href="/wishlist"
              className="inline-flex items-center gap-1 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium py-2 px-4 transition-colors duration-150 hover:text-[var(--text-accent)] motion-reduce:transition-none"
            >
              {t("goTo")} <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--border-subtle)]">
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
              className="bg-[var(--bg-elevated)]"
            >
              <Link
                href={`/shop/${item.category}/${item.subcategory}/${item.productId}`}
                className="flex flex-col no-underline group transition-opacity duration-150 hover:opacity-85 motion-reduce:transition-none"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-[var(--color-champagne-cream)]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 ease-[var(--ease-default)] group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                </div>
                <div className="p-3 pb-4 flex flex-col gap-1">
                  <span className="font-primary text-xs text-[var(--text-primary)] tracking-[-0.02em] leading-[140%] truncate">
                    {item.name}
                  </span>
                  <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                    {hasPublicPrice(item.badge) ? format.number(item.price, "price") : tCommon("priceOnRequest")}
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
  const t = useTranslations("private.account.orders");
  const format = useFormatter();
  const statusLabel = useOrderStatusLabel();
  const paymentLabel = useOrderPaymentStatusLabel();
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

  const STATUS_COLORS: Record<string, string> = {
    pending: "var(--accent-primary)",
    confirmed: "var(--accent-blue)",
    shipping: "var(--accent-sage)",
    delivered: "var(--accent-sage)",
    completed: "var(--accent-sage)",
    cancelled: "var(--color-deep-rose)",
  };

  return (
    <motion.section
      id="orders"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
      className="bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Package size={18} style={{ color: "var(--accent-blue)" }} />
          <h2 className="font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            {t("title")}
          </h2>
          {orders.length > 0 && (
            <span className="font-primary text-xs text-[var(--text-on-gold)] bg-[var(--accent-primary)] rounded-full py-0.5 px-2 font-medium tracking-[-0.02em] leading-[140%]">
              {orders.length}
            </span>
          )}
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium transition-opacity duration-150 hover:opacity-75 motion-reduce:transition-none"
        >
          {t("viewAll")} <ChevronRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 px-6 py-4">
          <div className="h-[52px] rounded-md bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
          <div className="h-[52px] rounded-md bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
          <ShoppingBag size={32} style={{ color: "var(--text-disabled)" }} />
          <p className="font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            {t("emptyTitle")}
          </p>
          <p className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] max-w-[280px]">
            {t("emptyDescription")}
          </p>
          <div className="flex flex-col items-center gap-2 mt-2 sm:flex-row sm:gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium py-2 px-5 rounded-full border border-[var(--border-light)] transition-colors duration-150 hover:bg-[var(--color-champagne-cream)] hover:border-[var(--accent-primary)] motion-reduce:transition-none"
            >
              {t("startShopping")} <ChevronRight size={14} />
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium py-2 px-4 transition-colors duration-150 hover:text-[var(--text-accent)] motion-reduce:transition-none"
            >
              {t("goTo")} <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {orders.map((order, idx) => {
            const statusColor = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
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
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 px-6 py-4 no-underline border-b border-[var(--border-subtle)] last:border-b-0 transition-colors duration-150 hover:bg-[var(--color-champagne-cream)] motion-reduce:transition-none"
                >
                  {/* Info */}
                  <div className="shrink-0 flex flex-col gap-0.5">
                    <span className="font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                      #{order.id}
                    </span>
                    <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                      {t("summary", {
                        count: order.items.length,
                        date: format.dateTime(new Date(order.createdAt), "short"),
                      })}
                    </span>
                  </div>

                  {/* Thumbnail stack */}
                  <div className="flex flex-1 min-w-0 ">
                    {thumbs.map((src, i) => (
                      <div
                        key={i}
                        className={`relative w-8 h-8 rounded-full overflow-hidden border-2 border-[var(--bg-elevated)] bg-[var(--color-champagne-cream)] ${i > 0 ? "-ml-2.5" : ""}`}
                        style={{ zIndex: thumbs.length - i }}
                      >
                        <Image src={src} alt="" fill sizes="30px" style={{ objectFit: "cover" }} />
                      </div>
                    ))}
                    {thumbs.length === 0 && (
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--bg-elevated)] bg-[var(--color-champagne-cream)] flex items-center justify-center text-[var(--text-disabled)]">
                        <Package size={16} />
                      </div>
                    )}
                  </div>

                  {/* Status + Total */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span
                      className="font-primary text-[11px] font-medium tracking-[0.04em] uppercase"
                      style={{ color: statusColor }}
                    >
                      {statusLabel(order.status)}
                    </span>
                    {order.paymentStatus && (
                      <span className="font-primary text-[11px] text-[var(--text-muted)] tracking-[0.02em]">
                        {paymentLabel(order.paymentStatus)}
                      </span>
                    )}
                    <span className="font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em]">
                      {format.number(Number(order.total), "price")}
                    </span>
                  </div>

                  <ChevronRight size={14} className="text-[var(--text-disabled)] shrink-0" />
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
  const t = useTranslations("private.account");
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.3 }}
      className="flex justify-center py-4"
    >
      <button
        onClick={onSignOut}
        className="inline-flex items-center gap-2 py-3 px-6 rounded-full border border-[var(--border-light)] bg-transparent cursor-pointer font-primary text-sm text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium transition-colors duration-150 hover:bg-[var(--color-champagne-cream)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] motion-reduce:transition-none"
      >
        <LogOut size={16} />
        {t("signOut")}
      </button>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════════ */
function AccountSkeleton() {
  return (
    <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-10">
        <div className="flex flex-col items-center gap-4 py-10 sm:flex-row sm:gap-6">
          <div className="w-20 h-20 rounded-full bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
          <div className="flex flex-col gap-2 items-center sm:items-start">
            <div className="w-[180px] h-6 rounded-sm bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
            <div className="w-[120px] h-4 rounded-sm bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
          </div>
        </div>
        <div className="h-[200px] rounded-lg bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
        <div className="h-[200px] rounded-lg bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
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
      <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
        <UnauthenticatedState />
      </main>
    );
  }

  /* Logged in — full account page */
  return (
    <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8 sm:gap-10">
        <ProfileHeader user={user} />
        <WishlistSection />
        <OrdersSection />
        <SignOutSection onSignOut={logout} />
      </div>
    </main>
  );
}
