"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/src/i18n/navigation";
import { Trash2, ShoppingBag, ArrowLeft, ChevronRight, Minus, Plus, Heart } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  type CartItem,
  cartItemKey,
  selectCartItems,
  selectDeselectedKeys,
  selectSelectedCartItems,
  selectSelectedTotalPrice,
  selectTotalItems,
  selectSelectedTotalItems,
  updateQuantity,
  removeItem,
  removeItems,
  toggleItemSelected,
  setAllSelected,
  syncUpdateCartItemQuantity,
  syncRemoveCartItem,
} from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import {
  selectWishlistItems,
  selectIsWishlisted,
  toggleWishlistItem,
  syncAddToWishlist,
  syncRemoveFromWishlist,
} from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import Checkbox from "@/src/app/[locale]/_components/Checkbox";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";

const ease = [0.25, 0.1, 0.25, 1] as const;

/** Orders at or above this subtotal (USD) ship free */
const FREE_SHIPPING_THRESHOLD = 150;

/* ── Quantity Stepper with debounced API sync ── */
function QuantityControl({ item }: { item: CartItem }) {
  const t = useTranslations("private.cart.quantity");
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
        aria-label={t("decrease")}
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center font-primary text-sm text-[var(--text-primary)] font-medium tracking-[-0.02em]">{item.quantity}</span>
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--color-champagne-cream)] hover:text-[var(--text-primary)] disabled:text-[var(--text-disabled)] disabled:cursor-default transition-all duration-150"
        onClick={() => handleChange(1)}
        disabled={item.quantity >= 10}
        aria-label={t("increase")}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ── Icon-only button: the label shows on hover / keyboard focus and is the accessible name ── */
function IconButton({
  label,
  onClick,
  disabled = false,
  pressed,
  size = "md",
  align = "end",
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Set for toggle buttons so assistive tech announces the on / off state. */
  pressed?: boolean;
  size?: "sm" | "md";
  /** Which edge of the button the tooltip lines up with. */
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
        className={`${size === "sm" ? "w-8 h-8" : "w-9 h-9"} flex items-center justify-center rounded-full border border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed motion-reduce:transition-none ${className}`}
      >
        {children}
      </button>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-sm bg-[var(--bg-dark)] px-2.5 py-1.5 font-primary text-xs tracking-[-0.02em] text-[var(--text-on-dark)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 motion-reduce:transition-none ${align === "end" ? "right-0" : "left-0"}`}
      >
        {label}
      </span>
    </span>
  );
}

/* ── Cart Item Row ── */
function CartItemRow({
  item,
  index,
  selected,
  onToggleSelected,
}: {
  item: CartItem;
  index: number;
  selected: boolean;
  onToggleSelected: (item: CartItem) => void;
}) {
  const t = useTranslations("private.cart.item");
  const format = useFormatter();
  const tBulk = useTranslations("private.cart.bulk.confirmRemove");
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { toast } = useToast();
  const isWishlisted = useAppSelector(selectIsWishlisted(item.productId));

  const handleToggleWishlist = useCallback(() => {
    dispatch(
      toggleWishlistItem({
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image,
        category: item.category,
        subcategory: item.subcategory,
      })
    );
    /* The state before the dispatch decides which way it went */
    if (isWishlisted) {
      dispatch(syncRemoveFromWishlist(item.productId));
      toast.info(t("wishlistRemoved", { name: item.name }));
    } else {
      dispatch(syncAddToWishlist(item.productId));
      toast.info(t("wishlistAdded", { name: item.name }));
    }
  }, [item, isWishlisted, dispatch, toast, t]);

  const handleRemove = useCallback(async () => {
    const confirmed = await confirm({
      title: tBulk("title"),
      message: t("confirmRemove", { name: item.name }),
      confirmLabel: tBulk("confirm"),
      danger: true,
    });
    if (!confirmed) return;
    dispatch(removeItem({ productId: item.productId, size: item.size, color: item.color }));
    if (item.serverItemId) {
      dispatch(syncRemoveCartItem(item.serverItemId));
    }
  }, [item, dispatch, confirm, t, tBulk]);

  const productUrl = `/shop/${item.category}/${item.subcategory}/${item.productId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [...ease], delay: Math.min(index * 0.05, 0.3) }}
      className="flex gap-3 sm:gap-4 p-4 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-subtle)] relative"
    >
      {/* Select for checkout / bulk actions */}
      <Checkbox
        className="self-center"
        checked={selected}
        onCheckedChange={() => onToggleSelected(item)}
        aria-label={t("select", { name: item.name })}
      />

      {/* Image */}
      <div className="relative shrink-0">
        <Link href={productUrl} className="block no-underline">
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
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <Link href={productUrl} className="pr-16 font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] leading-[140%] no-underline font-medium line-clamp-2 hover:text-[var(--accent-primary)]">
          {item.name}
        </Link>
        <div className="flex items-center gap-1 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
          <span>{t("size", { size: item.size })}</span>
          <span className="text-[var(--border-default)]">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-[var(--border-light)]" style={{ background: item.colorHex }} />
            {item.color}
          </span>
        </div>
        <span className="font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em]">
          {format.number(item.price, "price")}
        </span>

        {/* Quantity + Remove */}
        <div className="flex items-center gap-3 mt-2">
          <QuantityControl item={item} />
          <IconButton
            size="sm"
            align="start"
            label={isWishlisted ? t("removeFromWishlist") : t("addToWishlist")}
            pressed={isWishlisted}
            onClick={handleToggleWishlist}
            className={
              isWishlisted
                ? "border-rose-300 bg-[var(--color-rose-milk)] text-rose-500 hover:border-rose-400"
                : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--color-deep-rose)] hover:bg-[var(--color-rose-milk)]"
            }
          >
            <Heart size={14} className={isWishlisted ? "fill-current" : ""} />
          </IconButton>
          <button
            type="button"
            className="w-8 h-8 rounded-full border border-[var(--border-subtle)] bg-transparent flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--color-deep-rose)] hover:bg-[var(--color-rose-milk)] transition-all duration-150"
            onClick={handleRemove}
            aria-label={t("remove", { name: item.name })}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Line total */}
      <span className="absolute top-4 right-4 font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em]">
        {format.number(item.price * item.quantity, "price")}
      </span>
    </motion.div>
  );
}

