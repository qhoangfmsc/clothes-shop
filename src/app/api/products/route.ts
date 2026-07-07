/* ═══════════════════════════════════════════════════════════
   GET /api/products
   
   Query params:
     ?category=tops
     ?category=tops&subcategory=halter
     ?badge=new
     ?sort=price_asc | price_desc | newest
     ?limit=10
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { PRODUCTS } from "./data";

/* ═══ Handler ═══ */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const badge = searchParams.get("badge");
  const sort = searchParams.get("sort");
  const limit = searchParams.get("limit");

  let result = PRODUCTS.filter((p) => p.status === "active");

  if (category) {
    result = result.filter((p) => p.category === category);
    if (subcategory) {
      result = result.filter((p) => p.subcategory === subcategory);
    }
  }

  if (badge) {
    result = result.filter((p) => p.badge === badge);
  }

  if (sort) {
    switch (sort) {
      case "price_asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
  }

  if (limit) {
    const n = parseInt(limit, 10);
    if (!isNaN(n) && n > 0) result = result.slice(0, n);
  }

  return NextResponse.json({ data: result, total: result.length });
}
