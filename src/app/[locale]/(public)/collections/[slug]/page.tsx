import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import CollectionDetailClient from "./_components/CollectionDetailClient";
import {
  getCollections,
  getCollectionBySlug,
  getCollectionProducts,
} from "../../shop/_lib/server-fetchers";
import { buildAlternates, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";

interface CollectionDetailPageProps {
  params: Promise<{ locale: AppLocale; slug: string }>;
}

/* ── Static params for all valid collections ── */
export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((col) => ({
    slug: col.slug,
  }));
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: CollectionDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const collection = await getCollectionBySlug(slug);
  const tCommon = await getTranslations({ locale, namespace: "common" });
  if (!collection) return { title: withBrand(tCommon("notFound")) };

  const t = await getTranslations({ locale, namespace: "public.collections.detailMeta" });
  return {
    title: t("title", { name: collection.name }),
    description: collection.description,
    alternates: buildAlternates(locale, `/collections/${slug}`),
  };
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  const products = await getCollectionProducts(slug);

  return (
    <main style={{ minHeight: "100vh" }}>
      <CollectionDetailClient collection={collection} products={products} />
    </main>
  );
}
