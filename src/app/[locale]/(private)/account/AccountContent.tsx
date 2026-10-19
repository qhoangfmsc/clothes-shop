"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { useProductLink } from "@/src/hooks/use-api";
import { hasPublicPrice } from "@/src/lib/product-purchase";
import { Link } from "@/src/i18n/navigation";
import Image from "next/image";
import { Heart, Package, ChevronRight, ShoppingBag, Sparkles } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useAppSelector } from "@/src/store/hooks";
import { selectWishlistItems } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import { UserAvatar } from "@/src/app/[locale]/_components/UserMenu";
import SignOutButton from "@/src/app/[locale]/_components/SignOutButton";
import Carousel from "@/src/app/[locale]/_components/Carousel";
import { useOrderPaymentStatusLabel, useOrderStatusLabel } from "@/src/i18n/use-labels";

interface OrderPreview {
  id: string;
  status: string;
  paymentStatus?: string;
  totalVnd: number;
  totalUsd: number;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    productImage: string;
    quantity: number;
    priceVnd: number;
    priceUsd: number;
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
      className="flex items-center gap-4 px-1 py-2 sm:gap-6 sm:px-6 sm:py-4 lg:flex-col lg:gap-5 lg:rounded-lg lg:border lg:border-[var(--border-subtle)] lg:bg-[var(--bg-elevated)] lg:px-6 lg:py-8 lg:text-center lg:shadow-[var(--shadow-sm)]"
    >
      <div className="relative shrink-0">
        <UserAvatar user={user} size={64} className="!border-2 !border-[var(--border-default)]" />
        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-[var(--text-on-gold)] border-2 border-[var(--bg-primary)]">
          <Sparkles size={9} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:w-full lg:flex-none">
        <h1 className="truncate font-display font-normal text-xl sm:text-3xl lg:text-2xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
          {user.name ?? t("welcome")}
        </h1>
        <p className="truncate font-primary text-sm sm:text-base text-[var(--text-secondary)] tracking-[-0.02em] leading-[140%]">
          {user.email}
        </p>
        <p className="font-primary text-xs text-[var(--text-muted)] tracking-[0.04em] uppercase mt-1">
          {t("memberSince", { date: format.dateTime(new Date(user.createdAt), "long") })}
        </p>
      </div>

      {/* Icon button beside the profile below lg, full text button inside the card on lg */}
      <SignOutButton variant="profile" />
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════
   Wishlist Section
   ═══════════════════════════════════════════════ */
function WishlistSection() {
  const t = useTranslations("private.account.wishlist");
  const tCommon = useTranslations("common");
  const { fmt } = useMoney();
  const items = useAppSelector(selectWishlistItems);
  const productLink = useProductLink();
  const latestItems = items.slice(-4).reverse();

  return (
    <motion.section
      id="wishlist"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
      className="bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-5 sm:px-6 border-b border-[var(--border-subtle)]">
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
          <p className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] max-w-[17.5rem]">
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
        <div className="px-4 pb-5 pt-4 sm:px-6">
          <Carousel
            ariaLabel={t("carouselAria")}
            slidesPerView={{ base: 2.5, sm: 4 }}
            gap={{ base: 3, sm: 4 }}
            // at most 4 recent items: swipe only — nothing to loop, auto-advance or paginate
            arrows={false}
            dots={false}
            autoplay={false}
            loop={false}
          >
            {latestItems.map((item, idx) => (
              <motion.div
                key={item.productId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [...ease], delay: 0.15 + idx * 0.05 }}
              >
                <Link
                  {...productLink(item)}
                  className="group flex flex-col gap-2 no-underline transition-opacity duration-150 hover:opacity-85 motion-reduce:transition-none"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-[var(--color-champagne-cream)]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 40vw, 160px"
                      className="object-cover transition-transform duration-300 ease-[var(--ease-default)] group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-primary text-xs text-[var(--text-primary)] tracking-[-0.02em] leading-[140%]">
                      {item.name}
                    </span>
                    <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                      {hasPublicPrice(item.badge) ? fmt(item, "price") : tCommon("priceOnRequest")}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </Carousel>
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
  const { fmt } = useMoney();
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
      transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
      className="bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-5 sm:px-6 border-b border-[var(--border-subtle)]">
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
          <div className="h-[3.25rem] rounded-md bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
          <div className="h-[3.25rem] rounded-md bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
          <ShoppingBag size={32} style={{ color: "var(--text-disabled)" }} />
          <p className="font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            {t("emptyTitle")}
          </p>
          <p className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] max-w-[17.5rem]">
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
            const thumb = order.items.find((i) => i.productImage)?.productImage;

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
                  className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 no-underline border-b border-[var(--border-subtle)] last:border-b-0 transition-colors duration-150 hover:bg-[var(--color-champagne-cream)] motion-reduce:transition-none"
                >
                  {/* First product image — small square */}
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--color-champagne-cream)] text-[var(--text-disabled)]">
                    {thumb ? (
                      <Image src={thumb} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <Package size={18} />
                    )}
                  </div>

