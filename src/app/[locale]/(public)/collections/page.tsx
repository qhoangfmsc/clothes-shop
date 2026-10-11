import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import CollectionsClient from "./_components/CollectionsClient";
import { getCollections, getBannerConfig } from "../shop/_lib/server-fetchers";
import { SITE_CONFIG_KEYS } from "@/src/types/site-config";
import { buildAlternates, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";

type CollectionsPageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: CollectionsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.collections.meta" });
  return {
    title: withBrand(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/collections"),
  };
}

export default async function CollectionsPage({ params }: CollectionsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [collections, heroBanners] = await Promise.all([
    getCollections(),
    getBannerConfig(SITE_CONFIG_KEYS.COLLECTIONS_HERO_BANNERS),
  ]);

  return (
    <main style={{ minHeight: "100vh" }}>
      <CollectionsClient collections={collections} heroBanners={heroBanners} />
    </main>
  );
}
