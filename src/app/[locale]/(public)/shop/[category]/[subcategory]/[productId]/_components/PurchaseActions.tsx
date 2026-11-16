"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Check, ShoppingBag, Heart, Share2, MessageCircle } from "lucide-react";
import { Link, useRouter } from "@/src/i18n/navigation";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useProductWishlist } from "@/src/app/[locale]/(private)/wishlist/_common/use-product-wishlist";
import { buildOrderInquiryHref, type PurchaseMode } from "@/src/lib/product-purchase";
import { productPath } from "@/src/lib/product-url";
import type { Product } from "@/src/types/product";
import type { ProductSelection } from "../_common/use-product-selection";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface PurchaseActionsProps {
  product: Product;
  purchaseMode: PurchaseMode;
  selection: ProductSelection;
  addedToCart: boolean;
  onAddToBag: () => void;
}

/** What the shopper can do with the product: add to bag / ask for a custom order / sold out, save to the wishlist, share. */
export default function PurchaseActions({ product, purchaseMode, selection, addedToCart, onAddToBag }: PurchaseActionsProps) {
  const t = useTranslations("public.product.detail");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const { size: selectedSize, color: selectedColor, isComplete: isSelectionComplete } = selection;

  const notifyWishlist = useCallback(
    (added: boolean) => {
      if (added) {
        toast.info(
          t.rich("toastSaved", {
            name: product.name,
            link: (chunks) => <Link href="/wishlist">{chunks}</Link>,
          })
        );
      } else {
        toast.info(t("toastRemoved", { name: product.name }));
      }
    },
    [toast, t, product.name]
  );
  const { isWishlisted, toggle: handleWishlist } = useProductWishlist(product, notifyWishlist);

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [...ease], delay: 0.45 }}
    >
      {/* Validation hint */}
      {purchaseMode === "cart" && !isSelectionComplete && (
        <p className="font-primary text-xs text-[var(--text-muted)] tracking-[0.04em] text-center m-0">
          {!selectedSize && !selectedColor
            ? t("hintBoth")
            : !selectedSize
              ? t("hintSize")
              : t("hintColor")}
        </p>
      )}
      {purchaseMode !== "cart" && (
        <p className="font-primary text-xs text-[var(--text-muted)] tracking-[0.04em] text-center m-0">
          {purchaseMode === "soldOut" ? t("soldOutHint") : t("customOrderHint")}
        </p>
      )}
      <div className="flex gap-3 items-stretch">
        <button
          type="button"
          className={`flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border-none font-primary text-[0.9375rem] font-medium tracking-[0.04em] uppercase cursor-pointer transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-px ${
            purchaseMode === "soldOut"
              ? "!opacity-45 !cursor-not-allowed hover:transform-none bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)]"
              : purchaseMode === "customOrder"
                ? "bg-[var(--accent-primary)] text-[var(--text-on-gold)] shadow-[var(--shadow-gold-sm)] hover:opacity-90"
                : addedToCart
                  ? "!bg-[var(--accent-primary)] !text-[var(--text-on-gold)] pointer-events-none"
                  : !isSelectionComplete
                    ? "opacity-45 cursor-not-allowed hover:transform-none hover:shadow-none bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)]"
                    : "bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)] hover:bg-[var(--color-charcoal)] hover:shadow-[var(--shadow-lg)]"
          }`}
          onClick={
            purchaseMode === "customOrder"
              ? () => router.push(buildOrderInquiryHref(product.id))
              : onAddToBag
          }
          disabled={
            purchaseMode === "soldOut" || (purchaseMode === "cart" && !isSelectionComplete)
          }
        >
          {purchaseMode === "soldOut" ? (
            <>
              <ShoppingBag size={16} />
              {t("soldOut")}
            </>
          ) : purchaseMode === "customOrder" ? (
            <>
              <MessageCircle size={16} />
              {t("customOrder")}
            </>
          ) : addedToCart ? (
            <>
              <Check size={16} />
              {t("addedToBag")}
            </>
          ) : (
            <>
              <ShoppingBag size={16} />
              {t("addToBag")}
            </>
          )}
        </button>

        <button
          type="button"
          className={`w-14 h-14 rounded-full border bg-transparent flex items-center justify-center cursor-pointer shrink-0 transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
            isWishlisted
              ? "border-[var(--color-dusty-rose)] text-[var(--color-dusty-rose)] bg-[rgba(212,165,165,0.1)]"
              : "border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--color-dusty-rose)] hover:text-[var(--color-dusty-rose)] hover:bg-[rgba(212,165,165,0.08)]"
          }`}
          onClick={handleWishlist}
          aria-label={isWishlisted ? t("removeFromWishlist") : t("addToWishlist")}
        >
          <motion.div
            animate={isWishlisted ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.35, ease: [...ease] }}
          >
            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
          </motion.div>
        </button>
        <button
          type="button"
          className="w-14 h-14 rounded-full border border-[var(--border-light)] bg-transparent flex items-center justify-center cursor-pointer text-[var(--text-muted)] shrink-0 transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:bg-[rgba(201,169,110,0.06)]"
          onClick={async () => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}${productPath(product) ?? "/shop"}`;
            if (typeof navigator !== "undefined" && navigator.share) {
              try {
                await navigator.share({
                  title: product.name,
                  text: t("shareText", { name: product.name }),
                  url,
                });
              } catch {
                /* cancelled */
              }
            } else {
              try {
                await navigator.clipboard.writeText(url);
                toast.success(t("linkCopied"));
              } catch {
                /* fallback */
              }
            }
          }}
          aria-label={t("share")}
        >
          <Share2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}
