"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Collection } from "@/src/types/collection";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface CollectionsClientProps {
  collections: Collection[];
}

/* ── Map collection data for horizontal scroll cards ── */
function buildHorizontalCards(collections: Collection[]) {
  return collections.map((col) => ({
    title: col.name,
    subtitle: col.subtitle,
    image: col.image,
    href: `/collections/${col.slug}`,
  }));
}

/* ── 3 rotating background tints for editorial spreads ── */
const EDITORIAL_BG_TINTS = [
  "var(--color-rose-milk)",
  "var(--color-vanilla)",
  "var(--color-lavender-cream)",
];

function buildEditorialSections(collections: Collection[]) {
  return collections.slice(0, 3).map((col, idx) => ({
    num: String(idx + 1).padStart(2, "0"),
    heading: col.name,
    description: col.description,
    image: col.image,
    bgColor: EDITORIAL_BG_TINTS[idx % EDITORIAL_BG_TINTS.length],
    textColor: "var(--text-heading)",
    cta: { label: "Explore Collection", href: `/collections/${col.slug}` },
  }));
}

const MARQUEE_TEXT = "Ori Baebi ◆ Collections ◆ Summer 2026 ◆ Crafted with Intention ◆ ";

export default function CollectionsClient({ collections }: CollectionsClientProps) {
  const HORIZONTAL_CARDS = buildHorizontalCards(collections);
  const EDITORIAL_SECTIONS = buildEditorialSections(collections);
  const heroRef = useRef<HTMLElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const spreadRefs = useRef<(HTMLElement | null)[]>([]);

  /* ── Hero reveal animation ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });

      /* Image scale-in */
      tl.from(hero.querySelector("[data-hero-media] img"), {
        scale: 1.2,
        duration: 1.4,
        ease: "power2.out",
      });

      /* Season label */
      tl.to(
        hero.querySelector("[data-hero-season]"),
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.8"
      );

      /* Title lines — stagger reveal */
      tl.to(
        hero.querySelectorAll("[data-hero-title-line]"),
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
        },
        "-=0.4"
      );

      /* Subtitle */
      tl.to(
        hero.querySelector("[data-hero-subtitle]"),
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.3"
      );

      /* Scroll hint */
      tl.to(hero.querySelector("[data-hero-scroll-hint]"), { opacity: 1, duration: 0.5 }, "-=0.1");

      /* Hero parallax on scroll */
      gsap.to(hero.querySelector("[data-hero-media] img"), {
        y: "20%",
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, hero);

    return () => ctx.revert();
  }, []);

  /* ── Horizontal scroll ── */
  useEffect(() => {
    const section = horizontalRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const totalWidth = track.scrollWidth - window.innerWidth;

      gsap.to(track, {
        x: -totalWidth,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalWidth}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  /* ── Editorial spreads — scroll-triggered reveals ── */
  useEffect(() => {
    const refs = spreadRefs.current.filter(Boolean);
    if (refs.length === 0) return;

    const ctx = gsap.context(() => {
      refs.forEach((section) => {
        if (!section) return;

        /* Parallax image */
        const img = section.querySelector("[data-spread-image] img");
        if (img) {
          gsap.fromTo(
            img,
            { y: "-10%" },
            {
              y: "10%",
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );
        }

        /* Text reveals */
        const textEls = section.querySelectorAll(
          "[data-spread-num], [data-spread-heading], [data-spread-desc], [data-spread-cta]"
        );
        gsap.to(textEls, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section.querySelector("[data-spread-text]"),
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        });

        /* Set initial states */
        gsap.set(textEls, { opacity: 0, y: 30 });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* ═══ 1. HERO — Full-bleed cinematic ═══ */}
      <section
        ref={heroRef}
        className="relative h-screen overflow-hidden flex items-end justify-start bg-[var(--color-noir)]"
      >
        <div data-hero-media className="absolute inset-0 z-0">
          <Image
            src="/images/model-intro/model_intro_6.webp"
            alt="Collections — Summer 2026"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            className="will-change-transform motion-reduce:will-change-auto"
          />
        </div>
        <div
          className="absolute inset-0 z-1 pointer-events-none bg-[linear-gradient(to_top,rgba(10,10,8,0.7)_0%,transparent_50%),linear-gradient(to_right,rgba(10,10,8,0.4)_0%,transparent_60%)]"
        />

        <div className="relative z-2 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 max-w-160">
          <span
            data-hero-season
            className="inline-block text-[var(--color-champagne-gold)] font-primary text-xs font-medium tracking-[0.2em] uppercase mb-5 opacity-0"
          >
            Summer 2026
          </span>
          <h1 className="font-display font-normal text-[clamp(48px,10vw,120px)] text-[var(--color-pearl-cream)] tracking-tighter leading-[90%] mb-5 overflow-hidden">
            <span data-hero-title-line className="block opacity-0 translate-y-full">
              The
            </span>
            <span data-hero-title-line className="block opacity-0 translate-y-full">
              Collections
            </span>
          </h1>
          <p
            data-hero-subtitle
            className="text-white/55 font-primary text-[15px] font-medium tracking-[-0.02em] leading-[160%] max-w-90 opacity-0"
          >
            Stories told through fabric, form, and intention. Each collection a chapter in the Ori
            Baebi narrative.
          </p>
        </div>

        <div
          data-hero-scroll-hint
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-3 flex flex-col items-center gap-2 text-white/35 font-primary text-xs tracking-[0.12em] uppercase opacity-0"
        >
          <div className="w-px h-10 bg-linear-to-b from-[rgba(201,169,110,0.6)] to-transparent animate-[col-scroll-pulse_1.8s_ease-in-out_infinite] motion-reduce:animate-none" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ═══ 2. MARQUEE — Running text strip ═══ */}
      <div className="overflow-hidden py-10 bg-[var(--color-noir)] border-t border-b border-[rgba(201,169,110,0.1)]">
        <div className="flex whitespace-nowrap will-change-transform animate-[col-marquee-scroll_25s_linear_infinite] motion-reduce:animate-none motion-reduce:will-change-auto">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="font-display font-normal text-[clamp(40px,6vw,80px)] text-[rgba(201,169,110,0.12)] tracking-[-0.04em] px-10 shrink-0"
            >
              {MARQUEE_TEXT}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ 3. HORIZONTAL SCROLL — Collection cards ═══ */}
      <div ref={horizontalRef} className="relative overflow-hidden bg-[var(--color-noir)]">
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">
          {/* Section label */}
          <div className="absolute top-8 left-8 z-2 flex flex-col gap-2">
            <span className="text-[var(--color-champagne-gold)] font-primary text-xs font-medium tracking-[0.15em] uppercase">
              Explore
            </span>
            <span className="text-[var(--color-pearl-cream)] font-display font-normal text-2xl tracking-[-0.04em]">
              All Collections
            </span>
          </div>

          {/* Scrolling track */}
          <div ref={trackRef} className="flex gap-6 px-8 will-change-transform motion-reduce:will-change-auto">
            {/* Spacer for label */}
            <div style={{ width: 200, flexShrink: 0 }} />

            {HORIZONTAL_CARDS.map((col, idx) => (
              <Link
                key={col.title}
                href={col.href}
                className="group shrink-0 w-85 sm:w-95 lg:w-105 flex flex-col no-underline text-inherit cursor-pointer"
              >
                <div className="relative aspect-3/4 rounded-md overflow-hidden bg-[var(--color-obsidian)]">
                  <Image
                    src={col.image}
                    alt={col.title}
                    fill
                    sizes="420px"
                    style={{ objectFit: "cover" }}
                    className="transition-transform duration-[var(--duration-slow)] [transition-timing-function:var(--ease-luxury)] group-hover:scale-[1.06] motion-reduce:transition-none"
                  />
                  <span className="absolute top-4 left-4 font-display font-normal text-3xl text-white/15 tracking-[-0.04em] leading-none pointer-events-none">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="py-4 px-1 flex flex-col gap-1">
                  <span className="text-[var(--color-pearl-cream)] font-display font-normal text-lg tracking-[-0.04em]">
                    {col.title}
                  </span>
                  <span className="text-white/40 font-primary text-sm font-medium tracking-[-0.02em]">
                    {col.subtitle}
                  </span>
                </div>
              </Link>
            ))}

            {/* End spacer */}
            <div style={{ width: 100, flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* ═══ 4. EDITORIAL SPREADS — Alternating text + image ═══ */}
      {EDITORIAL_SECTIONS.map((section, idx) => (
        <section
          key={section.num}
          ref={(el) => {
            spreadRefs.current[idx] = el;
          }}
          className={`flex flex-col min-h-screen overflow-hidden lg:flex-row ${idx % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
          style={{ background: section.bgColor }}
        >
          {/* Text side */}
          <div
            data-spread-text
            className="flex-1 flex flex-col justify-center px-4 py-16 sm:px-6 lg:px-12 gap-6"
          >
            <span
              data-spread-num
              className="font-display font-normal text-[clamp(80px,12vw,160px)] text-[var(--border-subtle)] tracking-[-0.06em] leading-[80%] opacity-0"
              style={{ color: section.textColor }}
            >
              {section.num}
            </span>
            <h2
              data-spread-heading
              className="font-display font-normal text-[clamp(28px,4vw,48px)] tracking-[-0.04em] leading-[105%] opacity-0"
              style={{ color: section.textColor }}
            >
              {section.heading}
            </h2>
            <p
              data-spread-desc
              className="font-primary text-[15px] font-medium tracking-[-0.02em] leading-[170%] max-w-100 opacity-0"
              style={{ color: "var(--text-secondary)" }}
            >
              {section.description}
            </p>
            <Link
              href={section.cta.href}
              data-spread-cta
              className="inline-flex items-center gap-2 font-primary text-xs font-medium tracking-widest uppercase no-underline text-[var(--color-champagne-gold)] opacity-0 transition-opacity duration-[var(--duration-fast)] [transition-timing-function:var(--ease-default)] hover:opacity-70! motion-reduce:transition-none"
            >
              {section.cta.label}
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Image side */}
          <div data-spread-image className="flex-1 relative min-h-100 lg:min-h-auto overflow-hidden">
            <Image
              src={section.image}
              alt={section.heading}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
              className="will-change-transform motion-reduce:will-change-auto"
            />
          </div>
        </section>
      ))}

      {/* ═══ 5. CLOSING MARQUEE ═══ */}
      <div className="overflow-hidden py-10 bg-[var(--bg-primary)] border-t border-b border-[rgba(201,169,110,0.1)]">
        <div className="flex whitespace-nowrap will-change-transform animate-[col-marquee-scroll_25s_linear_infinite] [animation-direction:reverse] motion-reduce:animate-none motion-reduce:will-change-auto">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="font-display font-normal text-[clamp(40px,6vw,80px)] text-[var(--border-light)] tracking-[-0.04em] px-10 shrink-0"
            >
              {MARQUEE_TEXT}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Keyframe animations + reduced motion ─── */}
      <style>{`
        @keyframes col-scroll-pulse {
          0%, 100% { opacity: 0.3; transform: scaleY(0.6); }
          50% { opacity: 1; transform: scaleY(1); }
        }

        @keyframes col-marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
