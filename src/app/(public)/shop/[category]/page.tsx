import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ShopHero from "../_components/ShopHero";
import BreadcrumbNav from "../_components/BreadcrumbNav";
import SubcategoryChips from "../_components/SubcategoryChips";
import ShopProductsClient from "../_components/ShopProductsClient";

import { getCategoryBySlug, getProducts, getCategories } from "../_lib/server-fetchers";

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
  if (!category) return { title: "Not Found — DOOVAN" };

  return {
    title: `${category.title} — DOOVAN Shop`,
    description: `${category.description} — DOOVAN luxury collection.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const products = await getProducts(slug);

  /* Hero image comes from this category's first product — no placeholder
     banner. An empty category (no products yet) just shows a plain hero. */
  const firstProductImage = products[0]?.images[0];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Hero — unique per category */}
      <ShopHero
        label={`DOOVAN — ${category.title}`}
        title={category.title}
        description={category.description}
        images={firstProductImage ? [firstProductImage] : []}
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
      <SubcategoryChips categorySlug={slug} subcategories={[...category.subcategories]} />

      {/* Products with Filter + Sort + Load More */}
      <div
        style={{
          background: "var(--bg-primary)",
          paddingTop: 1,
        }}
      >
        <ShopProductsClient
          products={products}
          heading={
            <div className="flex flex-col gap-2 px-4 sm:px-6 lg:px-8 pt-4">
              <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium">
                {category.description}
              </span>
              <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none">
                {category.title} Collection
              </h2>
            </div>
          }
        />
      </div>
    </main>
  );
}
