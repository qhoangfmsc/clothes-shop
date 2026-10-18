import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ShopHero from "./_components/ShopHero";
import CategoryGrid from "./_components/CategoryGrid";
import BreadcrumbNav from "./_components/BreadcrumbNav";
import ShopProductsClient from "./_components/ShopProductsClient";
import { getCategories, getProductsWithParams, getBannerConfig } from "./_lib/server-fetchers";
import { SHOP_PAGE_SIZE } from "./_common/constants";
import { SITE_CONFIG_KEYS } from "@/src/types/site-config";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import JsonLd from "@/src/app/[locale]/_components/JsonLd";
import { breadcrumbJsonLd } from "@/src/lib/structured-data";
import type { AppLocale } from "@/src/i18n/routing";

type ShopPageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.shop.pages.index.meta" });
  const title = withBrand(t("title"));
  return {
    title,
    description: t("description"),
    alternates: buildAlternates(locale, "/shop"),
    ...buildSocialMetadata({ locale, path: "/shop", title, description: t("description") }),
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.shop.pages.index");
  const tNav = await getTranslations("shared.header.nav");

  const [categories, firstPage, heroBanners] = await Promise.all([
    getCategories(),
    getProductsWithParams({ limit: SHOP_PAGE_SIZE }),
    getBannerConfig(SITE_CONFIG_KEYS.SHOP_HERO_BANNERS),
  ]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Hero */}
      <ShopHero
        label=""
        title={t("hero.title")}
        description={t("hero.description")}
        banners={heroBanners}
      />

      {/* Breadcrumb */}
      <BreadcrumbNav crumbs={[{ label: tNav("home"), href: "/" }, { label: tNav("shop") }]} />

      {/* Category Grid — Browse by Category */}
      <div className="flex flex-col gap-2 py-5 sm:py-6 sm:px-6">
        <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium px-4 sm:px-0">
          {t("browse.label")}
        </span>
        <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none px-4 sm:px-0">
          {t("browse.title")}
        </h2>
        <p className="text-[var(--text-muted)] font-primary text-[15px] tracking-[-0.02em] leading-[150%] max-w-[480px] mt-2 px-4 sm:px-0">
          {t("browse.description", { count: categories.length })}
        </p>
      </div>
      <CategoryGrid categories={categories} />

      {/* All Products Section with Filter + Sort + Load More */}
      <div
        style={{
          background: "var(--bg-section-3)",
          paddingTop: 1,
        }}
      >
        <ShopProductsClient
          initialProducts={firstPage.data}
          initialTotal={firstPage.total}
          heading={
            <div className="flex flex-col gap-2 px-4 sm:px-6 lg:px-8 pt-4">
              <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium">
                {t("all.label")}
              </span>
              <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none">
                {t("all.title")}
              </h2>
              <p className="text-[var(--text-muted)] font-primary text-[15px] tracking-[-0.02em] leading-[150%] max-w-[480px] mt-2">
                {t("all.description")}
              </p>
            </div>
          }
        />
      </div>
    <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: tNav("home"), path: "" },
          { name: tNav("shop"), path: "/shop" },
        ])}
      />
    </main>
  );
}
