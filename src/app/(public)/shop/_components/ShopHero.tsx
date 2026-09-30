"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ROTATE_MS = 5000;

interface ShopHeroProps {
  label: string;
  title: string;
  description?: string;
  /** Background image(s). 0 = plain color (no image available yet), 1 = static, 2+ = auto-rotating crossfade. */
  images: string[];
}

export default function ShopHero({ label, title, description, images }: ShopHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const [idx, setIdx] = useState(0);

  /* Reset to the first slide whenever the image list itself changes */
  useEffect(() => {
    setIdx(0);
  }, [images]);

  /* Auto-rotate when there's more than one image */
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setIdx((p) => (p + 1) % images.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [images]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      /* Entrance timeline */
      const tl = gsap.timeline({ delay: 0.15 });

      /* Hero background scale-in — targets the stable wrapper, not the
         (possibly rotating) image inside it, so crossfading images never
         disturbs this tween or the scroll parallax below. */
      const bg = el.querySelector("[data-hero-bg]");
      if (bg) {
        tl.from(bg, { scale: 1.1, duration: 1.2, ease: "power2.out" });
      }

      /* Text reveals — staggered */
      const textEls = el.querySelectorAll(
        "[data-hero-label], [data-hero-title], [data-hero-desc]"
      );
      gsap.set(textEls, { opacity: 0, y: 16 });
      tl.to(
        textEls,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
        },
        "-=0.5"
      );

      /* Parallax on scroll */
      if (bg) {
        gsap.to(bg, {
          y: "18%",
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[560px] flex flex-col justify-end overflow-hidden py-16 px-4 sm:py-16 sm:px-6 lg:py-20 lg:px-8">
      {/* Background: a champagne base color always shows underneath, and the
          image (when available) sits at slightly reduced opacity on top —
          so the brand color and the photo are both visible together, not
          just a photo blotting it out. No image yet → the base color alone. */}
      <div
        data-hero-bg
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "var(--bg-section-3)" }}
      >
        {images.length > 0 && (
          <AnimatePresence>
            <motion.div
              key={idx}
              initial={{ opacity: images.length > 1 ? 0 : 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={images[idx]}
                alt=""
                fill
                priority
                sizes="100vw"
                style={{ objectFit: "cover", opacity: 0.85 }}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(10, 10, 8, 0.85) 0%, rgba(10, 10, 8, 0.4) 50%, rgba(10, 10, 8, 0.2) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-2 max-w-[720px]">
        <span data-hero-label className="block text-[var(--color-champagne-gold)] uppercase text-xs tracking-[0.12em] leading-[140%] font-primary font-medium mb-4">{label}</span>
        <h1 data-hero-title className="text-[var(--color-pearl-cream)] tracking-[-0.04em] leading-none font-normal font-display text-[clamp(36px,7vw,72px)] mb-4">{title}</h1>
        {description && <p data-hero-desc className="text-[rgba(255,255,255,0.65)] tracking-[-0.02em] leading-[150%] text-[15px] font-primary max-w-[400px]">{description}</p>}
      </div>
    </section>
  );
}
