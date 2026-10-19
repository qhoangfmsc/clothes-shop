"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BannerFade from "@/src/app/[locale]/_components/BannerFade";
import { CarouselDots } from "@/src/app/[locale]/_components/CarouselControls";
import { useBannerRotation } from "@/src/hooks/use-banner-rotation";
import type { BannerItem } from "@/src/types/site-config";

gsap.registerPlugin(ScrollTrigger);

interface ShopHeroProps {
  label: string;
  title: string;
  description?: string;
  /** Background banner(s). 0 = plain color (no banner configured yet), 1 = static, 2+ = auto-rotating crossfade. */
  banners: BannerItem[];
}

export default function ShopHero({ label, title, description, banners }: ShopHeroProps) {
  /* Auto-rotates when there is more than one banner; the hook owns the index + pausing */
  const { ref: heroRef, index: idx, goTo } = useBannerRotation<HTMLElement>(banners);

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
  }, [heroRef]);

  return (
    <section ref={heroRef} className="relative min-h-[26.25rem] sm:min-h-[30rem] lg:min-h-[35rem] flex flex-col justify-end overflow-hidden py-16 px-4 sm:py-16 sm:px-6 lg:py-20 lg:px-8">
      {/* Background: a champagne base color always shows underneath, and the
          image (when available) sits at slightly reduced opacity on top —
          so the brand color and the photo are both visible together, not
          just a photo blotting it out. No image yet → the base color alone. */}
      <div
        data-hero-bg
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "var(--bg-section-3)" }}
      >
        <BannerFade banners={banners} index={idx} sizes="100vw" />
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(10, 10, 8, 0.85) 0%, rgba(10, 10, 8, 0.4) 50%, rgba(10, 10, 8, 0.2) 100%)",
        }}
      />

      <CarouselDots
        count={banners.length}
        index={idx}
        onSelect={goTo}
        className="absolute bottom-5 inset-x-0 z-3"
      />

      {/* Content */}
      <div className="relative z-2 max-w-[45rem]">
        <span data-hero-label className="block text-[var(--color-champagne-gold)] uppercase text-xs tracking-[0.12em] leading-[140%] font-primary font-medium mb-4">{label}</span>
        <h1 data-hero-title className="text-[var(--color-pearl-cream)] tracking-[-0.04em] leading-none font-normal font-display text-[clamp(2.25rem,7vw,4.5rem)] mb-4">{title}</h1>
        {description && <p data-hero-desc className="text-[rgba(255,255,255,0.65)] tracking-[-0.02em] leading-[150%] text-[0.9375rem] font-primary max-w-[25rem]">{description}</p>}
      </div>
    </section>
  );
}
