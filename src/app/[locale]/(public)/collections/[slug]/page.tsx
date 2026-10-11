import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import CollectionDetailClient from "./_components/CollectionDetailClient";
import {
  getCollections,
  getCollectionBySlug,
  getCollectionProducts,
} from "../../shop/_lib/server-fetchers";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import JsonLd from "@/src/app/[locale]/_components/JsonLd";
import { breadcrumbJsonLd } from "@/src/lib/structured-data";
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
  const title = t("title", { name: collection.name });
  return {
    title,
    description: collection.description,
    alternates: buildAlternates(locale, `/collections/${slug}`),
    ...buildSocialMetadata({
      locale,
      path: `/collections/${slug}`,
      title,
      description: collection.description,
      image: collection.image,
      imageAlt: collection.name,
    }),
  };
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  const tNav = await getTranslations("shared.header.nav");

  const products = await getCollectionProducts(slug);

  return (
    <main style={{ minHeight: "100vh" }}>
      <CollectionDetailClient collection={collection} products={products} />
    <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: tNav("home"), path: "" },
          { name: tNav("collections"), path: "/collections" },
          { name: collection.name, path: `/collections/${slug}` },
        ])}
      />
    </main>
  );
}
