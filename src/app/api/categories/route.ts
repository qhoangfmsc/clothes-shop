/* ═══════════════════════════════════════════════════════════
   GET /api/categories
   
   ?slug=tops → single category + uiConfig
   No params → all categories
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES, UI_CONFIG } from "./data";

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
