import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeaderNav from "@/src/app/_components/HeaderNav";
import ShopHero from "../_components/ShopHero";
import BreadcrumbNav from "../_components/BreadcrumbNav";
import SubcategoryChips from "../_components/SubcategoryChips";
import ProductGrid from "../_components/ProductGrid";
import ShopFooter from "../_components/ShopFooter";
import { getCategoryBySlug, getProducts, CATEGORIES } from "../_data/shop-data";
import "../shop.css";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

/* ── Static params for all valid categories ── */
export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({
    category: cat.slug,
  }));
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Not Found — Ori Baebi" };

  return {
    title: `${category.title} — Ori Baebi Shop`,
    description: `${category.description}. ${category.tagline} — Ori Baebi luxury collection.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const products = getProducts(slug);

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
        description={category.tagline}
        heroImage={category.heroImage}
        moodImage={category.moodImage}
        accentColor={category.accentColor}
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
          background: category.bgTint,
          paddingTop: 1,
        }}
      >
        <div className="shop-section-title">
          <span className="shop-section-title__label">{category.description}</span>
          <h2 className="shop-section-title__heading">{category.title} Collection</h2>
        </div>
        <ProductGrid products={products} />
      </div>

      {/* Footer */}
      <ShopFooter />
    </main>
  );
}
