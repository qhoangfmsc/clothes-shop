"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Product } from "@/src/types/product";
import { useQuickAdd } from "@/src/app/_components/QuickAddDrawer";
import { useToast } from "@/src/app/_components/Toast";
import { Heart, ShoppingBag, ArrowDown, ArrowRight, Mail } from "lucide-react";

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
  const gridRef = useRef<HTMLDivElement>(null);
  const { openQuickAdd } = useQuickAdd();
  const { toast } = useToast();
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const handleQuickAdd = useCallback(
    (product: Product, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openQuickAdd(product);
    },
    [openQuickAdd]
  );

  const handleLike = useCallback(
    (product: Product, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !likedMap[product.id];
      setLikedMap((prev) => ({ ...prev, [product.id]: next }));
      if (next) {
        toast.info(
          <>{product.name} saved — <Link href="/wishlist" onClick={(ev) => ev.stopPropagation()}>View Wishlist</Link></>
        );
      } else {
        toast.info(`${product.name} removed from wishlist`);
      }
    },
    [likedMap, toast]
  );

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
            <ArrowDown size={14} />
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
      {SPOTLIGHTS[0] && (
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
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

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
            const productUrl = `/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;

            return (
              <div key={product.id} className="product-card-wrap ni-product-card">
                <Link href={productUrl} className="product-card">
                  <div className="product-card__image-wrap">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      style={{ objectFit: "cover" }}
                    />
                    <span className="product-card__badge product-card__badge--new">New</span>

                    {/* ── Top-right icons: Wishlist + Bag (stacked) ── */}
                    <div className="product-card__icons">
                      <button
                        type="button"
                        className={`product-card__icon-btn product-card__icon-btn--wish ${likedMap[product.id] ? "product-card__icon-btn--liked" : ""}`}
                        onClick={(e) => handleLike(product, e)}
                        aria-label={likedMap[product.id] ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <Heart size={18} fill={likedMap[product.id] ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        className="product-card__icon-btn product-card__icon-btn--bag"
                        onClick={(e) => handleQuickAdd(product, e)}
                        aria-label="Add to bag"
                      >
                        <ShoppingBag size={16} />
                      </button>
                    </div>

                    {/* Desktop hover overlay */}
                    <div className="product-card__actions product-card__actions--desktop">
                      <button
                        className="product-card__quick-add"
                        type="button"
                        onClick={(e) => handleQuickAdd(product, e)}
                      >
                        <ShoppingBag size={13} />
                        Add to Bag
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
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ 5. SPOTLIGHT #2 ═══ */}
      {SPOTLIGHTS[1] && (
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
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* ═══ 6. NEWSLETTER CTA ═══ */}
      <section className="ni-newsletter">
        <div className="ni-newsletter__icon">
          <Mail size={20} />
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
