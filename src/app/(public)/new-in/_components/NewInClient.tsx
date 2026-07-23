"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Product } from "@/src/types/product";
import { ArrowDown, ArrowRight, Mail } from "lucide-react";
import ShopProductsClient from "../../shop/_components/ShopProductsClient";

gsap.registerPlugin(ScrollTrigger);

/* ── Build spotlight data from real products ── */
const SPOTLIGHT_LABELS = ["Editor's Pick", "Most Wanted"];
const SPOTLIGHT_BGS = ["var(--bg-section-2)", "var(--bg-section-5)"];

function buildSpotlights(products: Product[]) {
  return products.slice(0, 2).map((p, idx) => ({
    tag: SPOTLIGHT_LABELS[idx] ?? "Featured",
    name: p.name,
    desc: p.description,
    price: `$${p.price.toLocaleString()}`,
    image: p.images[0],
    href: `/shop/${p.category?.slug ?? ""}/${p.subcategory?.slug ?? ""}/${p.id}`,
    bgColor: SPOTLIGHT_BGS[idx] ?? "var(--bg-section-2)",
  }));
}

const TICKER_ITEMS = [
  "New Drop",
  "Free Shipping on Orders $150+",
  "Summer 2026",
  "Limited Edition",
  "Handcrafted",
  "New Drop",
  "Free Shipping on Orders $150+",
  "Summer 2026",
  "Limited Edition",
  "Handcrafted",
];

interface NewInClientProps {
  products: Product[];
}

