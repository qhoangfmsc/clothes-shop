"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Category } from "@/src/types/category";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  /* GSAP scroll-triggered stagger */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const ctx = gsap.context(() => {
      const cards = grid.children;
      gsap.set(cards, { opacity: 0, y: 40, scale: 0.97 });

      gsap.to(cards, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.12,
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
    <div
      ref={gridRef}
      className="grid grid-cols-2 gap-3 py-8 px-4 sm:grid-cols-3 sm:gap-4 sm:py-10 sm:px-6 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:gap-5 lg:py-12 lg:px-8"
    >
      {categories.map((cat) => {
        const totalItems = cat.subcategories.reduce((sum, s) => sum + s.count, 0);
        return (
          <div key={cat.slug}>
            {/* Square on mobile/tablet, wide landscape on desktop (lg+) —
                so the whole set of categories reads in one glance instead
                of a tall scroll. */}
            <Link href={`/shop/${cat.slug}`} className="group relative aspect-square lg:aspect-video overflow-hidden rounded-md cursor-pointer no-underline text-inherit flex flex-col justify-end">
              {/* Background: real hero image when the admin has set one on this
                  category, otherwise a plain color — never a placeholder banner,
                  so it's obvious whether this card has a real source image. */}
              {cat.heroImage ? (
                <div className="absolute inset-0 z-0">
                  <Image
                    src={cat.heroImage}
                    alt={cat.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{ objectFit: "cover" }}
                    className="transition-transform duration-600 group-hover:scale-[1.06]"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 z-0" style={{ background: "var(--bg-section-3)" }} />
              )}
              <div className="absolute inset-0 z-1 bg-gradient-to-t from-[rgba(10,10,8,0.75)] via-[rgba(10,10,8,0.2)] via-50% to-transparent transition-all duration-300 group-hover:from-[rgba(10,10,8,0.85)] group-hover:via-[rgba(10,10,8,0.3)]" />
              <div className="relative z-2 p-4 flex flex-col gap-1 lg:p-4">
                <span className="text-[var(--color-pearl-cream)] font-display text-lg sm:text-xl font-normal tracking-[-0.04em] leading-none">{cat.title}</span>
                <span className="text-[rgba(255,255,255,0.55)] font-primary text-xs font-medium tracking-[-0.02em] leading-[140%] lg:hidden">{cat.description}</span>
                <span className="text-[var(--color-champagne-gold)] font-primary text-xs font-medium tracking-[0.08em] uppercase mt-1 flex items-center gap-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  {totalItems} pieces
                  <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
