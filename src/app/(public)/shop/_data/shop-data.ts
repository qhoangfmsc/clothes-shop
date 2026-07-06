/* ═══════════════════════════════════════════════════════════
   SHOP DATA — Placeholder / Static Data Layer
   Replace with API calls when backend is ready.
   ═══════════════════════════════════════════════════════════ */

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  secondaryImage: string;
  category: string;
  subcategory: string;
  badge?: "new" | "sale" | "bestseller";
  description: string;
  material: string;
  care: string;
}

export interface SubCategory {
  slug: string;
  label: string;
  description: string;
  count: number;
}

export interface Category {
  slug: string;
  title: string;
  description: string;
  tagline: string;
  heroImage: string;
  moodImage: string;
  /** CSS variable name for accent color */
  accentColor: string;
  /** CSS variable name for section bg */
  bgTint: string;
  subcategories: SubCategory[];
}

/* ── Category Definitions ── */
export const CATEGORIES: Category[] = [
  {
    slug: "tops",
    title: "Tops",
    description: "Effortlessly elegant pieces for every silhouette",
    tagline: "From sunrise to sunset — draped in intention",
    heroImage: "/images/model-intro/model_intro_1.webp",
    moodImage: "/images/mood-bg/wall_sticker_soft_pink_lace.webp",
    accentColor: "var(--color-dusty-rose)",
    bgTint: "var(--color-rose-milk)",
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
    slug: "skirts",
    title: "Skirts",
    description: "Movement & grace in every step",
    tagline: "The art of flowing form",
    heroImage: "/images/model-intro/model_intro_3.webp",
    moodImage: "/images/mood-bg/wall_sticker_soft_cream_roses.webp",
    accentColor: "var(--color-sage)",
    bgTint: "var(--color-sage-cream)",
    subcategories: [
      { slug: "slip", label: "Slip Skirts", description: "Satin & silk", count: 6 },
      { slug: "midi", label: "Midi Skirts", description: "Classic length", count: 8 },
      { slug: "mini", label: "Mini Skirts", description: "Bold & playful", count: 7 },
      { slug: "wrap", label: "Wrap Skirts", description: "Effortless chic", count: 5 },
      { slug: "lace", label: "Lace Skirts", description: "Delicate detail", count: 4 },
    ],
  },
  {
    slug: "bags",
    title: "Bags",
    description: "Carry your world with intention",
    tagline: "Crafted companions for every journey",
    heroImage: "/images/model-intro/model_intro_5.webp",
    moodImage: "/images/mood-bg/wall_sticker_soft_blue_swirl.webp",
    accentColor: "var(--color-dusty-blue)",
    bgTint: "var(--color-cloud)",
    subcategories: [
      { slug: "hobo", label: "Hobo Bags", description: "Relaxed luxury", count: 5 },
      { slug: "shoulder", label: "Shoulder Bags", description: "Classic carriage", count: 7 },
      { slug: "clutches", label: "Clutches", description: "Evening essentials", count: 6 },
      { slug: "mini", label: "Mini Bags", description: "Petit & precious", count: 8 },
      { slug: "tote", label: "Tote Bags", description: "Spacious style", count: 5 },
    ],
  },
  {
    slug: "jewelry",
    title: "Jewelry",
    description: "Finishing touches that speak volumes",
    tagline: "Adornments crafted with soul",
    heroImage: "/images/model-intro/model_intro_7.webp",
    moodImage: "/images/mood-bg/wall_sticker_yellow_botanical.webp",
    accentColor: "var(--color-champagne-gold)",
    bgTint: "var(--color-vanilla)",
    subcategories: [
      { slug: "necklaces", label: "Necklaces", description: "Layered stories", count: 9 },
      { slug: "earrings", label: "Earrings", description: "Frame your face", count: 11 },
      { slug: "rings", label: "Rings", description: "Stacked intention", count: 7 },
      { slug: "bracelets", label: "Bracelets", description: "Wrist poetry", count: 6 },
      { slug: "hair", label: "Hair Accessories", description: "Crown your look", count: 5 },
    ],
  },
];

/* ── Helper: look up category by slug ── */
export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/* ── Helper: look up subcategory ── */
export function getSubcategory(
  categorySlug: string,
  subcategorySlug: string
): { category: Category; subcategory: SubCategory } | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  const subcategory = category.subcategories.find((s) => s.slug === subcategorySlug);
  if (!subcategory) return undefined;
  return { category, subcategory };
}

/* ── Placeholder Products ── */
const MODEL_IMAGES = [
  "/images/model-intro/model_intro_1.webp",
  "/images/model-intro/model_intro_2.webp",
  "/images/model-intro/model_intro_3.webp",
  "/images/model-intro/model_intro_4.webp",
  "/images/model-intro/model_intro_5.webp",
  "/images/model-intro/model_intro_6.webp",
  "/images/model-intro/model_intro_7.webp",
];

