"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Image from "next/image";
import { Link } from "@/src/i18n/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Collection } from "@/src/types/collection";
import type { Product } from "@/src/types/product";
import { useQuickAdd } from "@/src/app/[locale]/_components/QuickAddDrawer";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { Heart, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { hasPublicPrice } from "@/src/lib/product-purchase";
import ProductBagButton from "@/src/app/[locale]/_components/ProductBagButton";
import { PRODUCT_CARD_BADGE_STYLES } from "@/src/lib/product-badge";

gsap.registerPlugin(ScrollTrigger);

interface CollectionDetailClientProps {
  collection: Collection;
  products: Product[];
}

export default function CollectionDetailClient({
  collection,
  products,
}: CollectionDetailClientProps) {
  const t = useTranslations("public.collections.detail");
  const tBadge = useTranslations("common.productBadge");
  const tCommon = useTranslations("common");
  const { fmt, fmtOrNull } = useMoney();
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
          t.rich("saved", {
            name: product.name,
            link: (chunks) => (
              <Link href="/wishlist" onClick={(ev) => ev.stopPropagation()}>
                {chunks}
              </Link>
            ),
          })
        );
      } else {
        toast.info(t("removed", { name: product.name }));
      }
    },
    [likedMap, toast, t]
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
      <section
        ref={heroRef}
        className="cd-hero relative h-screen min-h-[35rem] overflow-hidden flex items-end bg-[var(--color-noir)]"
      >
        <div className="cd-hero__media absolute inset-0">
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            className="will-change-transform motion-reduce:will-change-auto"
          />
        </div>
        <div className="absolute inset-0 z-1 pointer-events-none bg-[linear-gradient(to_top,rgba(10,10,8,0.75)_0%,rgba(10,10,8,0.15)_50%,transparent_100%),linear-gradient(to_right,rgba(10,10,8,0.4)_0%,transparent_60%)]" />

        <div className="relative z-2 px-4 py-8 max-w-[35rem] sm:px-6 sm:py-10 sm:max-w-[37.5rem] lg:px-8 lg:py-12 lg:max-w-[40rem]">
          <span className="cd-hero__season inline-block text-[var(--color-champagne-gold)] [font-family:var(--font-primary)] text-[0.6875rem] tracking-[0.2em] uppercase mb-4 opacity-0 translate-y-2">
            {collection.season}
          </span>
          <h1 className="cd-hero__title [font-family:var(--font-display)] text-[clamp(2.5rem,8vw,5.5rem)] text-[var(--color-pearl-cream)] tracking-[-0.05em] leading-[95%] mb-3 opacity-0 translate-y-5">
            {collection.name}
          </h1>
          <p className="cd-hero__subtitle [font-family:var(--font-display)] text-[clamp(1rem,3vw,1.5rem)] text-[rgba(201,169,110,0.8)] tracking-[-0.02em] leading-[120%] mb-5 opacity-0 translate-y-3">
            {collection.subtitle}
          </p>
          <div className="cd-hero__line w-[3.75rem] h-px bg-[var(--color-champagne-gold)] opacity-40 mb-5 origin-left scale-x-0" />
          <p className="cd-hero__description text-white/55 [font-family:var(--font-primary)] text-[0.9375rem] tracking-[-0.02em] leading-[160%] max-w-[26.25rem] opacity-0 translate-y-3">
            {collection.description}
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-3 flex flex-col items-center gap-2 text-white/30 [font-family:var(--font-primary)] text-[0.6875rem] tracking-[0.12em] uppercase">
          <div className="w-px h-9 bg-[linear-gradient(to_bottom,rgba(201,169,110,0.5),transparent)] animate-[cd-scroll-pulse_1.8s_ease-in-out_infinite] motion-reduce:animate-none" />
          <span>{t("scroll")}</span>
        </div>
      </section>

      {/* ═══ 2. EDITORIAL LOOKBOOK — Asymmetric magazine layout ═══ */}
      <section className="bg-[var(--bg-primary)] pb-4">
        <div className="px-4 pt-16 pb-8 flex flex-col items-center text-center gap-3 sm:px-6 sm:pt-20 sm:pb-10">
          <span className="text-[var(--text-accent)] uppercase text-[0.6875rem] tracking-[0.14em] [font-family:var(--font-primary)]">
            {t("lookbook")}
          </span>
          <h2 className="text-[var(--text-heading)] [font-family:var(--font-display)] text-[clamp(2rem,6vw,3.5rem)] tracking-[-0.04em] leading-none">
            {t("curatedPieces")}
          </h2>
        </div>

        <div ref={editorialRef} className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 sm:gap-6 sm:px-6 lg:gap-8 lg:px-8">
          {editorialProducts.map((product, idx) => {
            const productUrl = `/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;
            /* Alternate: large left, small right, then reversed */
            const isOdd = idx % 2 !== 0;

            return (
              <Link
                key={product.id}
                href={productUrl}
                className={`cd-editorial__item group grid grid-cols-1 gap-6 no-underline text-inherit md:grid-cols-[3fr_2fr] md:gap-8 md:items-center lg:gap-12 ${
                  isOdd ? "md:grid-cols-[2fr_3fr] lg:grid-cols-[minmax(0,32rem)_auto] lg:justify-center" : "lg:grid-cols-[auto_minmax(0,32rem)] lg:justify-center"
                }`}
              >
                <div
                  className={`cd-editorial__img relative aspect-3/4 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] lg:w-[min(calc(min(85dvh,56rem)*0.75),44vw)] ${
                    isOdd ? "md:order-2" : ""
                  }`}
                >
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 45vw"
                    style={{ objectFit: "cover" }}
                    className="transition-transform duration-[800ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none"
                  />

                  {product.badge && (
                    <span
                      className={`absolute top-4 left-4 z-2 py-1 px-3 rounded-full [font-family:var(--font-primary)] text-[0.6875rem] tracking-[0.06em] uppercase ${
                        PRODUCT_CARD_BADGE_STYLES[product.badge] ?? ""
                      }`}
                    >
                      {tBadge(product.badge)}
                    </span>
                  )}
                </div>

                <div
                  className={`flex flex-col gap-3 py-2 md:py-6 ${
                    isOdd ? "md:order-1 md:text-right md:items-end" : ""
                  }`}
                >
                  <span className="cd-editorial__tag text-[var(--text-accent)] [font-family:var(--font-primary)] text-[0.6875rem] tracking-[0.12em] uppercase">
                    {String(idx + 1).padStart(2, "0")} /{" "}
                    {String(editorialProducts.length).padStart(2, "0")}
                  </span>
                  <span className="cd-editorial__name [font-family:var(--font-display)] text-[clamp(1.5rem,4vw,2.25rem)] text-[var(--text-heading)] tracking-[-0.04em] leading-[105%]">
                    {product.name}
                  </span>
                  <p
                    className={`text-[var(--text-secondary)] [font-family:var(--font-primary)] text-[0.9375rem] tracking-[-0.02em] leading-[160%] max-w-[23.75rem] ${
                      isOdd ? "md:ml-auto" : ""
                    }`}
                  >
                    {product.description}
                  </p>
                  <span className="cd-editorial__price [font-family:var(--font-primary)] text-[1.25rem] text-[var(--text-heading)] tracking-[-0.02em] flex items-baseline gap-2">
                    {hasPublicPrice(product.badge) ? fmt(product, "price") : tCommon("priceOnRequest")}
                    {hasPublicPrice(product.badge) && product.originalPriceVnd && (
                      <span className="text-[0.75rem] text-[var(--text-disabled)] line-through">
                        {fmtOrNull(product, "originalPrice")}
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-2 text-[var(--text-accent)] [font-family:var(--font-primary)] text-[0.6875rem] tracking-[0.08em] uppercase transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-default)] group-hover:text-[var(--accent-primary)] motion-reduce:transition-none">
                    {t("viewDetails")}
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══ 3. DIVIDER QUOTE ═══ */}
      <section className="py-20 px-4 flex flex-col items-center text-center gap-5 bg-[var(--bg-section-5)] border-t border-b border-[var(--border-subtle)] sm:px-12">
        <blockquote className="[font-family:var(--font-display)] text-[clamp(1.25rem,4vw,2rem)] text-[var(--text-heading)] tracking-[-0.03em] leading-[140%] max-w-[42.5rem] italic">
          “{collection.description}”
        </blockquote>
        <span className="text-[var(--text-accent)] [font-family:var(--font-primary)] text-[0.6875rem] tracking-[0.12em] uppercase">
          {t("quoteBy", { season: collection.season })}
        </span>
      </section>

      {/* ═══ 4. SHOP ALL — Full product grid ═══ */}
      <section className="bg-[var(--bg-primary)] pb-16">
        <div className="pt-16 px-4 pb-8 flex items-end justify-between gap-4 sm:px-6 lg:pt-20 lg:px-8">
          <div>
            <span className="text-[var(--text-accent)] uppercase text-[0.6875rem] tracking-[0.12em] [font-family:var(--font-primary)]">
              {t("shopCollection")}
            </span>
            <h2 className="text-[var(--text-heading)] [font-family:var(--font-display)] text-[clamp(1.75rem,5vw,3rem)] tracking-[-0.04em] leading-none mt-2">
              {collection.name}
            </h2>
          </div>
          <span className="text-[var(--text-muted)] [font-family:var(--font-primary)] text-[0.6875rem] tracking-[0.06em] uppercase whitespace-nowrap">
            {t("pieces", { count: products.length })}
          </span>
        </div>

        <div
          ref={shopAllRef}
          className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-3 sm:gap-5 sm:px-6 lg:grid-cols-4 lg:gap-6 lg:px-8 xl:grid-cols-5"
        >
          {gridProducts.map((product) => {
            const productUrl = `/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;

            return (
              <Link
                key={product.id}
                href={productUrl}
                className="cd-shop-card group flex flex-col cursor-pointer no-underline text-inherit"
              >
                <div className="relative aspect-2/3 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-base)] [transition-timing-function:var(--ease-default)] group-hover:shadow-[var(--shadow-gold-md)]">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{ objectFit: "cover" }}
                    className="transition-transform duration-[var(--duration-slow)] [transition-timing-function:var(--ease-luxury)] group-hover:scale-105 motion-reduce:transition-none"
                  />
                  {product.badge && (
                    <span
                      className={`absolute top-3 left-3 py-1 px-3 rounded-full font-primary text-xs font-medium tracking-[0.08em] uppercase z-2 backdrop-blur-lg ${
                        PRODUCT_CARD_BADGE_STYLES[product.badge] ?? ""
                      }`}
                    >
                      {tBadge(product.badge)}
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
                      aria-label={likedMap[product.id] ? t("removeFromWishlist") : t("addToWishlist")}
                    >
                      <Heart size={18} fill={likedMap[product.id] ? "currentColor" : "none"} />
                    </button>
                    <ProductBagButton
                      product={product}
                      variant="icon"
                      onAddToBag={(e) => handleQuickAdd(product, e)}
                      className="w-9 h-9 rounded-full border-none bg-[rgba(251,248,241,0.88)] backdrop-blur-lg flex items-center justify-center cursor-pointer text-[var(--color-slate)] shadow-[0_2px_8px_rgba(58,49,42,0.1)] transition-all duration-150 active:scale-90"
                      enabledClassName="hover:text-[var(--accent-primary)] hover:bg-[rgba(255,255,255,0.95)] active:!bg-[var(--accent-primary)] active:!text-[var(--text-on-gold)]"
                    />
                  </div>
                  {/* Desktop hover overlay */}
                  <div className="hidden sm:flex absolute inset-x-0 bottom-0 justify-center p-3 pt-10 z-2 bg-[linear-gradient(to_top,rgba(10,10,8,0.4)_0%,transparent_100%)] rounded-b-[var(--radius-lg)] sm:opacity-0 sm:translate-y-2 sm:transition-all sm:duration-[var(--duration-base)] sm:[transition-timing-function:var(--ease-default)] sm:group-hover:opacity-100 sm:group-hover:translate-y-0">
                    <ProductBagButton
                      product={product}
                      variant="text"
                      iconSize={13}
                      onAddToBag={(e) => handleQuickAdd(product, e)}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-full border-none bg-[rgba(251,248,241,0.92)] backdrop-blur-[12px] text-[var(--color-obsidian)] font-primary text-xs font-medium tracking-[0.06em] uppercase cursor-pointer shadow-[0_2px_12px_rgba(58,49,42,0.15)] transition-all duration-150"
                      enabledClassName="hover:bg-[var(--accent-primary)] hover:text-[var(--text-on-gold)] hover:scale-[1.03] hover:shadow-[var(--shadow-gold-md)]"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 pt-3 px-1">
                  <span className="text-[var(--text-primary)] [font-family:var(--font-primary)] text-[0.8125rem] tracking-[-0.02em] leading-[140%] transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-default)] group-hover:text-[var(--text-heading)] motion-reduce:transition-none">
                    {product.name}
                  </span>
                  <span className="text-[var(--text-secondary)] [font-family:var(--font-primary)] text-[0.75rem] tracking-[-0.02em]">
                    {hasPublicPrice(product.badge) ? fmt(product, "price") : tCommon("priceOnRequest")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══ 5. BACK TO COLLECTIONS CTA ═══ */}
      <section className="bg-[var(--bg-section-3)] border-t border-[var(--border-subtle)] py-16 px-4 flex items-center justify-center sm:py-20 sm:px-6">
        <div className="text-center flex flex-col items-center gap-4">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-[var(--text-muted)] [font-family:var(--font-primary)] text-[0.6875rem] tracking-[0.06em] uppercase no-underline transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-default)] hover:text-[var(--accent-primary)] motion-reduce:transition-none"
          >
            <ArrowLeft size={14} />
            {t("allCollections")}
          </Link>
          <div className="w-10 h-px bg-[var(--border-subtle)] my-2" />
          <span className="text-[var(--text-accent)] uppercase text-[0.6875rem] tracking-[0.12em] [font-family:var(--font-primary)]">
            {t("discoverMore")}
          </span>
          <h2 className="text-[var(--text-heading)] [font-family:var(--font-display)] text-[clamp(1.75rem,5vw,3rem)] tracking-[-0.04em] leading-none">
            {t("exploreAll")}
          </h2>
          <Link
            href="/collections"
            className="inline-flex items-center justify-center gap-2 py-4 px-8 rounded-full bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)] [font-family:var(--font-primary)] text-[0.75rem] tracking-[0.06em] uppercase no-underline cursor-pointer border-none transition-all duration-[var(--duration-fast)] [transition-timing-function:var(--ease-default)] hover:bg-[var(--color-charcoal)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] motion-reduce:transition-none"
          >
            {t("viewCollections")}
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ─── Local keyframes ─── */}
      <style>{`
        @keyframes cd-scroll-pulse {
          0%, 100% { opacity: 0.3; transform: scaleY(0.6); }
          50% { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
