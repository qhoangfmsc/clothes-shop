"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Link, useRouter } from "@/src/i18n/navigation";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { Check, ShoppingBag, Heart, Share2, MessageCircle } from "lucide-react";
import type { Product } from "@/src/types/product";
import Carousel, { type CarouselHandle } from "@/src/app/[locale]/_components/Carousel";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { addItem, syncAddToCartItem } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import {
  toggleWishlistItem,
  syncAddToWishlist,
  syncRemoveFromWishlist,
  selectIsWishlisted,
} from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";
import { useAuthAction } from "@/src/hooks/use-auth-action";
import { moneyProp, trackEvent } from "@/src/lib/analytics";
import { moneyOf } from "@/src/lib/money";
import SizeGuideModal from "./SizeGuideModal";
import ReviewsSection from "./ReviewsSection";
import ProductRating from "@/src/app/[locale]/_components/ProductRating";
import ShippingAccordion from "./ShippingAccordion";
import ZoomableImage from "./ZoomableImage";
const loadImageViewer = () => import("./ImageViewer");
const ImageViewer = dynamic(loadImageViewer, { ssr: false });
import { PRODUCT_DETAIL_BADGE_STYLES } from "@/src/lib/product-badge";
import { buildOrderInquiryHref, getPurchaseMode, hasPublicPrice } from "@/src/lib/product-purchase";
import { RELATED_PRODUCTS_LIMIT } from "../../../../_common/constants";

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
  const t = useTranslations("public.product.detail");
  const tNav = useTranslations("shared.header.nav");
  const tCommon = useTranslations("common");
  const { fmt, fmtOrNull } = useMoney();
  const locale = useLocale();
  const [activeImage, setActiveImage] = useState(0);
  /* Full-screen viewer: null until the first open (keeps its chunk unloaded); the gallery stops auto-advancing while it is open */
  const [viewer, setViewer] = useState<{ open: boolean; index: number } | null>(null);
  const viewerIndexRef = useRef(0);
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
  const router = useRouter();
  const purchaseMode = getPurchaseMode(product.badge);
  const showPrice = hasPublicPrice(product.badge);
  /* Custom-order products are inquired about, not configured: no size / color / quantity pickers */
  const showVariantPickers = purchaseMode !== "customOrder";

  const images = product.images;

  /* ── Gallery carousel: swipe / drag / arrows / dots live in <Carousel>; thumbnails drive it via the ref ── */
  const galleryRef = useRef<CarouselHandle>(null);
  const selectImage = useCallback((index: number) => {
    setActiveImage(index);
    galleryRef.current?.scrollToPage(index);
  }, []);

  /* Fetch the viewer chunk while the browser is idle, so the first tap on a photo opens it without a wait */
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => void loadImageViewer());
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => void loadImageViewer(), 2000);
    return () => clearTimeout(id);
  }, []);

  /* Funnel: one view per product page opened */
  useEffect(() => {
    trackEvent("view_product", {
      productId: product.id,
      ...moneyProp({ vnd: product.priceVnd, usd: product.priceUsd }, locale),
    });
  }, [product.id, product.priceVnd, product.priceUsd, locale]);

  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") galleryRef.current?.prev();
      if (e.key === "ArrowRight") galleryRef.current?.next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (purchaseMode !== "cart" || addedToCart || !isSelectionComplete) return;
    requireAuth(() => {
      const colorName = product.colors.find((c) => c.hex === selectedColor)?.name ?? "";
      dispatch(
        addItem(
          {
            productId: product.id,
            name: product.name,
            priceVnd: product.priceVnd,
            priceUsd: product.priceUsd,
            image: product.images[0],
            size: selectedSize!,
            color: colorName,
            colorHex: selectedColor!,
            category: product.category?.slug ?? "",
            subcategory: product.subcategory?.slug ?? "",
            badge: product.badge,
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
      /* Unit price: the BE prices the line only once the add is answered */
      trackEvent("add_to_cart", {
        productId: product.id,
        ...moneyProp(moneyOf(product, "price"), locale),
      });
      setAddedToCart(true);
      toast.success(
        t.rich("toastAdded", {
          name: product.name,
          details: `${selectedSize}, ${colorName}${quantity > 1 ? `, ×${quantity}` : ""}`,
          link: (chunks) => <Link href="/cart">{chunks}</Link>,
        })
      );
      setTimeout(() => setAddedToCart(false), 2200);
    }, "addToBag");
  }, [
    purchaseMode,
    addedToCart,
    isSelectionComplete,
    requireAuth,
    dispatch,
    product,
    selectedSize,
    selectedColor,
    quantity,
    toast,
    locale,
    t,
  ]);

  const handleWishlist = useCallback(() => {
    requireAuth(() => {
      dispatch(
        toggleWishlistItem({
          productId: product.id,
          name: product.name,
          priceVnd: product.priceVnd,
          priceUsd: product.priceUsd,
          image: product.images[0],
          category: product.category?.slug ?? "",
          subcategory: product.subcategory?.slug ?? "",
          badge: product.badge,
        })
      );
      // Check current state after toggling — if it was just added, sync add
      const stillWishlisted = !isWishlisted; // was not wishlisted before toggle, so now added
      if (stillWishlisted) {
        dispatch(syncAddToWishlist(product.id));
        toast.info(
          t.rich("toastSaved", {
            name: product.name,
            link: (chunks) => <Link href="/wishlist">{chunks}</Link>,
          })
        );
      } else {
        dispatch(syncRemoveFromWishlist(product.id));
        toast.info(t("toastRemoved", { name: product.name }));
      }
    }, "saveToWishlist");
  }, [requireAuth, dispatch, isWishlisted, product, toast, t]);

  return (
    <>
      {/* ── Main Content: 2-panel layout ── */}
      <div className="flex flex-col lg:flex-row lg:min-h-[calc(100vh-80px)]">
        {/* LEFT: Image Gallery with Carousel */}
        <div className="relative flex flex-col gap-3 p-4 sm:p-6 lg:flex-1 lg:max-w-[55%] lg:py-6 lg:pr-4 lg:pl-8 lg:sticky lg:top-20 lg:h-[calc(100vh-80px)]">
          {/* Main image — carousel */}
          <Carousel
            fill
            ariaLabel={t("carouselAria")}
            gap={0}
            arrows="hover"
            dots="overlay"
            keyboard={false}
            carouselRef={galleryRef}
            autoplay={viewer?.open ? false : undefined}
            onPageChange={setActiveImage}
            className="flex-1 rounded-lg overflow-hidden bg-[var(--bg-elevated)]"
            slideClassName="relative min-h-[400px] lg:min-h-0 select-none"
          >
            {images.map((img, idx) => (
              <ZoomableImage
                key={img}
                src={img}
                alt={t("imageAlt", { name: product.name, index: idx + 1 })}
                priority={idx === 0}
                onOpen={() => {
                  viewerIndexRef.current = idx;
                  setViewer({ open: true, index: idx });
                }}
              />
            ))}
          </Carousel>

          {/* Thumbnails — desktop only */}
          <div className="hidden sm:flex gap-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`relative w-16 h-20 rounded-md overflow-hidden border-2 p-0 cursor-pointer bg-[var(--bg-elevated)] transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:opacity-85 ${
                  activeImage === idx ? "border-[var(--accent-primary)]" : "border-transparent"
                }`}
                onClick={() => selectImage(idx)}
                aria-label={t("viewImage", { index: idx + 1 })}
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
            <Link href="/shop">{tNav("shop")}</Link>
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
                  PRODUCT_DETAIL_BADGE_STYLES[product.badge] ?? ""
                }`}
              >
                {t(`badge.${product.badge}`)}
              </span>
            )}
            <h1 className="font-display text-[clamp(28px,4vw,40px)] font-normal text-[var(--text-heading)] tracking-[-0.04em] leading-[105%]">
              {product.name}
            </h1>
            {/* Rating straight from the product response (no extra request); jumps to the reviews below */}
            {product.ratingAverage != null && product.ratingCount > 0 && (
              <a
                href="#reviews"
                onClick={() => window.dispatchEvent(new Event("reviews:open"))}
                className="mt-1 inline-flex min-h-11 items-center self-start no-underline"
              >
                <ProductRating
                  average={product.ratingAverage}
                  count={product.ratingCount}
                  variant="full"
                />
              </a>
            )}
          </motion.div>

          {/* Price */}
          <motion.div
            className="flex items-baseline gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.2 }}
          >
            <span className="font-primary text-xl font-medium text-[var(--text-heading)] tracking-[-0.04em]">
              {showPrice ? fmt(product, "price") : tCommon("priceOnRequest")}
            </span>
            {showPrice && product.originalPriceVnd && (
              <span className="font-primary text-[15px] font-medium text-[var(--text-disabled)] line-through tracking-[-0.04em]">
                {fmtOrNull(product, "originalPrice")}
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
          {showVariantPickers && (
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [...ease], delay: 0.35 }}
            >
              <span className="flex items-center gap-2 font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
                {t("size")}{" "}
                {selectedSize && (
                  <span className="text-[var(--text-heading)]">— {selectedSize}</span>
                )}
                <button
                  type="button"
                  className="ml-auto border-none bg-transparent p-0 font-primary text-xs text-[var(--accent-primary)] underline underline-offset-2 decoration-[rgba(201,169,110,0.4)] cursor-pointer tracking-[0.04em] transition hover:decoration-[var(--accent-primary)]"
                  onClick={() => setShowSizeGuide(true)}
                >
                  {t("sizeGuide")}
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
          )}

          {/* Color selector */}
          {showVariantPickers && product.colors.length > 0 && (
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [...ease], delay: 0.38 }}
            >
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
                {t("color")}{" "}
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
                    aria-label={t("selectColor", { name: color.name })}
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
          {showVariantPickers && (
            <motion.div
              className="flex items-center justify-between gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [...ease], delay: 0.42 }}
            >
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
                {t("quantity")}
              </span>
              <div className="flex items-center gap-0 border border-[var(--border-light)] rounded-full overflow-hidden">
                <button
                  type="button"
                  className="w-10 h-10 border-none bg-transparent text-[var(--text-secondary)] text-[15px] font-primary cursor-pointer flex items-center justify-center transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-heading)] disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label={t("decrease")}
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
                  aria-label={t("increase")}
                >
                  +
                </button>
              </div>
            </motion.div>
          )}

          {/* Actions: Add to Bag + Wishlist */}
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
                className={`flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border-none font-primary text-[15px] font-medium tracking-[0.04em] uppercase cursor-pointer transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-px ${
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
                    : handleAddToCart
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
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;
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

          {/* Details accordion */}
          <motion.div
            className="flex flex-col mt-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.45 }}
          >
            <div className="flex justify-between items-baseline py-3 border-t border-[var(--border-subtle)]">
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.06em] uppercase">
                {showVariantPickers ? t("material") : t("materialCustomOrder")}
              </span>
              <span className="font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em] text-right">
                {product.material}
              </span>
            </div>
            {showVariantPickers && (
              <div className="flex justify-between items-baseline py-3 border-t border-[var(--border-subtle)]">
                <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.06em] uppercase">
                  {t("care")}
                </span>
                <span className="font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em] text-right">
                  {product.care}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline py-3 border-t border-[var(--border-subtle)]">
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.06em] uppercase">
                {t("category")}
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
              {t("related.label")}
            </span>
            <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none px-4 sm:px-0">
              {t("related.title")}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 px-4 sm:px-6 lg:px-0 pt-2">
            {relatedProducts.slice(0, RELATED_PRODUCTS_LIMIT).map((rp, index) => (
              <Link
                key={rp.id}
                href={`/shop/${rp.category?.slug ?? ""}/${rp.subcategory?.slug ?? ""}/${rp.id}`}
                className={`group flex-col gap-2 no-underline text-inherit ${index === RELATED_PRODUCTS_LIMIT - 1 ? "hidden lg:flex" : "flex"}`}
              >
                <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-[var(--bg-elevated)]">
                  <Image
                    src={rp.images[0]}
                    alt={rp.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    style={{ objectFit: "cover" }}
                    className="transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                </div>
                <span className="font-primary text-[13px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                  {rp.name}
                </span>
                <span className="font-primary text-sm font-medium text-[var(--text-muted)] tracking-[-0.02em]">
                  {hasPublicPrice(rp.badge) ? fmt(rp, "price") : tCommon("priceOnRequest")}
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
      {/* Full-screen photo viewer (pinch / pan / zoom bar) */}
      {viewer && (
        <ImageViewer
          images={images}
          productName={product.name}
          index={viewer.index}
          open={viewer.open}
          onView={(i) => {
            viewerIndexRef.current = i;
          }}
          onClose={() => {
            /* Land the gallery on the photo the visitor ended on */
            selectImage(viewerIndexRef.current);
            setViewer((v) => v && { ...v, open: false });
          }}
        />
      )}
    </>
  );
}
