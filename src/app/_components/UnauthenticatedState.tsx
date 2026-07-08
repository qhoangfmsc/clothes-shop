"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldOff, Sparkles, Home } from "lucide-react";
import GoogleSignInButton from "@/src/app/(auth)/login/_components/GoogleSignInButton";

const ease = [0.25, 0.1, 0.25, 1] as const;

/**
 * UnauthenticatedState — Non-dismissable modal shown on private pages
 * when user is not logged in.
 *
 * - Cannot be closed (no X button, backdrop doesn't dismiss)
 * - Options: Google Sign-In to login, or "Go to Home" to leave
 * - Locks body scroll while visible
 */
export default function UnauthenticatedState() {
  /* Lock body scroll */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, []);

  const modal = (
    <>
      {/* Backdrop — NOT clickable, non-dismissable */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [...ease] }}
        className="unauth-modal__backdrop"
      />

      {/* Modal card */}
      <div className="unauth-modal__container">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [...ease], delay: 0.1 }}
          className="unauth-modal__card"
        >
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.15 }}
            className="unauth-modal__icon-wrap"
          >
            <ShieldOff size={28} style={{ color: "var(--text-muted)" }} />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.2 }}
            className="unauth-modal__title"
          >
            Session Expired
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.25 }}
            className="unauth-modal__subtitle"
          >
            Please sign in again to access your account, wishlist, and order history.
          </motion.p>

          {/* Google Sign-In */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.35 }}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <GoogleSignInButton />
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.4 }}
            className="unauth-modal__divider"
          >
            <span className="unauth-modal__divider-line" />
            <span className="unauth-modal__divider-text">or</span>
            <span className="unauth-modal__divider-line" />
          </motion.div>

          {/* Go to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.45 }}
          >
            <Link href="/" className="unauth-modal__home-link">
              <Home size={14} />
              Go to Home
            </Link>
          </motion.div>

          {/* Features preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: [...ease], delay: 0.5 }}
            className="unauth-modal__features"
          >
            {[
              "Track your orders",
              "Save your wishlist",
              "Exclusive member offers",
            ].map((feature) => (
              <div key={feature} className="unauth-modal__feature-item">
                <Sparkles size={12} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
                <span>{feature}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        .unauth-modal__backdrop {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal);
          background: rgba(10, 10, 8, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .unauth-modal__container {
          position: fixed;
          inset: 0;
          z-index: calc(var(--z-modal) + 1);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }

        .unauth-modal__card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-5);
          padding: var(--space-10) var(--space-8);
          max-width: 420px;
          width: 100%;
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-xl), var(--shadow-gold-glow);
          text-align: center;
        }

        .unauth-modal__icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--color-champagne-cream);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-subtle);
        }

        .unauth-modal__title {
          font-family: var(--font-display), serif;
          font-weight: var(--font-weight-display);
          font-size: var(--text-xl);
          color: var(--text-heading);
          letter-spacing: -0.04em;
          line-height: 100%;
        }

        .unauth-modal__subtitle {
          font-family: var(--font-primary);
          font-size: var(--text-base);
          color: var(--text-secondary);
          letter-spacing: -0.02em;
          line-height: 140%;
          max-width: 320px;
        }

        .unauth-modal__divider {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          width: 100%;
          transform-origin: center;
        }

        .unauth-modal__divider-line {
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }

        .unauth-modal__divider-text {
          font-family: var(--font-primary);
          font-size: var(--text-xs);
          color: var(--text-disabled);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .unauth-modal__home-link {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: 10px 24px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-light);
          background: transparent;
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: -0.02em;
          text-decoration: none;
          text-transform: uppercase;
          transition: background var(--duration-fast) var(--ease-default),
                      color var(--duration-fast) var(--ease-default),
                      border-color var(--duration-fast) var(--ease-default);
        }

        .unauth-modal__home-link:hover {
          background: var(--color-champagne-cream);
          color: var(--text-heading);
          border-color: var(--border-default);
        }

        .unauth-modal__features {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
          width: 100%;
        }

        .unauth-modal__feature-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          font-family: var(--font-primary);
          font-size: var(--text-sm);
          color: var(--text-muted);
          letter-spacing: -0.02em;
        }

        @media (min-width: 640px) {
          .unauth-modal__card {
            padding: var(--space-12) var(--space-10);
          }
          .unauth-modal__title {
            font-size: var(--text-2xl);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .unauth-modal__home-link {
            transition: none;
          }
        }
      `}</style>
    </>
  );

  return createPortal(modal, document.body);
}
