"use client";

import { motion } from "framer-motion";
import { INVITATION } from "../_common/constants";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function ContactCTA() {
  return (
    <section
      style={{
        background: "var(--bg-secondary)",
        height: "100vh",
        padding: "0 clamp(24px, 5vw, 80px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {/* Decorative symbol */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [...ease] }}
        style={{
          color: "var(--accent-primary)",
          fontSize: 24,
          marginBottom: 48,
        }}
      >
        ◆
      </motion.div>

      {/* CTA heading */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
        style={{
          color: "var(--text-heading)",
          letterSpacing: "-0.04em",
          lineHeight: "120%",
          fontWeight: 500,
          maxWidth: 480,
          marginBottom: 48,
          fontSize: "clamp(25px, 4vw, 42px)",
        }}
      >
        {INVITATION.ctaText}
      </motion.p>

      {/* CTA button */}
      <motion.a
        href="mailto:hello@oribaebi.com"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
        whileHover={{ scale: 1.02, opacity: 0.9 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--accent-primary)",
          color: "var(--color-white)",
          borderRadius: 9999,
          padding: "14px 36px",
          fontSize: "var(--text-md)",
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          textDecoration: "none",
          fontWeight: 500,
          boxShadow: "var(--shadow-md)",
          transition: `opacity var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-default)`,
          cursor: "pointer",
        }}
      >
        {INVITATION.ctaButton}
      </motion.a>

      {/* Footer branding */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.4 }}
        style={{
          color: "var(--text-muted)",
          fontSize: "var(--text-xs)",
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          position: "absolute",
          bottom: 40,
        }}
      >
        ORI BAEBI ® 2026
      </motion.p>
    </section>
  );
}
