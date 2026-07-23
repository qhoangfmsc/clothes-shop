import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Package } from "lucide-react";

import ShopHero from "../shop/_components/ShopHero";
import BreadcrumbNav from "../shop/_components/BreadcrumbNav";
import ProductGrid from "../shop/_components/ProductGrid";
import { getProductsWithParams } from "../shop/_lib/server-fetchers";
import type { ProductListParams } from "../shop/_lib/server-fetchers";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q) return { title: "Search — Ori Baebi" };
  return {
    title: `"${q}" — Search — Ori Baebi`,
    description: `Search results for "${q}" in the Ori Baebi collection.`,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: pageStr, sort } = await searchParams;

  if (!q) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <ShopHero
          label="Ori Baebi"
          title="Search"
          description="Find your perfect piece."
          heroImage="/images/model-intro/model_intro_2.webp"
        />
        <BreadcrumbNav
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: "Search" },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4">
          <Search size={48} className="text-[var(--text-disabled)]" />
          <h3 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">
            Search the Collection
          </h3>
          <p className="font-primary text-[15px] text-[var(--text-muted)] tracking-[-0.02em] max-w-80 leading-[150%]">
            Enter a keyword to find your perfect piece.
          </p>
        </div>
      </main>
    );
  }

  const page = pageStr ? parseInt(pageStr) : 1;
  const params: ProductListParams = {
    search: q,
    page,
    limit: 24,
  };
  if (sort) params.sort = sort as ProductListParams["sort"];

  const result = await getProductsWithParams(params);
  const totalPages = Math.ceil(result.total / result.limit);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <ShopHero
        label="Search Results"
        title={`"${q}"`}
        description={`${result.total} ${result.total === 1 ? "piece" : "pieces"} found`}
        heroImage={result.data[0]?.images[0]}
      />

      <BreadcrumbNav
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: `Search: "${q}"` },
        ]}
      />

      {result.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4">
          <Package size={48} className="text-[var(--text-disabled)]" />
          <h3 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">
            No Results Found
          </h3>
          <p className="font-primary text-[15px] text-[var(--text-muted)] tracking-[-0.02em] max-w-80 leading-[150%]">
            We couldn&apos;t find any pieces matching &quot;{q}&quot;. Try a different search term or browse our collections.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-full border border-[var(--border-light)] font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium mt-2"
          >
            Browse All <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pb-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3">
              {sort && (
                <span className="inline-flex items-center gap-1 py-1 px-3 bg-[var(--bg-elevated)] rounded-full text-xs font-medium text-[var(--text-secondary)]">
                  {sort === "price_asc" && "Price: Low → High"}
                  {sort === "price_desc" && "Price: High → Low"}
                  {sort === "newest" && "Newest"}
                  {sort === "name_asc" && "Name: A → Z"}
                  {sort === "name_desc" && "Name: Z → A"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/search?q=${encodeURIComponent(q)}&sort=price_asc`}
                className="py-1.5 px-3 rounded-full text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] no-underline hover:border-[var(--border-light)] transition-colors"
              >
                Price ↑
              </Link>
              <Link
                href={`/search?q=${encodeURIComponent(q)}&sort=price_desc`}
                className="py-1.5 px-3 rounded-full text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] no-underline hover:border-[var(--border-light)] transition-colors"
              >
                Price ↓
              </Link>
              <Link
                href={`/search?q=${encodeURIComponent(q)}&sort=newest`}
                className="py-1.5 px-3 rounded-full text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] no-underline hover:border-[var(--border-light)] transition-colors"
              >
                Newest
              </Link>
            </div>
          </div>

          <ProductGrid products={result.data} />

          {/* Server-side Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-8">
              {page > 1 ? (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}${sort ? `&sort=${sort}` : ""}`}
                  className="flex items-center justify-center w-9 h-9 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] no-underline hover:bg-[var(--bg-elevated)] transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </Link>
              ) : (
                <span className="flex items-center justify-center w-9 h-9 rounded-sm text-[var(--text-disabled)] opacity-30">
                  <ChevronLeft size={16} />
                </span>
              )}
              <span className="text-sm text-[var(--text-muted)] font-primary">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}${sort ? `&sort=${sort}` : ""}`}
                  className="flex items-center justify-center w-9 h-9 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] no-underline hover:bg-[var(--bg-elevated)] transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <span className="flex items-center justify-center w-9 h-9 rounded-sm text-[var(--text-disabled)] opacity-30">
                  <ChevronRight size={16} />
                </span>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
