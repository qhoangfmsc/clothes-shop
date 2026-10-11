"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/src/i18n/navigation";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Collection } from "@/src/types/collection";
import type { BannerItem } from "@/src/types/site-config";
import ResponsiveBannerImage from "@/src/app/[locale]/_components/ResponsiveBannerImage";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

gsap.registerPlugin(ScrollTrigger);

const HERO_ROTATE_MS = 5000;
const CAROUSEL_ADVANCE_MS = 2500;
/** How long auto-advance stays paused after the visitor touches / scrolls the carousel. */
const CAROUSEL_RESUME_MS = 3000;
/** Must match the `carousel:` variant in globals.css. */
const CAROUSEL_MEDIA_QUERY = "(max-width: 767.98px), not all and (pointer: fine)";

interface CollectionsClientProps {
  collections: Collection[];
  /** Hero background banner(s). 1 = static, 2+ = auto-rotating crossfade. */
  heroBanners: BannerItem[];
}

/** Scroll offsets (scrollLeft) at which each carousel card sits snapped to the start edge. */
function getCardOffsets(scroller: HTMLElement, track: HTMLElement): number[] {
  const scrollerLeft = scroller.getBoundingClientRect().left;
  const snapInset = parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
  const maxScroll = scroller.scrollWidth - scroller.clientWidth;
  return Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-card]")).map((card) =>
    Math.min(
      Math.max(
        card.getBoundingClientRect().left - scrollerLeft + scroller.scrollLeft - snapInset,
        0
      ),
      maxScroll
    )
  );
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

