"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import type { Product } from "@/src/types/product";
import { CirclePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const t = useTranslations("public.shop.components.productGrid");
  const gridRef = useRef<HTMLDivElement>(null);

  /* Ids already revealed: cards that stay in the grid are never animated again, only the ones that were added */
  const shownIdsRef = useRef<string[]>([]);

  /* Stagger reveal of the newly added cards as they scroll into view. An IntersectionObserver reads the real
     position of each card when it is looked at, so a layout that shifts after load (images, fonts) can never
     leave a card hidden. */
  useEffect(() => {
    const grid = gridRef.current;
    const ids = products.map((p) => p.id);
    const previous = shownIdsRef.current;
    shownIdsRef.current = ids;
    if (!grid || ids.length === 0 || typeof IntersectionObserver === "undefined") return;

    /* "Xem thêm" appends: the cards before the first new id are the old ones. Any other change is a new list. */
    let kept = 0;
    while (kept < previous.length && kept < ids.length && previous[kept] === ids[kept]) kept += 1;
    const cards = Array.from(grid.children).slice(kept) as HTMLElement[];
    if (cards.length === 0) return;

    gsap.set(cards, { opacity: 0, y: 32 });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
        if (visible.length === 0) return;
        visible.forEach((card) => observer.unobserve(card));
        gsap.to(visible, { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: "power2.out", clearProps: "transform,opacity" });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    cards.forEach((card) => observer.observe(card));

    return () => {
      observer.disconnect();
      /* A card still hidden or half-way must not stay that way */
      gsap.killTweensOf(cards);
      gsap.set(cards, { clearProps: "transform,opacity" });
    };
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4">
        <CirclePlus size={48} className="text-[var(--text-disabled)]" />
        <h3 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">{t("comingSoon")}</h3>
        <p className="font-primary text-[0.9375rem] text-[var(--text-muted)] tracking-[-0.02em] max-w-80 leading-[150%]">
          {t("comingSoonDescription")}
        </p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-4 px-4 pb-16 sm:grid-cols-3 sm:gap-5 sm:px-6 sm:pb-16 lg:grid-cols-4 lg:gap-6 lg:px-8 lg:pb-20 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
