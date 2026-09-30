import type { Metadata } from "next";


import CollectionsClient from "./_components/CollectionsClient";
import { getCollections, getBannerConfig } from "../shop/_lib/server-fetchers";
import { SITE_CONFIG_KEYS } from "@/src/types/site-config";

export const metadata: Metadata = {
  title: "Collections — DOOVAN",
  description:
    "Explore the DOOVAN collections. Curated seasonal edits and signature styles — each collection a chapter in the DOOVAN narrative.",
};

export default async function CollectionsPage() {
  const [collections, heroBanners] = await Promise.all([
    getCollections(),
    getBannerConfig(SITE_CONFIG_KEYS.COLLECTIONS_HERO_BANNERS),
  ]);

  /* Hero banner images — from Site Config > COLLECTIONS_HERO_BANNERS. No
     fallback image: if nothing is configured, CollectionsClient shows a
     plain color instead. */
  const heroImages = heroBanners.map((b) => b.image);

  return (
    <main style={{ minHeight: "100vh" }}>
      <CollectionsClient collections={collections} heroImages={heroImages} />
    </main>
  );
}
