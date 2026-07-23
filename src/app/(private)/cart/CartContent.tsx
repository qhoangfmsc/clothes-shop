"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ShoppingBag, ArrowLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  type CartItem,
  selectCartItems,
  selectTotalPrice,
  selectTotalItems,
  updateQuantity,
  removeItem,
  clearCart,
  syncUpdateCartItemQuantity,
  syncRemoveCartItem,
  clearCartOnServer,
} from "@/src/app/(private)/cart/_common/moduleSlice";
import UnauthenticatedState from "@/src/app/_components/UnauthenticatedState";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Quantity Stepper with debounced API sync ── */
function QuantityControl({ item }: { item: CartItem }) {
  const dispatch = useAppDispatch();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback(
    (delta: number) => {
      const newQty = item.quantity + delta;
      if (newQty < 1 || newQty > 10) return;
      dispatch(updateQuantity({ productId: item.productId, size: item.size, color: item.color, quantity: newQty }));

      /* Debounced API sync */
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (item.serverItemId) {
        debounceRef.current = setTimeout(() => {
          dispatch(syncUpdateCartItemQuantity({ serverItemId: item.serverItemId!, quantity: newQty }));
        }, 500);
      }
    },
    [item, dispatch]
  );

  return (
    <div className="flex items-center border border-[var(--border-light)] rounded-full overflow-hidden">
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--color-champagne-cream)] hover:text-[var(--text-primary)] disabled:text-[var(--text-disabled)] disabled:cursor-default transition-all duration-150"
        onClick={() => handleChange(-1)}
        disabled={item.quantity <= 1}
        aria-label="Decrease quantity"
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center font-primary text-sm text-[var(--text-primary)] font-medium tracking-[-0.02em]">{item.quantity}</span>
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--color-champagne-cream)] hover:text-[var(--text-primary)] disabled:text-[var(--text-disabled)] disabled:cursor-default transition-all duration-150"
        onClick={() => handleChange(1)}
        disabled={item.quantity >= 10}
        aria-label="Increase quantity"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ── Cart Item Row ── */
