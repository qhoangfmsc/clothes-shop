"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BRAND_STORY } from "../_common/constants";
import { useEffect, useState } from "react";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function BrandStory() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section
      style={{
        background: "var(--bg-primary)",
        padding: "clamp(80px, 12vw, 160px) clamp(24px, 5vw, 80px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
          gap: isDesktop ? 64 : 48,
          alignItems: "center",
        }}
      >
        {/* Left — Text content */}
        <div>
          {/* Section label */}
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [...ease] }}
            style={{
              color: "var(--text-accent)",
              textTransform: "uppercase",
              fontSize: "var(--text-sm)",
              letterSpacing: "-0.02em",
              lineHeight: "140%",
              display: "block",
              marginBottom: 24,
            }}
          >
            {BRAND_STORY.subtitle}
          </motion.span>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
            style={{
              color: "var(--text-heading)",
              letterSpacing: "-0.04em",
              lineHeight: "100%",
              fontWeight: 500,
              fontSize: "clamp(30px, 5vw, 52px)",
              marginBottom: 40,
            }}
          >
            {BRAND_STORY.title}
          </motion.h2>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [...ease], delay: 0.15 }}
            style={{
              width: 48,
              height: 1,
              background: "var(--accent-primary)",
              transformOrigin: "left",
              marginBottom: 40,
            }}
          />

          {/* Paragraphs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              marginBottom: 48,
            }}
          >
            {BRAND_STORY.paragraphs.map((paragraph, idx) => (
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.6,
                  ease: [...ease],
                  delay: 0.2 + idx * 0.1,
                }}
                style={{
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  lineHeight: "180%",
                  fontSize: "clamp(13px, 1.5vw, 15px)",
                }}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          {/* Pull quote */}
          <motion.blockquote
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [...ease], delay: 0.35 }}
            style={{
              borderLeft: "2px solid var(--accent-primary)",
              paddingLeft: 20,
              color: "var(--text-heading)",
              letterSpacing: "-0.04em",
              lineHeight: "140%",
              fontWeight: 500,
              fontStyle: "italic",
              fontSize: "clamp(16px, 2vw, 22px)",
            }}
          >
            &ldquo;We don&rsquo;t follow trends — we create stories you wear.&rdquo;
          </motion.blockquote>
        </div>

        {/* Right — Framed mood image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [...ease], delay: 0.2 }}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "3 / 4",
            padding: 4,
            background: "var(--color-warm-white)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Inner image */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <Image
              src="/images/mood-bg/wall_sticker_soft_cream_roses.webp"
              alt="Soft textures that inspire our craft"
              fill
              style={{ objectFit: "cover" }}
            />
          </div>

          {/* Frame corner accent — bottom-right */}
          <div
            style={{
              position: "absolute",
              bottom: -8,
              right: -8,
              width: 40,
              height: 40,
              borderBottom: "1px solid var(--accent-primary)",
              borderRight: "1px solid var(--accent-primary)",
              pointerEvents: "none",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
