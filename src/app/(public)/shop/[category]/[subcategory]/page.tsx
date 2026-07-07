import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ShopHero from "../../_components/ShopHero";
import BreadcrumbNav from "../../_components/BreadcrumbNav";
import SubcategoryChips from "../../_components/SubcategoryChips";
import ProductGrid from "../../_components/ProductGrid";

import {
  getSubcategory,
  getCategoryUIConfig,
  getProducts,
  getCategories,
} from "../../_lib/server-fetchers";
import "../../shop.css";

interface SubcategoryPageProps {
  params: Promise<{ category: string; subcategory: string }>;
}

/* ── Static params for all valid category/subcategory combos ── */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      category: cat.slug,
      subcategory: sub.slug,
    }))
  );
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: SubcategoryPageProps): Promise<Metadata> {
  const { category: catSlug, subcategory: subSlug } = await params;
  const result = await getSubcategory(catSlug, subSlug);
  if (!result) return { title: "Not Found — Ori Baebi" };

  const { category, subcategory } = result;

  return {
    title: `${subcategory.label} — ${category.title} — Ori Baebi`,
    description: `${subcategory.description}. Shop ${subcategory.label} from the Ori Baebi ${category.title} collection.`,
  };
}

export default async function SubcategoryPage({ params }: SubcategoryPageProps) {
  const { category: catSlug, subcategory: subSlug } = await params;
  const result = await getSubcategory(catSlug, subSlug);

  if (!result) {
    notFound();
  }

  const { category, subcategory } = result;
  const uiConfig = await getCategoryUIConfig(catSlug);
  const products = await getProducts(catSlug, subSlug);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >


      {/* Hero */}
      <ShopHero
        label={`${category.title} — ${subcategory.label}`}
        title={subcategory.label}
        description={subcategory.description}
        heroImage={uiConfig?.heroImage ?? "/images/model-intro/model_intro_1.webp"}
        moodImage={uiConfig?.moodImage}
        accentColor={uiConfig?.accentColor}
      />

      {/* Breadcrumb */}
      <BreadcrumbNav
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category.title, href: `/shop/${category.slug}` },
          { label: subcategory.label },
        ]}
      />

      {/* Subcategory filter chips — highlight current */}
      <SubcategoryChips
        categorySlug={catSlug}
        subcategories={[...category.subcategories]}
        activeSlug={subSlug}
      />

      {/* Products */}
      <div
        style={{
          background: uiConfig?.bgTint ?? "var(--bg-primary)",
          paddingTop: 1,
        }}
      >
        <div className="shop-section-title">
          <span className="shop-section-title__label">
            {subcategory.description}
          </span>
          <h2 className="shop-section-title__heading">{subcategory.label}</h2>
          <p className="shop-section-title__description">
            {products.length} {products.length === 1 ? "piece" : "pieces"} in this collection
          </p>
        </div>
        <ProductGrid products={products} />
      </div>
    </main>
  );
}
