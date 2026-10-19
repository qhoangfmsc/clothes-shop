"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/src/i18n/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { User, Heart, Package, LogOut } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";

const ease = [0.25, 0.1, 0.25, 1] as const;

const MENU_ITEMS = [
  { key: "myAccount", href: "/account", icon: User },
  { key: "wishlist", href: "/wishlist", icon: Heart },
  { key: "orders", href: "/orders", icon: Package },
] as const;

function UserAvatar({
  user,
  size = 32,
  onClick,
  className,
}: {
  user: { name: string | null; image: string | null };
  size?: number;
  onClick?: () => void;
  className?: string;
}) {
  const t = useTranslations("shared.header.account");
  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  /* A <button> only when it does something: the avatar is also shown inside other buttons / links
     (burger menu toggle) where a nested <button> would be invalid HTML. */
  const Root = onClick ? "button" : "span";
  const interactiveProps = onClick
    ? { onClick, className: `user-avatar-btn ${className ?? ""}`, "aria-label": t("userMenu") }
    : { className };

  return (
    <Root
      {...interactiveProps}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1.5px solid var(--border-light)",
        background: "var(--color-champagne-cream)",
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        flexShrink: 0,
        transition: `border-color var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default)`,
        pointerEvents: "auto",
      }}
    >
      {user.image ? (
        <Image
          src={user.image}
          alt={user.name ?? t("userFallback")}
          width={size}
          height={size}
          unoptimized
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          style={{
            fontSize: size * 0.38,
            fontFamily: "var(--font-primary)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      )}
    </Root>
  );
}

export { UserAvatar };

export default function UserMenu() {
  const t = useTranslations("shared.header.account");
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const handleEnter = useCallback(() => {
    clearTimer();
    setIsOpen(true);
  }, [clearTimer]);

  const handleLeave = useCallback(() => {
    clearTimer();
    closeTimer.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, [clearTimer]);

  const closeNow = useCallback(() => {
    clearTimer();
    setIsOpen(false);
  }, [clearTimer]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeNow]);

  /* Cleanup */
  useEffect(
    () => () => {
      clearTimer();
    },
    [clearTimer]
  );

  /* Not logged in — show Sign In link */
  if (isLoading || !isAuthenticated || !user) {
    return (
      <Link
        href="/login"
        className="header-nav-link"
        style={{
          fontSize: "0.8125rem",
          textTransform: "uppercase",
          color: "currentColor",
          letterSpacing: "-0.02em",
          pointerEvents: "auto",
          textDecoration: "none",
          transition: "opacity 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
          position: "relative",
          paddingBottom: 2,
          display: "var(--nav-link-display, none)",
        }}
      >
        {t("signIn")}
      </Link>
    );
  }

  /* Logged in — show avatar + dropdown */
  const triggerRect = triggerRef.current?.getBoundingClientRect();

  const dropdown = (
    <AnimatePresence>
      {isOpen && triggerRect && (
        <>
          {/* Invisible backdrop to catch clicks */}
          <div
            onClick={closeNow}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 98,
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [...ease] }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            style={{
              position: "fixed",
              top: triggerRect.bottom + 12,
              right: Math.max(16, window.innerWidth - triggerRect.right),
              zIndex: 99,
              minWidth: "13.75rem",
              background: "rgba(251, 248, 241, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-light)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            {/* User info header */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <UserAvatar user={user} size={36} />
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
                    fontSize: "var(--text-base)",
                    fontFamily: "var(--font-primary)",
                    fontWeight: 500,
                    color: "var(--text-heading)",
                    letterSpacing: "-0.02em",
                    lineHeight: "140%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.name ?? "User"}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    fontFamily: "var(--font-primary)",
                    color: "var(--text-muted)",
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

            {/* Menu items */}
            <div style={{ padding: "0.5rem 0" }}>
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={closeNow}
                    className="user-menu-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.625rem 1.25rem",
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      fontSize: "var(--text-base)",
                      fontFamily: "var(--font-primary)",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      transition: `background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)`,
                    }}
                  >
                    <Icon size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    {t(item.key)}
                  </Link>
                );
              })}
            </div>

            {/* Sign out */}
            <div
              style={{
                padding: "0.5rem 0",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button
                onClick={() => {
                  logout();
                  closeNow();
                }}
                className="user-menu-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.625rem 1.25rem",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-base)",
                  fontFamily: "var(--font-primary)",
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  textAlign: "left",
                  transition: `background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)`,
                }}
              >
                <LogOut size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                {t("signOut")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        display: "var(--nav-link-display, none)",
        position: "relative",
      }}
    >
      <UserAvatar user={user} size={32} onClick={() => setIsOpen((p) => !p)} />
      {mounted && createPortal(dropdown, document.body)}
    </div>
  );
}
