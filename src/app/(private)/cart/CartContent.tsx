"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ShoppingBag, ArrowLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useCartStore, type CartItem } from "@/src/store/cart";
import UnauthenticatedState from "@/src/app/_components/UnauthenticatedState";
import "./cart.css";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Quantity Stepper with debounced API sync ── */
function QuantityControl({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const syncUpdate = useCartStore((s) => s.syncUpdateQuantityApi);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback(
    (delta: number) => {
      const newQty = item.quantity + delta;
      if (newQty < 1 || newQty > 10) return;
      updateQuantity(item.productId, item.size, item.color, newQty);

      /* Debounced API sync */
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (item.serverItemId) {
        debounceRef.current = setTimeout(() => {
          syncUpdate(item.serverItemId!, newQty);
        }, 500);
      }
    },
    [item, updateQuantity, syncUpdate]
  );

  return (
    <div className="cart-qty">
      <button
        type="button"
        className="cart-qty__btn"
        onClick={() => handleChange(-1)}
        disabled={item.quantity <= 1}
        aria-label="Decrease quantity"
      >
        <Minus size={14} />
      </button>
      <span className="cart-qty__value">{item.quantity}</span>
      <button
        type="button"
        className="cart-qty__btn"
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
  const removeItem = useCartStore((s) => s.removeItem);
  const syncRemove = useCartStore((s) => s.syncRemoveFromApi);

  const handleRemove = useCallback(() => {
    removeItem(item.productId, item.size, item.color);
    if (item.serverItemId) {
      syncRemove(item.serverItemId);
    }
  }, [item, removeItem, syncRemove]);

  const productUrl = `/shop/${item.category}/${item.subcategory}/${item.productId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [...ease], delay: Math.min(index * 0.05, 0.3) }}
      className="cart-item"
    >
      {/* Image */}
      <Link href={productUrl} className="cart-item__image-link">
        <div className="cart-item__image-wrap">
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
      <div className="cart-item__info">
        <Link href={productUrl} className="cart-item__name">
          {item.name}
        </Link>
        <div className="cart-item__meta">
          <span>Size: {item.size}</span>
          <span className="cart-item__meta-sep">·</span>
          <span className="cart-item__color">
            <span className="cart-item__color-dot" style={{ background: item.colorHex }} />
            {item.color}
          </span>
        </div>
        <span className="cart-item__price">
          ${item.price.toLocaleString()}
        </span>

        {/* Quantity + Remove */}
        <div className="cart-item__actions">
          <QuantityControl item={item} />
          <button
            type="button"
            className="cart-item__remove"
            onClick={handleRemove}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Line total */}
      <span className="cart-item__total">
        ${(item.price * item.quantity).toLocaleString()}
      </span>
    </motion.div>
  );
}

/* ── Main Cart Content ── */
export default function CartContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const totalItems = useCartStore((s) => s.totalItems());
  const clearCart = useCartStore((s) => s.clearCart);
  const clearCartApi = useCartStore((s) => s.clearCartApi);

  const handleClearAll = useCallback(() => {
    clearCartApi();
    clearCart();
  }, [clearCart, clearCartApi]);

  /* Loading */
  if (isLoading) {
    return (
      <main className="cart-page">
        <div className="cart-page__inner">
          <div className="cart-skeleton__header" />
          <div className="cart-skeleton__item" />
          <div className="cart-skeleton__item" />
        </div>
      </main>
    );
  }

  /* Not authenticated */
  if (!isAuthenticated) {
    return (
      <main className="cart-page">
        <UnauthenticatedState />
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-page__inner">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease] }}
          className="cart-page__header"
        >
          <Link href="/shop" className="cart-page__back">
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>

          <div className="cart-page__title-row">
            <h1 className="cart-page__title">
              <ShoppingBag size={24} style={{ color: "var(--accent-primary)" }} />
              Shopping Bag
            </h1>
            {totalItems > 0 && (
              <span className="cart-page__count">{totalItems} {totalItems === 1 ? "item" : "items"}</span>
            )}
          </div>

          {items.length > 0 && (
            <button onClick={handleClearAll} className="cart-page__clear-btn">
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
            className="cart-empty"
          >
            <div className="cart-empty__icon-wrap">
              <ShoppingBag size={40} style={{ color: "var(--text-disabled)" }} />
            </div>
            <h2 className="cart-empty__title">Your bag is empty</h2>
            <p className="cart-empty__text">
              Browse our collections and add your favorite pieces to get started
            </p>
            <Link href="/shop" className="cart-empty__cta">
              <ShoppingBag size={16} />
              Browse Shop
            </Link>
          </motion.div>
        ) : (
          <div className="cart-layout">
            {/* Items list */}
            <div className="cart-items">
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
              className="cart-summary"
            >
              <h2 className="cart-summary__title">Order Summary</h2>

              {/* Free Shipping Progress */}
              {(() => {
                const FREE_THRESHOLD = 150;
                const remaining = FREE_THRESHOLD - totalPrice;
                const progress = Math.min((totalPrice / FREE_THRESHOLD) * 100, 100);
                const qualified = totalPrice >= FREE_THRESHOLD;
                return (
                  <div className={`cart-shipping-bar ${qualified ? "cart-shipping-bar--done" : ""}`}>
                    <p className="cart-shipping-bar__text">
                      {qualified
                        ? "🎉 You've unlocked free shipping!"
                        : `Spend $${remaining.toFixed(0)} more for free shipping`}
                    </p>
                    <div className="cart-shipping-bar__track">
                      <div
                        className="cart-shipping-bar__fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="cart-summary__row">
                <span>Subtotal</span>
                <span>${totalPrice.toLocaleString()}</span>
              </div>
              <div className="cart-summary__row">
                <span>Shipping</span>
                <span className="cart-summary__shipping">
                  {totalPrice >= 150 ? "Free" : "Calculated at checkout"}
                </span>
              </div>

              <div className="cart-summary__divider" />

              <div className="cart-summary__row cart-summary__row--total">
                <span>Total</span>
                <span>${totalPrice.toLocaleString()}</span>
              </div>

              <Link href="/checkout" className="cart-summary__checkout-btn">
                Proceed to Checkout
                <ChevronRight size={16} />
              </Link>

              <p className="cart-summary__note">
                Free standard shipping on orders over $150.
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
