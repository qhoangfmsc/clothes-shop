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
    <div className="subcategory-chips">
      {/* "All" chip */}
      <Link
        href={`/shop/${categorySlug}`}
        className={`subcategory-chip ${!activeSlug ? "subcategory-chip--active" : ""}`}
      >
        All
      </Link>

      {subcategories.map((sub) => (
        <Link
          key={sub.slug}
          href={`/shop/${categorySlug}/${sub.slug}`}
          className={`subcategory-chip ${activeSlug === sub.slug ? "subcategory-chip--active" : ""}`}
        >
          {sub.label}
          <span className="subcategory-chip__count">{sub.count}</span>
        </Link>
      ))}
    </div>
  );
}
