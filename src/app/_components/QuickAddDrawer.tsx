"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ShoppingBag } from "lucide-react";
import type { Product } from "@/src/types/product";
import { useToast } from "@/src/app/_components/Toast";
import { useSizeGuide } from "@/src/hooks/use-api";
import "@/src/styles/quick-add-drawer.css";

/* ═══════════════════════════════════════════════════════════
   QUICK ADD DRAWER — Bottom sheet for quick product add
   
   Usage:
     const { openQuickAdd } = useQuickAdd();
     openQuickAdd(product);
   ═══════════════════════════════════════════════════════════ */

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Context ── */
interface QuickAddContextValue {
  openQuickAdd: (product: Product) => void;
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function useQuickAdd(): QuickAddContextValue {
  const ctx = useContext(QuickAddContext);
  if (!ctx) {
    throw new Error("useQuickAdd must be used within a <QuickAddProvider>");
  }
  return ctx;
}

/* ── Drawer Content ── */
function QuickAddContent({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const { toast } = useToast();
  const { sizeGuide } = useSizeGuide(showSizeGuide ? product.category : null);
  const drawerRef = useRef<HTMLDivElement>(null);

  /* Detect desktop for animation direction — safe because this only renders client-side (portal) */
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 640px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isSelectionComplete = selectedSize !== null && selectedColor !== null;

  /* Close on Escape */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /* Swipe down to close */
  const touchStartY = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (deltaY > 80) onClose();
    },
    [onClose]
  );

  const handleAddToCart = useCallback(() => {
    if (addedToCart || !isSelectionComplete) return;
    setAddedToCart(true);
    const colorName = product.colors.find((c) => c.hex === selectedColor)?.name ?? "";
    toast.success(
      <>
        {product.name} ({selectedSize}, {colorName}
        {quantity > 1 ? `, ×${quantity}` : ""}) added —{" "}
        <Link href="/cart">View Bag</Link>
      </>
    );
    setTimeout(() => {
      onClose();
    }, 800);
  }, [addedToCart, isSelectionComplete, product, selectedSize, selectedColor, quantity, toast, onClose]);

  const productUrl = `/shop/${product.category}/${product.subcategory}/${product.id}`;

  /* Size guide row helper */
  const getRowValue = (row: Record<string, string | undefined>, col: string): string => {
    const key = col.toLowerCase().replace(/\s+/g, "");
    const mapping: Record<string, string> = {
      size: "size", style: "size", ringsize: "size",
      bust: "bust", waist: "waist", hips: "hips",
      length: "length", width: "width", height: "height",
      depth: "depth", circumference: "circumference",
    };
    return row[mapping[key] ?? key] ?? "—";
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="qa-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />

      {/* Drawer — always reset both x and y to prevent stale transforms */}
      <motion.div
        ref={drawerRef}
        className="qa-drawer"
        initial={isDesktop ? { x: "100%", y: 0 } : { y: "100%", x: 0 }}
        animate={{ x: 0, y: 0 }}
        exit={isDesktop ? { x: "100%", y: 0 } : { y: "100%", x: 0 }}
        transition={{ duration: 0.4, ease: [...ease] }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Handle bar */}
        <div className="qa-drawer__handle">
          <span className="qa-drawer__handle-bar" />
        </div>

        {/* Product info row */}
        <div className="qa-drawer__product">
          <div className="qa-drawer__thumb">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="64px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="qa-drawer__product-info">
            <Link href={productUrl} className="qa-drawer__product-name" onClick={onClose}>
              {product.name}
            </Link>
            <div className="qa-drawer__product-price">
              <span>${product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="qa-drawer__product-price--original">
                  ${product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button type="button" className="qa-drawer__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Size selector */}
        <div className="qa-drawer__section">
          <div className="qa-drawer__section-header">
            <span className="qa-drawer__label">
              Size {selectedSize && <span className="qa-drawer__label-value">— {selectedSize}</span>}
            </span>
            <button
              type="button"
              className="qa-drawer__guide-link"
              onClick={() => setShowSizeGuide(!showSizeGuide)}
            >
              Size Guide
            </button>
          </div>
          <div className="qa-drawer__sizes">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                className={`qa-drawer__size-btn ${selectedSize === size ? "qa-drawer__size-btn--active" : ""}`}
                onClick={() => setSelectedSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Inline size guide (collapsible) */}
        <AnimatePresence>
          {showSizeGuide && sizeGuide && (
            <motion.div
              className="qa-drawer__sg-inline"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [...ease] }}
            >
              <div className="qa-drawer__sg-content">
                <table className="sg-modal__table">
                  <thead>
                    <tr>
                      {sizeGuide.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeGuide.rows.map((row, idx) => (
                      <tr key={idx}>
                        {sizeGuide.columns.map((col) => (
                          <td key={col}>
                            {getRowValue(row as unknown as Record<string, string | undefined>, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color selector */}
        {product.colors.length > 0 && (
          <div className="qa-drawer__section">
            <span className="qa-drawer__label">
              Color{" "}
              {selectedColor && (
                <span className="qa-drawer__label-value">
                  — {product.colors.find((c) => c.hex === selectedColor)?.name}
                </span>
              )}
            </span>
            <div className="qa-drawer__colors">
              {product.colors.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  className={`pdp-colors__swatch ${selectedColor === color.hex ? "pdp-colors__swatch--active" : ""}`}
                  onClick={() => setSelectedColor(color.hex)}
                  aria-label={`Select color: ${color.name}`}
                  title={color.name}
                >
                  <span className="pdp-colors__dot" style={{ background: color.hex }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="qa-drawer__section qa-drawer__section--row">
          <span className="qa-drawer__label">Quantity</span>
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
        </div>

        {/* Add to Bag */}
        <div className="qa-drawer__footer">
          {!isSelectionComplete && (
            <p className="qa-drawer__hint">
              {!selectedSize && !selectedColor
                ? "Select size & color"
                : !selectedSize
                  ? "Select a size"
                  : "Select a color"}
            </p>
          )}
          <button
            type="button"
            className={`qa-drawer__add-btn ${addedToCart ? "qa-drawer__add-btn--added" : ""} ${!isSelectionComplete ? "qa-drawer__add-btn--disabled" : ""}`}
            onClick={handleAddToCart}
            disabled={!isSelectionComplete}
          >
            {addedToCart ? (
              <>
                <Check size={16} />
                Added
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                Add to Bag — ${(product.price * quantity).toLocaleString()}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ── Provider ── */
interface QuickAddProviderProps {
  children: ReactNode;
}

export function QuickAddProvider({ children }: QuickAddProviderProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openQuickAdd = useCallback((p: Product) => {
    setProduct(p);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setProduct(null);
  }, []);

  const contextValue = useMemo(() => ({ openQuickAdd }), [openQuickAdd]);

  return (
    <QuickAddContext.Provider value={contextValue}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {product && <QuickAddContent product={product} onClose={closeQuickAdd} />}
          </AnimatePresence>,
          document.body
        )}
    </QuickAddContext.Provider>
  );
}