export default function NewInClient({ products }: NewInClientProps) {
  const SPOTLIGHTS = buildSpotlights(products);
  const heroRef = useRef<HTMLElement>(null);
  const spotlightRefs = useRef<(HTMLElement | null)[]>([]);

  /* ── Hero animation ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });

      /* Image reveal */
      tl.from(hero.querySelector("[data-ni-hero-image] img"), {
        scale: 1.15,
        duration: 0.5,
        ease: "power2.out",
      });

      /* Date label */
      tl.to(
        hero.querySelector("[data-ni-hero-date]"),
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        "-=0.6"
      );

      /* Title lines — stagger up */
      tl.to(
        hero.querySelectorAll("[data-ni-hero-title-line]"),
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
        },
        "-=0.3"
      );

      /* Watermark number */
      tl.to(
        hero.querySelector("[data-ni-hero-watermark]"),
        { opacity: 0.5, duration: 0.8, ease: "power2.out" },
        "-=0.3"
      );

      /* Subtitle */
      tl.to(
        hero.querySelector("[data-ni-hero-subtitle]"),
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        "-=0.4"
      );

      /* CTA */
      tl.to(
        hero.querySelector("[data-ni-hero-cta]"),
        { opacity: 1, duration: 0.4, ease: "power2.out" },
        "-=0.2"
      );

      /* Hero image parallax */
      gsap.to(hero.querySelector("[data-ni-hero-image] img"), {
        y: "15%",
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

  /* ── Spotlight section reveals ── */
  useEffect(() => {
    const refs = spotlightRefs.current.filter(Boolean);
    if (refs.length === 0) return;

    const ctx = gsap.context(() => {
      refs.forEach((section) => {
        if (!section) return;

        /* Parallax image */
        const img = section.querySelector("[data-ni-spotlight-image] img");
        if (img) {
          gsap.fromTo(
            img,
            { y: "-8%" },
            {
              y: "8%",
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
          "[data-ni-spotlight-tag], [data-ni-spotlight-name], [data-ni-spotlight-desc], [data-ni-spotlight-price], [data-ni-spotlight-cta]"
        );
        gsap.set(textEls, { opacity: 0, y: 24 });
        gsap.to(textEls, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section.querySelector("[data-ni-spotlight-info]"),
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  /* ── Product grid stagger reveal — removed (now handled by ShopProductsClient) ── */

  return (
    <>
      {/* ═══ 1. SPLIT-SCREEN HERO ═══ */}
      <section ref={heroRef} className="flex flex-col lg:flex-row min-h-screen bg-[var(--bg-primary)]">
        {/* Text side */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 pt-[120px] pb-12 sm:pb-16 lg:py-0 gap-6 relative overflow-hidden">
          <div className="font-primary text-xs font-normal tracking-[0.2em] uppercase text-[var(--color-champagne-gold)] flex items-center gap-3 opacity-0" data-ni-hero-date>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-champagne-gold)] motion-safe:animate-[ni-pulse_2s_ease-in-out_infinite]" />
            Live Now — Summer 2026
          </div>

          <h1 className="font-display text-[clamp(52px,10vw,100px)] font-light text-[var(--text-heading)] tracking-[-0.05em] leading-[90%] overflow-hidden">
            <span className="block opacity-0 translate-y-full" data-ni-hero-title-line>New</span>
            <span className="block opacity-0 translate-y-full" data-ni-hero-title-line>
              <em className="not-italic text-[var(--color-champagne-gold)]">Arrivals</em>
            </span>
          </h1>

          <p className="font-primary text-base font-normal text-[var(--text-muted)] tracking-[-0.02em] leading-[160%] max-w-[380px] opacity-0" data-ni-hero-subtitle>
            Be the first to discover what&apos;s next. Fresh drops, new silhouettes, and pieces
            designed for those who move first.
          </p>

          <a
            href="#new-drops"
            className="inline-flex items-center gap-2 py-4 px-8 rounded-full border-none bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)] font-primary text-sm font-normal tracking-[0.06em] uppercase no-underline cursor-pointer w-fit opacity-0 transition-all duration-150 hover:bg-[var(--color-charcoal)] hover:-translate-y-0.5"
            data-ni-hero-cta
          >
            <ArrowDown size={14} />
            Explore Drops
          </a>

          <span
            className="absolute -right-5 lg:-right-10 -bottom-[30px] lg:bottom-5 font-display text-[clamp(120px,25vw,280px)] font-light text-[var(--border-subtle)] tracking-[-0.06em] leading-[80%] opacity-0 pointer-events-none select-none"
            data-ni-hero-watermark
          >
            N
          </span>
        </div>

        {/* Image side */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-auto overflow-hidden" data-ni-hero-image>
          <Image
            src="/images/model-intro/model_intro_4.webp"
            alt="New Arrivals — Summer 2026"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      </section>

      {/* ═══ 2. TICKER STRIP ═══ */}
      <div className="overflow-hidden py-4 bg-[var(--color-obsidian)]">
        <div className="flex whitespace-nowrap motion-safe:animate-[ni-ticker-scroll_18s_linear_infinite]">
          {[...Array(2)].map((_, setIdx) =>
            TICKER_ITEMS.map((item, idx) => (
              <span key={`${setIdx}-${idx}`} className="inline-flex items-center gap-4 px-6 flex-shrink-0 font-primary text-sm font-normal tracking-[0.12em] uppercase text-[var(--color-pearl-cream)]">
                {item}
                <span className="w-1 h-1 rounded-full bg-[var(--color-champagne-gold)] flex-shrink-0" />
              </span>
            ))
          )}
        </div>
      </div>

      {/* ═══ 3. SPOTLIGHT #1 ═══ */}
      {SPOTLIGHTS[0] && (
        <section
          ref={(el) => {
            spotlightRefs.current[0] = el;
          }}
          className="flex flex-col lg:flex-row min-h-[80vh] overflow-hidden"
          style={{ background: SPOTLIGHTS[0].bgColor }}
        >
          <div className="flex-[1.2] relative min-h-[400px] overflow-hidden" data-ni-spotlight-image>
            <Image
              src={SPOTLIGHTS[0].image}
              alt={SPOTLIGHTS[0].name}
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-16 gap-5" data-ni-spotlight-info>
            <span className="font-primary text-xs font-normal tracking-[0.15em] uppercase text-[var(--color-champagne-gold)] opacity-0" data-ni-spotlight-tag>{SPOTLIGHTS[0].tag}</span>
            <h2 className="font-display text-[clamp(28px,5vw,48px)] font-light text-[var(--text-heading)] tracking-[-0.04em] leading-[105%] opacity-0" data-ni-spotlight-name>{SPOTLIGHTS[0].name}</h2>
            <p className="font-primary text-base font-normal text-[var(--text-secondary)] tracking-[-0.02em] leading-[170%] max-w-[400px] opacity-0" data-ni-spotlight-desc>{SPOTLIGHTS[0].desc}</p>
            <span className="font-primary text-xl font-normal text-[var(--text-heading)] tracking-[-0.04em] opacity-0" data-ni-spotlight-price>{SPOTLIGHTS[0].price}</span>
            <Link
              href={SPOTLIGHTS[0].href}
              className="inline-flex items-center gap-2 py-4 px-8 rounded-full border-[1.5px] border-[var(--color-obsidian)] bg-transparent text-[var(--color-obsidian)] font-primary text-sm font-normal tracking-[0.06em] uppercase no-underline w-fit cursor-pointer transition-all duration-150 hover:bg-[var(--color-obsidian)] hover:text-[var(--color-pearl-cream)] hover:-translate-y-0.5 opacity-0"
              data-ni-spotlight-cta
            >
              Shop Now
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ 4. PRODUCT GRID with Filter + Sort + Load More ═══ */}
      <div id="new-drops" className="py-16 sm:py-20 lg:py-20" style={{ background: "var(--bg-primary)" }}>
        <ShopProductsClient
          products={products}
          heading={
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-4 px-4 sm:px-6 lg:px-8">
              <div>
                <span className="font-primary text-xs font-normal tracking-[0.12em] uppercase text-[var(--text-accent)]">Just Dropped</span>
                <h2 className="font-display text-[clamp(28px,5vw,44px)] font-light text-[var(--text-heading)] tracking-[-0.04em] leading-[100%]">All New Pieces</h2>
              </div>
            </div>
          }
        />
      </div>

      {/* ═══ 5. SPOTLIGHT #2 ═══ */}
      {SPOTLIGHTS[1] && (
        <section
          ref={(el) => {
            spotlightRefs.current[1] = el;
          }}
          className="flex flex-col lg:flex-row-reverse min-h-[80vh] overflow-hidden"
          style={{ background: SPOTLIGHTS[1].bgColor }}
        >
          <div className="flex-[1.2] relative min-h-[400px] overflow-hidden" data-ni-spotlight-image>
            <Image
              src={SPOTLIGHTS[1].image}
              alt={SPOTLIGHTS[1].name}
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-16 gap-5" data-ni-spotlight-info>
            <span className="font-primary text-xs font-normal tracking-[0.15em] uppercase text-[var(--color-champagne-gold)] opacity-0" data-ni-spotlight-tag>{SPOTLIGHTS[1].tag}</span>
            <h2 className="font-display text-[clamp(28px,5vw,48px)] font-light text-[var(--text-heading)] tracking-[-0.04em] leading-[105%] opacity-0" data-ni-spotlight-name>{SPOTLIGHTS[1].name}</h2>
            <p className="font-primary text-base font-normal text-[var(--text-secondary)] tracking-[-0.02em] leading-[170%] max-w-[400px] opacity-0" data-ni-spotlight-desc>{SPOTLIGHTS[1].desc}</p>
            <span className="font-primary text-xl font-normal text-[var(--text-heading)] tracking-[-0.04em] opacity-0" data-ni-spotlight-price>{SPOTLIGHTS[1].price}</span>
            <Link
              href={SPOTLIGHTS[1].href}
              className="inline-flex items-center gap-2 py-4 px-8 rounded-full border-[1.5px] border-[var(--color-obsidian)] bg-transparent text-[var(--color-obsidian)] font-primary text-sm font-normal tracking-[0.06em] uppercase no-underline w-fit cursor-pointer transition-all duration-150 hover:bg-[var(--color-obsidian)] hover:text-[var(--color-pearl-cream)] hover:-translate-y-0.5 opacity-0"
              data-ni-spotlight-cta
            >
              Shop Now
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ 6. NEWSLETTER CTA ═══ */}
      <section className="flex flex-col items-center text-center py-20 px-4 gap-6 bg-[var(--color-obsidian)]">
        <div className="w-12 h-12 rounded-full border border-[rgba(201,169,110,0.3)] flex items-center justify-center text-[var(--color-champagne-gold)]">
          <Mail size={20} />
        </div>
        <h2 className="font-display text-[clamp(24px,4vw,40px)] font-light text-[var(--color-pearl-cream)] tracking-[-0.04em] leading-[105%]">Never Miss a Drop</h2>
        <p className="font-primary text-base font-normal text-[rgba(255,255,255,0.5)] tracking-[-0.02em] leading-[160%] max-w-[400px]">
          Be the first to know when new pieces land. Join our inner circle for early access and
          exclusive previews.
        </p>
        <form className="flex gap-2 w-full max-w-[400px]" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            className="flex-1 py-3 px-5 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] text-[var(--color-pearl-cream)] font-primary text-sm font-normal tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[rgba(255,255,255,0.3)] focus:border-[var(--color-champagne-gold)]"
            placeholder="your@email.com"
            aria-label="Email address"
          />
          <button type="submit" className="py-3 px-6 rounded-full border-none bg-[var(--color-champagne-gold)] text-[var(--text-on-gold)] font-primary text-xs font-normal tracking-[0.08em] uppercase cursor-pointer transition-all duration-150 hover:bg-[var(--accent-hover)] hover:scale-[1.03]">
            Join
          </button>
        </form>
      </section>
    </>
  );
}
