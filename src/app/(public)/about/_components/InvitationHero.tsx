"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { INVITATION } from "../_common/constants";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function InvitationHero() {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--color-rose-milk)",
      }}
    >
      {/* Mood wallpaper — subtle background texture */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1.2, ease: [...ease] }}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <Image
          src="/images/mood-bg/wall_sticker_pink_floral.webp"
          alt=""
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </motion.div>

      {/* Inset editorial frame */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [...ease], delay: 0.4 }}
        style={{
          position: "absolute",
          inset: 24,
          border: "1px solid var(--border-subtle)",
          pointerEvents: "none",
        }}
      />

      {/* Content — centered */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "120px 32px",
          maxWidth: 640,
        }}
      >
        {/* Label */}
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
          style={{
            color: "var(--text-accent)",
            textTransform: "uppercase",
            fontSize: "var(--text-sm)",
            letterSpacing: "0.12em",
            lineHeight: "140%",
            marginBottom: 32,
          }}
        >
          About — Ori Baebi
        </motion.span>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.3 }}
          style={{
            color: "var(--text-heading)",
            letterSpacing: "-0.04em",
            lineHeight: "100%",
            fontWeight: 400,
            fontFamily: "var(--font-display), serif",
            fontSize: "clamp(42px, 8vw, 80px)",
          }}
        >
          {INVITATION.heading}
        </motion.h1>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.5 }}
          style={{
            width: 48,
            height: 1,
            background: "var(--accent-primary)",
            transformOrigin: "center",
            marginTop: 40,
            marginBottom: 40,
          }}
        />

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.6 }}
          style={{
            color: "var(--text-secondary)",
            letterSpacing: "-0.02em",
            lineHeight: "160%",
            fontSize: "clamp(13px, 1.5vw, 16px)",
            maxWidth: 400,
          }}
        >
          {INVITATION.subheading}
        </motion.p>

        {/* Brand tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.8 }}
          style={{
            color: "var(--text-muted)",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            fontSize: "var(--text-xs)",
            lineHeight: "140%",
            marginTop: 80,
          }}
        >
          Ori Baebi — Est. 2026
        </motion.p>
      </div>
    </section>
  );
}
