import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeaderNav from "@/src/app/_components/HeaderNav";
import ShopHero from "../_components/ShopHero";
import BreadcrumbNav from "../_components/BreadcrumbNav";
import SubcategoryChips from "../_components/SubcategoryChips";
import ProductGrid from "../_components/ProductGrid";

import {
  getCategoryBySlug,
  getCategoryUIConfig,
  getProducts,
  getCategories,
} from "../_data/server-fetchers";
import "../shop.css";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

/* ── Static params for all valid categories ── */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((cat) => ({
    category: cat.slug,
  }));
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  const uiConfig = await getCategoryUIConfig(slug);
  if (!category) return { title: "Not Found — Ori Baebi" };

  return {
    title: `${category.title} — Ori Baebi Shop`,
    description: `${category.description}. ${uiConfig?.tagline ?? ""} — Ori Baebi luxury collection.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  const uiConfig = await getCategoryUIConfig(slug);

  if (!category) {
    notFound();
  }

  const products = await getProducts(slug);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <HeaderNav />

      {/* Hero — unique per category */}
      <ShopHero
        label={`Ori Baebi — ${category.title}`}
        title={category.title}
        description={uiConfig?.tagline ?? category.description}
        heroImage={uiConfig?.heroImage ?? "/images/model-intro/model_intro_1.webp"}
        moodImage={uiConfig?.moodImage}
        accentColor={uiConfig?.accentColor}
      />

      {/* Breadcrumb */}
      <BreadcrumbNav
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category.title },
        ]}
      />

      {/* Subcategory filter chips */}
      <SubcategoryChips
        categorySlug={slug}
        subcategories={[...category.subcategories]}
      />

      {/* Product Grid */}
      <div
        style={{
          background: uiConfig?.bgTint ?? "var(--bg-primary)",
          paddingTop: 1,
        }}
      >
        <div className="shop-section-title">
          <span className="shop-section-title__label">{category.description}</span>
          <h2 className="shop-section-title__heading">{category.title} Collection</h2>
        </div>
        <ProductGrid products={products} />
      </div>
    </main>
  );
}
