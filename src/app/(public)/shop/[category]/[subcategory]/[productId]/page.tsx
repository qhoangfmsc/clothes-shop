import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeaderNav from "@/src/app/_components/HeaderNav";
import ShopFooter from "../../../_components/ShopFooter";
import ProductDetailClient from "./_components/ProductDetailClient";
import {
  getProductById,
  getSubcategory,
  getProducts,
  getAllProducts,
  CATEGORIES,
} from "../../../_data/shop-data";
import "../../../shop.css";
import "./product-detail.css";

interface ProductPageProps {
  params: Promise<{ category: string; subcategory: string; productId: string }>;
}

/* ── Static params ── */
export function generateStaticParams() {
  return getAllProducts().map((p) => ({
    category: p.category,
    subcategory: p.subcategory,
    productId: p.id,
  }));
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = getProductById(productId);
  if (!product) return { title: "Not Found — Ori Baebi" };

  return {
    title: `${product.name} — Ori Baebi`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { category: catSlug, subcategory: subSlug, productId } = await params;

  const product = getProductById(productId);
  const result = getSubcategory(catSlug, subSlug);

  if (!product || !result) {
    notFound();
  }

  const { category, subcategory } = result;

  /* Related products: same category but different product */
  const related = getProducts(catSlug).filter((p) => p.id !== product.id);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <HeaderNav />

      {/* Spacer for fixed nav */}
      <div style={{ height: 80 }} />

      <ProductDetailClient
        product={product}
        categoryTitle={category.title}
        subcategoryLabel={subcategory.label}
        relatedProducts={related}
      />

      <ShopFooter />
    </main>
  );
}
