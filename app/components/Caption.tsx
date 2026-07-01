"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function Caption() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.3 }}
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 20,
        mixBlendMode: "exclusion",
        fontSize: 12,
        lineHeight: "140%",
        letterSpacing: "-0.04em",
        color: "#FFFFFF",
      }}
      className="top-[118px] left-4 w-[calc(100vw-82px)] sm:top-[180px] sm:left-4 sm:w-[calc(50vw-90px)] lg:top-[244px] lg:left-8 lg:w-[540px]"
    >
      When luxury meets the runway, every thread tells a story. Ori Baebi crafts exclusive bags,
      apparel &amp; accessories for the world&apos;s most discerning fashion houses — where heritage
      artisanship meets avant-garde vision.
    </motion.div>
  );
}
