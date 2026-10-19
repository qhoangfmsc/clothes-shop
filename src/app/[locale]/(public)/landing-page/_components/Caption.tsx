"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function Caption() {
  const t = useTranslations("public.landing");
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.3 }}
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 10,
        mixBlendMode: "exclusion",
        lineHeight: "140%",
        letterSpacing: "-0.04em",
        color: "#FFF",
      }}
      className="top-[7.375rem] left-[calc(var(--page-edge)+1rem)] w-[calc(100vw-82px)] text-[0.75rem] sm:top-[11.25rem] sm:w-[calc(50vw-90px)] lg:top-[17.5rem] lg:left-[calc(var(--page-edge)+2rem)] lg:w-[31.25rem] 2xl:w-[36rem] 2xl:text-[0.875rem]"
    >
      {t("caption")}
    </motion.div>
  );
}
