import type { Metadata } from "next";
import HeaderNav from "@/src/app/_components/HeaderNav";
import ShopHero from "./_components/ShopHero";
import CategoryGrid from "./_components/CategoryGrid";
import ProductGrid from "./_components/ProductGrid";
import BreadcrumbNav from "./_components/BreadcrumbNav";
import { getCategoriesWithUI, getAllProducts } from "./_lib/server-fetchers";
import "./shop.css";

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
  for (const [slug, config] of Object.entries(uiConfigs)) {
    if (config.heroImage) heroImages[slug] = config.heroImage;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <HeaderNav />

      {/* Hero */}
      <ShopHero
        label="Ori Baebi Collection"
        title="Shop All"
        description="Discover our curated selection of luxury essentials — each piece designed to elevate your everyday."
        heroImage="/images/model-intro/model_intro_2.webp"
        moodImage="/images/mood-bg/wall_sticker_soft_cream_roses.webp"
      />

      {/* Breadcrumb */}
      <BreadcrumbNav
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Shop" },
        ]}
      />

      {/* Category Grid — Browse by Category */}
      <div className="shop-section-title">
        <span className="shop-section-title__label">Browse by Category</span>
        <h2 className="shop-section-title__heading">Find Your Piece</h2>
        <p className="shop-section-title__description">
          Four curated collections, each telling its own story of elegance and intention.
        </p>
      </div>
      <CategoryGrid categories={categories} heroImages={heroImages} />

      {/* All Products Section */}
      <div
        style={{
          background: "var(--bg-section-3)",
          paddingTop: 1,
        }}
      >
        <div className="shop-section-title">
          <span className="shop-section-title__label">All Products</span>
          <h2 className="shop-section-title__heading">The Full Edit</h2>
          <p className="shop-section-title__description">
            Every piece in our collection, ready to be discovered.
          </p>
        </div>
        <ProductGrid products={allProducts} />
      </div>
    </main>
  );
}
