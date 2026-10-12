"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/src/i18n/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Collection } from "@/src/types/collection";
import type { BannerItem } from "@/src/types/site-config";
import BannerFade from "@/src/app/[locale]/_components/BannerFade";
import Carousel from "@/src/app/[locale]/_components/Carousel";
import { CarouselDots } from "@/src/app/[locale]/_components/CarouselControls";
import { useBannerRotation } from "@/src/hooks/use-banner-rotation";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

gsap.registerPlugin(ScrollTrigger);

/** Touch carousel auto-advance interval. */
const AUTOPLAY_MS = 2500;

interface CollectionsClientProps {
  collections: Collection[];
  /** Hero background banner(s). 1 = static, 2+ = auto-rotating crossfade. */
  heroBanners: BannerItem[];
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

function buildEditorialSections(collections: Collection[], ctaLabel: string) {
  return collections.slice(0, 3).map((col, idx) => ({
    num: String(idx + 1).padStart(2, "0"),
    heading: col.name,
    description: col.description,
    image: col.image,
    bgColor: EDITORIAL_BG_TINTS[idx % EDITORIAL_BG_TINTS.length],
    textColor: "var(--text-heading)",
    cta: { label: ctaLabel, href: `/collections/${col.slug}` },
  }));
}

type HorizontalCard = ReturnType<typeof buildHorizontalCards>[number];

function SectionLabel({
  exploreLabel,
  allCollections,
  className = "",
}: {
  exploreLabel: string;
  allCollections: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-[var(--color-champagne-gold)] font-primary text-xs font-medium tracking-[0.15em] uppercase">
        {exploreLabel}
      </span>
      <span className="text-[var(--color-pearl-cream)] font-display font-normal text-2xl tracking-[-0.04em]">
        {allCollections}
      </span>
    </div>
  );
}

function CollectionCard({
  card,
  index,
  className = "",
}: {
  card: HorizontalCard;
  index: number;
  className?: string;
}) {
  return (
    <Link
      href={card.href}
      className={`group shrink-0 flex flex-col no-underline text-inherit cursor-pointer ${className}`}
    >
      <div className="relative aspect-3/4 rounded-md overflow-hidden bg-[var(--color-obsidian)]">
        <Image
          src={card.image}
          alt={card.title}
          fill
          sizes="420px"
          style={{ objectFit: "cover" }}
          className="transition-transform duration-[var(--duration-slow)] [transition-timing-function:var(--ease-luxury)] group-hover:scale-[1.06] motion-reduce:transition-none"
        />
        <span className="absolute top-4 left-4 font-display font-normal text-3xl text-[var(--color-noir)]/70 tracking-[-0.04em] leading-none pointer-events-none">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="py-4 px-1 flex flex-col gap-1">
        <span className="text-[var(--color-pearl-cream)] font-display font-normal text-lg tracking-[-0.04em]">
          {card.title}
        </span>
        <span className="text-[var(--color-pearl-cream)]/40 font-primary text-sm font-medium tracking-[-0.02em]">
          {card.subtitle}
        </span>
      </div>
    </Link>
  );
}

export default function CollectionsClient({ collections, heroBanners }: CollectionsClientProps) {
  const t = useTranslations("public.collections.list");
  const MARQUEE_TEXT = t("marquee");
  const HORIZONTAL_CARDS = buildHorizontalCards(collections);
  const EDITORIAL_SECTIONS = buildEditorialSections(collections, t("exploreCollection"));
  const horizontalRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const spreadRefs = useRef<(HTMLElement | null)[]>([]);
  /* Auto-rotates the hero background when there is more than one banner */
  const { ref: heroRef, index: heroIdx, goTo: goToHero } = useBannerRotation<HTMLElement>(heroBanners);

  /* ── Hero reveal animation ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });

      /* Image scale-in — targets the stable wrapper, not the (possibly
         rotating) image inside it, so crossfading never disturbs this
         tween or the scroll parallax below. */
      tl.from(hero.querySelector("[data-hero-media]"), {
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
      gsap.to(hero.querySelector("[data-hero-media]"), {
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
  }, [heroRef]);

  /* ── Horizontal scroll ──
     Desktop (wide + fine pointer): vertical scroll drives the track (pinned + scrubbed).
     Phones / touch devices: the track is a native horizontal carousel with snap points
     (see the `carousel:` variant in globals.css), so no pin/scrub is registered. */
  useEffect(() => {
    const section = horizontalRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px) and (pointer: fine)", () => {
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
    });

    return () => mm.revert();
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
        {/* Background: a champagne base color always shows underneath, and
            the image (when available) sits at slightly reduced opacity on
            top — so the brand color and the photo are both visible together.
            No image yet → the base color alone. */}
        <div
          data-hero-media
          className="absolute inset-0 z-0"
          style={{ background: "var(--bg-section-3)" }}
        >
          <BannerFade
            banners={heroBanners}
            index={heroIdx}
            alt={t("heroAlt")}
            sizes="100vw"
            imageClassName="will-change-transform motion-reduce:will-change-auto"
          />
        </div>
        <div className="absolute inset-0 z-1 pointer-events-none bg-[linear-gradient(to_top,rgba(10,10,8,0.7)_0%,transparent_50%),linear-gradient(to_right,rgba(10,10,8,0.4)_0%,transparent_60%)]" />
        <CarouselDots
          count={heroBanners.length}
          index={heroIdx}
          onSelect={goToHero}
          className="absolute bottom-3 inset-x-0 z-[3]"
        />

        <div className="relative z-2 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <span
            data-hero-season
            className="inline-block text-[var(--color-champagne-gold)] font-primary text-xs font-medium tracking-[0.2em] uppercase mb-5 opacity-0"
          >
            {t("heroSeason")}
          </span>
          <h1 className="font-display font-normal text-[clamp(48px,10vw,120px)] text-[var(--color-pearl-cream)] tracking-tight leading-[1] mb-5">
            <div className="overflow-hidden">
              <span data-hero-title-line className="block opacity-0 translate-y-full">
                {t("heroTitleLine1")}
              </span>
            </div>
            <div className="overflow-hidden">
              <span data-hero-title-line className="block opacity-0 translate-y-full">
                {t("heroTitleLine2")}
              </span>
            </div>
          </h1>
          <p
            data-hero-subtitle
            className="text-white/55 font-primary text-[15px] font-medium tracking-[-0.02em] leading-[160%] max-w-90 opacity-0"
          >
            {t("heroSubtitle")}
          </p>
        </div>

        <div
          data-hero-scroll-hint
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-3 flex flex-col items-center gap-2 text-white/35 font-primary text-xs tracking-[0.12em] uppercase opacity-0"
        >
          <div className="w-px h-10 bg-linear-to-b from-[rgba(201,169,110,0.6)] to-transparent animate-[col-scroll-pulse_1.8s_ease-in-out_infinite] motion-reduce:animate-none" />
          <span>{t("scroll")}</span>
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

      {/* ═══ 3. COLLECTION CARDS ═══
          Desktop (wide + fine pointer): vertical scroll drives a pinned horizontal track (GSAP).
          Phones / touch devices: a swipeable, auto-advancing Carousel (no pin / scrub). */}
      <div ref={horizontalRef} className="relative overflow-hidden bg-[var(--color-noir)]">
        <div className="sticky top-0 h-screen overflow-hidden flex items-center carousel:hidden">
          <SectionLabel
            exploreLabel={t("exploreLabel")}
            allCollections={t("allCollections")}
            className="absolute top-8 left-8 z-2"
          />
          <div ref={trackRef} className="flex gap-6 px-8 w-max will-change-transform motion-reduce:will-change-auto">
            {/* Spacer for the label */}
            <div className="w-75 shrink-0" />
            {HORIZONTAL_CARDS.map((col, idx) => (
              <CollectionCard key={col.title} card={col} index={idx} className="w-95 lg:w-105" />
            ))}
            {/* End spacer */}
            <div className="w-25 shrink-0" />
          </div>
        </div>

        <div className="hidden carousel:flex flex-col gap-6 py-12 px-4 sm:px-8">
          <SectionLabel exploreLabel={t("exploreLabel")} allCollections={t("allCollections")} />
          <Carousel
            ariaLabel={t("carouselAria")}
            slidesPerView={{ base: 1.25, sm: 2.5, lg: 3 }}
            gap={{ base: 4, sm: 6 }}
            autoplay={AUTOPLAY_MS}
            dotsTone="onImage"
          >
            {HORIZONTAL_CARDS.map((col, idx) => (
              <CollectionCard key={col.title} card={col} index={idx} />
            ))}
          </Carousel>
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
          <div
            data-spread-image
            className="flex-1 relative min-h-100 lg:min-h-auto overflow-hidden"
          >
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
