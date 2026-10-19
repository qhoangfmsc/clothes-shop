"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { buildMailto } from "@/src/lib/contact";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function ContactCTA() {
  const t = useTranslations("public.about.cta");
  return (
    <section className="bg-[var(--bg-secondary)] h-screen px-[clamp(1.5rem,5vw,5rem)] flex flex-col items-center justify-center text-center relative">
      {/* Decorative symbol */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [...ease] }}
        className="text-[var(--accent-primary)] text-2xl mb-12"
      >
        ◆
      </motion.div>

      {/* CTA heading */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
        className="text-[var(--text-heading)] tracking-[-0.04em] leading-[120%] font-medium max-w-[30rem] mb-12 text-[clamp(1.5625rem,4vw,2.625rem)]"
      >
        {t("text")}
      </motion.p>

      {/* CTA button */}
      <motion.a
        href={buildMailto()}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
        whileHover={{ scale: 1.02, opacity: 0.9 }}
        className="inline-flex items-center justify-center bg-[var(--accent-primary)] text-[var(--color-white)] rounded-full py-[0.875rem] px-9 text-base tracking-[-0.02em] uppercase no-underline font-medium shadow-[var(--shadow-md)] cursor-pointer"
        style={{
          transition:
            "opacity var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-default)",
        }}
      >
        {t("button")}
      </motion.a>

      {/* Footer branding */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [...ease], delay: 0.4 }}
        className="text-[var(--text-muted)] text-xs uppercase tracking-[-0.02em] absolute bottom-10"
      >
        {t("copyright", { year: new Date().getFullYear() })}
      </motion.p>
    </section>
  );
}
