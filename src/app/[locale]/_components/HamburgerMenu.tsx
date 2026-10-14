"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/src/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, ArrowRight, User, Heart, Package, LogOut, Scissors } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useCategories, useBannerConfig } from "@/src/hooks/use-api";
import { SITE_CONFIG_KEYS } from "@/src/types/site-config";
import { LEGAL_DOCS } from "@/src/lib/legal";
import { UserAvatar } from "./UserMenu";
import ResponsiveBannerImage from "./ResponsiveBannerImage";
import { CarouselDots } from "./CarouselControls";
import { useAutoAdvance } from "@/src/hooks/use-auto-advance";
import LanguageSwitcher from "./LanguageSwitcher";
import SocialIcons from "./SocialIcons";
import { CONTACT_PATH } from "@/src/lib/product-purchase";

const ease = [0.25, 0.1, 0.25, 1] as const;

/** `featured` links are drawn as a highlighted card. */
const NAV_LINKS = [
  { key: "home", href: "/", hasAccordion: false },
  { key: "customOrder", href: CONTACT_PATH, hasAccordion: false, featured: true },
  { key: "shop", href: "/shop", hasAccordion: true },
  { key: "newIn", href: "/new-in", hasAccordion: false },
  { key: "collections", href: "/collections", hasAccordion: false },
  { key: "about", href: "/about", hasAccordion: false },
] as const;

const ACCOUNT_LINKS = [
  { key: "myAccount", href: "/account", icon: User },
  { key: "wishlist", href: "/wishlist", icon: Heart },
  { key: "orders", href: "/orders", icon: Package },
] as const;

