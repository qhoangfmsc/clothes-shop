"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, ShoppingBag, Heart, Share2 } from "lucide-react";
import type { Product } from "@/src/types/product";
import { useToast } from "@/src/app/_components/Toast";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { addItem, syncAddToCartItem } from "@/src/app/(private)/cart/_common/moduleSlice";
import {
  toggleWishlistItem,
  syncAddToWishlist,
  syncRemoveFromWishlist,
  selectIsWishlisted,
} from "@/src/app/(private)/wishlist/_common/moduleSlice";
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
  const dispatch = useAppDispatch();
  const isWishlisted = useAppSelector(selectIsWishlisted(product.id));
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
      dispatch(
        addItem(
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            size: selectedSize!,
            color: colorName,
            colorHex: selectedColor!,
            category: product.category?.slug ?? "",
            subcategory: product.subcategory?.slug ?? "",
          },
          quantity
        )
      );
      /* API sync in background */
      dispatch(
        syncAddToCartItem({
          productId: product.id,
          size: selectedSize!,
          color: colorName,
          quantity,
        })
      );
      setAddedToCart(true);
      toast.success(
        <>
          {product.name} ({selectedSize}, {colorName}
          {quantity > 1 ? `, ×${quantity}` : ""}) added — <Link href="/cart">View Bag</Link>
        </>
      );
      setTimeout(() => setAddedToCart(false), 2200);
    }, "add items to your bag");
  }, [
    addedToCart,
    isSelectionComplete,
    requireAuth,
    dispatch,
    product,
    selectedSize,
    selectedColor,
    quantity,
    toast,
  ]);

  const handleWishlist = useCallback(() => {
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
      // Check current state after toggling — if it was just added, sync add
      const stillWishlisted = !isWishlisted; // was not wishlisted before toggle, so now added
      if (stillWishlisted) {
        dispatch(syncAddToWishlist(product.id));
        toast.info(
          <>
            {product.name} saved — <Link href="/wishlist">View Wishlist</Link>
          </>
        );
      } else {
        dispatch(syncRemoveFromWishlist(product.id));
        toast.info(`${product.name} removed from wishlist`);
      }
    }, "save to wishlist");
  }, [requireAuth, dispatch, isWishlisted, product, toast]);

  return (
    <>
      {/* ── Main Content: 2-panel layout ── */}
      <div className="flex flex-col lg:flex-row lg:min-h-[calc(100vh-80px)]">
        {/* LEFT: Image Gallery with Carousel */}
        <div className="relative flex flex-col gap-3 p-4 sm:p-6 lg:flex-1 lg:max-w-[55%] lg:py-6 lg:pr-4 lg:pl-8 lg:sticky lg:top-20 lg:h-[calc(100vh-80px)]">
          {/* Main image — carousel */}
          <div
            ref={carouselRef}
            className="group relative flex-1 rounded-lg overflow-hidden bg-[var(--bg-elevated)] min-h-[400px] lg:min-h-0 cursor-grab active:cursor-grabbing select-none"
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
                className="absolute inset-0"
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
                className="absolute top-1/2 -translate-y-1/2 z-[3] w-10 h-10 rounded-full border border-white/20 bg-black/50 backdrop-blur-lg text-[var(--color-pearl-cream)] flex items-center justify-center cursor-pointer left-3 opacity-0 group-hover:opacity-100 transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-black/75 hover:border-[rgba(201,169,110,0.3)] [@media(hover:none)]:opacity-80 [@media(hover:none)]:w-9 [@media(hover:none)]:h-9"
                onClick={handlePrev}
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {activeImage < images.length - 1 && (
              <button
                type="button"
                className="absolute top-1/2 -translate-y-1/2 z-[3] w-10 h-10 rounded-full border border-white/20 bg-black/50 backdrop-blur-lg text-[var(--color-pearl-cream)] flex items-center justify-center cursor-pointer right-3 opacity-0 group-hover:opacity-100 transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-black/75 hover:border-[rgba(201,169,110,0.3)] [@media(hover:none)]:opacity-80 [@media(hover:none)]:w-9 [@media(hover:none)]:h-9"
                onClick={handleNext}
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Dot indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[3] flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`w-2 h-2 rounded-full border-none p-0 cursor-pointer transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                    activeImage === idx
                      ? "bg-[var(--color-champagne-gold)] scale-125"
                      : "bg-white/35 hover:bg-white/60"
                  }`}
                  onClick={() => setActiveImage(idx)}
                  aria-label={`View image ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Thumbnails — desktop only */}
          <div className="hidden sm:flex gap-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`relative w-16 h-20 rounded-md overflow-hidden border-2 p-0 cursor-pointer bg-[var(--bg-elevated)] transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:opacity-85 ${
                  activeImage === idx ? "border-[var(--accent-primary)]" : "border-transparent"
                }`}
                onClick={() => setActiveImage(idx)}
                aria-label={`View image ${idx + 1}`}
              >
                <Image src={img} alt="" fill sizes="80px" style={{ objectFit: "cover" }} />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Product Info */}
        <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-1 lg:max-w-[45%] lg:p-8 lg:pb-16 lg:overflow-y-auto">
          {/* Breadcrumb */}
          <motion.nav
            className="flex items-center gap-2 font-primary text-xs tracking-[0.06em] uppercase"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [...ease], delay: 0.1 }}
          >
            <Link href="/shop">Shop</Link>
            <span className="text-[var(--text-disabled)] text-[10px]">◆</span>
            <Link href={`/shop/${product.category?.slug ?? ""}`}>{categoryTitle}</Link>
            <span className="text-[var(--text-disabled)] text-[10px]">◆</span>
            <Link href={`/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}`}>
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
              <span
                className={`inline-block px-3 py-1 rounded-full font-primary text-xs font-medium tracking-[0.08em] uppercase mb-3 ${
                  product.badge === "new"
                    ? "bg-[rgba(201,169,110,0.15)] text-[var(--color-deep-gold)]"
                    : product.badge === "sale"
                      ? "bg-[rgba(212,165,165,0.15)] text-[var(--color-deep-rose)]"
                      : "bg-[rgba(10,10,8,0.08)] text-[var(--text-secondary)]"
                }`}
              >
                {product.badge === "new" && "New Arrival"}
                {product.badge === "sale" && "On Sale"}
                {product.badge === "bestseller" && "Bestseller"}
              </span>
            )}
            <h1 className="font-display text-[clamp(28px,4vw,40px)] font-normal text-[var(--text-heading)] tracking-[-0.04em] leading-[105%]">
              {product.name}
            </h1>
          </motion.div>

          {/* Price */}
          <motion.div
            className="flex items-baseline gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.2 }}
          >
            <span className="font-primary text-xl font-medium text-[var(--text-heading)] tracking-[-0.04em]">
              ${product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="font-primary text-[15px] font-medium text-[var(--text-disabled)] line-through tracking-[-0.04em]">
                ${product.originalPrice.toLocaleString()}
              </span>
            )}
          </motion.div>

          {/* Divider */}
          <motion.div
            className="h-px bg-[var(--border-subtle)] origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.25 }}
          />

          {/* Description */}
          <motion.p
            className="font-primary text-[15px] font-medium text-[var(--text-secondary)] tracking-[-0.02em] leading-[160%]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.3 }}
          >
            {product.description}
          </motion.p>

          {/* Size selector */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.35 }}
          >
            <span className="flex items-center gap-2 font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
              Size{" "}
              {selectedSize && <span className="text-[var(--text-heading)]">— {selectedSize}</span>}
              <button
                type="button"
                className="ml-auto border-none bg-transparent p-0 font-primary text-xs text-[var(--accent-primary)] underline underline-offset-2 decoration-[rgba(201,169,110,0.4)] cursor-pointer tracking-[0.04em] transition hover:decoration-[var(--accent-primary)]"
                onClick={() => setShowSizeGuide(true)}
              >
                Size Guide
              </button>
            </span>
            <div className="flex gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`w-12 h-12 rounded-md border font-primary text-sm font-medium tracking-[0.04em] cursor-pointer flex items-center justify-center transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                    selectedSize === size
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-gold)] shadow-[var(--shadow-gold-sm)]"
                      : "border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--accent-primary)]"
                  }`}
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
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [...ease], delay: 0.38 }}
            >
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
                Color{" "}
                {selectedColor && (
                  <span className="text-[var(--text-heading)]">
                    — {product.colors.find((c) => c.hex === selectedColor)?.name}
                  </span>
                )}
              </span>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    className={`w-9 h-9 rounded-full border-2 bg-transparent flex items-center justify-center cursor-pointer p-[3px] transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                      selectedColor === color.hex
                        ? "border-[var(--accent-primary)] shadow-[var(--shadow-gold-sm)] scale-110"
                        : "border-transparent hover:border-[var(--border-default)] hover:scale-110"
                    }`}
                    onClick={() => setSelectedColor(color.hex)}
                    aria-label={`Select color: ${color.name}`}
                    title={color.name}
                  >
                    <span
                      className="w-full h-full rounded-full block border border-[rgba(58,49,42,0.12)]"
                      style={{ background: color.hex }}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quantity selector */}
          <motion.div
            className="flex items-center justify-between gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.42 }}
          >
            <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
              Quantity
            </span>
            <div className="flex items-center gap-0 border border-[var(--border-light)] rounded-full overflow-hidden">
              <button
                type="button"
                className="w-10 h-10 border-none bg-transparent text-[var(--text-secondary)] text-[15px] font-primary cursor-pointer flex items-center justify-center transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-heading)] disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center font-primary text-[15px] font-medium text-[var(--text-heading)] tracking-[0.02em]">
                {quantity}
              </span>
              <button
                type="button"
                className="w-10 h-10 border-none bg-transparent text-[var(--text-secondary)] text-[15px] font-primary cursor-pointer flex items-center justify-center transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-heading)] disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.45 }}
          >
            {/* Validation hint */}
            {!isSelectionComplete && (
              <p className="font-primary text-xs text-[var(--text-muted)] tracking-[0.04em] text-center m-0">
                {!selectedSize && !selectedColor
                  ? "Select size & color to add to bag"
                  : !selectedSize
                    ? "Select a size"
                    : "Select a color"}
              </p>
            )}
            <div className="flex gap-3 items-stretch">
              <button
                type="button"
                className={`flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border-none font-primary text-[15px] font-medium tracking-[0.04em] uppercase cursor-pointer transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-px ${
                  addedToCart
                    ? "!bg-[var(--accent-primary)] !text-[var(--text-on-gold)] pointer-events-none"
                    : !isSelectionComplete
                      ? "opacity-45 cursor-not-allowed hover:transform-none hover:shadow-none bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)]"
                      : "bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)] hover:bg-[var(--color-charcoal)] hover:shadow-[var(--shadow-lg)]"
                }`}
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
                className={`w-14 h-14 rounded-full border bg-transparent flex items-center justify-center cursor-pointer shrink-0 transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                  isWishlisted
                    ? "border-[var(--color-dusty-rose)] text-[var(--color-dusty-rose)] bg-[rgba(212,165,165,0.1)]"
                    : "border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--color-dusty-rose)] hover:text-[var(--color-dusty-rose)] hover:bg-[rgba(212,165,165,0.08)]"
                }`}
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
                className="w-14 h-14 rounded-full border border-[var(--border-light)] bg-transparent flex items-center justify-center cursor-pointer text-[var(--text-muted)] shrink-0 transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:bg-[rgba(201,169,110,0.06)]"
                onClick={async () => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;
                  if (typeof navigator !== "undefined" && navigator.share) {
                    try {
                      await navigator.share({
                        title: product.name,
                        text: `Check out ${product.name} from Ori Baebi`,
                        url,
                      });
                    } catch {
                      /* cancelled */
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied to clipboard");
                    } catch {
                      /* fallback */
                    }
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
            className="flex flex-col mt-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.45 }}
          >
            <div className="flex justify-between items-baseline py-3 border-t border-[var(--border-subtle)]">
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.06em] uppercase">
                Material
              </span>
              <span className="font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em] text-right">
                {product.material}
              </span>
            </div>
            <div className="flex justify-between items-baseline py-3 border-t border-[var(--border-subtle)]">
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.06em] uppercase">
                Care
              </span>
              <span className="font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em] text-right">
                {product.care}
              </span>
            </div>
            <div className="flex justify-between items-baseline py-3 border-t border-[var(--border-subtle)]">
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.06em] uppercase">
                Category
              </span>
              <span className="font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em] text-right">
                {categoryTitle} — {subcategoryLabel}
              </span>
            </div>
            <ShippingAccordion />
          </motion.div>
        </div>
      </div>

      {/* Reviews */}
      <ReviewsSection productId={product.id} />

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-[var(--border-subtle)] bg-[var(--bg-section-3)] py-5 sm:py-6 sm:px-6">
          <div className="flex flex-col gap-2">
            <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium px-4 sm:px-0">
              You may also like
            </span>
            <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none px-4 sm:px-0">
              Complete the Look
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 px-4 sm:px-6 lg:px-8">
            {relatedProducts.slice(0, 4).map((rp) => (
              <Link
                key={rp.id}
                href={`/shop/${rp.category?.slug ?? ""}/${rp.subcategory?.slug ?? ""}/${rp.id}`}
                className="group flex flex-col gap-2 no-underline text-inherit"
              >
                <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-[var(--bg-elevated)]">
                  <Image
                    src={rp.images[0]}
                    alt={rp.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    style={{ objectFit: "cover" }}
                    className="transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                </div>
                <span className="font-primary text-[13px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                  {rp.name}
                </span>
                <span className="font-primary text-sm font-medium text-[var(--text-muted)] tracking-[-0.02em]">
                  ${rp.price.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {/* Size Guide Modal */}
      <SizeGuideModal
        category={product.category?.slug ?? ""}
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </>
  );
}
