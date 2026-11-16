"use client";

import { useState, useEffect } from "react";
import { Link } from "@/src/i18n/navigation";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import type { Product } from "@/src/types/product";
import { moneyProp, trackEvent } from "@/src/lib/analytics";
import ProductRating from "@/src/app/[locale]/_components/ProductRating";
import { PRODUCT_DETAIL_BADGE_STYLES } from "@/src/lib/product-badge";
import { getPurchaseMode, hasPublicPrice } from "@/src/lib/product-purchase";
import { useAddToBag } from "../_common/use-add-to-bag";
import { useProductSelection } from "../_common/use-product-selection";
import SizeGuideModal from "./SizeGuideModal";
import ReviewsSection from "./ReviewsSection";
import ProductGallery from "./ProductGallery";
import VariantPickers from "./VariantPickers";
import PurchaseActions from "./PurchaseActions";
import ProductSpecs from "./ProductSpecs";
import RelatedProducts from "./RelatedProducts";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface ProductDetailClientProps {
  product: Product;
  categoryTitle: string;
  subcategoryLabel: string;
  relatedProducts: Product[];
}

/** The product page below the server shell: gallery and buying panel side by side, then reviews, related products and the size guide. */
export default function ProductDetailClient({
  product,
  categoryTitle,
  subcategoryLabel,
  relatedProducts,
}: ProductDetailClientProps) {
  const tNav = useTranslations("shared.header.nav");
  const tCommon = useTranslations("common");
  const { fmt, fmtOrNull } = useMoney();
  const locale = useLocale();
  const t = useTranslations("public.product.detail");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const selection = useProductSelection();
  const { addedToCart, addToBag } = useAddToBag(product, selection);
  const purchaseMode = getPurchaseMode(product.badge);
  const showPrice = hasPublicPrice(product.badge);
  /* Custom-order products are inquired about, not configured: no size / color / quantity pickers */
  const showVariantPickers = purchaseMode !== "customOrder";

  /* Funnel: one view per product page opened */
  useEffect(() => {
    trackEvent("view_product", {
      productId: product.id,
      ...moneyProp({ vnd: product.priceVnd, usd: product.priceUsd }, locale),
    });
  }, [product.id, product.priceVnd, product.priceUsd, locale]);

  return (
    <>
      {/* ── Main Content: 2-panel layout ── */}
      <div className="flex flex-col lg:flex-row">
        <ProductGallery product={product} />

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
            <span className="text-[var(--text-disabled)] text-[0.625rem]">◆</span>
            <Link href={`/shop/${product.category?.slug ?? ""}`}>{categoryTitle}</Link>
            <span className="text-[var(--text-disabled)] text-[0.625rem]">◆</span>
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
            <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-normal text-[var(--text-heading)] tracking-[-0.04em] leading-[105%]">
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
              <span className="font-primary text-[0.9375rem] font-medium text-[var(--text-disabled)] line-through tracking-[-0.04em]">
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
            className="font-primary text-[0.9375rem] font-medium text-[var(--text-secondary)] tracking-[-0.02em] leading-[160%]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.3 }}
          >
            {product.description}
          </motion.p>

          {showVariantPickers && <VariantPickers product={product} selection={selection} onOpenSizeGuide={() => setShowSizeGuide(true)} />}

          <PurchaseActions product={product} purchaseMode={purchaseMode} selection={selection} addedToCart={addedToCart} onAddToBag={addToBag} />

          <ProductSpecs product={product} categoryTitle={categoryTitle} subcategoryLabel={subcategoryLabel} showVariantPickers={showVariantPickers} />
        </div>
      </div>

      {/* Reviews */}
      <ReviewsSection productId={product.id} />

      <RelatedProducts products={relatedProducts} />

      {/* Size Guide Modal */}
      <SizeGuideModal
        category={product.category?.slug ?? ""}
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </>
  );
}
