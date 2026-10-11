"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Logo from "./Logo";
import HeaderNav from "./HeaderNav";

const LUXURY_EASE = [0.16, 1, 0.3, 1] as const;

export default function SiteHeader() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [lastY, setLastY] = useState(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const diff = latest - lastY;

    // Background visibility: simple threshold
    setIsScrolled(latest > 60);

    // Hide/Show logic: slide up on scroll down, show on scroll up
    if (diff > 5 && latest > 80) {
      setHidden(true);
    } else if (diff < -5) {
      setHidden(false);
    }

    setLastY(latest);
  });

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: hidden ? -140 : 0 }}
      transition={{ duration: 0.6, ease: [...LUXURY_EASE] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {/* Glassmorphism Background Layer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: (isScrolled || isMegaMenuOpen) ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "var(--header-bg-height, 120px)",
          background: "rgba(251, 248, 241, 0.95)", // --color-pearl-cream with opacity
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(201, 169, 110, 0.15)",
          boxShadow: (isScrolled || isMegaMenuOpen) ? "0 4px 20px rgba(58, 49, 42, 0.05)" : "none",
        }}
      />

      {/* Content Layer — Fixed Black Color */}
      <div
        style={{
          color: "var(--color-noir)",
          transition: "opacity 400ms var(--ease-default)",
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <Logo />
        <HeaderNav isHidden={hidden} onMenuToggle={setIsMegaMenuOpen} />
      </div>

      <style>{`
        :root { --header-bg-height: 80px; }
        @media (min-width: 1024px) {
          :root { --header-bg-height: 90px; }
        }
      `}</style>
    </motion.header>
  );
}
