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
import type { Product } from "@/src/types/product";

/* ── Shared image pool ── */
const M = [
  "/images/model-intro/model_intro_1.webp",
  "/images/model-intro/model_intro_2.webp",
  "/images/model-intro/model_intro_3.webp",
  "/images/model-intro/model_intro_4.webp",
  "/images/model-intro/model_intro_5.webp",
  "/images/model-intro/model_intro_6.webp",
  "/images/model-intro/model_intro_7.webp",
];

/* ═══════════════════════════════════════════════════════════
   PRODUCT DATABASE
   ═══════════════════════════════════════════════════════════ */

const PRODUCTS: Product[] = [
  /* ── TOPS ── */
  { id: "tops-1", slug: "silk-camisole-rose", sku: "OB-TP-001", name: "Silk Camisole Rosé", price: 185, image: M[0], secondaryImage: M[3], category: "tops", subcategory: "camisoles", badge: "new", status: "active", description: "Crafted from the finest mulberry silk, this camisole embodies effortless elegance. The delicate construction and thoughtful detailing make it a wardrobe essential.", material: "100% Mulberry Silk", care: "Dry clean only. Store in garment bag.", sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Rosé", hex: "#D4A5A5" }, { name: "Pearl", hex: "#F5EFE0" }, { name: "Noir", hex: "#1A1917" }], tags: ["silk", "camisole", "summer", "new-arrival"], createdAt: "2026-06-01T00:00:00Z" },
  { id: "tops-2", slug: "halter-top-noir", sku: "OB-TP-002", name: "Halter Top Noir", price: 145, image: M[1], secondaryImage: M[4], category: "tops", subcategory: "halter", status: "active", description: "A statement piece that transitions seamlessly from day to evening. The refined silhouette flatters every figure with understated luxury.", material: "Italian Cotton Blend", care: "Machine wash cold. Lay flat to dry.", sizes: ["XS", "S", "M", "L"], colors: [{ name: "Noir", hex: "#1A1917" }, { name: "Champagne", hex: "#C9A96E" }], tags: ["halter", "noir", "evening"], createdAt: "2026-05-20T00:00:00Z" },
  { id: "tops-3", slug: "linen-tank-creme", sku: "OB-TP-003", name: "Linen Tank Crème", price: 95, image: M[2], secondaryImage: M[5], category: "tops", subcategory: "tank", badge: "bestseller", status: "active", description: "Designed with intention and crafted with care. This timeless piece combines modern aesthetics with artisanal quality.", material: "French Linen", care: "Machine wash gentle cycle. Iron on low.", sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Crème", hex: "#F5EFE0" }, { name: "Sage", hex: "#A3B18A" }, { name: "Dusty Blue", hex: "#8FA3B4" }], tags: ["linen", "tank", "basics", "bestseller"], createdAt: "2026-04-15T00:00:00Z" },
  { id: "tops-4", slug: "off-shoulder-blush", sku: "OB-TP-004", name: "Off-Shoulder Blush", price: 165, image: M[3], secondaryImage: M[6], category: "tops", subcategory: "off-shoulder", status: "active", description: "Inspired by the golden hour — where light meets form. Every stitch tells a story of meticulous craftsmanship.", material: "Organic Pima Cotton", care: "Hand wash cold. Hang to dry.", sizes: ["S", "M", "L"], colors: [{ name: "Blush", hex: "#D4A5A5" }, { name: "Vanilla", hex: "#F0E4A6" }], tags: ["off-shoulder", "romantic", "blush"], createdAt: "2026-05-10T00:00:00Z" },
  { id: "tops-5", slug: "cashmere-cardigan", sku: "OB-TP-005", name: "Cashmere Cardigan", price: 295, originalPrice: 350, image: M[4], secondaryImage: M[0], category: "tops", subcategory: "cardigans", badge: "sale", status: "active", description: "A versatile essential that pairs beautifully with any outfit. Premium cashmere ensures lasting comfort and style.", material: "Cashmere Wool Blend", care: "Dry clean recommended. Store folded.", sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Oatmeal", hex: "#D4C5A9" }, { name: "Charcoal", hex: "#3A3128" }, { name: "Rosé", hex: "#D4A5A5" }], tags: ["cashmere", "cardigan", "layering", "sale"], createdAt: "2026-03-01T00:00:00Z" },
  { id: "tops-6", slug: "corset-top-champagne", sku: "OB-TP-006", name: "Corset Top Champagne", price: 210, image: M[5], secondaryImage: M[1], category: "tops", subcategory: "corset", status: "active", description: "Where minimalism meets luxury. Clean lines and exceptional materials create a piece that speaks volumes in silence.", material: "Silk Satin", care: "Dry clean only.", sizes: ["XS", "S", "M", "L"], colors: [{ name: "Champagne", hex: "#C9A96E" }, { name: "Noir", hex: "#1A1917" }], tags: ["corset", "champagne", "structured"], createdAt: "2026-06-10T00:00:00Z" },
  { id: "tops-7", slug: "ruched-halter-pearl", sku: "OB-TP-007", name: "Ruched Halter Pearl", price: 155, image: M[6], secondaryImage: M[2], category: "tops", subcategory: "halter", badge: "new", status: "active", description: "An ode to feminine grace. Soft draping and careful tailoring create a silhouette that moves with you.", material: "Premium Viscose", care: "Hand wash cold. Lay flat to dry.", sizes: ["XS", "S", "M", "L"], colors: [{ name: "Pearl", hex: "#F5EFE0" }, { name: "Lavender", hex: "#B8A5C8" }], tags: ["halter", "ruched", "pearl", "new-arrival"], createdAt: "2026-06-15T00:00:00Z" },
  { id: "tops-8", slug: "knit-tank-sage", sku: "OB-TP-008", name: "Knit Tank Sage", price: 120, image: M[0], secondaryImage: M[4], category: "tops", subcategory: "tank", status: "active", description: "The intersection of art and fashion. A carefully curated piece that elevates your everyday wardrobe.", material: "Japanese Crepe", care: "Machine wash cold. Lay flat to dry.", sizes: ["S", "M", "L", "XL"], colors: [{ name: "Sage", hex: "#A3B18A" }, { name: "Crème", hex: "#F5EFE0" }], tags: ["knit", "tank", "sage", "casual"], createdAt: "2026-05-25T00:00:00Z" },

  /* ── SKIRTS ── */
  { id: "skirts-1", slug: "satin-slip-skirt-blush", sku: "OB-SK-001", name: "Satin Slip Skirt Blush", price: 175, image: M[2], secondaryImage: M[5], category: "skirts", subcategory: "slip", badge: "new", status: "active", description: "Liquid satin that cascades like water. This bias-cut slip skirt is the foundation of modern elegance.", material: "Silk Satin", care: "Dry clean only. Store hanging.", sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Blush", hex: "#D4A5A5" }, { name: "Champagne", hex: "#C9A96E" }, { name: "Noir", hex: "#1A1917" }], tags: ["satin", "slip", "blush", "new-arrival"], createdAt: "2026-06-05T00:00:00Z" },
  { id: "skirts-2", slug: "midi-wrap-champagne", sku: "OB-SK-002", name: "Midi Wrap Champagne", price: 195, image: M[3], secondaryImage: M[6], category: "skirts", subcategory: "wrap", status: "active", description: "A wrap silhouette that flatters every body. The champagne tone catches light beautifully as you move.", material: "Italian Cotton Blend", care: "Machine wash cold. Iron on medium.", sizes: ["XS", "S", "M", "L"], colors: [{ name: "Champagne", hex: "#C9A96E" }, { name: "Rose", hex: "#D4A5A5" }], tags: ["midi", "wrap", "champagne"], createdAt: "2026-05-18T00:00:00Z" },
  { id: "skirts-3", slug: "mini-skirt-noir", sku: "OB-SK-003", name: "Mini Skirt Noir", price: 135, image: M[5], secondaryImage: M[1], category: "skirts", subcategory: "mini", badge: "bestseller", status: "active", description: "Bold yet refined. This mini skirt in deep noir is a versatile statement piece for any occasion.", material: "Premium Viscose", care: "Machine wash gentle. Hang to dry.", sizes: ["XS", "S", "M", "L"], colors: [{ name: "Noir", hex: "#1A1917" }, { name: "Burgundy", hex: "#722F37" }], tags: ["mini", "noir", "bestseller", "evening"], createdAt: "2026-04-20T00:00:00Z" },
  { id: "skirts-4", slug: "pleated-midi-rose", sku: "OB-SK-004", name: "Pleated Midi Rose", price: 225, image: M[0], secondaryImage: M[3], category: "skirts", subcategory: "midi", status: "active", description: "Hand-pressed pleats that move like poetry. Each fold catches light differently, creating a living texture.", material: "French Linen", care: "Dry clean recommended.", sizes: ["S", "M", "L"], colors: [{ name: "Rose", hex: "#D4A5A5" }, { name: "Sage", hex: "#A3B18A" }], tags: ["pleated", "midi", "rose", "editorial"], createdAt: "2026-05-12T00:00:00Z" },
  { id: "skirts-5", slug: "lace-overlay-skirt", sku: "OB-SK-005", name: "Lace Overlay Skirt", price: 245, originalPrice: 295, image: M[1], secondaryImage: M[4], category: "skirts", subcategory: "lace", badge: "sale", status: "active", description: "Delicate Chantilly lace layered over a silk lining. An heirloom piece that transcends seasons.", material: "Chantilly Lace & Silk", care: "Dry clean only. Store in garment bag.", sizes: ["XS", "S", "M", "L"], colors: [{ name: "Ivory", hex: "#FFFFF0" }, { name: "Blush", hex: "#D4A5A5" }], tags: ["lace", "overlay", "sale", "romantic"], createdAt: "2026-03-15T00:00:00Z" },
  { id: "skirts-6", slug: "a-line-mini-sage", sku: "OB-SK-006", name: "A-Line Mini Sage", price: 140, image: M[4], secondaryImage: M[0], category: "skirts", subcategory: "mini", status: "active", description: "Fresh sage green in a classic A-line cut. The perfect daytime companion.", material: "Organic Pima Cotton", care: "Machine wash cold.", sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Sage", hex: "#A3B18A" }, { name: "Dusty Blue", hex: "#8FA3B4" }, { name: "Vanilla", hex: "#F0E4A6" }], tags: ["a-line", "mini", "sage", "casual"], createdAt: "2026-05-28T00:00:00Z" },
  { id: "skirts-7", slug: "bias-cut-slip-pearl", sku: "OB-SK-007", name: "Bias-Cut Slip Pearl", price: 185, image: M[6], secondaryImage: M[2], category: "skirts", subcategory: "slip", badge: "new", status: "active", description: "Cut on the bias for a fluid drape that skims the body. Pearl tones for a luminous finish.", material: "100% Mulberry Silk", care: "Dry clean only.", sizes: ["XS", "S", "M", "L"], colors: [{ name: "Pearl", hex: "#F5EFE0" }, { name: "Gold", hex: "#C9A96E" }], tags: ["bias-cut", "slip", "pearl", "new-arrival"], createdAt: "2026-06-12T00:00:00Z" },
  { id: "skirts-8", slug: "wrap-skirt-lavender", sku: "OB-SK-008", name: "Wrap Skirt Lavender", price: 160, image: M[3], secondaryImage: M[5], category: "skirts", subcategory: "wrap", status: "active", description: "Soft lavender wrap with an adjustable tie. Evening-ready elegance in a relaxed silhouette.", material: "Japanese Crepe", care: "Hand wash cold. Hang to dry.", sizes: ["S", "M", "L"], colors: [{ name: "Lavender", hex: "#B8A5C8" }, { name: "Crème", hex: "#F5EFE0" }], tags: ["wrap", "lavender", "evening"], createdAt: "2026-05-05T00:00:00Z" },

  /* ── BAGS ── */
  { id: "bags-1", slug: "woven-hobo-camel", sku: "OB-BG-001", name: "Woven Hobo Camel", price: 320, image: M[4], secondaryImage: M[0], category: "bags", subcategory: "hobo", badge: "new", status: "active", description: "Hand-woven leather in a relaxed hobo silhouette. Each bag takes three days to weave, making every piece unique.", material: "Hand-Woven Italian Leather", care: "Condition with leather cream quarterly.", sizes: ["One Size"], colors: [{ name: "Camel", hex: "#C19A6B" }, { name: "Cognac", hex: "#8B4513" }], tags: ["hobo", "woven", "leather", "new-arrival"], createdAt: "2026-06-08T00:00:00Z" },
  { id: "bags-2", slug: "shoulder-bag-noir", sku: "OB-BG-002", name: "Shoulder Bag Noir", price: 285, image: M[5], secondaryImage: M[1], category: "bags", subcategory: "shoulder", status: "active", description: "The everyday essential, elevated. Structured yet supple, with gold-tone hardware that whispers luxury.", material: "Nappa Leather", care: "Wipe with damp cloth. Avoid direct sunlight.", sizes: ["One Size"], colors: [{ name: "Noir", hex: "#1A1917" }, { name: "Taupe", hex: "#B8A99A" }], tags: ["shoulder", "noir", "classic"], createdAt: "2026-05-15T00:00:00Z" },
  { id: "bags-3", slug: "evening-clutch-gold", sku: "OB-BG-003", name: "Evening Clutch Gold", price: 195, image: M[6], secondaryImage: M[2], category: "bags", subcategory: "clutches", badge: "bestseller", status: "active", description: "Pure evening glamour. The textured gold finish catches every light, while the compact frame holds your night essentials.", material: "Metallic Leather", care: "Store in dust bag. Handle with clean hands.", sizes: ["One Size"], colors: [{ name: "Gold", hex: "#C9A96E" }, { name: "Silver", hex: "#C0C0C0" }], tags: ["clutch", "gold", "evening", "bestseller"], createdAt: "2026-04-10T00:00:00Z" },
  { id: "bags-4", slug: "mini-bag-rose", sku: "OB-BG-004", name: "Mini Bag Rosé", price: 165, image: M[0], secondaryImage: M[3], category: "bags", subcategory: "mini", status: "active", description: "Perfectly petite. This mini bag proves that small things can make the biggest impression.", material: "Saffiano Leather", care: "Wipe clean. Avoid water exposure.", sizes: ["One Size"], colors: [{ name: "Rosé", hex: "#D4A5A5" }, { name: "Blush", hex: "#F2D7D7" }, { name: "Noir", hex: "#1A1917" }], tags: ["mini", "rose", "crossbody"], createdAt: "2026-05-22T00:00:00Z" },
  { id: "bags-5", slug: "tote-bag-canvas", sku: "OB-BG-005", name: "Canvas Tote Natural", price: 145, image: M[1], secondaryImage: M[4], category: "bags", subcategory: "tote", badge: "new", status: "active", description: "Spacious, sustainable, and effortlessly chic. Organic canvas with leather trim for everyday luxury.", material: "Organic Canvas & Leather", care: "Spot clean canvas. Condition leather.", sizes: ["One Size"], colors: [{ name: "Natural", hex: "#F5EFE0" }, { name: "Sand", hex: "#D4C5A9" }], tags: ["tote", "canvas", "sustainable", "new-arrival"], createdAt: "2026-06-15T00:00:00Z" },
  { id: "bags-6", slug: "crescent-shoulder-sage", sku: "OB-BG-006", name: "Crescent Shoulder Sage", price: 255, image: M[2], secondaryImage: M[5], category: "bags", subcategory: "shoulder", status: "active", description: "A crescent-shaped shoulder bag in muted sage. The curved form is both sculptural and practical.", material: "Soft Grain Leather", care: "Condition monthly. Store stuffed.", sizes: ["One Size"], colors: [{ name: "Sage", hex: "#A3B18A" }, { name: "Oatmeal", hex: "#D4C5A9" }], tags: ["shoulder", "sage", "sculptural"], createdAt: "2026-05-08T00:00:00Z" },
  { id: "bags-7", slug: "envelope-clutch-noir", sku: "OB-BG-007", name: "Envelope Clutch Noir", price: 175, image: M[3], secondaryImage: M[6], category: "bags", subcategory: "clutches", status: "active", description: "Sleek envelope lines in buttery noir leather. The magnetic closure keeps everything secure in style.", material: "Nappa Leather", care: "Store in dust bag.", sizes: ["One Size"], colors: [{ name: "Noir", hex: "#1A1917" }, { name: "Burgundy", hex: "#722F37" }], tags: ["clutch", "envelope", "noir", "evening"], createdAt: "2026-04-18T00:00:00Z" },
  { id: "bags-8", slug: "bucket-bag-tan", sku: "OB-BG-008", name: "Bucket Bag Tan", price: 235, image: M[4], secondaryImage: M[1], category: "bags", subcategory: "hobo", status: "active", description: "A modern bucket silhouette with drawstring closure. Rich tan leather that ages beautifully over time.", material: "Full-Grain Leather", care: "Condition with leather balm. Avoid rain.", sizes: ["One Size"], colors: [{ name: "Tan", hex: "#C19A6B" }, { name: "Chocolate", hex: "#5C4033" }], tags: ["bucket", "tan", "casual"], createdAt: "2026-05-30T00:00:00Z" },

  /* ── JEWELRY ── */
  { id: "jewelry-1", slug: "layered-chain-gold", sku: "OB-JW-001", name: "Layered Chain Gold", price: 145, image: M[6], secondaryImage: M[2], category: "jewelry", subcategory: "necklaces", badge: "new", status: "active", description: "Three delicate chains at varying lengths create the illusion of effortless layering in a single piece.", material: "18K Gold Plate over Sterling Silver", care: "Store in jewelry pouch. Remove before swimming.", sizes: ["One Size"], colors: [{ name: "Gold", hex: "#C9A96E" }, { name: "Rose Gold", hex: "#B76E79" }], tags: ["necklace", "layered", "gold", "new-arrival"], createdAt: "2026-06-12T00:00:00Z" },
  { id: "jewelry-2", slug: "pearl-drop-earrings", sku: "OB-JW-002", name: "Pearl Drop Earrings", price: 95, image: M[0], secondaryImage: M[3], category: "jewelry", subcategory: "earrings", badge: "bestseller", status: "active", description: "Freshwater pearls suspended from delicate gold posts. The classic earring, refined for the modern woman.", material: "Freshwater Pearl & 14K Gold", care: "Wipe gently with soft cloth.", sizes: ["One Size"], colors: [{ name: "Pearl/Gold", hex: "#F5EFE0" }, { name: "Pearl/Silver", hex: "#C0C0C0" }], tags: ["earrings", "pearl", "classic", "bestseller"], createdAt: "2026-04-05T00:00:00Z" },
  { id: "jewelry-3", slug: "signet-ring-gold", sku: "OB-JW-003", name: "Signet Ring Gold", price: 125, image: M[1], secondaryImage: M[4], category: "jewelry", subcategory: "rings", status: "active", description: "A modern signet ring with a smooth, polished face. Substantial weight for a premium feel.", material: "18K Gold Plate", care: "Polish with jewelry cloth.", sizes: ["5", "6", "7", "8"], colors: [{ name: "Gold", hex: "#C9A96E" }, { name: "Silver", hex: "#C0C0C0" }], tags: ["ring", "signet", "gold", "statement"], createdAt: "2026-05-01T00:00:00Z" },
  { id: "jewelry-4", slug: "chain-bracelet-mixed", sku: "OB-JW-004", name: "Chain Bracelet Mixed", price: 85, image: M[2], secondaryImage: M[5], category: "jewelry", subcategory: "bracelets", status: "active", description: "Three different chain patterns interlinked for a textured, layered look on the wrist.", material: "Gold & Silver Plate", care: "Remove before washing hands.", sizes: ["One Size"], colors: [{ name: "Mixed Metal", hex: "#C9A96E" }], tags: ["bracelet", "chain", "mixed-metal"], createdAt: "2026-05-10T00:00:00Z" },
  { id: "jewelry-5", slug: "silk-hair-ribbon", sku: "OB-JW-005", name: "Silk Hair Ribbon", price: 45, image: M[3], secondaryImage: M[6], category: "jewelry", subcategory: "hair", badge: "new", status: "active", description: "Pure silk ribbon in a generous length. Tie, wrap, or bow — however your hair story unfolds.", material: "100% Mulberry Silk", care: "Hand wash cold.", sizes: ["One Size"], colors: [{ name: "Champagne", hex: "#C9A96E" }, { name: "Rosé", hex: "#D4A5A5" }, { name: "Noir", hex: "#1A1917" }, { name: "Sage", hex: "#A3B18A" }], tags: ["hair", "ribbon", "silk", "new-arrival"], createdAt: "2026-06-18T00:00:00Z" },
  { id: "jewelry-6", slug: "hoop-earrings-gold", sku: "OB-JW-006", name: "Hoop Earrings Gold", price: 75, image: M[4], secondaryImage: M[0], category: "jewelry", subcategory: "earrings", status: "active", description: "Medium-sized hoops with a subtle hammered texture. Lightweight enough for all-day wear.", material: "14K Gold Plate", care: "Store in anti-tarnish bag.", sizes: ["One Size"], colors: [{ name: "Gold", hex: "#C9A96E" }, { name: "Rose Gold", hex: "#B76E79" }], tags: ["earrings", "hoop", "gold", "everyday"], createdAt: "2026-04-22T00:00:00Z" },
  { id: "jewelry-7", slug: "pendant-necklace-amethyst", sku: "OB-JW-007", name: "Pendant Necklace Amethyst", price: 165, image: M[5], secondaryImage: M[1], category: "jewelry", subcategory: "necklaces", status: "active", description: "A raw amethyst crystal cradled in gold. Every stone is naturally unique — no two necklaces are the same.", material: "Natural Amethyst & 18K Gold", care: "Handle crystal gently.", sizes: ["One Size"], colors: [{ name: "Amethyst/Gold", hex: "#B8A5C8" }], tags: ["necklace", "pendant", "amethyst", "crystal"], createdAt: "2026-05-15T00:00:00Z" },
  { id: "jewelry-8", slug: "enamel-signet-noir", sku: "OB-JW-008", name: "Enamel Signet Noir", price: 110, image: M[6], secondaryImage: M[3], category: "jewelry", subcategory: "rings", status: "active", description: "A modern take on the classic signet. Black enamel over gold creates a bold, graphic statement.", material: "Gold Plate with Black Enamel", care: "Avoid abrasives. Store in ring box.", sizes: ["5", "6", "7", "8", "9"], colors: [{ name: "Noir/Gold", hex: "#1A1917" }, { name: "Burgundy/Gold", hex: "#722F37" }], tags: ["ring", "signet", "noir", "statement"], createdAt: "2026-05-02T00:00:00Z" },
];

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
