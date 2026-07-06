"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Product } from "../../shop/_data/shop-data";

gsap.registerPlugin(ScrollTrigger);

/* ── Spotlight data (featured "hero" products) ── */
const SPOTLIGHTS = [
  {
    tag: "Editor's Pick",
    name: "Silk Camisole Rosé",
    desc: "Our signature camisole, reimagined in a blush-rosé silk that catches the light like liquid gold. Cut on the bias for a fluid drape that moves with you — this is the piece that started it all.",
    price: "$185",
    image: "/images/model-intro/model_intro_1.webp",
    href: "/shop/tops",
    bgColor: "var(--bg-section-2)",
  },
  {
    tag: "Most Wanted",
    name: "Chain Necklace Gold",
    desc: "Hand-finished 18k gold vermeil links, each one individually polished. Designed to be layered or worn alone as a quiet statement of intention.",
    price: "$120",
    image: "/images/model-intro/model_intro_7.webp",
    href: "/shop/jewelry",
    bgColor: "var(--bg-section-5)",
  },
];

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
  const heroRef = useRef<HTMLElement>(null);
  const spotlightRefs = useRef<(HTMLElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleQuickAdd = useCallback((productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddedIds((prev) => new Set(prev).add(productId));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }, 2000);
  }, []);

  /* ── Hero animation ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });

      /* Image reveal */
      tl.from(hero.querySelector(".ni-hero__image img"), {
        scale: 1.15,
        duration: 0.5,
        ease: "power2.out",
      });

      /* Date label */
      tl.to(
        hero.querySelector(".ni-hero__date"),
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        "-=0.6"
      );

      /* Title lines — stagger up */
      tl.to(
        hero.querySelectorAll(".ni-hero__title-line"),
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
        hero.querySelector(".ni-hero__watermark"),
        { opacity: 0.5, duration: 0.8, ease: "power2.out" },
        "-=0.3"
      );

      /* Subtitle */
      tl.to(
        hero.querySelector(".ni-hero__subtitle"),
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        "-=0.4"
      );

      /* CTA */
      tl.to(
        hero.querySelector(".ni-hero__cta"),
        { opacity: 1, duration: 0.4, ease: "power2.out" },
        "-=0.2"
      );

      /* Hero image parallax */
      gsap.to(hero.querySelector(".ni-hero__image img"), {
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
        const img = section.querySelector(".ni-spotlight__image img");
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
          ".ni-spotlight__tag, .ni-spotlight__name, .ni-spotlight__desc, .ni-spotlight__price, .ni-spotlight__cta"
        );
        gsap.set(textEls, { opacity: 0, y: 24 });
        gsap.to(textEls, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section.querySelector(".ni-spotlight__info"),
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  /* ── Product grid stagger reveal ── */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const ctx = gsap.context(() => {
      const cards = grid.querySelectorAll(".ni-product-card");
      gsap.set(cards, { opacity: 0, y: 40 });
      gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: grid,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
    }, grid);

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* ═══ 1. SPLIT-SCREEN HERO ═══ */}
      <section ref={heroRef} className="ni-hero">
        {/* Text side */}
        <div className="ni-hero__text">
          <div className="ni-hero__date">
            <span className="ni-hero__date-dot" />
            Live Now — Summer 2026
          </div>

          <h1 className="ni-hero__title">
            <span className="ni-hero__title-line">New</span>
            <span className="ni-hero__title-line">
              <em>Arrivals</em>
            </span>
          </h1>

          <p className="ni-hero__subtitle">
            Be the first to discover what&apos;s next. Fresh drops, new silhouettes, and pieces
            designed for those who move first.
          </p>

          <a href="#new-drops" className="ni-hero__cta">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3V13M8 13L4 9M8 13L12 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Explore Drops
          </a>

          <span className="ni-hero__watermark">N</span>
        </div>

        {/* Image side */}
        <div className="ni-hero__image">
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
      <div className="ni-ticker">
        <div className="ni-ticker__track">
          {[...Array(2)].map((_, setIdx) =>
            TICKER_ITEMS.map((item, idx) => (
              <span key={`${setIdx}-${idx}`} className="ni-ticker__item">
                {item}
                <span className="ni-ticker__sep" />
              </span>
            ))
          )}
        </div>
      </div>

      {/* ═══ 3. SPOTLIGHT #1 ═══ */}
      <section
        ref={(el) => {
          spotlightRefs.current[0] = el;
        }}
        className="ni-spotlight"
        style={{ background: SPOTLIGHTS[0].bgColor }}
      >
        <div className="ni-spotlight__image">
          <Image
            src={SPOTLIGHTS[0].image}
            alt={SPOTLIGHTS[0].name}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="ni-spotlight__info">
          <span className="ni-spotlight__tag">{SPOTLIGHTS[0].tag}</span>
          <h2 className="ni-spotlight__name">{SPOTLIGHTS[0].name}</h2>
          <p className="ni-spotlight__desc">{SPOTLIGHTS[0].desc}</p>
          <span className="ni-spotlight__price">{SPOTLIGHTS[0].price}</span>
          <Link href={SPOTLIGHTS[0].href} className="ni-spotlight__cta">
            Shop Now
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
      </section>

      {/* ═══ 4. PRODUCT GRID ═══ */}
      <div id="new-drops" className="ni-grid-section" style={{ background: "var(--bg-primary)" }}>
        <div className="ni-grid-section__header">
          <div>
            <span className="ni-grid-section__label">Just Dropped</span>
            <h2 className="ni-grid-section__title">All New Pieces</h2>
          </div>
          <span className="ni-grid-section__count">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </span>
        </div>

        {/* Custom grid with stagger animation */}
        <div ref={gridRef} className="product-grid">
          {products.map((product) => {
            const isAdded = addedIds.has(product.id);
            const productUrl = `/shop/${product.category}/${product.subcategory}/${product.id}`;

            return (
              <Link key={product.id} href={productUrl} className="ni-product-card product-card">
                <div className="product-card__image-wrap">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                  <span className="product-card__badge product-card__badge--new">New</span>

                  {/* Wishlist + Cart overlay */}
                  <div className="product-card__actions">
                    <button
                      className={`product-card__quick-add ${isAdded ? "product-card__quick-add--added" : ""}`}
                      type="button"
                      onClick={(e) => handleQuickAdd(product.id, e)}
                    >
                      {isAdded ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3 8L6.5 11.5L13 4.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Added
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" />
                            <path
                              d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Add to Bag
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="product-card__info">
                  <span className="product-card__name">{product.name}</span>
                  <div className="product-card__price-row">
                    <span className="product-card__price">${product.price.toLocaleString()}</span>
                    {product.originalPrice && (
                      <span className="product-card__price product-card__price--original">
                        ${product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══ 5. SPOTLIGHT #2 ═══ */}
      <section
        ref={(el) => {
          spotlightRefs.current[1] = el;
        }}
        className="ni-spotlight ni-spotlight--reverse"
        style={{ background: SPOTLIGHTS[1].bgColor }}
      >
        <div className="ni-spotlight__image">
          <Image
            src={SPOTLIGHTS[1].image}
            alt={SPOTLIGHTS[1].name}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="ni-spotlight__info">
          <span className="ni-spotlight__tag">{SPOTLIGHTS[1].tag}</span>
          <h2 className="ni-spotlight__name">{SPOTLIGHTS[1].name}</h2>
          <p className="ni-spotlight__desc">{SPOTLIGHTS[1].desc}</p>
          <span className="ni-spotlight__price">{SPOTLIGHTS[1].price}</span>
          <Link href={SPOTLIGHTS[1].href} className="ni-spotlight__cta">
            Shop Now
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
      </section>

      {/* ═══ 6. NEWSLETTER CTA ═══ */}
      <section className="ni-newsletter">
        <div className="ni-newsletter__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 6L12 13L2 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="ni-newsletter__title">Never Miss a Drop</h2>
        <p className="ni-newsletter__desc">
          Be the first to know when new pieces land. Join our inner circle for early access and
          exclusive previews.
        </p>
        <form className="ni-newsletter__form" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            className="ni-newsletter__input"
            placeholder="your@email.com"
            aria-label="Email address"
          />
          <button type="submit" className="ni-newsletter__btn">
            Join
          </button>
        </form>
      </section>
    </>
  );
}
