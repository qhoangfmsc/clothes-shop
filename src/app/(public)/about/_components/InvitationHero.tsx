"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { INVITATION } from "../_common/constants";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function InvitationHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--color-rose-milk)]">
      {/* Mood wallpaper — subtle background texture */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1.2, ease: [...ease] }}
        className="absolute inset-0 pointer-events-none"
      >
        <Image
          src="/images/mood-bg/wall_sticker_pink_floral.webp"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </motion.div>

      {/* Inset editorial frame */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [...ease], delay: 0.4 }}
        className="absolute inset-6 border border-[var(--border-subtle)] pointer-events-none"
      />

      {/* Content — centered */}
      <div className="relative flex flex-col items-center text-center py-[120px] px-8 max-w-[640px]">
        {/* Label */}
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.2 }}
          className="text-[var(--text-accent)] uppercase text-sm tracking-[0.12em] leading-[140%] mb-8"
        >
          About — Ori Baebi
        </motion.span>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.3 }}
          className="text-[var(--text-heading)] tracking-[-0.04em] leading-none font-normal [font-family:var(--font-display)] text-[clamp(42px,8vw,80px)]"
        >
          {INVITATION.heading}
        </motion.h1>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.5 }}
          className="w-12 h-px bg-[var(--accent-primary)] origin-center mt-10 mb-10"
        />

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.6 }}
          className="text-[var(--text-secondary)] tracking-[-0.02em] leading-[160%] text-[clamp(13px,1.5vw,16px)] max-w-[400px]"
        >
          {INVITATION.subheading}
        </motion.p>

        {/* Brand tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.8 }}
          className="text-[var(--text-muted)] tracking-[-0.02em] uppercase text-xs leading-[140%] mt-20"
        >
          Ori Baebi — Est. 2026
        </motion.p>
      </div>
    </section>
  );
}