function CartItemRow({
  item,
  index,
}: {
  item: CartItem;
  index: number;
}) {
  const dispatch = useAppDispatch();

  const handleRemove = useCallback(() => {
    dispatch(removeItem({ productId: item.productId, size: item.size, color: item.color }));
    if (item.serverItemId) {
      dispatch(syncRemoveCartItem(item.serverItemId));
    }
  }, [item, dispatch]);

  const productUrl = `/shop/${item.category}/${item.subcategory}/${item.productId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [...ease], delay: Math.min(index * 0.05, 0.3) }}
      className="flex gap-4 p-4 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-subtle)] relative"
    >
      {/* Image */}
      <Link href={productUrl} className="shrink-0 no-underline">
        <div className="relative w-20 h-[106px] sm:w-[100px] sm:h-[133px] rounded-sm overflow-hidden bg-[var(--color-champagne-cream)]">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="100px"
            style={{ objectFit: "cover" }}
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <Link href={productUrl} className="font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] leading-[140%] no-underline font-medium line-clamp-2 hover:text-[var(--accent-primary)]">
          {item.name}
        </Link>
        <div className="flex items-center gap-1 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
          <span>Size: {item.size}</span>
          <span className="text-[var(--border-default)]">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-[var(--border-light)]" style={{ background: item.colorHex }} />
            {item.color}
          </span>
        </div>
        <span className="font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em]">
          ${item.price.toLocaleString()}
        </span>

        {/* Quantity + Remove */}
        <div className="flex items-center gap-3 mt-2">
          <QuantityControl item={item} />
          <button
            type="button"
            className="w-8 h-8 rounded-full border border-[var(--border-subtle)] bg-transparent flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--color-deep-rose)] hover:bg-[var(--color-rose-milk)] transition-all duration-150"
            onClick={handleRemove}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Line total */}
      <span className="absolute top-4 right-4 font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em]">
        ${(item.price * item.quantity).toLocaleString()}
      </span>
    </motion.div>
  );
}

/* ── Main Cart Content ── */
export default function CartContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const totalPrice = useAppSelector(selectTotalPrice);
  const totalItems = useAppSelector(selectTotalItems);

  const handleClearAll = useCallback(() => {
    dispatch(clearCartOnServer());
    dispatch(clearCart());
  }, [dispatch]);

  /* Loading */
  if (isLoading) {
    return (
      <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6">
          <div className="h-[60px] rounded-md bg-[var(--color-champagne-cream)] mb-8 animate-[cart-shimmer_1.5s_ease_infinite]" />
          <div className="h-[120px] rounded-md bg-[var(--color-champagne-cream)] mb-4 animate-[cart-shimmer_1.5s_ease_infinite]" />
          <div className="h-[120px] rounded-md bg-[var(--color-champagne-cream)] mb-4 animate-[cart-shimmer_1.5s_ease_infinite]" />
        </div>
      </main>
    );
  }

  /* Not authenticated */
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
        <UnauthenticatedState />
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease] }}
          className="flex flex-col gap-4 mb-8"
        >
          <Link href="/shop" className="inline-flex items-center gap-2 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium hover:text-[var(--text-primary)] transition-colors duration-150">
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>

          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-3 font-display font-normal text-2xl sm:text-3xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              <ShoppingBag size={24} style={{ color: "var(--accent-primary)" }} />
              Shopping Bag
            </h1>
            {totalItems > 0 && (
              <span className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em]">{totalItems} {totalItems === 1 ? "item" : "items"}</span>
            )}
          </div>

          {items.length > 0 && (
            <button onClick={handleClearAll} className="self-start py-2 px-4 rounded-full border border-[var(--border-light)] bg-transparent font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium cursor-pointer hover:bg-[var(--color-champagne-cream)] hover:text-[var(--text-primary)] transition-all duration-150">
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
            className="flex flex-col items-center gap-5 py-12 px-6 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] text-center"
          >
            <div className="w-20 h-20 rounded-full bg-[var(--color-champagne-cream)] flex items-center justify-center border border-[var(--border-subtle)]">
              <ShoppingBag size={40} style={{ color: "var(--text-disabled)" }} />
            </div>
            <h2 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">Your bag is empty</h2>
            <p className="font-primary text-base text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] max-w-80">
              Browse our collections and add your favorite pieces to get started
            </p>
            <Link href="/shop" className="inline-flex items-center gap-2 py-3 px-7 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90 hover:-translate-y-px transition-all duration-150">
              <ShoppingBag size={16} />
              Browse Shop
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8 md:flex-row md:gap-8 md:items-start">
            {/* Items list */}
            <div className="flex flex-col gap-4 md:flex-1 md:min-w-0">
              {items.map((item, idx) => (
                <CartItemRow
                  key={`${item.productId}-${item.size}-${item.color}`}
                  item={item}
                  index={idx}
                />
              ))}
            </div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
              className="p-6 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] flex flex-col gap-4 md:w-80 md:shrink-0 md:sticky md:top-[120px]"
            >
              <h2 className="font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">Order Summary</h2>

              {/* Free Shipping Progress */}
              {(() => {
                const FREE_THRESHOLD = 150;
                const remaining = FREE_THRESHOLD - totalPrice;
                const progress = Math.min((totalPrice / FREE_THRESHOLD) * 100, 100);
                const qualified = totalPrice >= FREE_THRESHOLD;
                return (
                  <div className={`py-3 px-4 rounded-md border transition-colors duration-150 ${
                    qualified
                      ? "bg-[var(--color-sage-cream)] border-[var(--accent-sage)]"
                      : "bg-[var(--color-champagne-cream)] border-[var(--border-subtle)]"
                  }`}>
                    <p className={`font-primary text-xs tracking-[-0.02em] leading-[140%] m-0 mb-2 text-center ${
                      qualified ? "text-[var(--accent-sage)] font-medium" : "text-[var(--text-secondary)]"
                    }`}>
                      {qualified
                        ? "🎉 You've unlocked free shipping!"
                        : `Spend $${remaining.toFixed(0)} more for free shipping`}
                    </p>
                    <div className="h-1 rounded-sm bg-[var(--border-light)] overflow-hidden">
                      <div
                        className={`h-full rounded-sm transition-[width] duration-400 ${
                          qualified ? "bg-[var(--accent-sage)]" : "bg-[var(--accent-primary)]"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-between items-center font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em]">
                <span>Subtotal</span>
                <span>${totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em]">
                <span>Shipping</span>
                <span className="text-xs text-[var(--text-muted)] italic">
                  {totalPrice >= 150 ? "Free" : "Calculated at checkout"}
                </span>
              </div>

              <div className="h-px bg-[var(--border-subtle)]" />

              <div className="flex justify-between items-center font-primary text-base text-[var(--text-heading)] font-medium tracking-[-0.02em]">
                <span>Total</span>
                <span>${totalPrice.toLocaleString()}</span>
              </div>

              <Link href="/checkout" className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90 hover:-translate-y-px transition-all duration-150">
                Proceed to Checkout
                <ChevronRight size={16} />
              </Link>

              <p className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] text-center">
                Free standard shipping on orders over $150.
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
