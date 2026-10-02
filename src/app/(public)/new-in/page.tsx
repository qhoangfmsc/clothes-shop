import type { Metadata } from "next";

import NewInClient from "./_components/NewInClient";
import { getNewInProducts, getBannerConfig } from "../shop/_lib/server-fetchers";
import { SITE_CONFIG_KEYS } from "@/src/types/site-config";

export const metadata: Metadata = {
  title: "New In — DOOVAN",
  description:
    "Discover the latest arrivals at DOOVAN. Fresh drops, new silhouettes, and pieces designed for those who move first.",
};

export default async function NewInPage() {
  const [newProducts, heroBanners] = await Promise.all([
    getNewInProducts(),
    getBannerConfig(SITE_CONFIG_KEYS.NEW_IN_HERO_BANNERS),
  ]);

  return (
    <main style={{ minHeight: "100vh" }}>
      <NewInClient products={newProducts} heroBanners={heroBanners} />
    </main>
  );
}
