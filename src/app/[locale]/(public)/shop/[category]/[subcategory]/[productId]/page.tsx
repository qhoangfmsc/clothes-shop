import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ProductDetailClient from "./_components/ProductDetailClient";
import {
  getProductWithRelated,
  getSubcategory,
  getAllProducts,
} from "../../../_lib/server-fetchers";
import { buildAlternates } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";

interface ProductPageProps {
  params: Promise<{ locale: AppLocale; category: string; subcategory: string; productId: string }>;
}

/* ── Static params ── */
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({
    category: p.category?.slug ?? "",
    subcategory: p.subcategory?.slug ?? "",
    productId: p.id,
  }));
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, category, subcategory, productId } = await params;
  const result = await getProductWithRelated(productId);
  const tCommon = await getTranslations({ locale, namespace: "common" });
  if (!result) return { title: `${tCommon("notFound")} — DOOVAN` };

  const t = await getTranslations({ locale, namespace: "public.product.meta" });
  return {
    title: t("title", { name: result.product.name }),
    description: result.product.description,
    alternates: buildAlternates(locale, `/shop/${category}/${subcategory}/${productId}`),
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { locale, category: catSlug, subcategory: subSlug, productId } = await params;
  setRequestLocale(locale);

  const productResult = await getProductWithRelated(productId);
  const catResult = await getSubcategory(catSlug, subSlug);

  if (!productResult || !catResult) {
    notFound();
  }

  const { product, related } = productResult;
  const { category, subcategory } = catResult;

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