                  {/* Date + item count (the order id stays in the link only) */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                      {format.dateTime(new Date(order.createdAt), "short")}
                    </span>
                    <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                      {t("itemCount", { count: order.items.length })}
                    </span>
                  </div>

                  {/* Status + Total */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span
                      className="font-primary text-[0.6875rem] font-medium tracking-[0.04em] uppercase"
                      style={{ color: statusColor }}
                    >
                      {statusLabel(order.status)}
                    </span>
                    {order.paymentStatus && (
                      <span className="hidden font-primary text-[0.6875rem] text-[var(--text-muted)] tracking-[0.02em] sm:block">
                        {paymentLabel(order.paymentStatus)}
                      </span>
                    )}
                    <span className="font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em]">
                      {fmt(order, "total")}
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
   Loading Skeleton
   ═══════════════════════════════════════════════ */
function AccountSkeleton() {
  return (
    <main className="min-h-screen pt-[7.5rem] pb-16 bg-[var(--bg-primary)]">
      <div className="max-w-[45rem] lg:max-w-[67.5rem] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:items-start lg:gap-8">
        <div className="flex items-center gap-4 py-2 sm:gap-6 sm:py-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex-col lg:py-8">
          <div className="w-16 h-16 shrink-0 rounded-full bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
          <div className="flex flex-col gap-2 lg:items-center">
            <div className="w-[11.25rem] h-6 rounded-sm bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
            <div className="w-[7.5rem] h-4 rounded-sm bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
          </div>
        </div>
        <div className="h-[12.5rem] rounded-lg lg:col-start-1 lg:row-start-1 bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
        <div className="h-[12.5rem] rounded-lg lg:col-start-1 lg:row-start-2 bg-[var(--color-champagne-cream)] animate-[skeleton-shimmer_1.5s_ease_infinite] motion-reduce:animate-none motion-reduce:opacity-40" />
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════
   Main Account Content
   ═══════════════════════════════════════════════ */
export default function AccountContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  /* Loading state */
  if (isLoading) {
    return <AccountSkeleton />;
  }

  /* Not logged in — show inline unauthenticated state */
  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen pt-[7.5rem] pb-16 bg-[var(--bg-primary)]">
        <UnauthenticatedState />
      </main>
    );
  }

  /* Logged in — full account page */
  return (
    <main className="min-h-screen pt-[7.5rem] pb-16 bg-[var(--bg-primary)]">
      <div className="max-w-[45rem] lg:max-w-[67.5rem] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:items-start lg:gap-8">
        {/* Phone/tablet: profile → orders → wishlist. lg: orders + wishlist left, sticky profile card right */}
        <div className="lg:sticky lg:top-[6.5rem] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <ProfileHeader user={user} />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <OrdersSection />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <WishlistSection />
        </div>
      </div>
    </main>
  );
}
