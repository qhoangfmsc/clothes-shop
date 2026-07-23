"use client";

import { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/src/types/product";
import { useToast } from "@/src/app/_components/Toast";
import { useQuickAdd } from "@/src/app/_components/QuickAddDrawer";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  toggleWishlistItem,
  syncAddToWishlist,
  syncRemoveFromWishlist,
  selectIsWishlisted,
} from "@/src/app/(private)/wishlist/_common/moduleSlice";
import { useAuthAction } from "@/src/hooks/use-auth-action";
import { useBreakpoint } from "@/src/hooks/useMediaQuery";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface ProductCardProps {
  product: Product;
}

const badgeStyles: Record<string, string> = {
  new: "bg-[rgba(201,169,110,0.9)] text-[var(--text-on-gold)]",
  sale: "bg-[rgba(212,165,165,0.9)] text-[var(--color-pearl-cream)]",
  bestseller: "bg-[rgba(10,10,8,0.85)] text-[var(--color-pearl-cream)]",
};

export default function ProductCard({ product }: ProductCardProps) {
  const { toast } = useToast();
  const { openQuickAdd } = useQuickAdd();
  const { requireAuth } = useAuthAction();
  const { isDesktop } = useBreakpoint();

  /* Wishlist — defer to client to avoid hydration mismatch.
     Server always renders false; after mount we sync with the real store. */
  const dispatch = useAppDispatch();
  const storeIsWishlisted = useAppSelector(selectIsWishlisted(product.id));
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setIsWishlisted(storeIsWishlisted);
  }, [storeIsWishlisted]);

  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      requireAuth(() => {
        dispatch(
          toggleWishlistItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            category: product.category?.slug ?? "",
            subcategory: product.subcategory?.slug ?? "",
          })
        );
        // isWishlisted is still the old value before the dispatch re-render
        const added = !storeIsWishlisted;
        if (added) {
          dispatch(syncAddToWishlist(product.id));
          toast.info(
            <>
              {product.name} saved —{" "}
              <Link href="/wishlist" onClick={(ev) => ev.stopPropagation()}>
                View Wishlist
              </Link>
            </>
          );
        } else {
          dispatch(syncRemoveFromWishlist(product.id));
          toast.info(`${product.name} removed from wishlist`);
        }
      }, "save to wishlist");
    },
    [requireAuth, dispatch, storeIsWishlisted, product, toast]
  );

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      requireAuth(() => {
        openQuickAdd(product);
      }, "add items to your bag");
    },
    [requireAuth, openQuickAdd, product]
  );

  const productUrl = `/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;

  return (
    <div>
      <Link
        href={productUrl}
        className="group flex flex-col cursor-pointer no-underline text-inherit relative"
      >
        {/* Image */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)] transition-shadow duration-300 group-hover:shadow-[var(--shadow-gold-md)]">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            style={{ objectFit: "cover" }}
            className="transition-transform duration-600 group-hover:scale-105"
          />

          {/* Badge */}
          {product.badge && (
            <span
              className={`absolute top-3 left-3 py-1 px-3 rounded-full font-primary text-xs font-medium tracking-[0.08em] uppercase z-2 backdrop-blur-lg ${
                badgeStyles[product.badge] ?? ""
              }`}
            >
              {product.badge === "new" && "New"}
              {product.badge === "sale" && "Sale"}
              {product.badge === "bestseller" && "Best Seller"}
            </span>
          )}

          {/* ── Top-right icons: Wishlist + Bag (stacked) ── */}
          <div className="absolute bottom-3 right-3 z-3 flex flex-row gap-2 opacity-100 sm:opacity-0 sm:-translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:transition-all sm:duration-300 sm:[&:has(.liked)]:opacity-100 sm:[&:has(.liked)]:translate-y-0">
            <button
              type="button"
              className={`w-9 h-9 rounded-full border-none bg-[rgba(251,248,241,0.88)] backdrop-blur-lg flex items-center justify-center cursor-pointer text-[var(--color-slate)] shadow-[0_2px_8px_rgba(58,49,42,0.1)] transition-all duration-150 active:scale-90 hover:text-[var(--color-dusty-rose)] hover:bg-[rgba(255,255,255,0.95)] ${
                isWishlisted ? "!text-[var(--color-dusty-rose)] liked" : ""
              }`}
              onClick={handleLike}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <motion.div
                animate={isWishlisted ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.35, ease: [...ease] }}
              >
                <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
              </motion.div>
            </button>
            {!isDesktop && (
              <button
                type="button"
                className="w-9 h-9 rounded-full border-none bg-[rgba(251,248,241,0.88)] backdrop-blur-lg flex items-center justify-center cursor-pointer text-[var(--color-slate)] shadow-[0_2px_8px_rgba(58,49,42,0.1)] transition-all duration-150 active:scale-90 hover:text-[var(--accent-primary)] hover:bg-[rgba(255,255,255,0.95)] active:!bg-[var(--accent-primary)] active:!text-[var(--text-on-gold)] sm:hidden"
                onClick={handleAddToCart}
                aria-label="Add to bag"
              >
                <ShoppingBag size={16} />
              </button>
            )}
          </div>

          {/* ── Desktop hover overlay: text button ── */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10 z-2 hidden sm:flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 rounded-b-lg bg-gradient-to-t from-[rgba(10,10,8,0.4)] to-transparent">
            <button
              className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-full border-none bg-[rgba(251,248,241,0.92)] backdrop-blur-[12px] text-[var(--color-obsidian)] font-primary text-xs font-medium tracking-[0.06em] uppercase cursor-pointer shadow-[0_2px_12px_rgba(58,49,42,0.15)] transition-all duration-150 hover:bg-[var(--accent-primary)] hover:text-[var(--text-on-gold)] hover:scale-[1.03] hover:shadow-[var(--shadow-gold-md)]"
              type="button"
              onClick={handleAddToCart}
            >
              <ShoppingBag size={13} />
              Add to Bag
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1 pt-3 px-0.5 pb-0">
          <span className="text-[var(--text-primary)] font-primary text-[13px] font-medium tracking-[-0.02em] leading-[140%] transition-colors duration-150 group-hover:text-[var(--text-heading)]">
            {product.name}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-[var(--text-secondary)] font-primary text-xs font-medium tracking-[-0.02em]">
              ${product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-[var(--text-disabled)] line-through text-[11px]">
                ${product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
