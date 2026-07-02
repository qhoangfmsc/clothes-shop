"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

const NAV_LINKS = [
  { label: "Home", href: "/", description: "Back to start" },
  { label: "Collection", href: "#", description: "Explore pieces" },
  { label: "Custom Design", href: "#", description: "Made for you" },
  { label: "Lookbook", href: "#", description: "Editorial gallery" },
  { label: "Contact", href: "#", description: "Get in touch" },
  { label: "About", href: "/about", description: "Our story & vision" },
] as const;

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  /* Ensure portal target exists (client only) */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  /* ── Drawer content (portaled to body to escape mix-blend-mode) ── */
  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [...ease] }}
            onClick={close}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99,
              background: "rgba(58, 49, 42, 0.35)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              cursor: "pointer",
            }}
          />

          {/* Drawer panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [...ease] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 100,
              width: "100%",
              maxWidth: 480,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* ── Top bar ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "26px 20px",
              }}
              className="sm:py-[28px]! sm:px-[40px]!"
            >
              <motion.span
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [...ease], delay: 0.15 }}
                style={{
                  color: "#FFF",
                  fontSize: "34px",
                  letterSpacing: "-0.04em",
                  lineHeight: "100%",
                  fontWeight: 500,
                }}
              >
                Ori Baebi
              </motion.span>

              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 0.35, ease: [...ease], delay: 0.1 }}
                onClick={close}
                aria-label="Close menu"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "var(--radius-pill)",
                  cursor: "pointer",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFF",
                  transition: `background var(--duration-fast) var(--ease-default), border-color var(--duration-fast) var(--ease-default)`,
                }}
                className="drawer-close-btn"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1L13 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.button>
            </div>

            {/* ── Navigation links ── */}
            <nav
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "32px 24px",
              }}
              className="sm:!px-[40px] sm:!py-[40px]"
            >
              {NAV_LINKS.map((link, idx) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [...ease],
                    delay: 0.18 + idx * 0.06,
                  }}
                >
                  <Link
                    href={link.href}
                    onClick={close}
                    className="drawer-nav-link"
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "16px",
                      padding: "20px 0",
                      textDecoration: "none",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                      transition: `border-color var(--duration-fast) var(--ease-default)`,
                    }}
                  >
                    {/* Index number */}
                    <span
                      style={{
                        color: "rgba(255, 255, 255, 0.3)",
                        fontSize: "var(--text-xs)",
                        letterSpacing: "-0.02em",
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 24,
                        flexShrink: 0,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Label + description */}
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        className="drawer-nav-label"
                        style={{
                          color: "#FFF",
                          fontSize: "var(--text-xl)",
                          letterSpacing: "-0.04em",
                          lineHeight: "100%",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          transition: `color var(--duration-fast) var(--ease-default)`,
                        }}
                      >
                        {link.label}
                      </span>
                      <span
                        style={{
                          color: "rgba(255, 255, 255, 0.4)",
                          fontSize: "var(--text-sm)",
                          letterSpacing: "-0.02em",
                          lineHeight: "140%",
                        }}
                      >
                        {link.description}
                      </span>
                    </span>
                  </Link>
                </motion.div>
              ))}

              {/* Sign In — CTA pill button */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [...ease],
                  delay: 0.18 + NAV_LINKS.length * 0.06 + 0.1,
                }}
                style={{ marginTop: 32 }}
                className="sm:!mt-[40px]"
              >
                <Link
                  href="/login"
                  onClick={close}
                  className="drawer-signin-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: "#FFF",
                    color: "#000",
                    borderRadius: "var(--radius-pill)",
                    padding: "12px 32px",
                    fontSize: "var(--text-md)",
                    letterSpacing: "-0.02em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    fontWeight: 500,
                    boxShadow: "var(--shadow-sm)",
                    transition: `opacity var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-default)`,
                  }}
                >
                  Sign In
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 8H13M13 8L9 4M13 8L9 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </motion.div>
            </nav>

            {/* ── Footer ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: [...ease], delay: 0.6 }}
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                color: "rgba(255, 255, 255, 0.3)",
                fontSize: "var(--text-xs)",
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                padding: "20px 24px",
              }}
              className="sm:!px-[40px] sm:!py-[24px]"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>© 2026 Ori Baebi</span>
                <span>Haute Couture</span>
              </div>
              <span style={{ opacity: 0.6 }}>Crafted with intention</span>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={open}
        aria-label="Open menu"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          className="w-6 h-6 lg:w-[30px] lg:h-[30px]"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 14H40" stroke="white" strokeWidth="2.5" />
          <path d="M0 26H40" stroke="white" strokeWidth="2.5" />
        </svg>
      </button>

      {/* ── Drawer (portaled to body to escape mix-blend-mode: exclusion) ── */}
      {mounted && createPortal(drawerContent, document.body)}
    </>
  );
}
