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
  heroImages: Record<string, string>;
}

export default function CategoryGrid({ categories, heroImages }: CategoryGridProps) {
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
    <div ref={gridRef} className="grid grid-cols-1 gap-4 py-8 px-4 sm:grid-cols-2 sm:gap-5 sm:py-10 sm:px-6 lg:gap-6 lg:py-12 lg:px-8">
      {categories.map((cat) => {
        const totalItems = cat.subcategories.reduce((sum, s) => sum + s.count, 0);
        const heroImage = heroImages[cat.slug];
        return (
          <div key={cat.slug}>
            <Link href={`/shop/${cat.slug}`} className="group relative aspect-[3/4] overflow-hidden rounded-md cursor-pointer no-underline text-inherit flex flex-col justify-end">
              <div className="absolute inset-0 z-0">
                <Image
                  src={heroImage ?? "/images/model-intro/model_intro_1.webp"}
                  alt={cat.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                  className="transition-transform duration-600 group-hover:scale-[1.06]"
                />
              </div>
              <div className="absolute inset-0 z-1 bg-gradient-to-t from-[rgba(10,10,8,0.75)] via-[rgba(10,10,8,0.2)] via-50% to-transparent transition-all duration-300 group-hover:from-[rgba(10,10,8,0.85)] group-hover:via-[rgba(10,10,8,0.3)]" />
              <div className="relative z-2 p-6 flex flex-col gap-2">
                <span className="text-[var(--color-pearl-cream)] font-display text-2xl font-normal tracking-[-0.04em] leading-none">{cat.title}</span>
                <span className="text-[rgba(255,255,255,0.55)] font-primary text-xs font-medium tracking-[-0.02em] leading-[140%]">{cat.description}</span>
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
