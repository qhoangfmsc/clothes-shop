"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";

import { hasPublicPrice } from "@/src/lib/product-purchase";
import { PRODUCT_CARD_BADGE_STYLES } from "@/src/lib/product-badge";
import type { OrderProduct } from "../_common/types";

/** The product being ordered, kept to what helps the shopper decide: photos, name, price,
 *  a short description and the material. Size and colour are picked in the form next to it. */
export default function ProductSummaryCard({ product }: { product: OrderProduct }) {
  const t = useTranslations("public.contact.product");
  const tBadge = useTranslations("common.productBadge");
  const tCommon = useTranslations("common");
  const { fmt, fmtOrNull } = useMoney();
  const [activeImage, setActiveImage] = useState(0);
  const showPrice = hasPublicPrice(product.badge);

  const image = product.images[activeImage] ?? product.images[0];
  /* A percentage of the two VND prices, not an amount of money */
  const discount =
    product.originalPriceVnd && product.originalPriceVnd > product.priceVnd
      ? Math.round((1 - product.priceVnd / product.originalPriceVnd) * 100)
      : null;
  const eyebrow = [product.categoryTitle, product.subcategoryLabel].filter(Boolean).join(" · ");

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--border-light)] bg-[var(--bg-elevated)]">
      <div className="relative aspect-[5/6] w-full bg-[var(--color-champagne-cream)]">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 360px, 100vw"
            style={{ objectFit: "cover" }}
            priority
          />
        )}
        {product.badge && (
          <span
            className={`absolute left-4 top-4 rounded-full px-3 py-1 font-primary text-xs font-medium uppercase tracking-[0.08em] backdrop-blur-lg ${
              PRODUCT_CARD_BADGE_STYLES[product.badge] ?? ""
            }`}
          >
            {tBadge(product.badge)}
          </span>
        )}
        {product.images.length > 1 && (
          <div
            className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto bg-gradient-to-t from-[rgba(10,10,8,0.45)] to-transparent px-4 pb-3 pt-8"
            role="group"
            aria-label={t("gallery")}
          >
            {product.images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={t("showImage", { index: index + 1 })}
                aria-pressed={index === activeImage}
                className={`relative h-14 w-11 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 bg-[var(--color-champagne-cream)] p-0 transition-colors duration-150 motion-reduce:transition-none ${
                  index === activeImage
                    ? "border-[var(--color-white)]"
                    : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Image src={src} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-5">
        {eyebrow && (
          <span className="font-primary text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {eyebrow}
          </span>
        )}
        <h3 className="m-0 font-display text-2xl font-normal leading-[110%] tracking-[-0.04em] text-[var(--text-heading)]">
          {product.name}
        </h3>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-primary text-lg font-medium tracking-[-0.02em] text-[var(--text-heading)]">
            {showPrice ? fmt(product, "price") : tCommon("priceOnRequest")}
          </span>
          {showPrice && discount && product.originalPriceVnd && (
            <>
              <span className="font-primary text-sm text-[var(--text-disabled)] line-through">
                {fmtOrNull(product, "originalPrice")}
              </span>
              <span className="font-primary text-xs font-medium text-[var(--color-deep-rose)]">
                {t("discount", { percent: discount })}
              </span>
            </>
          )}
        </div>
        {product.description && (
          <p className="m-0 line-clamp-3 font-primary text-sm leading-[160%] tracking-[-0.02em] text-[var(--text-secondary)]">
            {product.description}
          </p>
        )}
        {product.material && (
          <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-3">
            <p className="m-0 font-primary text-sm tracking-[-0.02em] text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">{t("material")}:</span> {product.material}
            </p>
            <p className="m-0 font-primary text-xs leading-[150%] tracking-[-0.02em] text-[var(--text-muted)]">
              {t("materialHint")}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
