"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function HeaderNav() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease], delay: 0.15 }}
      style={{
        position: "fixed",
        zIndex: 20,
        pointerEvents: "none",
        mixBlendMode: "exclusion",
        height: 30,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
      className="top-4 right-4 w-auto sm:top-8 sm:right-8 lg:w-[330px]"
    >
      {/* ABOUT - hidden on mobile */}
      <span
        className="hidden lg:block"
        style={{
          fontSize: 15,
          textTransform: "uppercase",
          color: "white",
          letterSpacing: "-0.02em",
        }}
      >
        ABOUT
      </span>

      <div
        className="gap-5 lg:gap-[50px]"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* Hamburger */}
        <svg
          className="w-6 h-6 lg:w-[30px] lg:h-[30px]"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 14H40" stroke="white" strokeWidth="2.5" />
          <path d="M0 26H40" stroke="white" strokeWidth="2.5" />
        </svg>

        {/* CART */}
        <span
          className="text-[13px] lg:text-[15px]"
          style={{
            color: "white",
            letterSpacing: "-0.02em",
          }}
        >
          [ CART ]
        </span>
      </div>
    </motion.div>
  );
}
