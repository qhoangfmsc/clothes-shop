"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "../_data/shop-data";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* eslint-disable @typescript-eslint/no-unused-vars */

interface ProductCardProps {
  product: Product;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const [liked, setLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showCartToast, setShowCartToast] = useState(false);

  const badgeClass = product.badge
    ? `product-card__badge product-card__badge--${product.badge}`
    : "";

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((prev) => !prev);
  }, []);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (addedToCart) return;
    setAddedToCart(true);
    setShowCartToast(true);
    setTimeout(() => {
      setShowCartToast(false);
      setTimeout(() => setAddedToCart(false), 400);
    }, 1800);
  }, [addedToCart]);

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

          {/* ── Top-right: Wishlist heart ── */}
          <button
            type="button"
            className="product-card__wishlist"
            onClick={handleLike}
            aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          >
            <motion.svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              xmlns="http://www.w3.org/2000/svg"
              animate={liked ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.35, ease: [...ease] }}
            >
              <path
                d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </motion.svg>
          </button>

          {/* ── Bottom overlay: Quick Add + Cart ── */}
          <div className="product-card__actions">
            <button
              className={`product-card__quick-add ${addedToCart ? "product-card__quick-add--added" : ""}`}
              type="button"
              onClick={handleAddToCart}
            >
              {addedToCart ? (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 8L6.5 11.5L13 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Added
                </>
              ) : (
                <>
                  {/* Shopping bag icon */}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Add to Bag
                </>
              )}
            </button>
          </div>

          {/* ── Cart toast ── */}
          <AnimatePresence>
            {showCartToast && (
              <motion.div
                className="product-card__toast"
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [...ease] }}
              >
                ✓ Added to your bag
              </motion.div>
            )}
          </AnimatePresence>
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
