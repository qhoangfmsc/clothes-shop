"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CONFIRM DIALOG — Global imperative confirm popup

   Replaces window.confirm() with a themed modal.
   Usage:
     const confirm = useConfirm();
     const ok = await confirm({ title: "Delete item", message: "...", danger: true });
     if (!ok) return;
   ═══════════════════════════════════════════════════════════ */

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (rose instead of gold). */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a <ConfirmProvider>");
  }
  return ctx;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const settle = useCallback(
    (result: boolean) => {
      pending?.resolve(result);
      setPending(null);
    },
    [pending]
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmPortal pending={pending} onSettle={settle} />
    </ConfirmContext.Provider>
  );
}

function ConfirmPortal({
  pending,
  onSettle,
}: {
  pending: PendingConfirm | null;
  onSettle: (result: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {pending && (
        <motion.div
          className="fixed inset-0 bg-[rgba(10,10,8,0.55)] flex items-center justify-center z-200 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => onSettle(false)}
        >
          <motion.div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-[400px] shadow-xl p-6 flex flex-col gap-5"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
                  pending.danger
                    ? "bg-[rgba(212,165,165,0.18)] text-[var(--accent-rose)]"
                    : "bg-[rgba(201,169,110,0.18)] text-[var(--accent-primary)]"
                }`}
              >
                <TriangleAlert size={17} />
              </span>
              <div className="flex flex-col gap-1 pt-1">
                {pending.title && (
                  <h3 className="font-display text-base text-[var(--text-heading)] font-normal m-0">
                    {pending.title}
                  </h3>
                )}
                <p className="text-sm text-[var(--text-secondary)] font-primary leading-relaxed m-0">
                  {pending.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="py-2 px-4 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--text-secondary)] cursor-pointer"
                onClick={() => onSettle(false)}
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                autoFocus
                className={`py-2 px-5 border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer ${
                  pending.danger
                    ? "bg-[var(--accent-rose)] text-[var(--color-noir)]"
                    : "bg-[var(--accent-primary)] text-[var(--text-on-gold)]"
                }`}
                onClick={() => onSettle(true)}
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
