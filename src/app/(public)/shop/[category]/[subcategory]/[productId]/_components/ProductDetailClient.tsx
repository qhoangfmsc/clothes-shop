"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/src/types/product";
import { useToast } from "@/src/app/_components/Toast";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface ProductDetailClientProps {
  product: Product;
  categoryTitle: string;
  subcategoryLabel: string;
  relatedProducts: Product[];
}

export default function ProductDetailClient({
  product,
  categoryTitle,
  subcategoryLabel,
  relatedProducts,
}: ProductDetailClientProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const { toast } = useToast();

  const images = [product.image, product.secondaryImage];

  /* ── Carousel: swipe / drag support ── */
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const isDragging = useRef(false);

  const goToImage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, images.length - 1));
      setActiveImage(clamped);
    },
    [images.length]
  );

  const handleNext = useCallback(() => goToImage(activeImage + 1), [activeImage, goToImage]);
  const handlePrev = useCallback(() => goToImage(activeImage - 1), [activeImage, goToImage]);

  /* Touch handlers */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
    const threshold = 50;
    if (touchDeltaX.current > threshold) {
      handlePrev();
    } else if (touchDeltaX.current < -threshold) {
      handleNext();
    }
    touchDeltaX.current = 0;
  }, [handlePrev, handleNext]);

  /* Mouse drag handlers */
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    isDragging.current = true;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    touchDeltaX.current = e.clientX - touchStartX.current;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    const threshold = 50;
    if (touchDeltaX.current > threshold) {
      handlePrev();
    } else if (touchDeltaX.current < -threshold) {
      handleNext();
    }
    touchDeltaX.current = 0;
  }, [handlePrev, handleNext]);

  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  const handleAddToCart = useCallback(() => {
    if (addedToCart) return;
    setAddedToCart(true);
    toast.success(`${product.name} added to your bag`);
    setTimeout(() => setAddedToCart(false), 2200);
  }, [addedToCart, product.name, toast]);

  const handleWishlist = useCallback(() => {
    const next = !liked;
    setLiked(next);
    if (next) {
      toast.info(`${product.name} saved to wishlist`);
    } else {
      toast.info(`${product.name} removed from wishlist`);
    }
  }, [liked, product.name, toast]);

  return (
    <>
      {/* ── Main Content: 2-panel layout ── */}
      <div className="pdp-layout">
        {/* LEFT: Image Gallery with Carousel */}
        <div className="pdp-gallery">
          {/* Main image — carousel */}
          <div
            ref={carouselRef}
            className="pdp-gallery__main pdp-carousel"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            role="region"
            aria-label="Product image carousel"
            aria-roledescription="carousel"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeImage}
                className="pdp-carousel__slide"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: [...ease] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(_e, info) => {
                  if (info.offset.x > 60) handlePrev();
                  else if (info.offset.x < -60) handleNext();
                }}
              >
                <Image
                  src={images[activeImage]}
                  alt={`${product.name} — Image ${activeImage + 1}`}
                  fill
                  priority={activeImage === 0}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  style={{ objectFit: "cover", pointerEvents: "none" }}
                />
              </motion.div>
            </AnimatePresence>

            {/* Carousel navigation arrows */}
            {activeImage > 0 && (
              <button
                type="button"
                className="pdp-carousel__arrow pdp-carousel__arrow--prev"
                onClick={handlePrev}
                aria-label="Previous image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {activeImage < images.length - 1 && (
              <button
                type="button"
                className="pdp-carousel__arrow pdp-carousel__arrow--next"
                onClick={handleNext}
                aria-label="Next image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {/* Dot indicators */}
            <div className="pdp-carousel__dots">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`pdp-carousel__dot ${activeImage === idx ? "pdp-carousel__dot--active" : ""}`}
                  onClick={() => setActiveImage(idx)}
                  aria-label={`View image ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Thumbnails — desktop only */}
          <div className="pdp-gallery__thumbs">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`pdp-gallery__thumb ${activeImage === idx ? "pdp-gallery__thumb--active" : ""}`}
                onClick={() => setActiveImage(idx)}
                aria-label={`View image ${idx + 1}`}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  sizes="80px"
                  style={{ objectFit: "cover" }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Product Info */}
        <div className="pdp-info">
          {/* Breadcrumb */}
          <motion.nav
            className="pdp-breadcrumb"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [...ease], delay: 0.1 }}
          >
            <Link href="/shop">Shop</Link>
            <span className="pdp-breadcrumb__sep">◆</span>
            <Link href={`/shop/${product.category}`}>{categoryTitle}</Link>
            <span className="pdp-breadcrumb__sep">◆</span>
            <Link href={`/shop/${product.category}/${product.subcategory}`}>
              {subcategoryLabel}
            </Link>
          </motion.nav>

          {/* Title + Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.15 }}
          >
            {product.badge && (
              <span className={`pdp-badge pdp-badge--${product.badge}`}>
                {product.badge === "new" && "New Arrival"}
                {product.badge === "sale" && "On Sale"}
                {product.badge === "bestseller" && "Bestseller"}
              </span>
            )}
            <h1 className="pdp-title">{product.name}</h1>
          </motion.div>

          {/* Price */}
          <motion.div
            className="pdp-price-block"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.2 }}
          >
            <span className="pdp-price">${product.price.toLocaleString()}</span>
            {product.originalPrice && (
              <span className="pdp-price pdp-price--original">
                ${product.originalPrice.toLocaleString()}
              </span>
            )}
          </motion.div>

          {/* Divider */}
          <motion.div
            className="pdp-divider"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.25 }}
          />

          {/* Description */}
          <motion.p
            className="pdp-description"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.3 }}
          >
            {product.description}
          </motion.p>

          {/* Size selector */}
          <motion.div
            className="pdp-sizes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.35 }}
          >
            <span className="pdp-sizes__label">
              Size {selectedSize && <span className="pdp-sizes__selected">— {selectedSize}</span>}
            </span>
            <div className="pdp-sizes__grid">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`pdp-sizes__btn ${selectedSize === size ? "pdp-sizes__btn--active" : ""}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Actions: Add to Bag + Wishlist */}
          <motion.div
            className="pdp-actions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.4 }}
          >
            <button
              type="button"
              className={`pdp-add-to-bag ${addedToCart ? "pdp-add-to-bag--added" : ""}`}
              onClick={handleAddToCart}
            >
              {addedToCart ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Added to Bag
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Add to Bag
                </>
              )}
            </button>

            <button
              type="button"
              className={`pdp-wishlist ${liked ? "pdp-wishlist--liked" : ""}`}
              onClick={handleWishlist}
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
            >
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={liked ? "currentColor" : "none"}
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
          </motion.div>

          {/* Details accordion */}
          <motion.div
            className="pdp-details"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.45 }}
          >
            <div className="pdp-detail-row">
              <span className="pdp-detail-row__label">Material</span>
              <span className="pdp-detail-row__value">{product.material}</span>
            </div>
            <div className="pdp-detail-row">
              <span className="pdp-detail-row__label">Care</span>
              <span className="pdp-detail-row__value">{product.care}</span>
            </div>
            <div className="pdp-detail-row">
              <span className="pdp-detail-row__label">Category</span>
              <span className="pdp-detail-row__value">{categoryTitle} — {subcategoryLabel}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <section className="pdp-related">
          <div className="shop-section-title">
            <span className="shop-section-title__label">You may also like</span>
            <h2 className="shop-section-title__heading">Complete the Look</h2>
          </div>
          <div className="pdp-related__grid">
            {relatedProducts.slice(0, 4).map((rp) => (
              <Link
                key={rp.id}
                href={`/shop/${rp.category}/${rp.subcategory}/${rp.id}`}
                className="pdp-related__card"
              >
                <div className="pdp-related__img">
                  <Image
                    src={rp.image}
                    alt={rp.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <span className="pdp-related__name">{rp.name}</span>
                <span className="pdp-related__price">${rp.price.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
