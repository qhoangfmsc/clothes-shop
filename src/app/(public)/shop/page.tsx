import type { Metadata } from "next";

import ShopHero from "./_components/ShopHero";
import CategoryGrid from "./_components/CategoryGrid";
import BreadcrumbNav from "./_components/BreadcrumbNav";
import ShopProductsClient from "./_components/ShopProductsClient";
import { getCategoriesWithUI, getAllProducts } from "./_lib/server-fetchers";

export const metadata: Metadata = {
  title: "Shop — Ori Baebi",
  description:
    "Explore the full Ori Baebi collection. Luxury tops, skirts, bags, and jewelry — crafted with intention for the modern wardrobe.",
};

export default async function ShopPage() {
  const [{ categories, uiConfigs }, allProducts] = await Promise.all([
    getCategoriesWithUI(),
    getAllProducts(),
  ]);

  /* Build hero image map from API uiConfig */
  const heroImages: Record<string, string> = {};
  if (uiConfigs) {
    for (const [slug, config] of Object.entries(uiConfigs)) {
      if (config?.heroImage) heroImages[slug] = config.heroImage;
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Hero */}
      <ShopHero
        label="Ori Baebi Collection"
        title="Shop All"
        description="Discover our curated selection of luxury essentials — each piece designed to elevate your everyday."
        heroImage={allProducts[0]?.images[0] ?? "/images/model-intro/model_intro_2.webp"}
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
          Four curated collections, each telling its own story of elegance and intention.
        </p>
      </div>
      <CategoryGrid categories={categories} heroImages={heroImages} />

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
