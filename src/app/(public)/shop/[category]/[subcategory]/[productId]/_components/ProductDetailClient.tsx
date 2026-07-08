"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, ShoppingBag, Heart, Share2 } from "lucide-react";
import type { Product } from "@/src/types/product";
import { useToast } from "@/src/app/_components/Toast";
import { useCartStore } from "@/src/store/cart";
import { useWishlistStore } from "@/src/store/wishlist";
import { useAuthAction } from "@/src/hooks/use-auth-action";
import SizeGuideModal from "./SizeGuideModal";
import ReviewsSection from "./ReviewsSection";
import ShippingAccordion from "./ShippingAccordion";

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
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const { toast } = useToast();

  /* Stores + auth */
  const addToCart = useCartStore((s) => s.addItem);
  const syncCartAdd = useCartStore((s) => s.syncAddToApi);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const syncWishlistAdd = useWishlistStore((s) => s.syncAddToApi);
  const syncWishlistRemove = useWishlistStore((s) => s.syncRemoveFromApi);
  const { requireAuth } = useAuthAction();

  const isSelectionComplete = selectedSize !== null && selectedColor !== null;

  const images = product.images;

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
    if (addedToCart || !isSelectionComplete) return;
    requireAuth(() => {
      const colorName = product.colors.find((c) => c.hex === selectedColor)?.name ?? "";
      addToCart(
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.images[0],
          size: selectedSize!,
          color: colorName,
          colorHex: selectedColor!,
          category: product.category,
          subcategory: product.subcategory,
        },
        quantity
      );
      /* API sync in background */
      syncCartAdd(product.id, selectedSize!, colorName, quantity);
      setAddedToCart(true);
      toast.success(
        <>{product.name} ({selectedSize}, {colorName}{quantity > 1 ? `, ×${quantity}` : ""}) added — <Link href="/cart">View Bag</Link></>
      );
      setTimeout(() => setAddedToCart(false), 2200);
    }, "add items to your bag");
  }, [addedToCart, isSelectionComplete, requireAuth, addToCart, syncCartAdd, product, selectedSize, selectedColor, quantity, toast]);

  const handleWishlist = useCallback(() => {
    requireAuth(() => {
      const added = toggleWishlist({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        category: product.category,
        subcategory: product.subcategory,
      });
      if (added) {
        syncWishlistAdd(product.id);
        toast.info(
          <>{product.name} saved — <Link href="/wishlist">View Wishlist</Link></>
        );
      } else {
        syncWishlistRemove(product.id);
        toast.info(`${product.name} removed from wishlist`);
      }
    }, "save to wishlist");
  }, [requireAuth, toggleWishlist, syncWishlistAdd, syncWishlistRemove, product, toast]);

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
                <ChevronLeft size={20} />
              </button>
            )}
            {activeImage < images.length - 1 && (
              <button
                type="button"
                className="pdp-carousel__arrow pdp-carousel__arrow--next"
                onClick={handleNext}
                aria-label="Next image"
              >
                <ChevronRight size={20} />
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
              <button
                type="button"
                className="pdp-sizes__guide-link"
                onClick={() => setShowSizeGuide(true)}
              >
                Size Guide
              </button>
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

          {/* Color selector */}
          {product.colors.length > 0 && (
            <motion.div
              className="pdp-colors"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [...ease], delay: 0.38 }}
            >
              <span className="pdp-colors__label">
                Color{" "}
                {selectedColor && (
                  <span className="pdp-colors__selected">
                    — {product.colors.find((c) => c.hex === selectedColor)?.name}
                  </span>
                )}
              </span>
              <div className="pdp-colors__grid">
                {product.colors.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    className={`pdp-colors__swatch ${selectedColor === color.hex ? "pdp-colors__swatch--active" : ""}`}
                    onClick={() => setSelectedColor(color.hex)}
                    aria-label={`Select color: ${color.name}`}
                    title={color.name}
                  >
                    <span
                      className="pdp-colors__dot"
                      style={{ background: color.hex }}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quantity selector */}
          <motion.div
            className="pdp-quantity"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.42 }}
          >
            <span className="pdp-quantity__label">Quantity</span>
            <div className="pdp-quantity__controls">
              <button
                type="button"
                className="pdp-quantity__btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="pdp-quantity__value">{quantity}</span>
              <button
                type="button"
                className="pdp-quantity__btn"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                disabled={quantity >= 10}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </motion.div>

          {/* Actions: Add to Bag + Wishlist */}
          <motion.div
            className="pdp-actions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.45 }}
          >
            {/* Validation hint */}
            {!isSelectionComplete && (
              <p className="pdp-actions__hint">
                {!selectedSize && !selectedColor
                  ? "Select size & color to add to bag"
                  : !selectedSize
                    ? "Select a size"
                    : "Select a color"}
              </p>
            )}
            <div className="pdp-actions__row">
            <button
              type="button"
              className={`pdp-add-to-bag ${addedToCart ? "pdp-add-to-bag--added" : ""} ${!isSelectionComplete ? "pdp-add-to-bag--disabled" : ""}`}
              onClick={handleAddToCart}
              disabled={!isSelectionComplete}
            >
              {addedToCart ? (
                <>
                  <Check size={16} />
                  Added to Bag
                </>
              ) : (
                <>
                  <ShoppingBag size={16} />
                  Add to Bag
                </>
              )}
            </button>

            <button
              type="button"
              className={`pdp-wishlist ${isWishlisted ? "pdp-wishlist--liked" : ""}`}
              onClick={handleWishlist}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
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
              className="pdp-share-btn"
              onClick={async () => {
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/shop/${product.category}/${product.subcategory}/${product.id}`;
                if (typeof navigator !== "undefined" && navigator.share) {
                  try {
                    await navigator.share({ title: product.name, text: `Check out ${product.name} from Ori Baebi`, url });
                  } catch { /* cancelled */ }
                } else {
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Link copied to clipboard");
                  } catch { /* fallback */ }
                }
              }}
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
            </div>
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

          {/* Shipping info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.5 }}
          >
            <ShippingAccordion />
          </motion.div>
        </div>
      </div>

      {/* Reviews */}
      <ReviewsSection productId={product.id} />

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
                    src={rp.images[0]}
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
      {/* Size Guide Modal */}
      <SizeGuideModal
        category={product.category}
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </>
  );
}
