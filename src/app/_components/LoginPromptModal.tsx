"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import GoogleSignInButton from "@/src/app/(auth)/login/_components/GoogleSignInButton";
import { useAuth } from "@/src/contexts/auth-context";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Context ── */
interface LoginPromptContextValue {
  openLoginPrompt: (onSuccess?: () => void, featureLabel?: string) => void;
}

const LoginPromptContext = createContext<LoginPromptContextValue | null>(null);

export function useLoginPrompt(): LoginPromptContextValue {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) {
    throw new Error("useLoginPrompt must be used within <LoginPromptProvider>");
  }
  return ctx;
}

/* ── Modal Content ── */
function LoginPromptContent({
  featureLabel,
  onClose,
}: {
  featureLabel: string;
  onClose: () => void;
}) {
  /* Lock scroll */
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  /* Close on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Full-screen wrapper — flex centering */}
      <div className="login-prompt__overlay" onClick={onClose}>
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [...ease] }}
          className="login-prompt__card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="login-prompt__close"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div className="login-prompt__icon-wrap">
            <ShoppingBag size={24} style={{ color: "var(--accent-primary)" }} />
          </div>

          {/* Title */}
          <h2 className="login-prompt__title">Sign in to continue</h2>

          {/* Subtitle */}
          <p className="login-prompt__subtitle">
            Sign in to {featureLabel}. Your selections will be saved.
          </p>

          {/* Google Sign-In */}
          <div className="login-prompt__signin">
            <GoogleSignInButton />
          </div>

          {/* Dismiss */}
          <button onClick={onClose} className="login-prompt__dismiss">
            Continue Browsing
          </button>
        </motion.div>
      </div>

      <style>{`
        .login-prompt__overlay {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal);
          background: rgba(10, 10, 8, 0.45);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }

        .login-prompt__card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-5);
          padding: var(--space-10) var(--space-8);
          max-width: 380px;
          width: 100%;
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-xl);
          text-align: center;
        }

        .login-prompt__close {
          position: absolute;
          top: var(--space-4);
          right: var(--space-4);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: color var(--duration-fast) var(--ease-default),
                      background var(--duration-fast) var(--ease-default);
        }
        .login-prompt__close:hover {
          color: var(--text-primary);
          background: var(--color-champagne-cream);
        }

        .login-prompt__icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--color-champagne-cream);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-subtle);
        }

        .login-prompt__title {
          font-family: var(--font-display), serif;
          font-weight: var(--font-weight-display);
          font-size: var(--text-xl);
          color: var(--text-heading);
          letter-spacing: -0.04em;
          line-height: 100%;
        }

        .login-prompt__subtitle {
          font-family: var(--font-primary);
          font-size: var(--text-base);
          color: var(--text-secondary);
          letter-spacing: -0.02em;
          line-height: 140%;
          max-width: 280px;
        }

        .login-prompt__signin {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .login-prompt__dismiss {
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
          padding: var(--space-2) var(--space-4);
          transition: color var(--duration-fast) var(--ease-default);
        }
        .login-prompt__dismiss:hover { color: var(--text-primary); }

        @media (prefers-reduced-motion: reduce) {
          .login-prompt__close,
          .login-prompt__dismiss {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}

/* ── Provider ── */
export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [featureLabel, setFeatureLabel] = useState("continue");
  const [mounted, setMounted] = useState(false);
  const pendingCallbackRef = useRef<(() => void) | null>(null);
  const wasAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* When user successfully logs in while modal is open → run pending callback */
  useEffect(() => {
    if (isAuthenticated && !wasAuthenticatedRef.current && pendingCallbackRef.current) {
      const cb = pendingCallbackRef.current;
      pendingCallbackRef.current = null;
      setIsOpen(false);
      /* Small delay to let auth state propagate */
      setTimeout(cb, 100);
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const openLoginPrompt = useCallback(
    (onSuccess?: () => void, label?: string) => {
      pendingCallbackRef.current = onSuccess ?? null;
      setFeatureLabel(label ?? "continue");
      setIsOpen(true);
    },
    []
  );

  const handleClose = useCallback(() => {
    pendingCallbackRef.current = null;
    setIsOpen(false);
  }, []);

  const contextValue = useMemo(() => ({ openLoginPrompt }), [openLoginPrompt]);

  return (
    <LoginPromptContext.Provider value={contextValue}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <LoginPromptContent
                featureLabel={featureLabel}
                onClose={handleClose}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </LoginPromptContext.Provider>
  );
}
