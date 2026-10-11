import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import NewInClient from "./_components/NewInClient";
import { getNewInProducts, getBannerConfig } from "../shop/_lib/server-fetchers";
import { SITE_CONFIG_KEYS } from "@/src/types/site-config";
import { buildAlternates, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";

type NewInPageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: NewInPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.newIn.meta" });
  return {
    title: withBrand(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/new-in"),
  };
}

export default async function NewInPage({ params }: NewInPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
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
