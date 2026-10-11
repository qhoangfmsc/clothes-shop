"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CURSOR_VARIANTS } from "./cursor-config";
import { useCursorTracker } from "./use-cursor-tracker";

interface Petal {
  dx: number;
  dy: number;
  rotate: number;
  color: string;
}

interface Burst {
  id: number;
  petals: Petal[];
}

const PETAL_COLORS = [
  "var(--color-champagne-gold)",
  "var(--color-dusty-rose)",
  "var(--color-dusty-blue)",
];

const PETAL_COUNT = 6;
const BURST_LIFETIME_MS = 500;

function createBurst(): Burst {
  const petals: Petal[] = Array.from({ length: PETAL_COUNT }, (_, i) => {
    const angle = (360 / PETAL_COUNT) * i + (Math.random() * 20 - 10);
    const distance = 22 + Math.random() * 14;
    const radians = (angle * Math.PI) / 180;
    return {
      dx: Math.cos(radians) * distance,
      dy: Math.sin(radians) * distance,
      rotate: Math.random() * 360,
      color: PETAL_COLORS[i % PETAL_COLORS.length],
    };
  });
  return { id: Date.now() + Math.random(), petals };
}

/**
 * Replaces the native OS cursor with the hand-illustrated default/pointer/text
 * artwork in /public/cursor. Mounted once near the root layout.
 *
 * No-ops entirely on touch devices (no fine pointer), so the native cursor/tap
 * behaviour is left untouched there.
 */
export default function CustomCursor() {
  const { isSupported, isVisible, isPressed, variant, x, y } = useCursorTracker();
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    if (!isSupported) return;
    document.documentElement.classList.add("custom-cursor-active");

    const handleDown = () => {
      const burst = createBurst();
      setBursts((prev) => [...prev, burst]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burst.id));
      }, BURST_LIFETIME_MS);
    };
    window.addEventListener("pointerdown", handleDown);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("pointerdown", handleDown);
    };
  }, [isSupported]);

  if (!isSupported || variant === "native") return null;

  const { src, width, height, anchor, scale } = CURSOR_VARIANTS[variant];
  const isPointerVariant = variant === "pointer";

  return (
    <motion.div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        x,
        y,
        zIndex: 2147483647,
        pointerEvents: "none",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.15s ease-out",
      }}
    >
      {/* Cute little "poof" of petals blooming outward from the click point —
          a one-off flourish on click, nothing lingers on screen. */}
      <AnimatePresence>
        {bursts.map((burst) => (
          <motion.div key={burst.id} style={{ position: "absolute", top: 0, left: 0 }}>
            {burst.petals.map((petal, i) => (
              <motion.span
                key={i}
                style={{
                  position: "absolute",
                  top: -4,
                  left: -3,
                  width: 6,
                  height: 9,
                  borderRadius: "60% 60% 60% 0%",
                  background: petal.color,
                }}
                initial={{ x: 0, y: 0, opacity: 0.9, scale: 0.9, rotate: petal.rotate }}
                animate={{
                  x: petal.dx,
                  y: petal.dy,
                  opacity: 0,
                  scale: 0.3,
                  rotate: petal.rotate + 70,
                }}
                transition={{ duration: BURST_LIFETIME_MS / 1000, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Shifts the whole artwork so its "active point" (tip/fingertip/beam) sits on the real pointer position. */}
      <div style={{ marginLeft: -(anchor.x * width), marginTop: -(anchor.y * height) }}>
        <motion.div
          style={{
            position: "relative",
            width,
            height,
            transformOrigin: `${anchor.x * 100}% ${anchor.y * 100}%`,
            filter: isPointerVariant
              ? "drop-shadow(0 3px 6px rgba(58,49,42,0.32)) drop-shadow(0 0 7px rgba(201,169,110,0.5))"
              : "drop-shadow(0 3px 6px rgba(58,49,42,0.3)) drop-shadow(0 0 4px rgba(201,169,110,0.3))",
          }}
          animate={{ scale: scale * (isPressed ? 0.85 : 1) }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <AnimatePresence initial={false}>
            <motion.img
              key={variant}
              src={src}
              alt=""
              draggable={false}
              data-cursor-img
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width,
                height,
                display: "block",
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
            />
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
