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
    <section className="bg-[var(--bg-secondary)] py-20 px-10">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [...ease] }}
          className="text-[var(--text-accent)] uppercase text-sm tracking-[0.12em] leading-[140%] block mb-4"
        >
          Services
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
          className="text-[var(--text-heading)] tracking-[-0.04em] leading-none font-normal text-[clamp(25px,4vw,42px)] mb-16"
        >
          What We Offer
        </motion.h2>

        {/* Cards — diverse tinted cream backgrounds */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
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
                className={`bg-[${style.bg}] border border-[${style.border}] rounded-md p-[clamp(32px,3.5vw,48px)] flex flex-col gap-5 cursor-default`}
                style={{
                  transition:
                    "transform var(--duration-base) var(--ease-default), box-shadow var(--duration-base) var(--ease-default), border-color var(--duration-base) var(--ease-default)",
                }}
                whileHover={{
                  y: -2,
                  boxShadow: "var(--shadow-gold-sm)",
                }}
              >
                {/* Icon — color-matched accent */}
                <span
                  className="text-2xl leading-none"
                  style={{ color: style.iconColor }}
                >
                  {service.icon}
                </span>

                {/* Title */}
                <h3 className="text-[var(--text-heading)] tracking-[-0.04em] leading-none font-medium uppercase text-[clamp(15px,1.8vw,20px)]">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-[var(--text-secondary)] tracking-[-0.02em] leading-[170%] text-[clamp(12px,1.3vw,14px)]">
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
          className="flex justify-center mt-16"
        >
          <motion.a
            href="mailto:hello@oribaebi.com"
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            className="inline-flex items-center justify-center bg-[var(--accent-primary)] text-[var(--text-on-gold)] rounded-[var(--radius-pill)] py-[14px] px-10 text-base tracking-[-0.02em] uppercase no-underline font-medium shadow-[var(--shadow-gold-sm)] cursor-pointer"
            style={{
              transition:
                "opacity var(--duration-base) var(--ease-default), transform var(--duration-base) var(--ease-default)",
            }}
          >
            {INVITATION.ctaButton}
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
