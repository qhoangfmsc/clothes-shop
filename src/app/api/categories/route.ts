/* ═══════════════════════════════════════════════════════════
   GET /api/categories
   
   ?slug=tops → single category + uiConfig
   No params → all categories
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import type { Category, CategoryUIConfig } from "@/src/types/category";

/* ═══ Category Database ═══ */
const CATEGORIES: Category[] = [
  {
    slug: "tops", title: "Tops",
    description: "Effortlessly elegant pieces for every silhouette",
    subcategories: [
      { slug: "camisoles", label: "Camisoles", description: "Delicate & feminine", count: 8 },
      { slug: "halter", label: "Halter Tops", description: "Statement necklines", count: 6 },
      { slug: "tank", label: "Tank Tops", description: "Everyday essentials", count: 10 },
      { slug: "off-shoulder", label: "Off-Shoulder", description: "Romantic elegance", count: 5 },
      { slug: "cardigans", label: "Cardigans", description: "Layered warmth", count: 7 },
      { slug: "corset", label: "Corset Tops", description: "Sculpted beauty", count: 4 },
    ],
  },
  {
    slug: "skirts", title: "Skirts",
    description: "Movement & grace in every step",
    subcategories: [
      { slug: "slip", label: "Slip Skirts", description: "Satin & silk", count: 6 },
      { slug: "midi", label: "Midi Skirts", description: "Classic length", count: 8 },
      { slug: "mini", label: "Mini Skirts", description: "Bold & playful", count: 7 },
      { slug: "wrap", label: "Wrap Skirts", description: "Effortless chic", count: 5 },
      { slug: "lace", label: "Lace Skirts", description: "Delicate detail", count: 4 },
    ],
  },
  {
    slug: "bags", title: "Bags",
    description: "Carry your world with intention",
    subcategories: [
      { slug: "hobo", label: "Hobo Bags", description: "Relaxed luxury", count: 5 },
      { slug: "shoulder", label: "Shoulder Bags", description: "Classic carriage", count: 7 },
      { slug: "clutches", label: "Clutches", description: "Evening essentials", count: 6 },
      { slug: "mini", label: "Mini Bags", description: "Petit & precious", count: 8 },
      { slug: "tote", label: "Tote Bags", description: "Spacious style", count: 5 },
    ],
  },
  {
    slug: "jewelry", title: "Jewelry",
    description: "Finishing touches that speak volumes",
    subcategories: [
      { slug: "necklaces", label: "Necklaces", description: "Layered stories", count: 9 },
      { slug: "earrings", label: "Earrings", description: "Frame your face", count: 11 },
      { slug: "rings", label: "Rings", description: "Stacked intention", count: 7 },
      { slug: "bracelets", label: "Bracelets", description: "Wrist poetry", count: 6 },
      { slug: "hair", label: "Hair Accessories", description: "Crown your look", count: 5 },
    ],
  },
];

const UI_CONFIG: Record<string, CategoryUIConfig> = {
  tops: {
    heroImage: "/images/model-intro/model_intro_1.webp",
    moodImage: "/images/mood-bg/wall_sticker_soft_pink_lace.webp",
    tagline: "From sunrise to sunset — draped in intention",
    accentColor: "var(--color-dusty-rose)",
    bgTint: "var(--color-rose-milk)",
  },
  skirts: {
    heroImage: "/images/model-intro/model_intro_3.webp",
    moodImage: "/images/mood-bg/wall_sticker_soft_cream_roses.webp",
    tagline: "The art of flowing form",
    accentColor: "var(--color-sage)",
    bgTint: "var(--color-sage-cream)",
  },
  bags: {
    heroImage: "/images/model-intro/model_intro_5.webp",
    moodImage: "/images/mood-bg/wall_sticker_soft_blue_swirl.webp",
    tagline: "Crafted companions for every journey",
    accentColor: "var(--color-dusty-blue)",
    bgTint: "var(--color-cloud)",
  },
  jewelry: {
    heroImage: "/images/model-intro/model_intro_7.webp",
    moodImage: "/images/mood-bg/wall_sticker_yellow_botanical.webp",
    tagline: "Adornments crafted with soul",
    accentColor: "var(--color-champagne-gold)",
    bgTint: "var(--color-vanilla)",
  },
};

/* ═══ Handler ═══ */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (slug) {
    const category = CATEGORIES.find((c) => c.slug === slug);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ data: category, uiConfig: UI_CONFIG[slug] ?? null });
  }

  return NextResponse.json({ data: CATEGORIES, uiConfigs: UI_CONFIG, total: CATEGORIES.length });
}
