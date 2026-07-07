"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Collection } from "@/src/types/collection";

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

const EDITORIAL_SECTIONS = [
  {
    num: "01",
    heading: "Summer Reverie",
    description:
      "A meditation on warm light and effortless draping. This season, we explored the space between structure and flow — garments that hold their form while moving with yours.",
    image: "/images/model-intro/model_intro_1.webp",
    moodImage: "/images/mood-bg/wall_sticker_soft_pink_lace.webp",
    bgColor: "var(--color-rose-milk)",
    textColor: "var(--text-heading)",
    cta: { label: "Explore Collection", href: "/collections/summer-reverie" },
  },
  {
    num: "02",
    heading: "Golden Craft",
    description:
      "Every piece in this collection is a conversation between artisan and material. Hand-finished details, warm metallics, and textures that demand a second look.",
    image: "/images/model-intro/model_intro_7.webp",
    moodImage: "/images/mood-bg/wall_sticker_yellow_botanical.webp",
    bgColor: "var(--color-vanilla)",
    textColor: "var(--text-heading)",
    cta: { label: "Explore Collection", href: "/collections/golden-craft" },
  },
  {
    num: "03",
    heading: "Twilight Edit",
    description:
      "For the hours between dusk and dawn. Pieces designed to catch and hold the last light — satin, structured silhouettes, and whispered metallics.",
    image: "/images/model-intro/model_intro_6.webp",
    moodImage: "/images/mood-bg/wall_sticker_lavender_damask.webp",
    bgColor: "var(--color-lavender-cream)",
    textColor: "var(--text-heading)",
    cta: { label: "Explore Collection", href: "/collections/twilight-edit" },
  },
];

const MARQUEE_TEXT = "Ori Baebi ◆ Collections ◆ Summer 2026 ◆ Crafted with Intention ◆ ";

export default function CollectionsClient({ collections }: CollectionsClientProps) {
  const HORIZONTAL_CARDS = buildHorizontalCards(collections);
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
      tl.from(hero.querySelector(".col-hero__media img"), {
        scale: 1.2,
        duration: 1.4,
        ease: "power2.out",
      });

      /* Season label */
      tl.to(
        hero.querySelector(".col-hero__season"),
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.8"
      );

      /* Title lines — stagger reveal */
      tl.to(
        hero.querySelectorAll(".col-hero__title-line"),
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
        hero.querySelector(".col-hero__subtitle"),
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.3"
      );

      /* Scroll hint */
      tl.to(hero.querySelector(".col-hero__scroll-hint"), { opacity: 1, duration: 0.5 }, "-=0.1");

      /* Hero parallax on scroll */
      gsap.to(hero.querySelector(".col-hero__media img"), {
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
        const img = section.querySelector(".col-spread__image img");
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
          ".col-spread__num, .col-spread__heading, .col-spread__desc, .col-spread__cta"
        );
        gsap.to(textEls, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section.querySelector(".col-spread__text"),
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
      <section ref={heroRef} className="col-hero">
        <div className="col-hero__media">
          <Image
            src="/images/model-intro/model_intro_6.webp"
            alt="Collections — Summer 2026"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="col-hero__vignette" />

        <div className="col-hero__content">
          <span className="col-hero__season">Summer 2026</span>
          <h1 className="col-hero__title">
            <span className="col-hero__title-line">The</span>
            <span className="col-hero__title-line">Collections</span>
          </h1>
          <p className="col-hero__subtitle">
            Stories told through fabric, form, and intention. Each collection a chapter in the Ori
            Baebi narrative.
          </p>
        </div>

        <div className="col-hero__scroll-hint">
          <div className="col-hero__scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ═══ 2. MARQUEE — Running text strip ═══ */}
      <div className="col-marquee">
        <div className="col-marquee__inner">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="col-marquee__text">
              {MARQUEE_TEXT}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ 3. HORIZONTAL SCROLL — Collection cards ═══ */}
      <div ref={horizontalRef} className="col-horizontal">
        <div className="col-horizontal__sticky">
          {/* Section label */}
          <div className="col-horizontal__label">
            <span className="col-horizontal__label-tag">Explore</span>
            <span className="col-horizontal__label-title">All Collections</span>
          </div>

          {/* Scrolling track */}
          <div ref={trackRef} className="col-horizontal__track">
            {/* Spacer for label */}
            <div style={{ width: 200, flexShrink: 0 }} />

            {HORIZONTAL_CARDS.map((col, idx) => (
              <Link key={col.title} href={col.href} className="col-horizontal__card">
                <div className="col-horizontal__card-img">
                  <Image
                    src={col.image}
                    alt={col.title}
                    fill
                    sizes="420px"
                    style={{ objectFit: "cover" }}
                  />
                  <span className="col-horizontal__card-num">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="col-horizontal__card-info">
                  <span className="col-horizontal__card-title">{col.title}</span>
                  <span className="col-horizontal__card-sub">{col.subtitle}</span>
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
          className={`col-spread ${idx % 2 === 1 ? "col-spread--reverse" : ""}`}
          style={{ background: section.bgColor }}
        >
          {/* Text side */}
          <div className="col-spread__text">
            <span className="col-spread__num" style={{ color: section.textColor }}>
              {section.num}
            </span>
            <h2 className="col-spread__heading" style={{ color: section.textColor }}>
              {section.heading}
            </h2>
            <p className="col-spread__desc" style={{ color: "var(--text-secondary)" }}>
              {section.description}
            </p>
            <Link href={section.cta.href} className="col-spread__cta">
              {section.cta.label}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8H13M13 8L9 4M13 8L9 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {/* Image side */}
          <div className="col-spread__image">
            <Image
              src={section.image}
              alt={section.heading}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        </section>
      ))}

      {/* ═══ 5. CLOSING MARQUEE ═══ */}
      <div className="col-marquee" style={{ background: "var(--bg-primary)" }}>
        <div className="col-marquee__inner" style={{ animationDirection: "reverse" }}>
          {[...Array(4)].map((_, i) => (
            <span key={i} className="col-marquee__text" style={{ color: "var(--border-light)" }}>
              {MARQUEE_TEXT}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
