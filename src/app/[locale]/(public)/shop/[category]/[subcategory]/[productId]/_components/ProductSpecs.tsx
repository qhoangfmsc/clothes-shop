"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Product } from "@/src/types/product";
import ShippingAccordion from "./ShippingAccordion";

const ease = [0.25, 0.1, 0.25, 1] as const;

/** Material, care (not for custom orders), category, and the shipping & returns accordion. */
export default function ProductSpecs({ product, categoryTitle, subcategoryLabel, showVariantPickers }: { product: Product; categoryTitle: string; subcategoryLabel: string; showVariantPickers: boolean }) {
  const t = useTranslations("public.product.detail");

  return (
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
  );
}
