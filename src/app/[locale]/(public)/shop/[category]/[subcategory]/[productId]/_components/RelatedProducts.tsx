"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { useMoney } from "@/src/hooks/use-money";
import { hasPublicPrice } from "@/src/lib/product-purchase";
import { productPath } from "@/src/lib/product-url";
import type { Product } from "@/src/types/product";
import { RELATED_PRODUCTS_LIMIT } from "../../../../_common/constants";

/** Other products of the same sub-category; the last of five shows from `lg` only. */
export default function RelatedProducts({ products }: { products: Product[] }) {
  const t = useTranslations("public.product.detail");
  const tCommon = useTranslations("common");
  const { fmt } = useMoney();

  return (
    <>
    {products.length > 0 && (
      <section className="border-t border-[var(--border-subtle)] bg-[var(--bg-section-3)] py-5 sm:py-6 sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium px-4 sm:px-0">
            {t("related.label")}
          </span>
          <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(1.75rem,5vw,3rem)] tracking-[-0.04em] leading-none px-4 sm:px-0">
            {t("related.title")}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 px-4 sm:px-6 lg:px-0 pt-2">
          {products.map((rp, index) => (
            <Link
              key={rp.id}
              href={productPath(rp) ?? "/shop"}
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
              <span className="font-primary text-[0.8125rem] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
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
    </>
  );
}
