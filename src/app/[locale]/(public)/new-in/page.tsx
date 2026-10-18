import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import NewInClient from "./_components/NewInClient";
import { getProductsWithParams, getBannerConfig } from "../shop/_lib/server-fetchers";
import { SHOP_PAGE_SIZE } from "../shop/_common/constants";
import { SITE_CONFIG_KEYS } from "@/src/types/site-config";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";

type NewInPageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: NewInPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.newIn.meta" });
  const title = withBrand(t("title"));
  return {
    title,
    description: t("description"),
    alternates: buildAlternates(locale, "/new-in"),
    ...buildSocialMetadata({ locale, path: "/new-in", title, description: t("description") }),
  };
}

export default async function NewInPage({ params }: NewInPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [newProducts, heroBanners] = await Promise.all([
    getProductsWithParams({ badge: "new", limit: SHOP_PAGE_SIZE }),
    getBannerConfig(SITE_CONFIG_KEYS.NEW_IN_HERO_BANNERS),
  ]);

  return (
    <main style={{ minHeight: "100vh" }}>
      <NewInClient products={newProducts.data} total={newProducts.total} heroBanners={heroBanners} />
    </main>
  );
}
