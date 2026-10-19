"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { buildMailto } from "@/src/lib/contact";
import { SERVICES } from "../_common/constants";

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
  const t = useTranslations("public.about");
  return (
    <section className="bg-[var(--bg-secondary)] py-20 px-10">
      <div className="max-w-[75rem] mx-auto">
        {/* Section header */}
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [...ease] }}
          className="text-[var(--text-accent)] uppercase text-sm tracking-[0.12em] leading-[140%] block mb-4"
        >
          {t("services.label")}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
          className="text-[var(--text-heading)] tracking-[-0.04em] leading-none font-normal text-[clamp(1.5625rem,4vw,2.625rem)] mb-16"
        >
          {t("services.title")}
        </motion.h2>

        {/* Cards — diverse tinted cream backgrounds */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(17.5rem,1fr))] gap-4">
          {SERVICES.map((service, idx) => {
            const style = CARD_STYLES[idx];
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.6,
                  ease: [...ease],
                  delay: idx * 0.12,
                }}
                className={`bg-[${style.bg}] border border-[${style.border}] rounded-md p-[clamp(2rem,3.5vw,3rem)] flex flex-col gap-5 cursor-default`}
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
                <h3 className="text-[var(--text-heading)] tracking-[-0.04em] leading-none font-medium uppercase text-[clamp(0.9375rem,1.8vw,1.25rem)]">
                  {t(`services.items.${service.key}.title`)}
                </h3>

                {/* Description */}
                <p className="text-[var(--text-secondary)] tracking-[-0.02em] leading-[170%] text-[clamp(0.75rem,1.3vw,0.875rem)]">
                  {t(`services.items.${service.key}.description`)}
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
            href={buildMailto()}
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            className="inline-flex items-center justify-center bg-[var(--accent-primary)] text-[var(--text-on-gold)] rounded-[var(--radius-pill)] py-[0.875rem] px-10 text-base tracking-[-0.02em] uppercase no-underline font-medium shadow-[var(--shadow-gold-sm)] cursor-pointer"
            style={{
              transition:
                "opacity var(--duration-base) var(--ease-default), transform var(--duration-base) var(--ease-default)",
            }}
          >
            {t("cta.button")}
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
