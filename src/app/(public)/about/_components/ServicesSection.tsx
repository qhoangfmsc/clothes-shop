"use client";

import { motion } from "framer-motion";
import { SERVICES } from "../_common/constants";

const ease = [0.25, 0.1, 0.25, 1] as const;

const CARD_BG = [
  "var(--color-petal)",
  "var(--color-cloud)",
  "var(--color-vanilla)",
] as const;

export default function ServicesSection() {
  return (
    <section
      style={{
        background: "var(--bg-accent-blue)",
        padding: "clamp(80px, 12vw, 160px) clamp(24px, 5vw, 80px)",
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
            letterSpacing: "-0.02em",
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
            fontWeight: 500,
            fontSize: "clamp(25px, 4vw, 42px)",
            marginBottom: 64,
          }}
        >
          What We Offer
        </motion.h2>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {SERVICES.map((service, idx) => (
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
                background: CARD_BG[idx],
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: "clamp(28px, 3vw, 40px)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                cursor: "default",
                transition: `transform var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default)`,
              }}
              whileHover={{
                y: -2,
                boxShadow: "var(--shadow-md)",
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  color: "var(--accent-primary)",
                  lineHeight: "100%",
                }}
              >
                {service.icon}
              </span>

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

              <p
                style={{
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  lineHeight: "170%",
                  fontSize: "clamp(12px, 1.3vw, 14px)",
                }}
              >
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
