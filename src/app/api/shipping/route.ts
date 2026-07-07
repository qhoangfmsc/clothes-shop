/* ═══════════════════════════════════════════════════════════
   GET /api/shipping
   
   Returns shipping methods, return policy, and notes.
   ═══════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import type { ShippingInfo } from "@/src/types/shipping";

/* ═══ Shipping Database ═══ */
const SHIPPING_INFO: ShippingInfo = {
  freeShippingThreshold: 200,
  methods: [
    {
      id: "standard", name: "Standard Delivery",
      description: "Carefully packed and shipped with tracking",
      estimatedDays: "3-5 business days", price: 12, freeAbove: 200, icon: "truck",
    },
    {
      id: "express", name: "Express Delivery",
      description: "Priority shipping with next-day tracking",
      estimatedDays: "1-2 business days", price: 25, icon: "express",
    },
  ],
  returnPolicy: {
    days: 30,
    description: "Free returns within 30 days of delivery",
    conditions: [
      "Items must be unworn with original tags attached",
      "Sale items are final sale and cannot be returned",
      "Jewelry must be in original packaging",
      "We provide a prepaid return label",
    ],
  },
  notes: [
    "All orders include complimentary gift wrapping",
    "International shipping available — rates calculated at checkout",
    "Orders placed before 2pm ship same day",
  ],
};

/* ═══ Handler ═══ */
export async function GET() {
  return NextResponse.json({ data: SHIPPING_INFO });
}
