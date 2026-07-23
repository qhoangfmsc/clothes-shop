"use client";

import Link from "next/link";
import type { SubCategory } from "@/src/types/category";

interface SubcategoryChipsProps {
  categorySlug: string;
  subcategories: SubCategory[];
  activeSlug?: string;
}

export default function SubcategoryChips({
  categorySlug,
  subcategories,
  activeSlug,
}: SubcategoryChipsProps) {
  return (
    <div className="flex gap-2 px-4 pb-6 overflow-x-auto sm:flex-wrap sm:px-6 sm:pb-8 lg:px-8 lg:pb-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* "All" chip */}
      <Link
        href={`/shop/${categorySlug}`}
        className={`shrink-0 inline-flex items-center gap-1 py-2 px-4 rounded-full border border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] font-primary text-sm font-medium tracking-[-0.02em] no-underline cursor-pointer transition-all duration-150 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] ${
          !activeSlug ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-gold)] hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)] hover:text-[var(--text-on-gold)]" : ""
        }`}
      >
        All
      </Link>

      {subcategories.map((sub) => (
        <Link
          key={sub.slug}
          href={`/shop/${categorySlug}/${sub.slug}`}
          className={`shrink-0 inline-flex items-center gap-1 py-2 px-4 rounded-full border border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] font-primary text-sm font-medium tracking-[-0.02em] no-underline cursor-pointer transition-all duration-150 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] ${
            activeSlug === sub.slug ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-gold)] hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)] hover:text-[var(--text-on-gold)]" : ""
          }`}
        >
          {sub.label}
          <span className="opacity-50 text-xs">{sub.count}</span>
        </Link>
      ))}
    </div>
  );
}
