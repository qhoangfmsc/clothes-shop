/* ═══════════════════════════════════════════════════════════
   GET /api/collections
   
   ?slug=summer-reverie → single collection + resolved products
   No params → all collections
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS } from "./data";
import { PRODUCTS } from "../products/data";

/* ═══ Handler ═══ */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (slug) {
    const collection = COLLECTIONS.find((c) => c.slug === slug);
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const products = collection.productIds
      .map((id) => PRODUCTS.find((p) => p.id === id))
      .filter(Boolean);

    return NextResponse.json({ data: collection, products });
  }

  return NextResponse.json({ data: COLLECTIONS, total: COLLECTIONS.length });
}
