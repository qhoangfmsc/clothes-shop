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
      <div className="shop-empty">
        <CirclePlus className="shop-empty__icon" size={48} />
        <h3 className="shop-empty__title">Coming Soon</h3>
        <p className="shop-empty__text">
          New pieces are being curated for this collection. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