export default function CollectionsClient({ collections, heroBanners }: CollectionsClientProps) {
  const t = useTranslations("public.collections.list");
  const MARQUEE_TEXT = t("marquee");
  const HORIZONTAL_CARDS = buildHorizontalCards(collections);
  const EDITORIAL_SECTIONS = buildEditorialSections(collections, t("exploreCollection"));
  const heroRef = useRef<HTMLElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselPausedUntilRef = useRef(0);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const spreadRefs = useRef<(HTMLElement | null)[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);

  /* Auto-rotate hero background when there's more than one banner */
  useEffect(() => {
    setHeroIdx(0);
    if (heroBanners.length <= 1) return;
    const timer = setInterval(
      () => setHeroIdx((p) => (p + 1) % heroBanners.length),
      HERO_ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [heroBanners]);

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
  }, []);

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

  const pauseCarousel = useCallback(() => {
    carouselPausedUntilRef.current = Date.now() + CAROUSEL_RESUME_MS;
  }, []);

  const goToCard = useCallback(
    (idx: number) => {
      const scroller = carouselRef.current;
      const track = trackRef.current;
      if (!scroller || !track) return;
      pauseCarousel();
      const left = getCardOffsets(scroller, track)[idx];
      if (left !== undefined) scroller.scrollTo({ left, behavior: "smooth" });
    },
    [pauseCarousel]
  );

  /* ── Carousel position — drives the dot indicator (phones / touch only) ── */
  useEffect(() => {
    const scroller = carouselRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    let frame = 0;
    const sync = () => {
      frame = 0;
      const offsets = getCardOffsets(scroller, track);
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      if (offsets.length === 0) return;

      // Pinned to the end → last card, even when its snap offset can't be reached
      if (maxScroll > 0 && scroller.scrollLeft >= maxScroll - 2) {
        setCarouselIdx(offsets.length - 1);
        return;
      }
      let nearest = 0;
      offsets.forEach((offset, i) => {
        if (
          Math.abs(offset - scroller.scrollLeft) < Math.abs(offsets[nearest] - scroller.scrollLeft)
        ) {
          nearest = i;
        }
      });
      setCarouselIdx(nearest);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };

    sync();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [collections.length]);

  /* ── Carousel auto-advance (phones / touch only) ──
     Steps to the next card every few seconds and loops back to the first. Pauses while
     the visitor touches, hovers, scrolls or taps a dot (resumes after a short idle), while
     the section is off-screen or the tab is hidden, and never runs with reduced motion. */
  useEffect(() => {
    const scroller = carouselRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    const carouselMq = window.matchMedia(CAROUSEL_MEDIA_QUERY);
    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    let hovering = false;
    let inView = false;

    const advance = () => {
      if (!carouselMq.matches || reducedMotionMq.matches) return;
      if (!inView || hovering || document.hidden) return;
      if (Date.now() < carouselPausedUntilRef.current) return;

      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      if (scroller.scrollLeft >= maxScroll - 2) {
        scroller.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      const next = getCardOffsets(scroller, track).find(
        (offset) => offset > scroller.scrollLeft + 8
      );
      if (next !== undefined) scroller.scrollTo({ left: next, behavior: "smooth" });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0.5 }
    );
    observer.observe(scroller);

    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
      pauseCarousel();
    };

    scroller.addEventListener("pointerdown", pauseCarousel, { passive: true });
    scroller.addEventListener("touchstart", pauseCarousel, { passive: true });
    scroller.addEventListener("wheel", pauseCarousel, { passive: true });
    scroller.addEventListener("pointerenter", onEnter);
    scroller.addEventListener("pointerleave", onLeave);

    const timer = setInterval(advance, CAROUSEL_ADVANCE_MS);

    return () => {
      clearInterval(timer);
      observer.disconnect();
      scroller.removeEventListener("pointerdown", pauseCarousel);
      scroller.removeEventListener("touchstart", pauseCarousel);
      scroller.removeEventListener("wheel", pauseCarousel);
      scroller.removeEventListener("pointerenter", onEnter);
      scroller.removeEventListener("pointerleave", onLeave);
    };
  }, [pauseCarousel]);

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
          {heroBanners.length > 0 && (
            <AnimatePresence>
              <motion.div
                key={heroIdx}
                initial={{ opacity: heroBanners.length > 1 ? 0 : 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <ResponsiveBannerImage
                  banner={heroBanners[heroIdx]}
                  alt={t("heroAlt")}
                  fill
                  priority
                  sizes="100vw"
                  style={{ objectFit: "cover", opacity: 0.85 }}
                  className="will-change-transform motion-reduce:will-change-auto"
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        <div className="absolute inset-0 z-1 pointer-events-none bg-[linear-gradient(to_top,rgba(10,10,8,0.7)_0%,transparent_50%),linear-gradient(to_right,rgba(10,10,8,0.4)_0%,transparent_60%)]" />

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

      {/* ═══ 3. HORIZONTAL SCROLL — Collection cards ═══ */}
      <div ref={horizontalRef} className="relative overflow-hidden bg-[var(--color-noir)]">
        <div className="sticky top-0 h-screen overflow-hidden flex items-center carousel:static carousel:h-auto carousel:flex-col carousel:items-stretch carousel:gap-6 carousel:py-12">
          {/* Section label */}
          <div className="absolute top-8 left-8 z-2 flex flex-col gap-2 carousel:static carousel:px-4 sm:carousel:px-8">
            <span className="text-[var(--color-champagne-gold)] font-primary text-xs font-medium tracking-[0.15em] uppercase">
              {t("exploreLabel")}
            </span>
            <span className="text-[var(--color-pearl-cream)] font-display font-normal text-2xl tracking-[-0.04em]">
              {t("allCollections")}
            </span>
          </div>

          {/* Scrolling track — scroll-snap scroller on touch devices */}
          <div
            ref={carouselRef}
            className="w-full carousel:overflow-x-auto carousel:overscroll-x-contain carousel:snap-x carousel:snap-mandatory carousel:scroll-px-4 sm:carousel:scroll-px-8 carousel:[scrollbar-width:none] carousel:[&::-webkit-scrollbar]:hidden"
          >
            <div
              ref={trackRef}
              className="flex gap-6 px-8 w-max will-change-transform motion-reduce:will-change-auto carousel:will-change-auto carousel:px-4 sm:carousel:px-8"
            >
              {/* Spacer for label (desktop only — the label is inline on touch) */}
              <div className="w-75 shrink-0 carousel:hidden" />

              {HORIZONTAL_CARDS.map((col, idx) => (
                <Link
                  key={col.title}
                  href={col.href}
                  data-carousel-card
                  className="group shrink-0 snap-start w-[78vw] max-w-85 sm:w-95 sm:max-w-none lg:w-105 flex flex-col no-underline text-inherit cursor-pointer"
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
                    <span className="absolute top-4 left-4 font-display font-normal text-3xl text-black/70 tracking-[-0.04em] leading-none pointer-events-none">
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
              <div className="w-25 shrink-0 carousel:w-1" />
            </div>
          </div>

          {/* Position dots — touch / small screens only; tap one to jump to that card */}
          {HORIZONTAL_CARDS.length > 1 && (
            <div className="hidden carousel:flex justify-center items-center">
              {HORIZONTAL_CARDS.map((col, idx) => (
                <button
                  key={col.title}
                  type="button"
                  onClick={() => goToCard(idx)}
                  aria-label={t("carouselDot", { number: idx + 1, total: HORIZONTAL_CARDS.length })}
                  aria-current={idx === carouselIdx}
                  className="group flex items-center justify-center h-8 px-1 cursor-pointer"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                      idx === carouselIdx
                        ? "w-6 bg-[var(--color-champagne-gold)]"
                        : "w-1.5 bg-white/25 group-hover:bg-white/50"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
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