/* ── Main Cart Content ── */
export default function CartContent() {
  const t = useTranslations("private.cart");
  const format = useFormatter();
  const { isAuthenticated, isLoading } = useAuth();
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { toast } = useToast();
  const items = useAppSelector(selectCartItems);
  const deselectedKeys = useAppSelector(selectDeselectedKeys);
  const selectedItems = useAppSelector(selectSelectedCartItems);
  const wishlistItems = useAppSelector(selectWishlistItems);
  /* Totals follow the ticked items only — they are what checkout will order */
  const totalPrice = useAppSelector(selectSelectedTotalPrice);
  const selectedQuantity = useAppSelector(selectSelectedTotalItems);
  const totalItems = useAppSelector(selectTotalItems);

  const selectedCount = selectedItems.length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const handleToggleSelected = useCallback(
    (item: CartItem) => dispatch(toggleItemSelected(cartItemKey(item))),
    [dispatch]
  );

  /** Takes the given lines out of the bag, locally first and then on the server. */
  const removeFromBag = useCallback(
    (lines: CartItem[]) => {
      dispatch(removeItems(lines.map(cartItemKey)));
      for (const line of lines) {
        if (line.serverItemId) dispatch(syncRemoveCartItem(line.serverItemId));
      }
    },
    [dispatch]
  );

  const handleRemoveSelected = useCallback(async () => {
    if (selectedCount === 0) return;
    const confirmed = await confirm({
      title: t("bulk.confirmRemove.title"),
      message: t("bulk.confirmRemove.message", { count: selectedCount }),
      confirmLabel: t("bulk.confirmRemove.confirm"),
      danger: true,
    });
    if (!confirmed) return;
    removeFromBag(selectedItems);
    toast.success(t("toast.removed", { count: selectedCount }));
  }, [selectedCount, selectedItems, confirm, removeFromBag, toast, t]);

  const handleAddToWishlist = useCallback(() => {
    if (selectedCount === 0) return;
    /* A product can sit in the bag in several sizes — save it once, and never un-save one
       that is already on the wishlist (the toggle action would remove it) */
    const saved = new Set(wishlistItems.map((w) => w.productId));
    let added = 0;
    for (const line of selectedItems) {
      if (saved.has(line.productId)) continue;
      saved.add(line.productId);
      added += 1;
      dispatch(
        toggleWishlistItem({
          productId: line.productId,
          name: line.name,
          price: line.price,
          image: line.image,
          category: line.category,
          subcategory: line.subcategory,
        })
      );
      dispatch(syncAddToWishlist(line.productId));
    }
    /* Saving to the wishlist never takes anything out of the bag */
    if (added > 0) toast.success(t("toast.addedToWishlist", { count: added }));
    else toast.info(t("toast.alreadyInWishlist"));
  }, [selectedCount, selectedItems, wishlistItems, dispatch, toast, t]);

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
            {t("header.continueShopping")}
          </Link>

          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-3 font-display font-normal text-2xl sm:text-3xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              <ShoppingBag size={24} style={{ color: "var(--accent-primary)" }} />
              {t("header.title")}
            </h1>
            {totalItems > 0 && (
              <span className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em]">{t("header.itemCount", { count: totalItems })}</span>
            )}
          </div>
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
            <h2 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">{t("empty.title")}</h2>
            <p className="font-primary text-base text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] max-w-80">
              {t("empty.description")}
            </p>
            <Link href="/shop" className="inline-flex items-center gap-2 py-3 px-7 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90 hover:-translate-y-px transition-all duration-150">
              <ShoppingBag size={16} />
              {t("empty.browse")}
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8 md:flex-row md:gap-8 md:items-start">
            {/* Items list */}
            <div className="flex flex-col gap-4 md:flex-1 md:min-w-0">
              {/* Bulk actions */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 px-4 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-subtle)]">
                <label className="flex items-center gap-3 cursor-pointer font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] font-medium">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={(checked) => dispatch(setAllSelected(checked))}
                  />
                  {t("bulk.selectAll")}
                  <span className="font-normal text-[var(--text-muted)]">
                    {t("bulk.selectedCount", { selected: selectedCount, total: items.length })}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <IconButton
                    label={t("bulk.addToWishlist")}
                    onClick={handleAddToWishlist}
                    disabled={selectedCount === 0}
                    className="enabled:hover:bg-[var(--color-rose-milk)] enabled:hover:text-[var(--color-deep-rose)]"
                  >
                    <Heart size={16} />
                  </IconButton>
                  <IconButton
                    label={t("bulk.remove")}
                    onClick={handleRemoveSelected}
                    disabled={selectedCount === 0}
                    className="enabled:hover:bg-[var(--color-champagne-cream)] enabled:hover:text-[var(--text-primary)]"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>

              {items.map((item, idx) => (
                <CartItemRow
                  key={cartItemKey(item)}
                  item={item}
                  index={idx}
                  selected={!deselectedKeys.includes(cartItemKey(item))}
                  onToggleSelected={handleToggleSelected}
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
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">{t("summary.title")}</h2>
                <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                  {t("summary.selected", { count: selectedQuantity })}
                </span>
              </div>

              {/* Free Shipping Progress */}
              {(() => {
                const remaining = FREE_SHIPPING_THRESHOLD - totalPrice;
                const progress = Math.min((totalPrice / FREE_SHIPPING_THRESHOLD) * 100, 100);
                const qualified = totalPrice >= FREE_SHIPPING_THRESHOLD;
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
                        ? t("summary.unlocked")
                        : t("summary.remaining", { amount: format.number(Math.ceil(remaining), "price") })}
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
                <span>{t("summary.subtotal")}</span>
                <span>{format.number(totalPrice, "price")}</span>
              </div>
              <div className="flex justify-between items-center font-primary text-sm text-[var(--text-secondary)] tracking-[-0.02em]">
                <span>{t("summary.shipping")}</span>
                <span className="text-xs text-[var(--text-muted)] italic">
                  {totalPrice >= FREE_SHIPPING_THRESHOLD ? t("summary.free") : t("summary.atCheckout")}
                </span>
              </div>

              <div className="h-px bg-[var(--border-subtle)]" />

              <div className="flex justify-between items-center font-primary text-base text-[var(--text-heading)] font-medium tracking-[-0.02em]">
                <span>{t("summary.total")}</span>
                <span>{format.number(totalPrice, "price")}</span>
              </div>

              {selectedCount > 0 ? (
                <Link href="/checkout" className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90 hover:-translate-y-px transition-all duration-150">
                  {t("summary.checkout")}
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase border-none opacity-50 cursor-not-allowed"
                  >
                    {t("summary.checkout")}
                    <ChevronRight size={16} />
                  </button>
                  <p className="m-0 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] text-center">
                    {t("summary.selectToCheckout")}
                  </p>
                </>
              )}

              <p className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] text-center">
                {t("summary.freeNote", { amount: format.number(FREE_SHIPPING_THRESHOLD, "price") })}
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
