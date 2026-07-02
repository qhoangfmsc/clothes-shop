"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0 }}
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 20,
        mixBlendMode: "exclusion",
      }}
      className="top-4 left-4 w-[200px] sm:top-8 sm:left-8 sm:w-[266px] lg:w-[355px]"
    >
      <svg viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
        <text
          x="0"
          y="65"
          fill="white"
          fontSize="52"
          fontFamily="var(--font-quiche-display), serif"
          fontWeight="400"
          letterSpacing="-0.02em"
        >
          Ori Baebi
        </text>
      </svg>
    </motion.div>
  );
}
