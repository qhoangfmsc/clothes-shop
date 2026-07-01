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
      className="top-4 left-4 w-[124px] sm:top-8 sm:left-8 sm:w-[266px] lg:w-[355px]"
    >
      <svg viewBox="0 0 360 50" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
        <text
          x="0"
          y="40"
          fill="white"
          fontSize="48"
          fontFamily="'Inter Tight', sans-serif"
          fontWeight="500"
          letterSpacing="-0.04em"
        >
          Ori Baebi
        </text>
      </svg>
    </motion.div>
  );
}
