"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Collection } from "@/src/types/collection";
import type { Product } from "@/src/types/product";
import { useQuickAdd } from "@/src/app/_components/QuickAddDrawer";
import { useToast } from "@/src/app/_components/Toast";
import { Heart, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface CollectionDetailClientProps {
  collection: Collection;
  products: Product[];
}

const badgeStyles: Record<string, string> = {
  new: "bg-[rgba(201,169,110,0.9)] text-[var(--text-on-gold)]",
  sale: "bg-[rgba(212,165,165,0.9)] text-[var(--color-pearl-cream)]",
  bestseller: "bg-[rgba(10,10,8,0.85)] text-[var(--color-pearl-cream)]",
};

export default function CollectionDetailClient({
  collection,
  products,
}: CollectionDetailClientProps) {
  const heroRef = useRef<HTMLElement>(null);
  const editorialRef = useRef<HTMLDivElement>(null);
  const shopAllRef = useRef<HTMLDivElement>(null);
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
          <>
            {product.name} saved —{" "}
            <Link href="/wishlist" onClick={(ev) => ev.stopPropagation()}>
              View Wishlist
            </Link>
          </>
        );
      } else {
        toast.info(`${product.name} removed from wishlist`);
      }
    },
    [likedMap, toast]
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
        const info = item.querySelectorAll(
          ".cd-editorial__name, .cd-editorial__price, .cd-editorial__tag"
        );

        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.12 },
            {
              scale: 1,
              duration: 1.2,
              ease: "power2.out",
              scrollTrigger: {
                trigger: item,
                start: "top 80%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }

        gsap.fromTo(
          info,
          { opacity: 0, y: 20 },
          {
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
          }
        );
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
      gsap.fromTo(
        cards,
        { opacity: 0, y: 40 },
        {
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
        }
      );
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
            const productUrl = `/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;
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
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 65vw"
                    style={{ objectFit: "cover" }}
                  />

                  {product.badge && (
                    <span className={`cd-editorial__badge cd-editorial__badge--${product.badge}`}>
                      {product.badge === "new" && "New"}
                      {product.badge === "sale" && "Sale"}
                      {product.badge === "bestseller" && "Best Seller"}
                    </span>
                  )}
                </div>

                <div className="cd-editorial__info">
                  <span className="cd-editorial__tag">
                    {String(idx + 1).padStart(2, "0")} /{" "}
                    {String(editorialProducts.length).padStart(2, "0")}
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
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══ 3. DIVIDER QUOTE ═══ */}
      <section className="cd-quote">
        <blockquote className="cd-quote__text">&ldquo;{collection.description}&rdquo;</blockquote>
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
            const productUrl = `/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;

            return (
              <Link key={product.id} href={productUrl} className="cd-shop-card group">
                <div className="cd-shop-card__image">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                  {product.badge && (
                    <span
                      className={`absolute top-3 left-3 py-1 px-3 rounded-full font-primary text-xs font-medium tracking-[0.08em] uppercase z-2 backdrop-blur-lg ${
                        badgeStyles[product.badge] ?? ""
                      }`}
                    >
                      {product.badge === "new" && "New"}
                      {product.badge === "sale" && "Sale"}
                      {product.badge === "bestseller" && "Best Seller"}
                    </span>
                  )}
                  {/* ── Top-right icons: Wishlist + Bag (stacked) ── */}
                  <div className="absolute bottom-3 right-3 z-3 flex flex-row gap-2 opacity-100 sm:opacity-0 sm:-translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:transition-all sm:duration-300 sm:[&:has(.liked)]:opacity-100 sm:[&:has(.liked)]:translate-y-0">
                    <button
                      type="button"
                      className={`w-9 h-9 rounded-full border-none bg-[rgba(251,248,241,0.88)] backdrop-blur-lg flex items-center justify-center cursor-pointer text-[var(--color-slate)] shadow-[0_2px_8px_rgba(58,49,42,0.1)] transition-all duration-150 active:scale-90 hover:text-[var(--color-dusty-rose)] hover:bg-[rgba(255,255,255,0.95)] ${
                        likedMap[product.id] ? "!text-[var(--color-dusty-rose)] liked" : ""
                      }`}
                      onClick={(e) => handleLike(product, e)}
                      aria-label={likedMap[product.id] ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart size={18} fill={likedMap[product.id] ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full border-none bg-[rgba(251,248,241,0.88)] backdrop-blur-lg flex items-center justify-center cursor-pointer text-[var(--color-slate)] shadow-[0_2px_8px_rgba(58,49,42,0.1)] transition-all duration-150 active:scale-90 hover:text-[var(--accent-primary)] hover:bg-[rgba(255,255,255,0.95)] active:!bg-[var(--accent-primary)] active:!text-[var(--text-on-gold)]"
                      onClick={(e) => handleQuickAdd(product, e)}
                      aria-label="Add to bag"
                    >
                      <ShoppingBag size={16} />
                    </button>
                  </div>
                  {/* Desktop hover overlay */}
                  <div className="cd-shop-card__actions cd-shop-card__actions--desktop">
                    <button
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-full border-none bg-[rgba(251,248,241,0.92)] backdrop-blur-[12px] text-[var(--color-obsidian)] font-primary text-xs font-medium tracking-[0.06em] uppercase cursor-pointer shadow-[0_2px_12px_rgba(58,49,42,0.15)] transition-all duration-150 hover:bg-[var(--accent-primary)] hover:text-[var(--text-on-gold)] hover:scale-[1.03] hover:shadow-[var(--shadow-gold-md)]"
                      type="button"
                      onClick={(e) => handleQuickAdd(product, e)}
                    >
                      <ShoppingBag size={13} />
                      Add to Bag
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
            <ArrowLeft size={14} />
            All Collections
          </Link>
          <div className="cd-cta__divider" />
          <span className="cd-cta__label">Discover More</span>
          <h2 className="cd-cta__heading">Explore All Collections</h2>
          <Link href="/collections" className="cd-cta__button">
            View Collections
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
