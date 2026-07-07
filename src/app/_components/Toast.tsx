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
import "@/src/styles/toast.css";

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
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastAPI {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
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
function ToastIcon({ variant }: { variant: ToastVariant }) {
  const size = 16;
  switch (variant) {
    case "success":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="toast__icon">
          <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "error":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="toast__icon">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "warning":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="toast__icon">
          <path d="M8 2L14.5 13.5H1.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 6.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
        </svg>
      );
    case "info":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="toast__icon">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" />
        </svg>
      );
  }
}

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
      className={`toast toast--${item.variant}`}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [...motionEase] }}
    >
      <ToastIcon variant={item.variant} />
      <span className="toast__message">{item.message}</span>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
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

  return createPortal(
    <div
      className={`toast-container toast-container--${position}`}
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
    (variant: ToastVariant, message: string, duration: number = 3000) => {
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
      success: (msg: string, dur?: number) => addToast("success", msg, dur),
      error: (msg: string, dur?: number) => addToast("error", msg, dur),
      info: (msg: string, dur?: number) => addToast("info", msg, dur),
      warning: (msg: string, dur?: number) => addToast("warning", msg, dur),
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
