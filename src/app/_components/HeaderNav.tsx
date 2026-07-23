"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import HamburgerMenu from "./HamburgerMenu";
import UserMenu from "./UserMenu";
import SearchBar from "./SearchBar";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Shop categories with sub-items ── */
const SHOP_CATEGORIES = [
  {
    title: "Tops",
    href: "/shop/tops",
    items: [
      { label: "Camisoles", href: "/shop/tops/camisoles" },
      { label: "Halter Tops", href: "/shop/tops/halter" },
      { label: "Tank Tops", href: "/shop/tops/tank" },
      { label: "Off-Shoulder", href: "/shop/tops/off-shoulder" },
      { label: "Cardigans", href: "/shop/tops/cardigans" },
      { label: "Corset Tops", href: "/shop/tops/corset" },
    ],
  },
  {
    title: "Skirts",
    href: "/shop/skirts",
    items: [
      { label: "Slip Skirts", href: "/shop/skirts/slip" },
      { label: "Midi Skirts", href: "/shop/skirts/midi" },
      { label: "Mini Skirts", href: "/shop/skirts/mini" },
      { label: "Wrap Skirts", href: "/shop/skirts/wrap" },
      { label: "Lace Skirts", href: "/shop/skirts/lace" },
    ],
  },
  {
    title: "Bags",
    href: "/shop/bags",
    items: [
      { label: "Hobo Bags", href: "/shop/bags/hobo" },
      { label: "Shoulder Bags", href: "/shop/bags/shoulder" },
      { label: "Clutches", href: "/shop/bags/clutches" },
      { label: "Mini Bags", href: "/shop/bags/mini" },
      { label: "Tote Bags", href: "/shop/bags/tote" },
    ],
  },
  {
    title: "Jewelry",
    href: "/shop/jewelry",
    items: [
      { label: "Necklaces", href: "/shop/jewelry/necklaces" },
      { label: "Earrings", href: "/shop/jewelry/earrings" },
      { label: "Rings", href: "/shop/jewelry/rings" },
      { label: "Bracelets", href: "/shop/jewelry/bracelets" },
      { label: "Hair Accessories", href: "/shop/jewelry/hair" },
    ],
  },
] as const;

const NAV_LINKS = [
  // { label: "Home", href: "/", hasMegaMenu: false },
  { label: "Shop", href: "/shop", hasMegaMenu: true },
  { label: "New In", href: "/new-in", hasMegaMenu: false },
  { label: "Collections", href: "/collections", hasMegaMenu: false },
  { label: "About", href: "/about", hasMegaMenu: false },
] as const;

