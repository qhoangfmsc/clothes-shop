import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ShopHero from "../../_components/ShopHero";
import BreadcrumbNav from "../../_components/BreadcrumbNav";
import SubcategoryChips from "../../_components/SubcategoryChips";
import ProductGrid from "../../_components/ProductGrid";

import { getSubcategory, getProducts, getCategories } from "../../_lib/server-fetchers";

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
        heroImage={products[0]?.images[0] ?? "/images/model-intro/model_intro_1.webp"}
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
          background: "var(--bg-primary)",
          paddingTop: 1,
        }}
      >
        <div className="flex flex-col gap-2 py-5 sm:py-6 sm:px-6">
          <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium px-4 sm:px-0">
            {subcategory.description}
          </span>
          <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none px-4 sm:px-0">
            {subcategory.label}
          </h2>
          <p className="text-[var(--text-muted)] font-primary text-[15px] tracking-[-0.02em] leading-[150%] max-w-[480px] mt-2 px-4 sm:px-0">
            {products.length} {products.length === 1 ? "piece" : "pieces"} in this collection
          </p>
        </div>
        <ProductGrid products={products} />
      </div>
    </main>
  );
}
