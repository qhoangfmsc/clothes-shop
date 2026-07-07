/* ═══════════════════════════════════════════════════════════
   GET /api/size-guides/[category]
   
   Returns size guide table for a category.
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import type { SizeGuide } from "@/src/types/size-guide";

/* ═══ Size Guide Database ═══ */
const SIZE_GUIDES: Record<string, SizeGuide> = {
  tops: {
    category: "tops", title: "Tops Size Guide",
    description: "Measurements are taken flat across the garment. For best fit, compare with a similar garment you already own.",
    unit: "cm", columns: ["Size", "Bust", "Waist", "Length"],
    rows: [
      { size: "XS", bust: "80-84", waist: "62-66", length: "58" },
      { size: "S", bust: "84-88", waist: "66-70", length: "60" },
      { size: "M", bust: "88-92", waist: "70-74", length: "62" },
      { size: "L", bust: "92-96", waist: "74-78", length: "64" },
      { size: "XL", bust: "96-100", waist: "78-82", length: "66" },
    ],
    tips: ["If between sizes, we recommend sizing up for a relaxed fit", "Silk and satin pieces may have a more body-skimming fit", "Measure yourself without heavy clothing for accuracy"],
  },
  skirts: {
    category: "skirts", title: "Skirts Size Guide",
    description: "Waist is measured at the natural waistline. Length is measured from waist to hem.",
    unit: "cm", columns: ["Size", "Waist", "Hips", "Length"],
    rows: [
      { size: "XS", waist: "62-66", hips: "86-90", length: "varies" },
      { size: "S", waist: "66-70", hips: "90-94", length: "varies" },
      { size: "M", waist: "70-74", hips: "94-98", length: "varies" },
      { size: "L", waist: "74-78", hips: "98-102", length: "varies" },
      { size: "XL", waist: "78-82", hips: "102-106", length: "varies" },
    ],
    tips: ["Mini skirts: ~40cm, Midi: ~68cm, Maxi: ~90cm from waist", "Wrap skirts are adjustable and accommodate a wider range", "Slip skirts in silk may stretch slightly with wear"],
  },
  bags: {
    category: "bags", title: "Bags Dimensions",
    description: "All bags are one size. Dimensions are approximate and measured at widest point.",
    unit: "cm", columns: ["Style", "Width", "Height", "Depth"],
    rows: [
      { size: "Hobo Bags", width: "38-42", height: "28-32", depth: "12-15" },
      { size: "Shoulder Bags", width: "28-32", height: "22-26", depth: "10-12" },
      { size: "Clutches", width: "24-28", height: "14-16", depth: "4-6" },
      { size: "Mini Bags", width: "18-22", height: "14-18", depth: "6-8" },
      { size: "Tote Bags", width: "36-40", height: "30-34", depth: "14-16" },
    ],
    tips: ["All bags include an adjustable or detachable strap unless noted", "Leather bags will soften and develop patina with use", "Store bags stuffed with tissue paper to maintain shape"],
  },
  jewelry: {
    category: "jewelry", title: "Jewelry Size Guide",
    description: "Ring sizes follow US sizing. Necklaces and bracelets are adjustable unless noted.",
    unit: "cm", columns: ["Ring Size", "Circumference"],
    rows: [
      { size: "5", circumference: "4.95cm / 49.5mm" },
      { size: "6", circumference: "5.18cm / 51.8mm" },
      { size: "7", circumference: "5.41cm / 54.1mm" },
      { size: "8", circumference: "5.64cm / 56.4mm" },
      { size: "9", circumference: "5.87cm / 58.7mm" },
    ],
    tips: ["Measure your finger at the end of the day when it's largest", "Wide bands may require a half-size up", "Most necklaces are 16-18 inches with 2-inch extender"],
  },
};

/* ═══ Handler ═══ */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  const guide = SIZE_GUIDES[category];

  if (!guide) {
    return NextResponse.json({ error: "Size guide not found for this category" }, { status: 404 });
  }

  return NextResponse.json({ data: guide });
}
