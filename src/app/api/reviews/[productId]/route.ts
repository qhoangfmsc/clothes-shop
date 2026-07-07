/* ═══════════════════════════════════════════════════════════
   GET /api/reviews/[productId]
   
   Returns reviews for a product + average rating.
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import type { Review } from "@/src/types/review";

/* ═══ Review Database ═══ */
const REVIEWS: Record<string, Review[]> = {
  "tops-1": [
    { id: "r1", author: "Sophie L.", avatar: "SL", rating: 5, date: "2026-06-20", title: "Absolutely stunning silk", body: "The quality of this silk is unreal. It drapes beautifully and the rosé color is even more gorgeous in person. Worth every penny.", verified: true },
    { id: "r2", author: "Minh T.", avatar: "MT", rating: 4, date: "2026-06-15", title: "Beautiful but runs small", body: "Love the quality and design. I'd recommend sizing up one size. The silk is luxurious and the color is perfect.", verified: true },
    { id: "r3", author: "Emma W.", avatar: "EW", rating: 5, date: "2026-06-10", title: "My new favorite top", body: "I've worn this three times already. It transitions perfectly from office to dinner. The construction is impeccable.", verified: false },
  ],
  "tops-2": [
    { id: "r4", author: "Linh N.", avatar: "LN", rating: 5, date: "2026-06-18", title: "Perfect noir staple", body: "The halter neckline is so flattering. I love how versatile this piece is — works for casual and formal occasions.", verified: true },
    { id: "r5", author: "Isabella R.", avatar: "IR", rating: 4, date: "2026-06-01", title: "Great quality cotton", body: "Really nice Italian cotton blend. Comfortable and stylish. The fit is true to size.", verified: true },
  ],
  "tops-3": [
    { id: "r6", author: "Hannah K.", avatar: "HK", rating: 5, date: "2026-05-20", title: "Best basics I own", body: "This linen tank is perfection. Breathable, well-made, and looks expensive. I want it in every color.", verified: true },
    { id: "r7", author: "Jade M.", avatar: "JM", rating: 5, date: "2026-05-15", title: "Worth the bestseller tag", body: "I see why this is a bestseller. The French linen gets softer with every wash. Minimal but luxe.", verified: true },
    { id: "r8", author: "Trang P.", avatar: "TP", rating: 4, date: "2026-05-10", title: "Great everyday piece", body: "Reliable quality and lovely neutral color. Pairs with everything in my wardrobe.", verified: false },
  ],
  "tops-5": [
    { id: "r9", author: "Charlotte D.", avatar: "CD", rating: 5, date: "2026-04-15", title: "Luxurious cashmere", body: "The softest cardigan I've ever owned. The sale price made it an absolute steal. I wear it daily in air-conditioned spaces.", verified: true },
    { id: "r10", author: "Anh L.", avatar: "AL", rating: 4, date: "2026-04-01", title: "Lovely but pills slightly", body: "Beautiful cashmere that's incredibly warm. Minor pilling after a few wears, but nothing a cashmere comb can't fix.", verified: true },
  ],
  "skirts-1": [
    { id: "r11", author: "Olivia S.", avatar: "OS", rating: 5, date: "2026-06-25", title: "Liquid gold", body: "This skirt moves like water. The satin is heavy and luxurious, not cheap at all. The blush color is divine.", verified: true },
    { id: "r12", author: "Mai H.", avatar: "MH", rating: 5, date: "2026-06-15", title: "Dream slip skirt", body: "Finally found the perfect slip skirt. The bias cut is incredibly flattering and the length is just right.", verified: true },
    { id: "r13", author: "Sarah J.", avatar: "SJ", rating: 4, date: "2026-06-08", title: "Gorgeous but wrinkles", body: "Stunning piece that looks amazing on. Just be prepared to steam it before wearing. Silk satin does wrinkle.", verified: false },
  ],
  "skirts-3": [
    { id: "r14", author: "Lily C.", avatar: "LC", rating: 5, date: "2026-05-25", title: "Best mini skirt ever", body: "The noir color is so rich and deep. The viscose has a great weight to it — not flimsy at all. True to size.", verified: true },
    { id: "r15", author: "Thu V.", avatar: "TV", rating: 4, date: "2026-05-18", title: "Great for nights out", body: "Pairs perfectly with the Corset Top Champagne. The quality justifies the price.", verified: true },
  ],
  "bags-1": [
    { id: "r16", author: "Grace P.", avatar: "GP", rating: 5, date: "2026-06-28", title: "A work of art", body: "You can see the craftsmanship in every weave. This bag gets compliments everywhere I go. The camel leather is gorgeous.", verified: true },
    { id: "r17", author: "Hương N.", avatar: "HN", rating: 5, date: "2026-06-20", title: "Unique and beautiful", body: "Each bag truly is unique. The hand-woven leather is exceptional quality. Worth the investment.", verified: true },
  ],
  "bags-3": [
    { id: "r18", author: "Amelia F.", avatar: "AF", rating: 5, date: "2026-05-15", title: "Show-stopper clutch", body: "This clutch literally sparkles. The gold is elegant, not gaudy. Fits my phone, cards, and lipstick perfectly.", verified: true },
    { id: "r19", author: "Kim T.", avatar: "KT", rating: 4, date: "2026-05-01", title: "Gorgeous but small", body: "Absolutely beautiful craftsmanship. Just know it's quite compact — perfect for evening, not for daily use.", verified: true },
    { id: "r20", author: "Rachel W.", avatar: "RW", rating: 5, date: "2026-04-20", title: "Best evening bag", body: "I've used this for three events now and it always completes the look. The metallic leather quality is outstanding.", verified: false },
  ],
  "jewelry-1": [
    { id: "r21", author: "Victoria M.", avatar: "VM", rating: 5, date: "2026-06-30", title: "Effortless layering", body: "Three chains in one — genius! The gold plating looks real and hasn't tarnished. I wear it every day.", verified: true },
    { id: "r22", author: "Ngọc A.", avatar: "NA", rating: 4, date: "2026-06-22", title: "Love the design", body: "Beautiful layered look without the hassle of actual layering. The lengths are perfect.", verified: true },
  ],
  "jewelry-2": [
    { id: "r23", author: "Chloe R.", avatar: "CR", rating: 5, date: "2026-05-10", title: "Classic perfection", body: "These pearl drops are exactly what I was looking for. Elegant, lightweight, and the gold posts are comfortable even for sensitive ears.", verified: true },
    { id: "r24", author: "Lan P.", avatar: "LP", rating: 5, date: "2026-04-28", title: "Timeless beauties", body: "The freshwater pearls have a gorgeous luster. I can see myself wearing these for decades. A true investment piece.", verified: true },
    { id: "r25", author: "Diana K.", avatar: "DK", rating: 4, date: "2026-04-15", title: "Lovely but delicate", body: "Beautiful earrings that look expensive. Just be careful — the pearl attachment is delicate. Handle with care.", verified: false },
  ],
};

const DEFAULT_REVIEWS: Review[] = [
  { id: "rd1", author: "Happy Customer", avatar: "HC", rating: 5, date: "2026-06-01", title: "Beautiful quality", body: "Exactly as pictured. The quality is outstanding and it arrived beautifully packaged. Would definitely buy again.", verified: true },
  { id: "rd2", author: "Fashion Lover", avatar: "FL", rating: 4, date: "2026-05-15", title: "Great addition", body: "Really pleased with this purchase. The craftsmanship is evident and it looks even better in person.", verified: false },
];

/* ═══ Handler ═══ */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const reviews = REVIEWS[productId] ?? DEFAULT_REVIEWS;
  const average = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  return NextResponse.json({ data: reviews, average, total: reviews.length });
}
