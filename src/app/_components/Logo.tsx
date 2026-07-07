"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useBreakpoint } from "@/src/hooks/useMediaQuery";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function Logo() {
  const { isMobile } = useBreakpoint();

  /* Desktop (nav header visible) → compact logo
     Mobile/Tablet (nav header hidden) → large logo */
  const fontSize = !isMobile ? 30 : 52;
  const yPos = !isMobile ? 25 : 65;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0 }}
      style={{
        position: "absolute",
      }}
      className="top-4 left-4 w-[200px] sm:top-8 sm:left-8 sm:w-[266px] lg:w-[355px]"
    >
      <Link
        href="/"
        style={{
          display: "block",
          pointerEvents: "auto",
          textDecoration: "none",
        }}
        aria-label="Ori Baebi — Home"
      >
        <svg viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
          <text
            x="0"
            y={yPos}
            fill="currentColor"
            fontSize={fontSize}
            fontFamily="var(--font-quiche-display), serif"
            fontWeight="400"
            letterSpacing="-0.02em"
          >
            Ori Baebi
          </text>
        </svg>
      </Link>
    </motion.div>
  );
}
