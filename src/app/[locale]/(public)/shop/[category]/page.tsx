import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ShopHero from "../_components/ShopHero";
import BreadcrumbNav from "../_components/BreadcrumbNav";
import SubcategoryChips from "../_components/SubcategoryChips";
import ShopProductsClient from "../_components/ShopProductsClient";

import { getCategoryBySlug, getProducts, getProductsWithParams, getCategories } from "../_lib/server-fetchers";
import { SHOP_PAGE_SIZE } from "../_common/constants";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import JsonLd from "@/src/app/[locale]/_components/JsonLd";
import { breadcrumbJsonLd } from "@/src/lib/structured-data";
import type { AppLocale } from "@/src/i18n/routing";

interface CategoryPageProps {
  params: Promise<{ locale: AppLocale; category: string }>;
}

/* ── Static params for all valid categories ── */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((cat) => ({
    category: cat.slug,
  }));
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  const tCommon = await getTranslations({ locale, namespace: "common" });
  if (!category) return { title: withBrand(tCommon("notFound")) };

  const t = await getTranslations({ locale, namespace: "public.shop.pages.category.meta" });
  const title = t("title", { category: category.title });
  const description = t("description", { description: category.description });
  const products = await getProducts(slug);
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/shop/${slug}`),
    ...buildSocialMetadata({
      locale,
      path: `/shop/${slug}`,
      title,
      description,
      image: products[0]?.images[0],
      imageAlt: category.title,
    }),
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, category: slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.shop.pages.category");
  const tNav = await getTranslations("shared.header.nav");
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const firstPage = await getProductsWithParams({ category: slug, limit: SHOP_PAGE_SIZE });
  const products = firstPage.data;

  /* Hero image comes from this category's first product — no placeholder
     banner. An empty category (no products yet) just shows a plain hero. */
  const firstProductImage = products[0]?.images[0];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Hero — unique per category */}
      <ShopHero
        label={t("heroLabel", { category: category.title })}
        title={category.title}
        description={category.description}
        banners={firstProductImage ? [{ image: firstProductImage }] : []}
      />

      {/* Breadcrumb */}
      <BreadcrumbNav
        crumbs={[
          { label: tNav("home"), href: "/" },
          { label: tNav("shop"), href: "/shop" },
          { label: category.title },
        ]}
      />

      {/* Subcategory filter chips */}
      <SubcategoryChips categorySlug={slug} subcategories={[...category.subcategories]} />

      {/* Products with Filter + Sort + Load More */}
      <div
        style={{
          background: "var(--bg-primary)",
          paddingTop: 1,
        }}
      >
        <ShopProductsClient
          initialProducts={products}
          initialTotal={firstPage.total}
          scope={{ category: slug }}
          heading={
            <div className="flex flex-col gap-2 px-4 sm:px-6 lg:px-8 pt-4">
              <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium">
                {category.description}
              </span>
              <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(1.75rem,5vw,3rem)] tracking-[-0.04em] leading-none">
                {t("collectionHeading", { category: category.title })}
              </h2>
            </div>
          }
        />
      </div>
    <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: tNav("home"), path: "" },
          { name: tNav("shop"), path: "/shop" },
          { name: category.title, path: `/shop/${slug}` },
        ])}
      />
    </main>
  );
}
