/* ═══════════════════════════════════════════════════════════
   GET /api/collections
   
   ?slug=summer-reverie → single collection + resolved products
   No params → all collections
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import type { Collection } from "@/src/types/collection";
import type { Product } from "@/src/types/product";

/* ═══ Collection Database ═══ */
const COLLECTIONS: Collection[] = [
  { id: "col-1", slug: "summer-reverie", name: "Summer Reverie", subtitle: "A meditation on warm light", description: "A meditation on warm light and effortless draping. This season, we explored the space between structure and flow — garments that hold their form while moving with yours.", image: "/images/model-intro/model_intro_1.webp", productIds: ["tops-1", "tops-4", "skirts-1", "skirts-4", "bags-4", "jewelry-2"], season: "Summer 2026", bgColor: "var(--color-rose-milk)" },
  { id: "col-2", slug: "golden-craft", name: "Golden Craft", subtitle: "Artisan meets material", description: "Every piece in this collection is a conversation between artisan and material. Hand-finished details, warm metallics, and textures that demand a second look.", image: "/images/model-intro/model_intro_7.webp", productIds: ["jewelry-1", "jewelry-3", "jewelry-4", "jewelry-6", "bags-3", "bags-7"], season: "Summer 2026", bgColor: "var(--color-vanilla)" },
  { id: "col-3", slug: "twilight-edit", name: "Twilight Edit", subtitle: "Between dusk and dawn", description: "For the hours between dusk and dawn. Pieces designed to catch and hold the last light — satin, structured silhouettes, and whispered metallics.", image: "/images/model-intro/model_intro_6.webp", productIds: ["skirts-3", "skirts-5", "tops-6", "tops-2", "bags-2", "jewelry-8"], season: "Summer 2026", bgColor: "var(--color-lavender-cream)" },
  { id: "col-4", slug: "silk-and-satin", name: "Silk & Satin", subtitle: "Tops Collection", description: "The most luxurious fabrics, cut with precision and finished by hand. Each piece is a study in how fabric can transform the way you move and feel.", image: "/images/model-intro/model_intro_2.webp", productIds: ["tops-1", "tops-6", "tops-7", "skirts-1", "skirts-7"], season: "Summer 2026", bgColor: "var(--color-champagne-cream)" },
  { id: "col-5", slug: "resort-bags", name: "Resort Bags", subtitle: "Crafted companions", description: "A curated selection of bags designed for the resort lifestyle. From beach to dinner, each piece carries your essentials with intention and style.", image: "/images/model-intro/model_intro_5.webp", productIds: ["bags-1", "bags-2", "bags-4", "bags-6", "bags-8"], season: "Summer 2026", bgColor: "var(--color-cloud)" },
  { id: "col-6", slug: "lace-and-grace", name: "Lace & Grace", subtitle: "Delicate details", description: "Celebrating the art of lace — from Chantilly to crochet. These pieces honor the centuries-old tradition of lacework with a modern sensibility.", image: "/images/model-intro/model_intro_3.webp", productIds: ["skirts-5", "tops-4", "tops-7", "jewelry-5", "jewelry-2"], season: "Summer 2026", bgColor: "var(--color-sage-cream)" },
  { id: "col-7", slug: "night-out", name: "Night Out", subtitle: "After dark essentials", description: "Everything you need for a night that lingers. Bold silhouettes, luxurious textures, and accessories that catch the light just right.", image: "/images/model-intro/model_intro_4.webp", productIds: ["tops-2", "tops-6", "skirts-3", "bags-3", "bags-7", "jewelry-8"], season: "Summer 2026", bgColor: "var(--color-obsidian)" },
];

/* Fetch all products from products API */
async function getAllProducts(): Promise<Product[]> {
  const mod = await import("../products/route");
  const req = new NextRequest(new URL("http://localhost/api/products"));
  const res = await mod.GET(req);
  const json = await res.json();
  return json.data;
}

/* ═══ Handler ═══ */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (slug) {
    const collection = COLLECTIONS.find((c) => c.slug === slug);
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const allProducts = await getAllProducts();
    const products = collection.productIds
      .map((id) => allProducts.find((p) => p.id === id))
      .filter(Boolean);

    return NextResponse.json({ data: collection, products });
  }

  return NextResponse.json({ data: COLLECTIONS, total: COLLECTIONS.length });
}
