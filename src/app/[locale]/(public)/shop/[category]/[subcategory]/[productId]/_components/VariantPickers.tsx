"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Product } from "@/src/types/product";
import type { ProductSelection } from "../_common/use-product-selection";

const ease = [0.25, 0.1, 0.25, 1] as const;

/** Size (with the size-guide link), colour and quantity pickers. */
export default function VariantPickers({ product, selection, onOpenSizeGuide }: { product: Product; selection: ProductSelection; onOpenSizeGuide: () => void }) {
  const t = useTranslations("public.product.detail");
  const { size: selectedSize, color: selectedColor, quantity, setSize: setSelectedSize, setColor: setSelectedColor, setQuantity } = selection;

  return (
    <>
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
            onClick={() => onOpenSizeGuide()}
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

      {/* Color selector */}
      {product.colors.length > 0 && (
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
                className={`w-9 h-9 rounded-full border-2 bg-transparent flex items-center justify-center cursor-pointer p-[0.1875rem] transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
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
            className="w-10 h-10 border-none bg-transparent text-[var(--text-secondary)] text-[0.9375rem] font-primary cursor-pointer flex items-center justify-center transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-heading)] disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label={t("decrease")}
          >
            −
          </button>
          <span className="w-10 text-center font-primary text-[0.9375rem] font-medium text-[var(--text-heading)] tracking-[0.02em]">
            {quantity}
          </span>
          <button
            type="button"
            className="w-10 h-10 border-none bg-transparent text-[var(--text-secondary)] text-[0.9375rem] font-primary cursor-pointer flex items-center justify-center transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-heading)] disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => setQuantity((q) => Math.min(10, q + 1))}
            disabled={quantity >= 10}
            aria-label={t("increase")}
          >
            +
          </button>
        </div>
      </motion.div>
    </>
  );
}
