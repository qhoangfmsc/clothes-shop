import type { Metadata } from "next";

import ShopHero from "./_components/ShopHero";
import CategoryGrid from "./_components/CategoryGrid";
import BreadcrumbNav from "./_components/BreadcrumbNav";
import ShopProductsClient from "./_components/ShopProductsClient";
import { getCategories, getAllProducts, getBannerConfig } from "./_lib/server-fetchers";
import { SITE_CONFIG_KEYS } from "@/src/types/site-config";

export const metadata: Metadata = {
  title: "Shop — DOOVAN",
  description:
    "Explore the full DOOVAN collection. Luxury tops, skirts, bags, and jewelry — crafted with intention for the modern wardrobe.",
};

export default async function ShopPage() {
  const [categories, allProducts, heroBanners] = await Promise.all([
    getCategories(),
    getAllProducts(),
    getBannerConfig(SITE_CONFIG_KEYS.SHOP_HERO_BANNERS),
  ]);

  /* Hero banner images — from Site Config > SHOP_HERO_BANNERS. No fallback
     image: if nothing is configured, ShopHero shows a plain color instead. */
  const heroBannerImages = heroBanners.map((b) => b.image);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Hero */}
      <ShopHero
        label=""
        title="Shop All"
        description="Discover our curated selection of luxury essentials — each piece designed to elevate your everyday."
        images={heroBannerImages}
      />

      {/* Breadcrumb */}
      <BreadcrumbNav crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]} />

      {/* Category Grid — Browse by Category */}
      <div className="flex flex-col gap-2 py-5 sm:py-6 sm:px-6">
        <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium px-4 sm:px-0">
          Browse by Category
        </span>
        <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none px-4 sm:px-0">
          Find Your Piece
        </h2>
        <p className="text-[var(--text-muted)] font-primary text-[15px] tracking-[-0.02em] leading-[150%] max-w-[480px] mt-2 px-4 sm:px-0">
          {categories.length} curated {categories.length === 1 ? "category" : "categories"}, each
          telling its own story of elegance and intention.
        </p>
      </div>
      <CategoryGrid categories={categories} />

      {/* All Products Section with Filter + Sort + Load More */}
      <div
        style={{
          background: "var(--bg-section-3)",
          paddingTop: 1,
        }}
      >
        <ShopProductsClient
          products={allProducts}
          heading={
            <div className="flex flex-col gap-2 px-4 sm:px-6 lg:px-8 pt-4">
              <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium">
                All Products
              </span>
              <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none">
                The Full Edit
              </h2>
              <p className="text-[var(--text-muted)] font-primary text-[15px] tracking-[-0.02em] leading-[150%] max-w-[480px] mt-2">
                Every piece in our collection, ready to be discovered.
              </p>
            </div>
          }
        />
      </div>
    </main>
  );
}
