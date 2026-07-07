import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductDetailClient from "./_components/ProductDetailClient";
import {
  getProductById,
  getSubcategory,
  getProducts,
  getAllProducts,
} from "../../../_lib/server-fetchers";
import "../../../shop.css";
import "./product-detail.css";

interface ProductPageProps {
  params: Promise<{ category: string; subcategory: string; productId: string }>;
}

/* ── Static params ── */
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({
    category: p.category,
    subcategory: p.subcategory,
    productId: p.id,
  }));
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProductById(productId);
  if (!product) return { title: "Not Found — Ori Baebi" };

  return {
    title: `${product.name} — Ori Baebi`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { category: catSlug, subcategory: subSlug, productId } = await params;

  const product = await getProductById(productId);
  const result = await getSubcategory(catSlug, subSlug);

  if (!product || !result) {
    notFound();
  }

  const { category, subcategory } = result;

  /* Related products: same category but different product */
  const allCategoryProducts = await getProducts(catSlug);
  const related = allCategoryProducts.filter((p) => p.id !== product.id);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >


      {/* Spacer for fixed nav */}
      <div style={{ height: 80 }} />

      <ProductDetailClient
        product={product}
        categoryTitle={category.title}
        subcategoryLabel={subcategory.label}
        relatedProducts={related}
      />
    </main>
  );
}
