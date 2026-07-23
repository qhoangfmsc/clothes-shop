"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, XCircle, TriangleAlert, Info, X } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   TOAST SYSTEM — Global reusable toast notifications
   
   Usage:
     const { toast } = useToast();
     toast.success("Item added to your bag");
     toast.error("Something went wrong");
     toast.info("Your order is being processed");
     toast.warning("Only 2 left in stock");
   ═══════════════════════════════════════════════════════════ */

type ToastVariant = "success" | "error" | "info" | "warning";
type ToastPosition = "top-right" | "top-center" | "bottom-right" | "bottom-center";

interface ToastItem {
  id: string;
  message: ReactNode;
  variant: ToastVariant;
  duration: number;
}

interface ToastAPI {
  success: (message: ReactNode, duration?: number) => void;
  error: (message: ReactNode, duration?: number) => void;
  info: (message: ReactNode, duration?: number) => void;
  warning: (message: ReactNode, duration?: number) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

interface ToastContextValue {
  toast: ToastAPI;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* ── Hook: useToast ── */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

/* ── Variant Icons ── */
const variantIconColors: Record<ToastVariant, string> = {
  success: "var(--color-champagne-gold)",
  error: "var(--color-dusty-rose)",
  warning: "var(--color-butter)",
  info: "var(--color-dusty-blue)",
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const size = 16;
  const color = variantIconColors[variant];
  switch (variant) {
    case "success":
      return <Check size={size} style={{ color }} />;
    case "error":
      return <XCircle size={size} style={{ color }} />;
    case "warning":
      return <TriangleAlert size={size} style={{ color }} />;
    case "info":
      return <Info size={size} style={{ color }} />;
  }
}

/* ── Variant Styles ── */
const variantClasses: Record<ToastVariant, string> = {
  success: "bg-[rgba(10,10,8,0.90)] border-[rgba(201,169,110,0.25)]",
  error: "bg-[rgba(10,10,8,0.90)] border-[rgba(212,165,165,0.3)]",
  warning: "bg-[rgba(10,10,8,0.90)] border-[rgba(240,228,166,0.25)]",
  info: "bg-[rgba(10,10,8,0.90)] border-[rgba(143,163,180,0.3)]",
};

/* ── Single Toast Item ── */
const motionEase = [0.25, 0.1, 0.25, 1] as const;

function ToastItemComponent({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      className={`flex items-center gap-3 py-3 px-4 sm:px-5 rounded-full font-primary text-sm font-medium tracking-[0.02em] text-[var(--color-pearl-cream)] border max-w-[480px] max-sm:max-w-full max-sm:justify-center backdrop-blur-[20px] shadow-[0_8px_32px_rgba(58,49,42,0.18)] cursor-default pointer-events-auto ${variantClasses[item.variant]}`}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [...motionEase] }}
    >
      <ToastIcon variant={item.variant} />
      <span className="flex-1 leading-[140%] [&_a]:text-[var(--color-champagne-gold)] [&_a]:underline [&_a]:underline-offset-2">
        {item.message}
      </span>
      <button
        type="button"
        className="flex-shrink-0 flex items-center justify-center w-6 h-6 border-none bg-transparent text-[rgba(255,255,255,0.4)] cursor-pointer rounded-full p-0 hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.08)] transition-all duration-150"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

/* ── Toast Container (portal) ── */
function ToastPortal({
  toasts,
  position,
  onDismiss,
}: {
  toasts: ToastItem[];
  position: ToastPosition;
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  /* Only mount portal after client hydration */
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const posClasses: Record<ToastPosition, string> = {
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2 items-center",
    "bottom-right": "bottom-6 right-4 items-end",
    "top-center": "top-6 left-1/2 -translate-x-1/2 items-center",
    "top-right": "top-6 right-4 items-end",
  };

  return createPortal(
    <div
      className={`fixed z-9999 flex flex-col gap-2 pointer-events-none max-w-screen max-sm:!left-4 max-sm:!right-4 max-sm:!bottom-4 max-sm:!top-auto max-sm:!translate-x-0 max-sm:!items-stretch ${posClasses[position]}`}
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItemComponent key={t.id} item={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

/* ── Toast Provider ── */
interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = "bottom-center",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: ReactNode, duration: number = 3000) => {
      const id = `toast-${++counterRef.current}`;
      const newToast: ToastItem = { id, message, variant, duration };

      setToasts((prev) => {
        const next = [...prev, newToast];
        if (next.length > maxToasts) {
          const removed = next.shift();
          if (removed) {
            const timer = timersRef.current.get(removed.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(removed.id);
            }
          }
        }
        return next;
      });

      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    },
    [dismiss, maxToasts]
  );

  /* Stable toast API reference — won't cause re-renders in consumers */
  const toast: ToastAPI = useMemo(
    () => ({
      success: (msg: ReactNode, dur?: number) => addToast("success", msg, dur),
      error: (msg: ReactNode, dur?: number) => addToast("error", msg, dur),
      info: (msg: ReactNode, dur?: number) => addToast("info", msg, dur),
      warning: (msg: ReactNode, dur?: number) => addToast("warning", msg, dur),
      dismiss,
      dismissAll,
    }),
    [addToast, dismiss, dismissAll]
  );

  const contextValue = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastPortal toasts={toasts} position={position} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
