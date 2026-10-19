"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function ProductInfo() {
  const t = useTranslations("public.landing.productInfo");
  return (
    <motion.div
      id="outro-info"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.45 }}
      data-outro-offset="166"
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 20,
        mixBlendMode: "exclusion",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
      className="right-[calc(var(--page-edge)+1rem)] bottom-14 sm:right-[calc(var(--page-edge)+2rem)] sm:bottom-0 sm:w-[20.625rem]"
    >
      {/* Top block */}
      <div
        className="w-[15.75rem] mb-3 sm:w-full sm:mb-8"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        {/* Circle icon with symbol */}
        <div
          className="w-5 h-5 sm:w-[1.25rem] sm:h-[1.25rem]"
          style={{
            position: "relative",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="20" cy="20" r="18.75" stroke="white" className="stroke-2 sm:stroke-[2.5]" />
          </svg>
          <span
            id="circle-symbol"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
              color: "white",
            }}
            className="text-[0.625rem] sm:text-[0.9375rem]"
          >
            8
          </span>
        </div>

        {/* Collection label */}
        <div
          className="text-[1.875rem]"
          style={{
            lineHeight: "100%",
            textAlign: "right",
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            color: "white",
          }}
        >
          {t("line1")}
          <br />
          &ldquo;DOOVAN&rdquo;
        </div>
      </div>
    </motion.div>
  );
}
