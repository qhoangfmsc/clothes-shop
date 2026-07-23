import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CollectionDetailClient from "./_components/CollectionDetailClient";
import {
  getCollections,
  getCollectionBySlug,
  getCollectionProducts,
} from "../../shop/_lib/server-fetchers";

interface CollectionDetailPageProps {
  params: Promise<{ slug: string }>;
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
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return { title: "Not Found — Ori Baebi" };

  return {
    title: `${collection.name} — Collections — Ori Baebi`,
    description: collection.description,
  };
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { slug } = await params;
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
