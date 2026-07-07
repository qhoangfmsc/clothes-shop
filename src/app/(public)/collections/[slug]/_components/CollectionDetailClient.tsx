"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Collection } from "@/src/types/collection";
import type { Product } from "@/src/types/product";
import { useToast } from "@/src/app/_components/Toast";

gsap.registerPlugin(ScrollTrigger);

interface CollectionDetailClientProps {
  collection: Collection;
  products: Product[];
}

export default function CollectionDetailClient({
  collection,
  products,
}: CollectionDetailClientProps) {
  const heroRef = useRef<HTMLElement>(null);
  const editorialRef = useRef<HTMLDivElement>(null);
  const shopAllRef = useRef<HTMLDivElement>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleQuickAdd = useCallback(
    (product: Product, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (addedIds.has(product.id)) return;
      setAddedIds((prev) => new Set(prev).add(product.id));
      toast.success(`${product.name} added to your bag`);
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }, 2200);
    },
    [addedIds, toast]
  );

  /* ── Hero reveal ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });

      tl.from(hero.querySelector(".cd-hero__media img"), {
        scale: 1.15,
        duration: 1.2,
        ease: "power2.out",
      });

      tl.to(
        hero.querySelector(".cd-hero__season"),
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        "-=0.7"
      );

      tl.to(
        hero.querySelector(".cd-hero__title"),
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
        "-=0.4"
      );

      tl.to(
        hero.querySelector(".cd-hero__subtitle"),
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        "-=0.3"
      );

      tl.to(
        hero.querySelector(".cd-hero__line"),
        { scaleX: 1, duration: 0.8, ease: "power2.inOut" },
        "-=0.3"
      );

      tl.to(
        hero.querySelector(".cd-hero__description"),
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        "-=0.4"
      );

      gsap.to(hero.querySelector(".cd-hero__media img"), {
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

  /* ── Editorial: staggered reveal ── */
  useEffect(() => {
    const editorial = editorialRef.current;
    if (!editorial) return;

    const ctx = gsap.context(() => {
      const items = editorial.querySelectorAll(".cd-editorial__item");
      items.forEach((item) => {
        const img = item.querySelector(".cd-editorial__img img");
        const info = item.querySelectorAll(".cd-editorial__name, .cd-editorial__price, .cd-editorial__tag");

        if (img) {
          gsap.fromTo(img, { scale: 1.12 }, {
            scale: 1,
            duration: 1.2,
            ease: "power2.out",
            scrollTrigger: {
              trigger: item,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          });
        }

        gsap.fromTo(info, { opacity: 0, y: 20 }, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: item,
            start: "top 70%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, editorial);

    return () => ctx.revert();
  }, [products]);

  /* ── Shop All grid stagger ── */
  useEffect(() => {
    const grid = shopAllRef.current;
    if (!grid) return;

    const ctx = gsap.context(() => {
      const cards = grid.querySelectorAll(".cd-shop-card");
      gsap.fromTo(cards, { opacity: 0, y: 40 }, {
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
  }, [products]);

  /* Split products: first 3 for editorial, rest for grid */
  const editorialProducts = products.slice(0, Math.min(3, products.length));
  const gridProducts = products;

  return (
    <>
      {/* ═══ 1. HERO — Split-screen cinematic ═══ */}
      <section ref={heroRef} className="cd-hero">
        <div className="cd-hero__media">
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="cd-hero__vignette" />

        <div className="cd-hero__content">
          <span className="cd-hero__season">{collection.season}</span>
          <h1 className="cd-hero__title">{collection.name}</h1>
          <p className="cd-hero__subtitle">{collection.subtitle}</p>
          <div className="cd-hero__line" />
          <p className="cd-hero__description">{collection.description}</p>
        </div>

        <div className="cd-hero__scroll-hint">
          <div className="cd-hero__scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ═══ 2. EDITORIAL LOOKBOOK — Asymmetric magazine layout ═══ */}
      <section className="cd-editorial-section">
        <div className="cd-editorial-section__header">
          <span className="cd-editorial-section__label">The Lookbook</span>
          <h2 className="cd-editorial-section__title">Curated Pieces</h2>
        </div>

        <div ref={editorialRef} className="cd-editorial">
          {editorialProducts.map((product, idx) => {
            const productUrl = `/shop/${product.category}/${product.subcategory}/${product.id}`;
            /* Alternate: large left, small right, then reversed */
            const isOdd = idx % 2 !== 0;

            return (
              <Link
                key={product.id}
                href={productUrl}
                className={`cd-editorial__item ${isOdd ? "cd-editorial__item--reverse" : ""}`}
              >
                <div className="cd-editorial__img">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 65vw"
                    style={{ objectFit: "cover" }}
                  />

                  {product.badge && (
                    <span className={`cd-editorial__badge cd-editorial__badge--${product.badge}`}>
                      {product.badge === "new" && "New"}
                      {product.badge === "sale" && "Sale"}
                      {product.badge === "bestseller" && "Best"}
                    </span>
                  )}
                </div>

                <div className="cd-editorial__info">
                  <span className="cd-editorial__tag">
                    {String(idx + 1).padStart(2, "0")} / {String(editorialProducts.length).padStart(2, "0")}
                  </span>
                  <span className="cd-editorial__name">{product.name}</span>
                  <p className="cd-editorial__desc">{product.description}</p>
                  <span className="cd-editorial__price">
                    ${product.price.toLocaleString()}
                    {product.originalPrice && (
                      <span className="cd-editorial__price--original">
                        ${product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </span>
                  <span className="cd-editorial__cta">
                    View Details
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══ 3. DIVIDER QUOTE ═══ */}
      <section className="cd-quote">
        <blockquote className="cd-quote__text">
          &ldquo;{collection.description}&rdquo;
        </blockquote>
        <span className="cd-quote__attr">— Ori Baebi, {collection.season}</span>
      </section>

      {/* ═══ 4. SHOP ALL — Full product grid ═══ */}
      <section className="cd-shop-section">
        <div className="cd-shop-section__header">
          <div>
            <span className="cd-shop-section__label">Shop the Collection</span>
            <h2 className="cd-shop-section__title">{collection.name}</h2>
          </div>
          <span className="cd-shop-section__count">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </span>
        </div>

        <div ref={shopAllRef} className="cd-shop-grid">
          {gridProducts.map((product) => {
            const isAdded = addedIds.has(product.id);
            const productUrl = `/shop/${product.category}/${product.subcategory}/${product.id}`;

            return (
              <Link key={product.id} href={productUrl} className="cd-shop-card">
                <div className="cd-shop-card__image">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                  {product.badge && (
                    <span className={`product-card__badge product-card__badge--${product.badge}`}>
                      {product.badge === "new" && "New"}
                      {product.badge === "sale" && "Sale"}
                      {product.badge === "bestseller" && "Best"}
                    </span>
                  )}
                  <div className="cd-shop-card__actions">
                    <button
                      className={`product-card__quick-add ${isAdded ? "product-card__quick-add--added" : ""}`}
                      type="button"
                      onClick={(e) => handleQuickAdd(product, e)}
                    >
                      {isAdded ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Added
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Add to Bag
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="cd-shop-card__info">
                  <span className="cd-shop-card__name">{product.name}</span>
                  <span className="cd-shop-card__price">${product.price.toLocaleString()}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══ 5. BACK TO COLLECTIONS CTA ═══ */}
      <section className="cd-cta">
        <div className="cd-cta__inner">
          <Link href="/collections" className="cd-cta__back">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M3 8L7 4M3 8L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All Collections
          </Link>
          <div className="cd-cta__divider" />
          <span className="cd-cta__label">Discover More</span>
          <h2 className="cd-cta__heading">Explore All Collections</h2>
          <Link href="/collections" className="cd-cta__button">
            View Collections
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
