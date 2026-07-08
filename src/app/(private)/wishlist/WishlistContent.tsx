"use client";

import { useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart, Trash2, ChevronRight, ArrowLeft, ShoppingBag } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useWishlistStore } from "@/src/store/wishlist";
import UnauthenticatedState from "@/src/app/_components/UnauthenticatedState";
import { useToast } from "@/src/app/_components/Toast";

const ease = [0.25, 0.1, 0.25, 1] as const;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WishlistContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);
  const fetchFromApi = useWishlistStore((s) => s.fetchWishlistFromApi);
  const syncRemove = useWishlistStore((s) => s.syncRemoveFromApi);
  const { toast } = useToast();

  /* Sync wishlist from API on mount (authenticated only) */
  useEffect(() => {
    if (isAuthenticated) {
      fetchFromApi();
    }
  }, [isAuthenticated, fetchFromApi]);

  const handleRemove = useCallback(
    (productId: string, name: string) => {
      removeItem(productId);
      syncRemove(productId);
      toast.info(`${name} removed from wishlist`);
    },
    [removeItem, syncRemove, toast]
  );

  /* Loading */
  if (isLoading) {
    return (
      <main className="wishlist-page">
        <div className="wishlist-page__inner">
          <div className="wishlist-skeleton__header" />
          <div className="wishlist-skeleton__grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="wishlist-skeleton__card" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* Not authenticated */
  if (!isAuthenticated) {
    return (
      <main className="wishlist-page">
        <UnauthenticatedState />
      </main>
    );
  }

  return (
    <main className="wishlist-page">
      <div className="wishlist-page__inner">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease] }}
          className="wishlist-page__header"
        >
          <Link href="/account" className="wishlist-page__back">
            <ArrowLeft size={16} />
            Account
          </Link>

          <div className="wishlist-page__title-row">
            <h1 className="wishlist-page__title">
              <Heart size={24} style={{ color: "var(--accent-rose)" }} />
              My Wishlist
            </h1>
            {items.length > 0 && (
              <span className="wishlist-page__count">{items.length} items</span>
            )}
          </div>

          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              className="wishlist-page__clear-btn"
            >
              Clear All
            </button>
          )}
        </motion.div>

        {/* Empty state */}
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
            className="wishlist-empty"
          >
            <div className="wishlist-empty__icon-wrap">
              <Heart size={40} style={{ color: "var(--text-disabled)" }} />
            </div>
            <h2 className="wishlist-empty__title">Your wishlist is empty</h2>
            <p className="wishlist-empty__text">
              Browse our collections and tap the heart icon to save your favorite pieces
            </p>
            <Link href="/shop" className="wishlist-empty__cta">
              <ShoppingBag size={16} />
              Browse Shop
            </Link>

            {/* Feature preview */}
            <div className="wishlist-empty__features">
              <div className="wishlist-empty__feature">
                <span className="wishlist-empty__feature-dot" style={{ background: "var(--accent-rose)" }} />
                Save items you love
              </div>
              <div className="wishlist-empty__feature">
                <span className="wishlist-empty__feature-dot" style={{ background: "var(--accent-primary)" }} />
                Get notified on price drops
              </div>
              <div className="wishlist-empty__feature">
                <span className="wishlist-empty__feature-dot" style={{ background: "var(--accent-sage)" }} />
                Quick access to favorites
              </div>
            </div>
          </motion.div>
        ) : (
          /* Wishlist grid */
          <div className="wishlist-grid">
            {[...items].reverse().map((item, idx) => (
              <motion.div
                key={item.productId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [...ease],
                  delay: Math.min(idx * 0.04, 0.4),
                }}
                className="wishlist-card"
              >
                <Link
                  href={`/shop/${item.category}/${item.subcategory}/${item.productId}`}
                  className="wishlist-card__link"
                >
                  <div className="wishlist-card__image-wrap">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="wishlist-card__image"
                    />
                  </div>
                </Link>

                <div className="wishlist-card__info">
                  <Link
                    href={`/shop/${item.category}/${item.subcategory}/${item.productId}`}
                    className="wishlist-card__name"
                  >
                    {item.name}
                  </Link>
                  <span className="wishlist-card__price">
                    ${item.price.toLocaleString()}
                  </span>
                  <span className="wishlist-card__date">
                    Added {formatDate(item.addedAt)}
                  </span>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.productId, item.name)}
                  className="wishlist-card__remove"
                  aria-label={`Remove ${item.name} from wishlist`}
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Continue shopping */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="wishlist-page__footer"
          >
            <Link href="/shop" className="wishlist-page__continue">
              Continue Shopping <ChevronRight size={14} />
            </Link>
          </motion.div>
        )}
      </div>

      <style>{`
        .wishlist-page {
          min-height: 100vh;
          padding-top: 120px;
          padding-bottom: var(--space-16);
          background: var(--bg-primary);
        }

        .wishlist-page__inner {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 var(--space-4);
        }

        @media (min-width: 640px) {
          .wishlist-page__inner { padding: 0 var(--space-6); }
        }

        .wishlist-page__header {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }

        .wishlist-page__back {
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
        .wishlist-page__back:hover { color: var(--text-primary); }

        .wishlist-page__title-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .wishlist-page__title {
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
          .wishlist-page__title { font-size: var(--text-3xl); }
        }

        .wishlist-page__count {
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-muted);
          letter-spacing: -0.02em;
        }

        .wishlist-page__clear-btn {
          align-self: flex-start;
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-light);
          background: transparent;
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
          cursor: pointer;
          transition: background var(--duration-fast) var(--ease-default),
                      color var(--duration-fast) var(--ease-default);
        }
        .wishlist-page__clear-btn:hover {
          background: var(--color-champagne-cream);
          color: var(--text-primary);
        }

        /* ── Grid ── */
        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }

        @media (min-width: 640px) {
          .wishlist-grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-5); }
        }
        @media (min-width: 1024px) {
          .wishlist-grid { grid-template-columns: repeat(4, 1fr); }
        }

        /* ── Card ── */
        .wishlist-card {
          position: relative;
          background: var(--bg-elevated);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          overflow: hidden;
          transition: box-shadow var(--duration-fast) var(--ease-default);
        }
        .wishlist-card:hover {
          box-shadow: var(--shadow-md);
        }

        .wishlist-card__link {
          display: block;
          text-decoration: none;
        }

        .wishlist-card__image-wrap {
          aspect-ratio: 2/3;
          overflow: hidden;
          background: var(--color-champagne-cream);
        }

        .wishlist-card__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--duration-base) var(--ease-default);
        }
        .wishlist-card:hover .wishlist-card__image {
          transform: scale(1.03);
        }

        .wishlist-card__info {
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .wishlist-card__name {
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 140%;
          text-decoration: none;
          font-weight: 500;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .wishlist-card__name:hover { color: var(--accent-primary); }

        .wishlist-card__price {
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-secondary);
          letter-spacing: -0.02em;
        }

        .wishlist-card__date {
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-disabled);
          letter-spacing: -0.02em;
          margin-top: 2px;
        }

        .wishlist-card__remove {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(251, 248, 241, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-muted);
          opacity: 0;
          transition: opacity var(--duration-fast) var(--ease-default),
                      color var(--duration-fast) var(--ease-default),
                      background var(--duration-fast) var(--ease-default);
        }
        .wishlist-card:hover .wishlist-card__remove { opacity: 1; }
        .wishlist-card__remove:hover {
          color: var(--color-deep-rose);
          background: var(--color-rose-milk);
        }

        /* ── Empty ── */
        .wishlist-empty {
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

        .wishlist-empty__icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--color-champagne-cream);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-subtle);
        }

        .wishlist-empty__title {
          font-family: var(--font-display), serif;
          font-weight: var(--font-weight-display);
          font-size: var(--text-xl);
          color: var(--text-heading);
          letter-spacing: -0.04em;
          line-height: 100%;
        }

        .wishlist-empty__text {
          font-family: var(--font-primary);
          font-size: var(--text-base);
          color: var(--text-muted);
          letter-spacing: -0.02em;
          line-height: 140%;
          max-width: 320px;
        }

        .wishlist-empty__features {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding-top: var(--space-5);
          border-top: 1px solid var(--border-subtle);
          width: 100%;
          max-width: 280px;
        }

        .wishlist-empty__feature {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-muted);
          letter-spacing: -0.02em;
        }

        .wishlist-empty__feature-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .wishlist-empty__cta {
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
        .wishlist-empty__cta:hover { opacity: 0.9; transform: translateY(-1px); }

        /* ── Footer ── */
        .wishlist-page__footer {
          display: flex;
          justify-content: center;
          padding-top: var(--space-10);
        }

        .wishlist-page__continue {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-accent);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          font-weight: 500;
          transition: opacity var(--duration-fast) var(--ease-default);
        }
        .wishlist-page__continue:hover { opacity: 0.75; }

        /* ── Skeleton ── */
        .wishlist-skeleton__header {
          height: 60px;
          border-radius: var(--radius-md);
          background: var(--color-champagne-cream);
          margin-bottom: var(--space-8);
          animation: wishlist-shimmer 1.5s ease infinite;
        }
        .wishlist-skeleton__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }
        @media (min-width: 640px) {
          .wishlist-skeleton__grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .wishlist-skeleton__grid { grid-template-columns: repeat(4, 1fr); }
        }
        .wishlist-skeleton__card {
          aspect-ratio: 2/3.5;
          border-radius: var(--radius-md);
          background: var(--color-champagne-cream);
          animation: wishlist-shimmer 1.5s ease infinite;
        }
        @keyframes wishlist-shimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }

        @media (prefers-reduced-motion: reduce) {
          .wishlist-card__image,
          .wishlist-card__remove,
          .wishlist-card,
          .wishlist-page__back,
          .wishlist-page__clear-btn,
          .wishlist-empty__cta,
          .wishlist-page__continue,
          .wishlist-card__name,
          .wishlist-skeleton__header,
          .wishlist-skeleton__card {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
