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
      className="top-[118px] left-4 w-[calc(100vw-32px)] sm:top-[180px] sm:left-4 sm:w-[calc(50vw-48px)] lg:top-[244px] lg:left-8 lg:w-[692px]"
    >
      When switching between videos near the center, do not reset currentTime to
      0 abruptly. Add a small dead zone: if cursor is within +/-50px of center,
      keep both videos at currentTime = 0 and show whichever was last active.
    </motion.div>
  );
}
