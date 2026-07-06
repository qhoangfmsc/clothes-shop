"use client";

import { motion } from "framer-motion";
import { SERVICES, INVITATION } from "../_common/constants";

const ease = [0.25, 0.1, 0.25, 1] as const;

/**
 * Card backgrounds — diverse tinted creams from the palette,
 * each matching a different color family for visual richness.
 */
const CARD_STYLES = [
  {
    bg: "var(--color-rose-milk)",
    border: "var(--border-light)",
    iconColor: "var(--color-dusty-rose)",
  },
  {
    bg: "var(--color-sage-cream)",
    border: "var(--border-light)",
    iconColor: "var(--color-sage)",
  },
  {
    bg: "var(--color-lavender-cream)",
    border: "var(--border-light)",
    iconColor: "var(--color-lavender)",
  },
] as const;

export default function ServicesSection() {
  return (
    <section
      style={{
        background: "var(--bg-secondary)",
        padding: "80px 40px",
        height: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Section header */}
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [...ease] }}
          style={{
            color: "var(--text-accent)",
            textTransform: "uppercase",
            fontSize: "var(--text-sm)",
            letterSpacing: "0.12em",
            lineHeight: "140%",
            display: "block",
            marginBottom: 16,
          }}
        >
          Services
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
          style={{
            color: "var(--text-heading)",
            letterSpacing: "-0.04em",
            lineHeight: "100%",
            fontWeight: 400,
            fontSize: "clamp(25px, 4vw, 42px)",
            marginBottom: 64,
          }}
        >
          What We Offer
        </motion.h2>

        {/* Cards — diverse tinted cream backgrounds */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {SERVICES.map((service, idx) => {
            const style = CARD_STYLES[idx];
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.6,
                  ease: [...ease],
                  delay: idx * 0.12,
                }}
                style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: "var(--radius-md)",
                  padding: "clamp(32px, 3.5vw, 48px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  cursor: "default",
                  transition: `transform var(--duration-base) var(--ease-default), box-shadow var(--duration-base) var(--ease-default), border-color var(--duration-base) var(--ease-default)`,
                }}
                whileHover={{
                  y: -2,
                  boxShadow: "var(--shadow-gold-sm)",
                }}
              >
                {/* Icon — color-matched accent */}
                <span
                  style={{
                    fontSize: 24,
                    color: style.iconColor,
                    lineHeight: "100%",
                  }}
                >
                  {service.icon}
                </span>

                {/* Title */}
                <h3
                  style={{
                    color: "var(--text-heading)",
                    letterSpacing: "-0.04em",
                    lineHeight: "100%",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    fontSize: "clamp(15px, 1.8vw, 20px)",
                  }}
                >
                  {service.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    color: "var(--text-secondary)",
                    letterSpacing: "-0.02em",
                    lineHeight: "170%",
                    fontSize: "clamp(12px, 1.3vw, 14px)",
                  }}
                >
                  {service.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* GET IN TOUCH — CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.4 }}
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 64,
          }}
        >
          <motion.a
            href="mailto:hello@oribaebi.com"
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--accent-primary)",
              color: "var(--text-on-gold)",
              borderRadius: "var(--radius-pill)",
              padding: "14px 40px",
              fontSize: "var(--text-md)",
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              textDecoration: "none",
              fontWeight: 500,
              boxShadow: "var(--shadow-gold-sm)",
              transition:
                "opacity var(--duration-base) var(--ease-default), transform var(--duration-base) var(--ease-default)",
              cursor: "pointer",
            }}
          >
            {INVITATION.ctaButton}
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