const PRODUCT_NAMES: Record<string, string[]> = {
  tops: [
    "Silk Camisole Rosé",
    "Halter Top Noir",
    "Linen Tank Crème",
    "Off-Shoulder Blush",
    "Cashmere Cardigan",
    "Corset Top Champagne",
    "Ruched Halter Pearl",
    "Knit Tank Sage",
  ],
  skirts: [
    "Satin Slip Skirt Blush",
    "Midi Wrap Champagne",
    "Mini Skirt Noir",
    "Pleated Midi Rose",
    "Lace Overlay Skirt",
    "A-Line Mini Sage",
    "Bias-Cut Slip Pearl",
    "Wrap Skirt Lavender",
  ],
  bags: [
    "Hobo Bag Caramel",
    "Shoulder Bag Noir",
    "Evening Clutch Gold",
    "Mini Crossbody Blush",
    "Canvas Tote Crème",
    "Leather Hobo Sage",
    "Chain Clutch Champagne",
    "Bucket Bag Pearl",
  ],
  jewelry: [
    "Chain Necklace Gold",
    "Drop Earrings Pearl",
    "Stackable Ring Set",
    "Cuff Bracelet Gold",
    "Hair Clip Crystal",
    "Pendant Necklace Rose",
    "Hoop Earrings Mini",
    "Signet Ring Noir",
  ],
};

const BADGES: Array<Product["badge"] | undefined> = [
  "new",
  undefined,
  "bestseller",
  undefined,
  "sale",
  undefined,
  "new",
  undefined,
];

const DESCRIPTIONS = [
  "Crafted from the finest fabrics, this piece embodies effortless elegance. The delicate construction and thoughtful detailing make it a wardrobe essential.",
  "A statement piece that transitions seamlessly from day to evening. The refined silhouette flatters every figure with understated luxury.",
  "Designed with intention and crafted with care. This timeless piece combines modern aesthetics with artisanal quality.",
  "Inspired by the golden hour — where light meets form. Every stitch tells a story of meticulous craftsmanship.",
  "A versatile essential that pairs beautifully with any outfit. Premium materials ensure lasting comfort and style.",
  "Where minimalism meets luxury. Clean lines and exceptional materials create a piece that speaks volumes in silence.",
  "An ode to feminine grace. Soft draping and careful tailoring create a silhouette that moves with you.",
  "The intersection of art and fashion. A carefully curated piece that elevates your everyday wardrobe.",
];

const MATERIALS = [
  "100% Mulberry Silk",
  "Italian Cotton Blend",
  "French Linen",
  "Organic Pima Cotton",
  "Cashmere Wool Blend",
  "Silk Satin",
  "Premium Viscose",
  "Japanese Crepe",
];

function generateProducts(categorySlug: string): Product[] {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return [];

  const names = PRODUCT_NAMES[categorySlug] ?? [];
  const subcats = category.subcategories;

  return names.map((name, idx) => ({
    id: `${categorySlug}-${idx + 1}`,
    name,
    price: Math.round((45 + Math.random() * 200) / 5) * 5,
    originalPrice: BADGES[idx] === "sale" ? Math.round((80 + Math.random() * 250) / 5) * 5 : undefined,
    image: MODEL_IMAGES[idx % MODEL_IMAGES.length],
    secondaryImage: MODEL_IMAGES[(idx + 3) % MODEL_IMAGES.length],
    category: categorySlug,
    subcategory: subcats[idx % subcats.length].slug,
    badge: BADGES[idx],
    description: DESCRIPTIONS[idx % DESCRIPTIONS.length],
    material: MATERIALS[idx % MATERIALS.length],
    care: "Dry clean only. Store in garment bag.",
  }));
}

/* ── Export all products by category ── */
export const ALL_PRODUCTS: Record<string, Product[]> = {
  tops: generateProducts("tops"),
  skirts: generateProducts("skirts"),
  bags: generateProducts("bags"),
  jewelry: generateProducts("jewelry"),
};

/* ── Helper: get products filtered ── */
export function getProducts(categorySlug: string, subcategorySlug?: string): Product[] {
  const products = ALL_PRODUCTS[categorySlug] ?? [];
  if (!subcategorySlug) return products;
  return products.filter((p) => p.subcategory === subcategorySlug);
}

/* ── All products flat ── */
export function getAllProducts(): Product[] {
  return Object.values(ALL_PRODUCTS).flat();
}

/* ── "New In" products (flagged as new) ── */
export function getNewInProducts(): Product[] {
  return getAllProducts().filter((p) => p.badge === "new");
}

/* ── Get single product by ID ── */
export function getProductById(productId: string): Product | undefined {
  return getAllProducts().find((p) => p.id === productId);
}
