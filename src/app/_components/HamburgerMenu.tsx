"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Navigation structure ── */
const SHOP_CATEGORIES = [
  {
    title: "Tops",
    href: "/shop/tops",
    items: ["Camisoles", "Halter Tops", "Tank Tops", "Off-Shoulder", "Cardigans", "Corset Tops"],
  },
  {
    title: "Skirts",
    href: "/shop/skirts",
    items: ["Slip Skirts", "Midi Skirts", "Mini Skirts", "Wrap Skirts", "Lace Skirts"],
  },
  {
    title: "Bags",
    href: "/shop/bags",
    items: ["Hobo Bags", "Shoulder Bags", "Clutches", "Mini Bags", "Tote Bags"],
  },
  {
    title: "Jewelry",
    href: "/shop/jewelry",
    items: ["Necklaces", "Earrings", "Rings", "Bracelets", "Hair Accessories"],
  },
] as const;

const NAV_LINKS = [
  { label: "Home", href: "/", hasAccordion: false, description: "Welcome to our store" },
  { label: "Shop", href: "/shop", hasAccordion: true },
  { label: "New In", href: "/new-in", hasAccordion: false, description: "Latest arrivals" },
  {
    label: "Collections",
    href: "/collections",
    hasAccordion: false,
    description: "Curated seasonal edits",
  },
  { label: "About", href: "/about", hasAccordion: false, description: "Our story & vision" },
] as const;

const FEATURED_PRODUCTS = [
  {
    image: "/images/model-intro/model_intro_2.webp",
    title: "Summer Essentials",
    subtitle: "Discover the new collection",
    href: "/shop",
  },
  {
    image: "/images/model-intro/model_intro_5.webp",
    title: "Evening Edit",
    subtitle: "Après-midi to midnight",
    href: "/shop",
  },
] as const;

