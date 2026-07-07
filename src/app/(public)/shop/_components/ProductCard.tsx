"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/src/types/product";
import { useToast } from "@/src/app/_components/Toast";
import { useQuickAdd } from "@/src/app/_components/QuickAddDrawer";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [liked, setLiked] = useState(false);
  const { toast } = useToast();
  const { openQuickAdd } = useQuickAdd();

  const badgeClass = product.badge
    ? `product-card__badge product-card__badge--${product.badge}`
    : "";

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    if (next) {
      toast.info(
        <>{product.name} saved — <Link href="/wishlist" onClick={(ev) => ev.stopPropagation()}>View Wishlist</Link></>
      );
    } else {
      toast.info(`${product.name} removed from wishlist`);
    }
  }, [liked, product.name, toast]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickAdd(product);
  }, [openQuickAdd, product]);

  const productUrl = `/shop/${product.category}/${product.subcategory}/${product.id}`;

  return (
    <div>
      <Link href={productUrl} className="product-card">
        {/* Image */}
        <div className="product-card__image-wrap">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            style={{ objectFit: "cover" }}
          />

          {/* Badge */}
          {product.badge && (
            <span className={badgeClass}>
              {product.badge === "new" && "New"}
              {product.badge === "sale" && "Sale"}
              {product.badge === "bestseller" && "Best"}
            </span>
          )}

          {/* ── Top-right icons: Wishlist + Bag (stacked) ── */}
          <div className="product-card__icons">
            <button
              type="button"
              className={`product-card__icon-btn product-card__icon-btn--wish ${liked ? "product-card__icon-btn--liked" : ""}`}
              onClick={handleLike}
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
            >
              <motion.div
                animate={liked ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.35, ease: [...ease] }}
              >
                <Heart size={18} fill={liked ? "currentColor" : "none"} />
              </motion.div>
            </button>
            <button
              type="button"
              className="product-card__icon-btn product-card__icon-btn--bag"
              onClick={handleAddToCart}
              aria-label="Add to bag"
            >
              <ShoppingBag size={16} />
            </button>
          </div>

          {/* ── Desktop hover overlay: text button ── */}
          <div className="product-card__actions product-card__actions--desktop">
            <button
              className="product-card__quick-add"
              type="button"
              onClick={handleAddToCart}
            >
              <ShoppingBag size={13} />
              Add to Bag
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="product-card__info">
          <span className="product-card__name">{product.name}</span>
          <div className="product-card__price-row">
            <span className="product-card__price">
              ${product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="product-card__price product-card__price--original">
                ${product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
