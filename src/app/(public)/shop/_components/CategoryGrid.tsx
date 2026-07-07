"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Category } from "@/src/types/category";

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
    <div ref={gridRef} className="category-grid">
      {categories.map((cat) => {
        const totalItems = cat.subcategories.reduce((sum, s) => sum + s.count, 0);
        const heroImage = heroImages[cat.slug];
        return (
          <div key={cat.slug}>
            <Link href={`/shop/${cat.slug}`} className="category-card">
              <div className="category-card__image">
                <Image
                  src={heroImage ?? "/images/model-intro/model_intro_1.webp"}
                  alt={cat.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="category-card__overlay" />
              <div className="category-card__content">
                <span className="category-card__title">{cat.title}</span>
                <span className="category-card__subtitle">{cat.description}</span>
                <span className="category-card__count">
                  {totalItems} pieces
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 8H13M13 8L9 4M13 8L9 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
