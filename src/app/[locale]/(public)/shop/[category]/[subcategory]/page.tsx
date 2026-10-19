import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ShopHero from "../../_components/ShopHero";
import BreadcrumbNav from "../../_components/BreadcrumbNav";
import SubcategoryChips from "../../_components/SubcategoryChips";
import ShopProductsClient from "../../_components/ShopProductsClient";

import { getSubcategory, getProducts, getProductsWithParams, getCategories } from "../../_lib/server-fetchers";
import { SHOP_PAGE_SIZE } from "../../_common/constants";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import JsonLd from "@/src/app/[locale]/_components/JsonLd";
import { breadcrumbJsonLd } from "@/src/lib/structured-data";
import type { AppLocale } from "@/src/i18n/routing";

interface SubcategoryPageProps {
  params: Promise<{ locale: AppLocale; category: string; subcategory: string }>;
}

/* ── Static params for all valid category/subcategory combos ── */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      category: cat.slug,
      subcategory: sub.slug,
    }))
  );
}

/* ── Dynamic metadata ── */
export async function generateMetadata({ params }: SubcategoryPageProps): Promise<Metadata> {
  const { locale, category: catSlug, subcategory: subSlug } = await params;
  const result = await getSubcategory(catSlug, subSlug);
  const tCommon = await getTranslations({ locale, namespace: "common" });
  if (!result) return { title: withBrand(tCommon("notFound")) };

  const { category, subcategory } = result;
  const t = await getTranslations({ locale, namespace: "public.shop.pages.subcategory.meta" });

  const title = withBrand(`${subcategory.label} — ${category.title}`);
  const description = t("description", {
    description: subcategory.description,
    subcategory: subcategory.label,
    category: category.title,
  });
  const products = await getProducts(catSlug, subSlug);
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/shop/${catSlug}/${subSlug}`),
    ...buildSocialMetadata({
      locale,
      path: `/shop/${catSlug}/${subSlug}`,
      title,
      description,
      image: products[0]?.images[0],
      imageAlt: subcategory.label,
    }),
  };
}

export default async function SubcategoryPage({ params }: SubcategoryPageProps) {
  const { locale, category: catSlug, subcategory: subSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("public.shop.pages.subcategory");
  const tNav = await getTranslations("shared.header.nav");
  const result = await getSubcategory(catSlug, subSlug);

  if (!result) {
    notFound();
  }

  const { category, subcategory } = result;
  const firstPage = await getProductsWithParams({ category: catSlug, subcategory: subSlug, limit: SHOP_PAGE_SIZE });
  const products = firstPage.data;

  /* Hero image comes from this subcategory's first product — no placeholder
     banner. An empty subcategory (no products yet) just shows a plain hero. */
  const firstProductImage = products[0]?.images[0];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Hero */}
      <ShopHero
        label={`${category.title} — ${subcategory.label}`}
        title={subcategory.label}
        description={subcategory.description}
        banners={firstProductImage ? [{ image: firstProductImage }] : []}
      />

      {/* Breadcrumb */}
      <BreadcrumbNav
        crumbs={[
          { label: tNav("home"), href: "/" },
          { label: tNav("shop"), href: "/shop" },
          { label: category.title, href: `/shop/${category.slug}` },
          { label: subcategory.label },
        ]}
      />

      {/* Subcategory filter chips — highlight current */}
      <SubcategoryChips
        categorySlug={catSlug}
        subcategories={[...category.subcategories]}
        activeSlug={subSlug}
      />

      {/* Products */}
      <div
        style={{
          background: "var(--bg-primary)",
          paddingTop: 1,
        }}
      >
        <ShopProductsClient
          initialProducts={products}
          initialTotal={firstPage.total}
          scope={{ category: catSlug, subcategory: subSlug }}
          heading={
            <div className="flex flex-col gap-2 py-5 sm:py-6 sm:px-6">
              <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium px-4 sm:px-0">
                {subcategory.description}
              </span>
              <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(1.75rem,5vw,3rem)] tracking-[-0.04em] leading-none px-4 sm:px-0">
                {subcategory.label}
              </h2>
              <p className="text-[var(--text-muted)] font-primary text-[0.9375rem] tracking-[-0.02em] leading-[150%] max-w-[30rem] mt-2 px-4 sm:px-0">
                {t("pieceCount", { count: firstPage.total })}
              </p>
            </div>
          }
        />
      </div>
    <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: tNav("home"), path: "" },
          { name: tNav("shop"), path: "/shop" },
          { name: category.title, path: `/shop/${catSlug}` },
          { name: subcategory.label, path: `/shop/${catSlug}/${subSlug}` },
        ])}
      />
    </main>
  );
}
