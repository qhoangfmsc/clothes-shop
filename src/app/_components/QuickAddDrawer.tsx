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
import { useAppDispatch } from "@/src/store/hooks";
import { addItem, syncAddToCartItem } from "@/src/app/(private)/cart/_common/moduleSlice";

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
function QuickAddContent({ product, onClose }: { product: Product; onClose: () => void }) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const { toast } = useToast();
  const { sizeGuide } = useSizeGuide(showSizeGuide ? (product.category?.slug ?? null) : null);
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

  const dispatch = useAppDispatch();

  const handleAddToCart = useCallback(() => {
    if (addedToCart || !isSelectionComplete) return;
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
      syncAddToCartItem({ productId: product.id, size: selectedSize!, color: colorName, quantity })
    );
    setAddedToCart(true);
    toast.success(
      <>
        {product.name} ({selectedSize}, {colorName}
        {quantity > 1 ? `, ×${quantity}` : ""}) added — <Link href="/cart">View Bag</Link>
      </>
    );
    setTimeout(() => {
      onClose();
    }, 800);
  }, [
    addedToCart,
    isSelectionComplete,
    dispatch,
    product,
    selectedSize,
    selectedColor,
    quantity,
    toast,
    onClose,
  ]);

  const productUrl = `/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;

  /* Size guide row helper */
  const getRowValue = (row: Record<string, string | undefined>, col: string): string => {
    const key = col.toLowerCase().replace(/\s+/g, "");
    const mapping: Record<string, string> = {
      size: "size",
      style: "size",
      ringsize: "size",
      bust: "bust",
      waist: "waist",
      hips: "hips",
      length: "length",
      width: "width",
      height: "height",
      depth: "depth",
      circumference: "circumference",
    };
    return row[mapping[key] ?? key] ?? "—";
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-100 bg-[rgba(10,10,8,0.45)] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />

      {/* Drawer — always reset both x and y to prevent stale transforms */}
      <motion.div
        ref={drawerRef}
        className="fixed z-101 bottom-0 left-0 right-0 max-h-[90vh] bg-[var(--bg-primary)] rounded-t-lg flex flex-col overflow-hidden sm:max-w-[480px] sm:left-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-screen sm:rounded-l-lg sm:rounded-tr-none"
        style={{ boxShadow: "0 -8px 40px rgba(58,49,42,0.15)" }}
        initial={isDesktop ? { x: "100%", y: 0 } : { y: "100%", x: 0 }}
        animate={{ x: 0, y: 0 }}
        exit={isDesktop ? { x: "100%", y: 0 } : { y: "100%", x: 0 }}
        transition={{ duration: 0.4, ease: [...ease] }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3 sm:hidden shrink-0">
          <span className="w-9 h-1 rounded-sm bg-[var(--border-medium)]" />
        </div>

        {/* Product info row */}
        <div className="flex items-center gap-3 py-3 px-5 border-b border-[var(--border-subtle)] sm:gap-4 sm:py-5 sm:px-6 shrink-0">
          <div className="relative w-16 h-20 rounded-sm overflow-hidden shrink-0 bg-[var(--bg-elevated)] sm:w-20 sm:h-[100px] sm:rounded-md">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="64px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 sm:gap-1">
            <Link
              href={productUrl}
              className="font-display text-[15px] sm:text-lg text-[var(--text-heading)] tracking-[-0.04em] no-underline truncate hover:text-[var(--accent-primary)] transition-colors duration-150"
              onClick={onClose}
            >
              {product.name}
            </Link>
            <div className="flex items-center gap-2 font-primary text-sm font-medium text-[var(--text-primary)]">
              <span>${product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-[var(--text-muted)] line-through text-xs">
                  ${product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-full border-none bg-transparent text-[var(--text-muted)] cursor-pointer flex items-center justify-center shrink-0 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-heading)] transition-all duration-150"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable content area ── */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ overscrollBehavior: "contain" }}>
          {/* Size selector */}
          <div className="flex flex-col gap-3 py-4 px-5 border-b border-[var(--border-subtle)] sm:gap-4 sm:py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
                Size{" "}
                {selectedSize && (
                  <span className="text-[var(--text-heading)]">— {selectedSize}</span>
                )}
              </span>
              <button
                type="button"
                className="border-none bg-none p-0 font-primary text-xs text-[var(--accent-primary)] underline underline-offset-2 cursor-pointer tracking-[0.04em] hover:decoration-[var(--accent-primary)]"
                onClick={() => setShowSizeGuide(!showSizeGuide)}
              >
                Size Guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`min-w-11 h-11 rounded-md border border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] font-primary text-sm font-medium tracking-[0.04em] cursor-pointer flex items-center justify-center px-3 transition-all duration-150 hover:border-[var(--accent-primary)] sm:min-w-12 sm:h-12 sm:text-base sm:px-4 ${
                    selectedSize === size
                      ? "!border-[var(--accent-primary)] !bg-[var(--accent-primary)] !text-[var(--text-on-gold)] shadow-[var(--shadow-gold-sm)]"
                      : ""
                  }`}
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
                className="overflow-hidden border-b border-[var(--border-subtle)]"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [...ease] }}
              >
                <div className="py-3 px-5 overflow-x-auto sm:py-4 sm:px-6">
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontFamily: "var(--font-primary)",
                      fontSize: 12,
                    }}
                  >
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
                            <td key={col} className="text-center">
                              {getRowValue(
                                row as unknown as Record<string, string | undefined>,
                                col
                              )}
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
            <div className="flex flex-col gap-3 py-4 px-5 border-b border-[var(--border-subtle)] sm:gap-4 sm:py-5 sm:px-6">
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
                    className={`w-9 h-9 rounded-full border-2 bg-transparent flex items-center justify-center cursor-pointer p-[3px] transition-all duration-150 ${
                      selectedColor === color.hex
                        ? "!border-[var(--accent-primary)] shadow-[var(--shadow-gold-sm)] scale-110"
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
            </div>
          )}

          {/* Quantity */}
          <div className="flex flex-row items-center justify-between py-4 px-5 border-b border-[var(--border-subtle)] sm:gap-4 sm:py-5 sm:px-6">
            <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
              Quantity
            </span>
            <div className="flex items-center gap-0 border border-[var(--border-light)] rounded-full overflow-hidden">
              <button
                type="button"
                className="w-10 h-10 border-none bg-transparent text-[var(--text-secondary)] text-[15px] font-primary cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-heading)] disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="w-10 h-10 border-none bg-transparent text-[var(--text-secondary)] text-[15px] font-primary cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-heading)] disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                disabled={quantity >= 10}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </div>
        {/* end scrollable content */}

        {/* Add to Bag */}
        <div className="flex flex-col gap-2 p-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:gap-3 sm:p-6 sm:border-t sm:border-[var(--border-subtle)] shrink-0">
          {!isSelectionComplete && (
            <p className="font-primary text-xs text-[var(--text-muted)] tracking-[0.04em] text-center m-0">
              {!selectedSize && !selectedColor
                ? "Select size & color"
                : !selectedSize
                  ? "Select a size"
                  : "Select a color"}
            </p>
          )}
          <button
            type="button"
            className={`w-full inline-flex items-center justify-center gap-2 p-4 rounded-full border-none font-primary text-[15px] font-medium tracking-[0.04em] uppercase cursor-pointer transition-all duration-150 ${
              addedToCart
                ? "!bg-[var(--accent-primary)] !text-[var(--text-on-gold)] pointer-events-none"
                : "bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)] hover:bg-[var(--color-charcoal)] hover:-translate-y-px hover:shadow-[var(--shadow-lg)]"
            } ${!isSelectionComplete ? "opacity-45 cursor-not-allowed hover:translate-y-0 hover:shadow-none hover:bg-[var(--color-obsidian)]" : ""}`}
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