/* ── Social links ── */
const SOCIALS = [{ label: "Instagram", abbr: "IG", href: "#" }] as const;

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shopExpanded, setShopExpanded] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setShopExpanded(false);
  }, []);

  /* Ensure portal target exists (client only) */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Lock body scroll — prevent background scroll while drawer is open */
  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;

    // Prevent scrollbar-based scrolling
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    // Prevent touch-based scrolling on the background (iOS Safari)
    const handleTouchMove = (e: TouchEvent) => {
      // Allow scrolling inside the drawer panel
      const drawer = drawerRef.current;
      if (!drawer) {
        e.preventDefault();
        return;
      }

      const target = e.target as Node;
      // If touch is inside the drawer, check if drawer can scroll
      if (drawer.contains(target)) {
        const { scrollTop, scrollHeight, clientHeight } = drawer;
        const isAtTop = scrollTop <= 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight;
        const touchDeltaY =
          e.touches[0].clientY - (handleTouchMove as unknown as { lastY: number }).lastY;
        (handleTouchMove as unknown as { lastY: number }).lastY = e.touches[0].clientY;

        // Prevent overscroll (bouncing) at edges
        if ((isAtTop && touchDeltaY > 0) || (isAtBottom && touchDeltaY < 0)) {
          e.preventDefault();
        }
        // Otherwise allow drawer scrolling
      } else {
        // Touch is on backdrop — block scrolling
        e.preventDefault();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      (handleTouchMove as unknown as { lastY: number }).lastY = e.touches[0].clientY;
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
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

  /* Cycle featured product image */
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setFeaturedIdx((prev) => (prev + 1) % FEATURED_PRODUCTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen]);

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
              maxWidth: 860,
              background: "rgba(10, 10, 8, 0.88)",
              backdropFilter: "blur(50px)",
              WebkitBackdropFilter: "blur(50px)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-8px 0 32px rgba(10, 10, 8, 0.5)",
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
              className="sm:!py-[28px] sm:!px-[40px]"
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
                <X size={14} />
              </motion.button>
            </div>

            {/* ── Main content: 2-panel layout on sm+, single panel on mobile ── */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              className="sm:!flex-row"
            >
              {/* Left panel — Navigation */}
              <nav
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "32px 24px",
                  overflowY: "auto",
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
                    {/* Nav item */}
                    {link.hasAccordion ? (
                      /* Shop — Accordion toggle */
                      <button
                        onClick={() => setShopExpanded((prev) => !prev)}
                        className="drawer-nav-link"
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          width: "100%",
                          gap: "16px",
                          padding: "20px 0",
                          textDecoration: "none",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                          transition: `border-color var(--duration-fast) var(--ease-default)`,
                          background: "none",
                          border: "none",
                          borderBottomWidth: 1,
                          borderBottomStyle: "solid",
                          borderBottomColor: "rgba(255, 255, 255, 0.06)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "16px",
                          }}
                        >
                          <span
                            style={{
                              color: "rgba(255, 255, 255, 0.3)",
                              fontSize: "var(--text-xs)",
                              letterSpacing: "-0.02em",
                              fontVariantNumeric: "tabular-nums",
                              minWidth: 24,
                              flexShrink: 0,
                              fontFamily: "var(--font-primary)",
                            }}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>
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
                              fontFamily: "var(--font-primary)",
                            }}
                          >
                            {link.label}
                          </span>
                        </span>

                        {/* Accordion arrow */}
                        <motion.span
                          animate={{ rotate: shopExpanded ? 180 : 0 }}
                          transition={{ duration: 0.25, ease: [...ease] }}
                          style={{
                            color: "var(--color-champagne-gold)",
                            fontSize: "var(--text-md)",
                            lineHeight: 1,
                          }}
                        >
                          ▾
                        </motion.span>
                      </button>
                    ) : (
                      /* Regular nav link */
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
                          {"description" in link && (
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
                          )}
                        </span>
                      </Link>
                    )}

                    {/* ── Shop Accordion — Category sub-items ── */}
                    {link.hasAccordion && (
                      <AnimatePresence>
                        {shopExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [...ease] }}
                            style={{ overflow: "hidden" }}
                          >
                            <div
                              style={{
                                padding: "8px 0 16px 40px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 0,
                              }}
                            >
                              {SHOP_CATEGORIES.map((cat, catIdx) => (
                                <motion.div
                                  key={cat.title}
                                  initial={{ opacity: 0, x: 16 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    duration: 0.3,
                                    ease: [...ease],
                                    delay: catIdx * 0.04,
                                  }}
                                >
                                  <Link
                                    href={cat.href}
                                    onClick={close}
                                    className="drawer-category-link"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 12,
                                      padding: "12px 0",
                                      textDecoration: "none",
                                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                      transition: `border-color var(--duration-fast) var(--ease-default)`,
                                    }}
                                  >
                                    {/* Category color indicator dot */}
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        flexShrink: 0,
                                        background:
                                          catIdx === 0
                                            ? "var(--color-dusty-rose)"
                                            : catIdx === 1
                                              ? "var(--color-sage)"
                                              : catIdx === 2
                                                ? "var(--color-dusty-blue)"
                                                : "var(--color-champagne-gold)",
                                      }}
                                    />
                                    <span
                                      className="drawer-category-label"
                                      style={{
                                        color: "rgba(255, 255, 255, 0.7)",
                                        fontSize: "var(--text-md)",
                                        letterSpacing: "-0.02em",
                                        textTransform: "uppercase",
                                        fontFamily: "var(--font-primary)",
                                        fontWeight: 500,
                                        transition: `color var(--duration-fast) var(--ease-default)`,
                                      }}
                                    >
                                      {cat.title}
                                    </span>
                                    <span
                                      style={{
                                        marginLeft: "auto",
                                        color: "rgba(255, 255, 255, 0.2)",
                                        fontSize: "var(--text-xs)",
                                        fontFamily: "var(--font-primary)",
                                      }}
                                    >
                                      {cat.items.length}
                                    </span>
                                  </Link>
                                </motion.div>
                              ))}

                              {/* View All Shop */}
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  duration: 0.3,
                                  delay: SHOP_CATEGORIES.length * 0.04 + 0.1,
                                }}
                                style={{ marginTop: 8 }}
                              >
                                <Link
                                  href="/shop"
                                  onClick={close}
                                  style={{
                                    color: "var(--color-champagne-gold)",
                                    fontSize: "var(--text-xs)",
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    textDecoration: "none",
                                    fontFamily: "var(--font-primary)",
                                    fontWeight: 500,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    transition: "opacity 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                                  }}
                                >
                                  View All Products
                                  <ArrowRight size={12} />
                                </Link>
                              </motion.div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
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
                    <ArrowRight size={14} />
                  </Link>
                </motion.div>
              </nav>

              {/* Right panel — Featured Product (hidden on mobile, visible on sm+) */}
              <div
                className="drawer-featured-panel"
                style={{
                  display: "none",
                  flexDirection: "column",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.06)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={featuredIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [...ease] }}
                    style={{
                      flex: 1,
                      position: "relative",
                    }}
                  >
                    <img
                      src={FEATURED_PRODUCTS[featuredIdx].image}
                      alt={FEATURED_PRODUCTS[featuredIdx].title}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />

                    {/* Gradient overlay + info */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "80px 24px 24px",
                        background:
                          "linear-gradient(to top, rgba(10, 10, 8, 0.85) 0%, transparent 100%)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--color-soft-gold)",
                          fontSize: "var(--text-xs)",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-primary)",
                        }}
                      >
                        Featured
                      </span>
                      <span
                        style={{
                          color: "white",
                          fontSize: "var(--text-lg)",
                          letterSpacing: "-0.04em",
                          fontFamily: "var(--font-display)",
                          lineHeight: "100%",
                        }}
                      >
                        {FEATURED_PRODUCTS[featuredIdx].title}
                      </span>
                      <span
                        style={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: "var(--text-sm)",
                          letterSpacing: "-0.02em",
                          fontFamily: "var(--font-primary)",
                        }}
                      >
                        {FEATURED_PRODUCTS[featuredIdx].subtitle}
                      </span>
                      <Link
                        href={FEATURED_PRODUCTS[featuredIdx].href}
                        onClick={close}
                        className="drawer-featured-cta"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--color-champagne-gold)",
                          fontSize: "var(--text-xs)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          textDecoration: "none",
                          fontFamily: "var(--font-primary)",
                          marginTop: 8,
                          transition: "opacity 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                        }}
                      >
                        Discover
                        <ArrowRight size={12} />
                      </Link>

                      {/* Image carousel dots */}
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          marginTop: 12,
                        }}
                      >
                        {FEATURED_PRODUCTS.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            onClick={() => setFeaturedIdx(dotIdx)}
                            aria-label={`Show featured ${dotIdx + 1}`}
                            style={{
                              width: dotIdx === featuredIdx ? 20 : 6,
                              height: 6,
                              borderRadius: 3,
                              background:
                                dotIdx === featuredIdx
                                  ? "var(--color-champagne-gold)"
                                  : "rgba(255, 255, 255, 0.3)",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              transition:
                                "width 300ms cubic-bezier(0.25, 0.1, 0.25, 1), background 300ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

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
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {SOCIALS.map((s) => (
                    <a
                      key={s.abbr}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="drawer-social-link"
                      style={{
                        color: "rgba(255, 255, 255, 0.4)",
                        textDecoration: "none",
                        fontSize: "var(--text-xs)",
                        letterSpacing: "0.08em",
                        transition: "color 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                      }}
                    >
                      {s.abbr}
                    </a>
                  ))}
                </div>
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
          <path d="M0 14H40" stroke="currentColor" strokeWidth="2.5" />
          <path d="M0 26H40" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </button>

      {/* ── Drawer (portaled to body to escape mix-blend-mode: exclusion) ── */}
      {mounted && createPortal(drawerContent, document.body)}
    </>
  );
}
