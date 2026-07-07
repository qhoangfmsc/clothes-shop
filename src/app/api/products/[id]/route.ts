/* ═══════════════════════════════════════════════════════════
   GET /api/products/[id]
   
   Returns a single product by ID + related products (same category).
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/src/types/product";

/* Re-use the parent route's data by dynamic import */
async function getAllProducts(): Promise<Product[]> {
  const mod = await import("../route");
  const req = new NextRequest(new URL("http://localhost/api/products"));
  const res = await mod.GET(req);
  const json = await res.json();
  return json.data;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const products = await getAllProducts();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const related = products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  return NextResponse.json({ data: product, related });
}
