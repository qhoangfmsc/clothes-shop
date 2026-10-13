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
  selectPurchasableCartItems,
  selectTotalItems,
  selectSelectedTotalPrice,
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
import { buildOrderInquiryHref, getPurchaseMode } from "@/src/lib/product-purchase";
import Checkbox from "@/src/app/[locale]/_components/Checkbox";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Quantity Stepper with debounced API sync ── */
function QuantityControl({ item }: { item: CartItem }) {
  const t = useTranslations("private.cart.quantity");
  const dispatch = useAppDispatch();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback(
    (delta: number) => {
      const newQty = item.quantity + delta;
      if (newQty < 1 || newQty > 10) return;
      dispatch(
        updateQuantity({
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: newQty,
        })
      );

      /* Debounced API sync */
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (item.serverItemId) {
        debounceRef.current = setTimeout(() => {
          dispatch(
            syncUpdateCartItemQuantity({ serverItemId: item.serverItemId!, quantity: newQty })
          );
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
      <span className="w-8 text-center font-primary text-sm text-[var(--text-primary)] font-medium tracking-[-0.02em]">
        {item.quantity}
      </span>
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
  const tCommon = useTranslations("common");
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
        badge: item.badge,
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
  const purchaseMode = getPurchaseMode(item.badge);
  const purchasable = purchaseMode === "cart";

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [...ease], delay: Math.min(index * 0.05, 0.3) }}
      className="flex items-start gap-3 sm:gap-4 py-5 px-4 sm:px-6"
    >
      {/* Select for checkout / bulk actions */}
      <Checkbox
        className="mt-1"
        checked={selected && purchasable}
        disabled={!purchasable}
        onCheckedChange={() => onToggleSelected(item)}
        aria-label={t("select", { name: item.name })}
      />

      {/* Image */}
      <Link href={productUrl} className="block shrink-0 no-underline">
        <div
          className={`relative w-20 h-[107px] sm:w-[104px] sm:h-[139px] rounded-md overflow-hidden bg-[var(--color-champagne-cream)] ${
            purchasable ? "" : "opacity-60"
          }`}
        >
          <Image src={item.image} alt={item.name} fill sizes="104px" style={{ objectFit: "cover" }} />
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 self-stretch">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={productUrl}
            className="font-primary text-sm sm:text-base text-[var(--text-heading)] tracking-[-0.02em] leading-[130%] no-underline font-medium line-clamp-2 hover:text-[var(--accent-primary)]"
          >
            {item.name}
          </Link>
          <span className="shrink-0 font-primary text-sm sm:text-base text-[var(--text-heading)] font-medium tracking-[-0.02em]">
            {purchaseMode === "customOrder" ? "" : format.number(item.price * item.quantity, "price")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
          <span className="py-0.5 px-2 rounded-full bg-[var(--color-champagne-cream)] text-[var(--text-secondary)]">
            {t("size", { size: item.size })}
          </span>
          <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full bg-[var(--color-champagne-cream)] text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full border border-[var(--border-light)]" style={{ background: item.colorHex }} />
            {item.color}
          </span>
          <span>{purchaseMode === "customOrder" ? tCommon("priceOnRequest") : format.number(item.price, "price")}</span>
        </div>

        {/* Sold-out / custom-order lines stay in the bag but cannot be checked out */}
        {!purchasable && (
          <p className="m-0 font-primary text-xs text-[var(--color-deep-rose)] tracking-[-0.02em] leading-[140%]">
            {purchaseMode === "soldOut" ? t("unavailable.soldOut") : t("unavailable.customOrder")}{" "}
            {purchaseMode === "customOrder" && (
              <Link
                href={buildOrderInquiryHref(item.productId)}
                className="font-medium text-[var(--accent-primary)] underline underline-offset-2"
              >
                {t("unavailable.orderCta")}
              </Link>
            )}
          </p>
        )}

        {/* Quantity + actions */}
        <div className="flex items-center justify-between gap-3 mt-auto pt-1">
          <QuantityControl item={item} />
          <div className="flex items-center gap-1">
            <IconButton
              size="sm"
              align="end"
              label={isWishlisted ? t("removeFromWishlist") : t("addToWishlist")}
              pressed={isWishlisted}
              onClick={handleToggleWishlist}
              className={
                isWishlisted
                  ? "border-rose-300 bg-[var(--color-rose-milk)] text-rose-500 hover:border-rose-400"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--color-deep-rose)] hover:bg-[var(--color-rose-milk)]"
              }
            >
              <Heart size={15} className={isWishlisted ? "fill-current" : ""} />
            </IconButton>
            <button
              type="button"
              className="w-8 h-8 rounded-full border border-transparent bg-transparent flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--color-deep-rose)] hover:bg-[var(--color-rose-milk)] transition-all duration-150 motion-reduce:transition-none"
              onClick={handleRemove}
              aria-label={t("remove", { name: item.name })}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </motion.li>
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
  const purchasableCount = useAppSelector(selectPurchasableCartItems).length;
  const wishlistItems = useAppSelector(selectWishlistItems);
  const totalItems = useAppSelector(selectTotalItems);
  /* Follows the ticked lines only — they are what checkout will order */
  const selectedPrice = useAppSelector(selectSelectedTotalPrice);
  const selectedQuantity = useAppSelector(selectSelectedTotalItems);

  const selectedCount = selectedItems.length;
  /* Only purchasable lines can be ticked, so "all" means all of those */
  const allSelected = purchasableCount > 0 && selectedCount === purchasableCount;
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
          badge: line.badge,
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
        <div className="max-w-[820px] mx-auto px-4 sm:px-6">
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
      <div className="max-w-[820px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease] }}
          className="flex flex-col gap-4 mb-8"
        >
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            <ArrowLeft size={16} />
            {t("header.continueShopping")}
          </Link>

          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-3 font-display font-normal text-2xl sm:text-3xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              <ShoppingBag size={24} style={{ color: "var(--accent-primary)" }} />
              {t("header.title")}
            </h1>
            {totalItems > 0 && (
              <span className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em]">
                {t("header.itemCount", { count: totalItems })}
              </span>
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
            <h2 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              {t("empty.title")}
            </h2>
            <p className="font-primary text-base text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] max-w-80">
              {t("empty.description")}
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 py-3 px-7 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90 hover:-translate-y-px transition-all duration-150"
            >
              <ShoppingBag size={16} />
              {t("empty.browse")}
            </Link>
          </motion.div>
        ) : (
          <section
            aria-label={t("header.title")}
            className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
          >
            {/* Bulk actions */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 px-4 sm:px-6 rounded-t-lg bg-[var(--color-champagne-cream)] border-b border-[var(--border-subtle)]">
              <label className="flex items-center gap-3 cursor-pointer font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] font-medium">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={purchasableCount === 0}
                  onCheckedChange={(checked) => dispatch(setAllSelected(checked))}
                />
                {t("bulk.selectAll")}
                <span className="font-normal text-[var(--text-muted)]">
                  {t("bulk.selectedCount", { selected: selectedCount, total: purchasableCount })}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <IconButton
                  label={t("bulk.addToWishlist")}
                  onClick={handleAddToWishlist}
                  disabled={selectedCount === 0}
                  className="bg-[var(--bg-elevated)] enabled:hover:bg-[var(--color-rose-milk)] enabled:hover:text-[var(--color-deep-rose)]"
                >
                  <Heart size={16} />
                </IconButton>
                <IconButton
                  label={t("bulk.remove")}
                  onClick={handleRemoveSelected}
                  disabled={selectedCount === 0}
                  className="bg-[var(--bg-elevated)] enabled:hover:text-[var(--color-deep-rose)]"
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </div>

            {/* Items */}
            <ul className="m-0 p-0 list-none divide-y divide-[var(--border-subtle)]">
              {items.map((item, idx) => (
                <CartItemRow
                  key={cartItemKey(item)}
                  item={item}
                  index={idx}
                  selected={!deselectedKeys.includes(cartItemKey(item))}
                  onToggleSelected={handleToggleSelected}
                />
              ))}
            </ul>

            {/* Checkout: pinned to the bottom of the screen while the list scrolls; shipping is shown on /checkout */}
            <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 py-4 px-4 sm:px-6 rounded-b-lg bg-[var(--bg-elevated)]/95 backdrop-blur border-t border-[var(--border-light)] pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="min-w-0 flex flex-col gap-0.5">
                {selectedCount > 0 ? (
                  <>
                    <span className="font-primary text-xs text-[var(--text-muted)] tracking-[0.04em] uppercase">
                      {t("checkout.subtotal", { count: selectedQuantity })}
                    </span>
                    <span className="font-display text-xl sm:text-2xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
                      {format.number(selectedPrice, "price")}
                    </span>
                  </>
                ) : (
                  <span className="font-primary text-xs sm:text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[140%]">
                    {t("checkout.selectToCheckout")}
                  </span>
                )}
              </div>
              {selectedCount > 0 ? (
                <Link href="/checkout" className="shrink-0 group flex items-center justify-center gap-2 min-h-12 py-3 px-6 sm:px-8 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] hover:opacity-90 transition-opacity duration-150 motion-reduce:transition-none">
                  {t("checkout.action")}
                  <ChevronRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="shrink-0 flex items-center justify-center gap-2 min-h-12 py-3 px-6 sm:px-8 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase border-none opacity-50 cursor-not-allowed"
                >
                  {t("checkout.action")}
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