export default function HeaderNav({
  isHidden,
  onMenuToggle,
}: {
  isHidden?: boolean;
  onMenuToggle?: (isOpen: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldown = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Notify parent of menu state */
  useEffect(() => {
    onMenuToggle?.(menuOpen);
  }, [menuOpen, onMenuToggle]);

  /* Close mega menu if header hides */
  useEffect(() => {
    if (isHidden && menuOpen) {
      setMenuOpen(false);
    }
  }, [isHidden, menuOpen]);

  const clearTimers = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  /* Hover intent: wait 280ms before opening */
  const handleShopEnter = useCallback(() => {
    if (cooldown.current) return;
    if (menuOpen) {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      return;
    }
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setMenuOpen(true);
      openTimer.current = null;
    }, 280);
  }, [menuOpen]);

  const handleShopLeave = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (menuOpen) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        setMenuOpen(false);
        cooldown.current = true;
        setTimeout(() => {
          cooldown.current = false;
        }, 350);
      }, 150);
    }
  }, [menuOpen]);

  const handleDropdownEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const handleDropdownLeave = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMenuOpen(false);
      cooldown.current = true;
      setTimeout(() => {
        cooldown.current = false;
      }, 350);
    }, 120);
  }, []);

  const closeNow = useCallback(() => {
    clearTimers();
    setMenuOpen(false);
    cooldown.current = true;
    setTimeout(() => {
      cooldown.current = false;
    }, 350);
  }, [clearTimers]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeNow]);

  useEffect(
    () => () => {
      clearTimers();
    },
    [clearTimers]
  );

  /* ── Dropdown: sits BEHIND the nav (lower z-index) ── */
  const dropdown = (
    <AnimatePresence>
      {menuOpen && (
        <>
          {/* Backdrop — click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeNow}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 14,
              background: "rgba(10, 10, 8, 0.35)",
            }}
          />

          {/* Dropdown panel — slides from the very top, content padded below header */}
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.35, ease: [...ease] }}
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 15,
              background: "rgba(251, 248, 241, 0.95)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(201, 169, 110, 0.12)",
              boxShadow: "0 10px 40px rgba(58, 49, 42, 0.08)",
              paddingTop: "var(--header-bg-height, 90px)", // Push content below header
            }}
          >
            {/* Category grid */}
            <div
              style={{
                maxWidth: 960,
                margin: "0 auto",
                padding: "40px 36px 60px",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 32,
              }}
            >
              {SHOP_CATEGORIES.map((cat) => (
                <div key={cat.title}>
                  <Link
                    href={cat.href}
                    onClick={closeNow}
                    className="mega-menu-item-link"
                    style={{
                      display: "block",
                      color: "var(--color-champagne-gold)",
                      fontSize: "var(--text-xs)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      fontFamily: "var(--font-primary)",
                      fontWeight: 500,
                      marginBottom: 16,
                      paddingBottom: 8,
                      borderBottom: "1px solid rgba(201, 169, 110, 0.15)",
                    }}
                  >
                    {cat.title}
                  </Link>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {cat.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={closeNow}
                          className="mega-menu-item-link"
                          style={{
                            color: "var(--color-obsidian)",
                            fontSize: "var(--text-base)",
                            letterSpacing: "-0.02em",
                            textDecoration: "none",
                            fontFamily: "var(--font-primary)",
                            fontWeight: 500,
                            transition: "color 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                          }}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        href={cat.href}
                        onClick={closeNow}
                        className="mega-menu-item-link"
                        style={{
                          color: "rgba(10, 10, 8, 0.4)",
                          fontSize: "var(--text-xs)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          textDecoration: "none",
                          fontFamily: "var(--font-primary)",
                          fontWeight: 500,
                          marginTop: 4,
                          transition: "color 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                        }}
                      >
                        View All →
                      </Link>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* ── Real nav bar — always on top ── */}
      <motion.nav
        id="header-nav"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.15 }}
        style={{
          position: "absolute",
          pointerEvents: "none",
          height: 30,
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 28,
          top: 32,
          right: 32,
        }}
      >
        {/* Search — desktop only, hidden on mobile where HamburgerMenu handles it */}
        <div style={{ display: "var(--search-desktop-display, none)", alignItems: "center", pointerEvents: "auto" }}>
          <SearchBar />
        </div>

        {NAV_LINKS.map((link) => (
          <div
            key={link.label}
            onMouseEnter={link.hasMegaMenu ? handleShopEnter : undefined}
            onMouseLeave={link.hasMegaMenu ? handleShopLeave : undefined}
            style={{
              display: "var(--nav-link-display, none)",
              position: "relative",
            }}
          >
            <Link
              href={link.href}
              className="header-nav-link"
              style={{
                fontSize: 13,
                textTransform: "uppercase",
                color: "currentColor",
                letterSpacing: "-0.02em",
                pointerEvents: "auto",
                textDecoration: "none",
                transition: "opacity 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                position: "relative",
                paddingBottom: 2,
              }}
              onClick={() => {
                if (link.hasMegaMenu && menuOpen) {
                  closeNow();
                }
              }}
            >
              {link.label}
            </Link>
          </div>
        ))}

        {/* <UserMenu /> */}

        <HamburgerMenu />

        <style>{`
          @media (min-width: 1024px) {
            nav#header-nav { --nav-link-display: block; }
            nav#header-nav { --search-desktop-display: flex; }
          }
          }
          .header-nav-link::after {
            content: '';
            position: absolute;
            left: 0;
            bottom: 0;
            width: 0;
            height: 1px;
            background: currentColor;
            transition: width 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
          }
          .header-nav-link:hover::after {
            width: 100%;
          }
          .header-nav-link:hover {
            opacity: 0.85;
          }
        `}</style>
      </motion.nav>

      {/* Dropdown portaled to body — escapes nav's mix-blend-mode */}
      {mounted && createPortal(dropdown, document.body)}
    </>
  );
}
