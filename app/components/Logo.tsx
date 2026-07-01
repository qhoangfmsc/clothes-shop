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
      <svg
        viewBox="0 0 355 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
      >
        {/* "prmpt" wordmark */}
        <path
          d="M0 110V0H50C58.3 0 65.8 1.7 72.5 5C79.2 8.3 84.5 13 88.5 19C92.5 25 94.5 31.8 94.5 39.5C94.5 47.2 92.5 54 88.5 60C84.5 66 79.2 70.7 72.5 74C65.8 77.3 58.3 79 50 79H28V110H0ZM28 55H47C51.7 55 55.5 53.5 58.5 50.5C61.5 47.5 63 43.8 63 39.5C63 35.2 61.5 31.5 58.5 28.5C55.5 25.5 51.7 24 47 24H28V55Z"
          fill="white"
        />
        <path
          d="M105 110V0H155C163.3 0 170.8 1.5 177.5 4.5C184.2 7.5 189.5 12 193.5 18C197.5 24 199.5 30.7 199.5 38C199.5 46 197.2 53 192.5 59C187.8 65 181.8 69.2 174.5 71.5L202 110H170L145 75H133V110H105ZM133 53H152C156.7 53 160.5 51.5 163.5 48.5C166.5 45.5 168 41.8 168 37.5C168 33.2 166.5 29.7 163.5 27C160.5 24.3 156.7 23 152 23H133V53Z"
          fill="white"
        />
        <path
          d="M209 110V0H253L276 73L299 0H343V110H315V38L290 110H262L237 38V110H209Z"
          fill="white"
        />
        {/* Circled R */}
        <circle cx="335" cy="20" r="18" stroke="white" strokeWidth="3" />
        <text
          x="335"
          y="20"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="18"
          fontFamily="Inter Tight, sans-serif"
          fontWeight="500"
        >
          R
        </text>
      </svg>
    </motion.div>
  );
}
