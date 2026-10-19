"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function Logo() {
  const t = useTranslations("shared.footer");
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0 }}
      style={{ position: "absolute" }}
      className="top-8 left-6 w-[7.5rem] sm:top-6 sm:w-[8.125rem] md:top-6 lg:w-[11.25rem] text-[var(--color-brand)]"
    >
      <Link
        href="/"
        style={{
          display: "block",
          pointerEvents: "auto",
          textDecoration: "none",
        }}
        aria-label={t("homeAria")}
      >
        <svg viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
          <text
            x="0"
            y="30"
            fill="currentColor"
            fontSize="34"
            fontFamily="var(--font-display)"
            fontWeight="400"
            letterSpacing="-0.02em"
          >
            DOOVAN
          </text>
        </svg>
      </Link>
    </motion.div>
  );
}
