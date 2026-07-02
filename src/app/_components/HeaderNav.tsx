"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import HamburgerMenu from "./HamburgerMenu";

const ease = [0.25, 0.1, 0.25, 1] as const;

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Collection", href: "/collection" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

const linkStyle: React.CSSProperties = {
  fontSize: 13,
  textTransform: "uppercase",
  color: "white",
  letterSpacing: "-0.02em",
  pointerEvents: "auto",
  textDecoration: "none",
  transition: "opacity 150ms cubic-bezier(0.25, 0.1, 0.25, 1)",
};

export default function HeaderNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.15 }}
      style={{
        position: "fixed",
        zIndex: 20,
        pointerEvents: "none",
        mixBlendMode: "exclusion",
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
      {/* Nav links — hidden on mobile, visible on lg */}
      {NAV_LINKS.map((link, idx) => (
        <Link
          key={link.label}
          href={link.href}
          style={{
            ...linkStyle,
            display: "var(--nav-link-display, none)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "0.6";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
          }}
        >
          {link.label}
        </Link>
      ))}

      {/* Hamburger + Drawer (self-contained) */}
      <HamburgerMenu />

      {/* Responsive: show links on desktop only */}
      <style>{`
        @media (min-width: 1024px) {
          nav { --nav-link-display: block; }
        }
      `}</style>
    </motion.nav>
  );
}
