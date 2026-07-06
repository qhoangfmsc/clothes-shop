"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function NotFound() {
  return (
    <section
      style={{
        position: "relative",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--color-lavender-cream)",
      }}
    >
      {/* Mood wallpaper */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 1.4, ease: [...ease] }}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <Image
          src="/images/mood-bg/wall_sticker_lavender_damask.webp"
          alt=""
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </motion.div>

      {/* Editorial inset frame */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [...ease], delay: 0.3 }}
        style={{
          position: "absolute",
          inset: 20,
          border: "1px solid var(--border-subtle)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 600,
        }}
        className="px-6 sm:px-8"
      >
        {/* Top label — editorial style */}
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
          style={{
            color: "var(--text-muted)",
            textTransform: "uppercase",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.12em",
            lineHeight: "140%",
          }}
        >
          Ori Baebi
        </motion.span>

        {/* Main heading — fashion editorial */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.3 }}
          style={{
            fontFamily: "var(--font-quiche-display), serif",
            color: "var(--text-heading)",
            letterSpacing: "-0.03em",
            lineHeight: "105%",
            fontWeight: 400,
            marginTop: 20,
          }}
          className="text-[42px] sm:text-[56px] lg:text-[72px]"
        >
          Lost in the Atelier
        </motion.h1>

        {/* Decorative accent line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.5 }}
          style={{
            width: 40,
            height: 1,
            background: "var(--accent-primary)",
            transformOrigin: "center",
            marginTop: 32,
            marginBottom: 32,
          }}
        />

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.6 }}
          style={{
            color: "var(--text-secondary)",
            letterSpacing: "-0.02em",
            lineHeight: "170%",
            fontWeight: 500,
            maxWidth: 340,
          }}
          className="text-[13px] sm:text-[14px]"
        >
          This page seems to have slipped off the runway.
          Let us guide you back to the collection.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.7 }}
          style={{
            display: "flex",
            gap: "var(--space-3)",
            marginTop: 40,
          }}
        >
          <Link
            href="/"
            style={{
              background: "var(--accent-primary)",
              color: "var(--text-on-gold)",
              borderRadius: "var(--radius-pill)",
              padding: "12px 32px",
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              textDecoration: "none",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              transition:
                "opacity var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-default)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Return Home
          </Link>

          <Link
            href="/shop"
            style={{
              background: "transparent",
              color: "var(--accent-primary)",
              border: "1px solid var(--accent-primary)",
              borderRadius: "var(--radius-pill)",
              padding: "12px 32px",
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              textDecoration: "none",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              transition:
                "background var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-default)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-rose-milk)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Explore
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
