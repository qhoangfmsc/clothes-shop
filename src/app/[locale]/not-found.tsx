"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function NotFound() {
  const t = useTranslations("shared.errors.notFound");
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
          maxWidth: "37.5rem",
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
          DOOVAN
        </motion.span>

        {/* Main heading — fashion editorial */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.3 }}
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-heading)",
            letterSpacing: "-0.03em",
            lineHeight: "105%",
            fontWeight: 400,
            marginTop: "1.25rem",
          }}
          className="text-[2.625rem] sm:text-[3.5rem] lg:text-[4.5rem]"
        >
          {t("title")}
        </motion.h1>

        {/* Decorative accent line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.5 }}
          style={{
            width: "2.5rem",
            height: 1,
            background: "var(--accent-primary)",
            transformOrigin: "center",
            marginTop: "2rem",
            marginBottom: "2rem",
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
            maxWidth: "21.25rem",
          }}
          className="text-[0.8125rem] sm:text-[0.875rem]"
        >
          {t("description")}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.7 }}
          style={{
            display: "flex",
            gap: "var(--space-3)",
            marginTop: "2.5rem",
          }}
        >
          <Link
            href="/"
            style={{
              background: "var(--accent-primary)",
              color: "var(--text-on-gold)",
              borderRadius: "var(--radius-pill)",
              padding: "0.75rem 2rem",
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
            {t("home")}
          </Link>

          <Link
            href="/shop"
            style={{
              background: "transparent",
              color: "var(--accent-primary)",
              border: "1px solid var(--accent-primary)",
              borderRadius: "var(--radius-pill)",
              padding: "0.75rem 2rem",
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
            {t("explore")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