/* ── Auth-aware section in drawer ── */
function AuthDrawerSection({ close }: { close: () => void }) {
  const t = useTranslations("shared.header.account");
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const delay = 0.18 + NAV_LINKS.length * 0.06 + 0.1;

  if (isLoading) return null;

  /* Logged OUT — Sign In CTA */
  if (!isAuthenticated || !user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          ease: [...ease],
          delay,
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
          {t("signIn")}
          <ArrowRight size={14} />
        </Link>
      </motion.div>
    );
  }

  /* Logged IN — User info + account links + sign out */
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [...ease],
        delay,
      }}
      style={{
        marginTop: 32,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
      className="sm:!mt-[40px]"
    >
      {/* User info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 20,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <UserAvatar user={user} size={40} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              color: "#FFF",
              fontSize: "var(--text-md)",
              fontFamily: "var(--font-primary)",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: "140%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user.name ?? t("userFallback")}
          </span>
          <span
            style={{
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: "var(--text-xs)",
              fontFamily: "var(--font-primary)",
              letterSpacing: "-0.02em",
              lineHeight: "140%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user.email}
          </span>
        </div>
      </div>

      {/* Account links */}
      {ACCOUNT_LINKS.map((item, idx) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              ease: [...ease],
              delay: delay + 0.08 + idx * 0.04,
            }}
          >
            <Link
              href={item.href}
              onClick={close}
              className="drawer-category-link"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 0",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                transition: `border-color var(--duration-fast) var(--ease-default)`,
              }}
            >
              <Icon
                size={16}
                style={{
                  color: "var(--color-champagne-gold)",
                  flexShrink: 0,
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
                {t(item.key)}
              </span>
            </Link>
          </motion.div>
        );
      })}

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: delay + 0.24 }}
        style={{ marginTop: 16 }}
      >
        <button
          onClick={() => {
            logout();
            close();
          }}
          className="drawer-category-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
          }}
        >
          <LogOut
            size={16}
            style={{
              color: "rgba(255, 255, 255, 0.3)",
              flexShrink: 0,
            }}
          />
          <span
            className="drawer-category-label"
            style={{
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: "var(--text-sm)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--font-primary)",
              fontWeight: 500,
              transition: `color var(--duration-fast) var(--ease-default)`,
            }}
          >
            {t("signOut")}
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function HamburgerMenu() {
  const t = useTranslations("shared.header");
  const tLegal = useTranslations("shared.legal");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shopExpanded, setShopExpanded] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  /* ── Shop categories — from API, not hardcoded ── */
  const { categories } = useCategories();
  const shopCategories = useMemo(
    () =>
      categories.map((cat) => ({
        title: cat.title,
        href: `/shop/${cat.slug}`,
        items: cat.subcategories,
      })),
    [categories]
  );

  /* ── Featured panel banners — from API (Site Config > NAV_MENU_BANNERS).
     No fallback: the panel just doesn't render when nothing is configured. */
  const { banners: featuredBanners } = useBannerConfig(SITE_CONFIG_KEYS.NAV_MENU_BANNERS);
  const currentBanner = featuredBanners[featuredIdx] ?? featuredBanners[0];

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
    let lastY = 0;

    /* The drawer itself never overflows — the <nav> inside it is the scroller.
       Walk up from the touch target to the nearest element that can scroll. */
    const findScrollable = (from: Node, boundary: HTMLElement): HTMLElement | null => {
      let el: HTMLElement | null = from instanceof HTMLElement ? from : from.parentElement;
      while (el && boundary.contains(el)) {
        const { overflowY } = getComputedStyle(el);
        if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const drawer = drawerRef.current;
      const target = e.target as Node;
      const scroller = drawer && drawer.contains(target) ? findScrollable(target, drawer) : null;

      // Backdrop, or nothing scrollable under the finger — block background scroll
      if (!scroller) {
        e.preventDefault();
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - lastY;
      lastY = currentY;

      // Prevent overscroll (bouncing) at the scroller's edges
      const isAtTop = scroller.scrollTop <= 0;
      const isAtBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
        e.preventDefault();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0].clientY;
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

  /* Reset index if the banner list shrinks (e.g. config loads after mount) */
  useEffect(() => {
    setFeaturedIdx(0);
  }, [featuredBanners.length]);

  /* Cycle featured banner image */
  const featuredPanelRef = useRef<HTMLDivElement>(null);
  const pauseFeatured = useAutoAdvance(featuredPanelRef, {
    enabled: isOpen && featuredBanners.length > 1,
    intervalMs: 4000,
    onAdvance: () => setFeaturedIdx((prev) => (prev + 1) % featuredBanners.length),
  });

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
                DOOVAN
              </motion.span>

              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 0.35, ease: [...ease], delay: 0.1 }}
                onClick={close}
                aria-label={t("drawer.close")}
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
                    key={link.key}
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
                            {t(`nav.${link.key}`)}
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
                    ) : "featured" in link ? (
                      /* Highlighted call-to-action card (custom order) */
                      <Link
                        href={link.href}
                        onClick={close}
                        className="drawer-nav-featured"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          margin: "12px 0",
                          padding: "18px 20px",
                          borderRadius: 16,
                          textDecoration: "none",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            borderRadius: "50%",
                            background: "var(--accent-primary)",
                            color: "var(--text-on-gold)",
                          }}
                        >
                          <Scissors size={20} />
                        </span>
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              color: "var(--accent-primary)",
                              fontSize: "var(--text-xl)",
                              letterSpacing: "-0.04em",
                              lineHeight: "100%",
                              fontWeight: 500,
                              textTransform: "uppercase",
                            }}
                          >
                            {t(`nav.${link.key}`)}
                          </span>
                          <span
                            style={{
                              color: "rgba(255, 255, 255, 0.6)",
                              fontSize: "var(--text-sm)",
                              letterSpacing: "-0.02em",
                              lineHeight: "140%",
                            }}
                          >
                            {t(`navDescription.${link.key}`)}
                          </span>
                        </span>
                        <ArrowRight
                          size={18}
                          aria-hidden="true"
                          className="drawer-nav-featured-arrow"
                          style={{ color: "var(--accent-primary)", flexShrink: 0 }}
                        />
                      </Link>
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
                            {t(`nav.${link.key}`)}
                          </span>
                          <span
                            style={{
                              color: "rgba(255, 255, 255, 0.4)",
                              fontSize: "var(--text-sm)",
                              letterSpacing: "-0.02em",
                              lineHeight: "140%",
                            }}
                          >
                            {t(`navDescription.${link.key}`)}
                          </span>
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
                              {shopCategories.map((cat, catIdx) => (
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
                                  delay: shopCategories.length * 0.04 + 0.1,
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
                                  {t("megaMenu.viewAllProducts")}
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

                {/* Auth-aware bottom section */}
                <AuthDrawerSection close={close} />
              </nav>

              {/* Right panel — Featured banner (hidden on mobile, visible on sm+).
                  Doesn't render at all when no NAV_MENU_BANNERS are configured. */}
              {featuredBanners.length > 0 && (
                <div
                  ref={featuredPanelRef}
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
                      <ResponsiveBannerImage
                        banner={currentBanner}
                        alt={currentBanner.title ?? ""}
                        fill
                        sizes="400px"
                        style={{
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
                          {t("drawer.featured")}
                        </span>
                        {currentBanner.title && (
                          <span
                            style={{
                              color: "white",
                              fontSize: "var(--text-lg)",
                              letterSpacing: "-0.04em",
                              fontFamily: "var(--font-display)",
                              lineHeight: "100%",
                            }}
                          >
                            {currentBanner.title}
                          </span>
                        )}
                        {currentBanner.subtitle && (
                          <span
                            style={{
                              color: "rgba(255, 255, 255, 0.5)",
                              fontSize: "var(--text-sm)",
                              letterSpacing: "-0.02em",
                              fontFamily: "var(--font-primary)",
                            }}
                          >
                            {currentBanner.subtitle}
                          </span>
                        )}
                        <Link
                          href={currentBanner.ctaHref ?? "/shop"}
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
                          {currentBanner.ctaLabel ?? "Discover"}
                          <ArrowRight size={12} />
                        </Link>

                        {/* Position dots — only when there's more than one banner */}
                        <CarouselDots
                          count={featuredBanners.length}
                          index={featuredIdx}
                          onSelect={(i) => {
                            setFeaturedIdx(i);
                            pauseFeatured();
                          }}
                          className="mt-2 !justify-start"
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
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
                <span>{t("drawer.copyright", { year: new Date().getFullYear() })}</span>
                <SocialIcons
                  className="gap-3"
                  iconSize={16}
                  linkClassName="drawer-social-link flex items-center text-[var(--color-ash)] transition-colors duration-150 hover:text-[var(--text-on-dark)]"
                />
              </div>
              <nav aria-label={tLegal("title")} className="flex flex-wrap gap-x-4 gap-y-1.5 py-1.5">
                {LEGAL_DOCS.map((doc) => (
                  <Link
                    key={doc.key}
                    href={doc.path}
                    onClick={close}
                    className="text-inherit no-underline transition-colors duration-150 hover:text-[var(--text-on-dark)]"
                  >
                    {tLegal(doc.key)}
                  </Link>
                ))}
              </nav>
              <div className="py-1.5 normal-case">
                <LanguageSwitcher variant="drawer" onChange={close} />
              </div>
              <span style={{ opacity: 0.6 }}>{t("drawer.tagline")}</span>
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
        aria-label={t("drawer.open")}
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
