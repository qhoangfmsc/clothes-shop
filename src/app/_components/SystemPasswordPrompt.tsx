"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X } from "lucide-react";
import { SYSTEM_PASSWORD } from "@/src/lib/system-password";
import { markSystemUnlocked } from "@/src/lib/system-password-session";

/* ═══════════════════════════════════════════════════════════
   SYSTEM PASSWORD PROMPT — imperative admin password check

   One simple, generic dialog ("Enter password to continue")
   reused everywhere the admin password needs (re-)confirming —
   the full admin gate and one-off actions like Users "View".
   A correct entry unlocks the 15-minute session TTL for both.

   Usage:
     const requestPassword = useSystemPasswordPrompt();
     const ok = await requestPassword();
     if (!ok) return;
   ═══════════════════════════════════════════════════════════ */

type SystemPasswordPromptFn = () => Promise<boolean>;

const SystemPasswordContext = createContext<SystemPasswordPromptFn | null>(null);

export function useSystemPasswordPrompt(): SystemPasswordPromptFn {
  const ctx = useContext(SystemPasswordContext);
  if (!ctx) {
    throw new Error("useSystemPasswordPrompt must be used within a <SystemPasswordPromptProvider>");
  }
  return ctx;
}

interface PendingPrompt {
  resolve: (value: boolean) => void;
}

export function SystemPasswordPromptProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingPrompt | null>(null);

  const requestPassword = useCallback<SystemPasswordPromptFn>(() => {
    return new Promise<boolean>((resolve) => {
      setPending({ resolve });
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
    <SystemPasswordContext.Provider value={requestPassword}>
      {children}
      <SystemPasswordPortal pending={pending} onSettle={settle} />
    </SystemPasswordContext.Provider>
  );
}

function SystemPasswordPortal({
  pending,
  onSettle,
}: {
  pending: PendingPrompt | null;
  onSettle: (result: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Reset the field whenever a new prompt opens */
  useEffect(() => {
    setValue("");
    setError(false);
  }, [pending]);

  if (!mounted) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value === SYSTEM_PASSWORD) {
      markSystemUnlocked();
      onSettle(true);
    } else {
      setError(true);
      setValue("");
    }
  };

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
          <motion.form
            onSubmit={handleSubmit}
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-[360px] shadow-xl p-6 flex flex-col gap-4"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(201,169,110,0.18)] text-[var(--accent-primary)] shrink-0">
                  <Lock size={15} />
                </span>
                <h3 className="font-display text-base text-[var(--text-heading)] font-normal m-0">
                  Enter password to continue
                </h3>
              </div>
              <button
                type="button"
                className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)] shrink-0"
                onClick={() => onSettle(false)}
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="password"
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              placeholder="Password"
              className="w-full py-2.5 px-3 border border-[var(--border-light)] rounded-sm text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none"
            />
            {error && (
              <p className="text-xs text-[var(--accent-rose)] font-primary m-0">
                Incorrect password. Try again.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="py-2 px-4 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--text-secondary)] cursor-pointer"
                onClick={() => onSettle(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer"
              >
                Continue
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
