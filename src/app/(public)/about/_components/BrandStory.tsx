"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BRAND_STORY } from "../_common/constants";
import { useEffect, useState } from "react";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function BrandStory() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section className="bg-[var(--bg-primary)] px-[clamp(24px,5vw,80px)] py-[clamp(80px,12vw,160px)]">
      <div
        className={`max-w-[1200px] mx-auto grid items-center ${
          isDesktop ? "grid-cols-2 gap-16" : "grid-cols-1 gap-12"
        }`}
      >
        {/* Left — Text content */}
        <div>
          {/* Section label */}
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [...ease] }}
            className="text-[var(--text-accent)] uppercase text-sm tracking-[-0.02em] leading-[140%] block mb-6"
          >
            {BRAND_STORY.subtitle}
          </motion.span>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [...ease], delay: 0.1 }}
            className="text-[var(--text-heading)] tracking-[-0.04em] leading-none font-medium text-[clamp(30px,5vw,52px)] mb-10"
          >
            {BRAND_STORY.title}
          </motion.h2>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [...ease], delay: 0.15 }}
            className="w-12 h-px bg-[var(--accent-primary)] origin-left mb-10"
          />

          {/* Paragraphs */}
          <div className="flex flex-col gap-7 mb-12">
            {BRAND_STORY.paragraphs.map((paragraph, idx) => (
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.6,
                  ease: [...ease],
                  delay: 0.2 + idx * 0.1,
                }}
                className="text-[var(--text-primary)] tracking-[-0.02em] leading-[180%] text-[clamp(13px,1.5vw,15px)]"
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          {/* Pull quote */}
          <motion.blockquote
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [...ease], delay: 0.35 }}
            className="border-l-2 border-l-[var(--accent-primary)] pl-5 text-[var(--text-heading)] tracking-[-0.04em] leading-[140%] font-medium italic text-[clamp(16px,2vw,22px)]"
          >
            &ldquo;We don&rsquo;t follow trends — we create stories you wear.&rdquo;
          </motion.blockquote>
        </div>

        {/* Right — Framed mood image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [...ease], delay: 0.2 }}
          className="relative w-full aspect-[3/4] p-1 bg-[var(--color-warm-white)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)]"
        >
          {/* Inner image */}
          <div className="relative w-full h-full overflow-hidden">
            <Image
              src="/images/mood-bg/wall_sticker_soft_cream_roses.webp"
              alt="Soft textures that inspire our craft"
              fill
              className="object-cover"
            />
          </div>

          {/* Frame corner accent — bottom-right */}
          <div className="absolute -bottom-2 -right-2 w-10 h-10 border-b border-r border-b-[var(--accent-primary)] border-r-[var(--accent-primary)] pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
}
