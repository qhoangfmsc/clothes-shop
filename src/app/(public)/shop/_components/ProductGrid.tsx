"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Product } from "@/src/types/product";
import { CirclePlus } from "lucide-react";
import ProductCard from "./ProductCard";

gsap.registerPlugin(ScrollTrigger);

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  /* GSAP scroll-triggered stagger reveal */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || products.length === 0) return;

    const ctx = gsap.context(() => {
      const cards = grid.children;
      gsap.set(cards, { opacity: 0, y: 32 });

      gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.06,
        ease: "power2.out",
        scrollTrigger: {
          trigger: grid,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    }, grid);

    return () => ctx.revert();
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4">
        <CirclePlus size={48} className="text-[var(--text-disabled)]" />
        <h3 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">Coming Soon</h3>
        <p className="font-primary text-[15px] text-[var(--text-muted)] tracking-[-0.02em] max-w-80 leading-[150%]">
          New pieces are being curated for this collection. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-4 px-4 pb-16 sm:grid-cols-3 sm:gap-5 sm:px-6 sm:pb-16 lg:grid-cols-4 lg:gap-6 lg:px-8 lg:pb-20">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
