"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0 }}
      style={{ position: "absolute" }}
      className="top-8 left-6 w-[120px] sm:top-6 sm:w-[130px] md:top-8 lg:w-[180px]"
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
        <svg viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
          <text
            x="0"
            y="30"
            fill="currentColor"
            fontSize="34"
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
