"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ShopHeroProps {
  label: string;
  title: string;
  description?: string;
  heroImage: string;
}

export default function ShopHero({
  label,
  title,
  description,
  heroImage,
}: ShopHeroProps) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      /* Entrance timeline */
      const tl = gsap.timeline({ delay: 0.15 });

      /* Hero image scale-in */
      const bgImg = el.querySelector("[data-hero-bg] img");
      if (bgImg) {
        tl.from(bgImg, { scale: 1.1, duration: 1.2, ease: "power2.out" });
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
      if (bgImg) {
        gsap.to(bgImg, {
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
      {/* Background image */}
      <div data-hero-bg className="absolute inset-0 pointer-events-none z-0">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
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
