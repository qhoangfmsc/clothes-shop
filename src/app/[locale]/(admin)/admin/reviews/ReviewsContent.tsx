"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Camera, ImageIcon, X } from "lucide-react";
import { Link, useRouter } from "@/src/i18n/navigation";
import { FormTabs } from "@/src/app/[locale]/_components/AdminFormKit";
import { usePendingCounts } from "@/src/app/[locale]/_components/PendingCountsProvider";
import StarRating from "@/src/app/[locale]/_components/StarRating";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableFilter,
  type DataTableRef,
} from "@/src/app/[locale]/_components/DataTable";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { toMediaUrl } from "@/src/lib/media-url";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { REVIEW_FITS, REVIEW_STATUSES, type AdminReview, type ReviewFit, type ReviewStatus } from "@/src/types/review";
import { fetchReviewDetail, fetchReviews } from "./_common/moduleSlice";
import { REVIEW_SORT_OPTIONS, REVIEW_TABS, type ReviewTab } from "./_common/constants";
import type { ReviewListResult } from "./_common/types";
import ReviewDetailPanel from "./_components/ReviewDetailPanel";
import ReviewStatusBadge from "./_components/ReviewStatusBadge";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function ReviewsContent() {
  const t = useTranslations("admin.reviews");
  const tFit = useTranslations("shared.reviews.fit");
  const sortOptions = useSortOptions(REVIEW_SORT_OPTIONS);
  const format = useFormatter();
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableRef = useRef<DataTableRef>(null);
  const total = useAppSelector((s) => s.reviews.total);
  const { counts } = usePendingCounts();

  /* `?product=<slug>` and `?userId=` narrow the list; `?reviewId=` opens a review (shareable, like orders and returns) */
  const product = searchParams.get("product") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const urlReviewId = searchParams.get("reviewId");
  /* The "awaiting reply" tab is the default: it is the queue the menu badge counts */
  const tab: ReviewTab = REVIEW_TABS.find((id) => id === searchParams.get("tab")) ?? "pending";

  const urlWith = (changes: Record<string, string | null>) => {
    const qs = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) qs.delete(key);
      else qs.set(key, value);
    }
    const text = qs.toString();
    return text ? `/admin/reviews?${text}` : "/admin/reviews";
  };
  const setTab = (next: ReviewTab) => router.replace(urlWith({ tab: next === "pending" ? null : next }), { scroll: false });

  const [detail, setDetail] = useState<AdminReview | null>(null);
  const openedFromUrl = useRef<string | null>(null);

  /* Open the review named in the URL once, from its own detail call */
  useEffect(() => {
    if (!urlReviewId) {
      openedFromUrl.current = null;
      setDetail(null);
      return;
    }
    if (openedFromUrl.current === urlReviewId) return;
    openedFromUrl.current = urlReviewId;
    dispatch(fetchReviewDetail(urlReviewId))
      .unwrap()
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [urlReviewId, dispatch]);

  const fetchData = async (params: DataTableFetchParams): Promise<ReviewListResult> => {
    const pendingTab = tab === "pending";
    const rating = Number(params.filters.rating);
    return dispatch(
      fetchReviews({
        search: params.search || undefined,
        /* The tab = exactly what the menu badge counts: published and not replied to */
        status: pendingTab ? "PUBLISHED" : ((params.filters.status || undefined) as ReviewStatus | undefined),
        replied: pendingTab ? "false" : ((params.filters.replied || undefined) as "true" | "false" | undefined),
        rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
        fit: (params.filters.fit || undefined) as ReviewFit | undefined,
        hasImages: (params.filters.hasImages || undefined) as "true" | "false" | undefined,
        product,
        userId,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();
  };

  const openDetail = (review: AdminReview) => {
    openedFromUrl.current = review.id;
    setDetail(review);
    router.push(urlWith({ reviewId: review.id }), { scroll: false });
    /* The row is enough to show at once; fetch the full detail */
    dispatch(fetchReviewDetail(review.id))
      .unwrap()
      .then(setDetail)
      .catch(() => {
        /* keep the row's data */
      });
  };

  const closeDetail = () => {
    openedFromUrl.current = null;
    setDetail(null);
    router.push(urlWith({ reviewId: null }), { scroll: false });
  };

  const handleChanged = (updated: AdminReview) => {
    setDetail(updated);
    /* The menu badge and the tab count refresh by themselves after the write */
    tableRef.current?.refresh();
  };

  const handleGone = () => {
    closeDetail();
    tableRef.current?.refresh();
  };

  const columns: DataTableColumn<AdminReview>[] = useMemo(
    () => [
      {
        key: "product",
        header: t("table.columns.product"),
        render: (r) => (
          <div className="flex items-center gap-3 min-w-0">
            {r.product?.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- small thumbnail from the media library
              <img src={toMediaUrl(r.product.image)} alt="" className="h-12 w-10 shrink-0 rounded-sm object-cover" />
            ) : (
              <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-sm bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                <ImageIcon size={14} />
              </div>
            )}
            <span className="line-clamp-2 min-w-0 text-sm font-semibold">{r.product?.name ?? "—"}</span>
          </div>
        ),
      },
      {
        key: "author",
        header: t("table.columns.author"),
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{r.author}</span>
            {r.userId && (
              <Link
                href={`/admin/reviews?userId=${encodeURIComponent(r.userId)}`}
                className="text-[11px] font-mono text-[var(--text-muted)] no-underline hover:underline"
              >
                {r.userId}
              </Link>
            )}
          </div>
        ),
      },
      {
        key: "rating",
        header: t("table.columns.rating"),
        render: (r) => <StarRating rating={r.rating} size={13} />,
      },
      {
        key: "content",
        header: t("table.columns.content"),
        hideBelow: "lg",
        render: (r) => (
          <div className="flex max-w-[280px] flex-col gap-0.5">
            {r.title && <span className="truncate text-xs font-semibold">{r.title}</span>}
            <span className="line-clamp-2 text-xs text-[var(--text-secondary)]">{r.content || "—"}</span>
          </div>
        ),
      },
      {
        key: "images",
        header: t("table.columns.images"),
        hideBelow: "md",
        render: (r) =>
          r.images.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Camera size={13} aria-hidden="true" />
              {r.images.length}
            </span>
          ) : (
            <span className="text-[var(--text-disabled)]">—</span>
          ),
      },
      {
        key: "helpful",
        header: t("table.columns.helpful"),
        hideBelow: "lg",
        render: (r) => <span className="text-xs tabular-nums">{r.helpfulCount}</span>,
      },
      {
        key: "status",
        header: t("table.columns.status"),
        render: (r) => (
          <div className="flex flex-col items-start gap-1">
            <ReviewStatusBadge status={r.status} />
            <span
              className={`text-[11px] font-primary ${r.reply ? "text-[var(--text-muted)]" : "text-[var(--text-accent)] font-semibold"}`}
            >
              {r.reply ? t("table.replied.yes") : t("table.replied.no")}
            </span>
          </div>
        ),
      },
      {
        key: "createdAt",
        header: t("table.columns.createdAt"),
        hideBelow: "sm",
        render: (r) => (
          <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">{format.dateTime(new Date(r.createdAt), "short")}</span>
        ),
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (r) => (
          <button
            type="button"
            className="py-1 px-3 pointer-coarse:min-h-11 text-xs font-medium font-primary bg-[var(--bg-elevated)] border-0 rounded-sm cursor-pointer text-[var(--text-secondary)]"
            onClick={() => openDetail(r)}
          >
            {t("table.view")}
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, t]
  );

  const filters: DataTableFilter[] = useMemo(() => {
    const common: DataTableFilter[] = [
      {
        key: "rating",
        label: t("table.filters.rating"),
        options: [5, 4, 3, 2, 1].map((stars) => ({ value: String(stars), label: t("table.filterOptions.stars", { stars }) })),
      },
      { key: "fit", label: t("table.filters.fit"), options: REVIEW_FITS.map((fit) => ({ value: fit, label: tFit(fit) })) },
      {
        key: "hasImages",
        label: t("table.filters.hasImages"),
        options: [
          { value: "true", label: t("table.filterOptions.withPhotos") },
          { value: "false", label: t("table.filterOptions.withoutPhotos") },
        ],
      },
    ];
    if (tab === "pending") return common;
    return [
      {
        key: "status",
        label: t("table.filters.status"),
        options: REVIEW_STATUSES.map((status) => ({ value: status, label: t(`status.${status}`) })),
      },
      {
        key: "replied",
        label: t("table.filters.replied"),
        options: [
          { value: "true", label: t("table.replied.yes") },
          { value: "false", label: t("table.replied.no") },
        ],
      },
      ...common,
    ];
  }, [tab, t, tFit]);

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">{t("page.title")}</h1>
          <p className="text-xs text-[var(--text-muted)] font-primary mt-1">{t("page.total", { count: total })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {product && (
            <FilterChip
              label={t("page.productFilter", { slug: product })}
              clearLabel={t("page.clearFilter")}
              href={urlWith({ product: null })}
            />
          )}
          {userId && (
            <FilterChip
              label={t("page.userFilter", { id: userId })}
              clearLabel={t("page.clearFilter")}
              href={urlWith({ userId: null })}
            />
          )}
        </div>
      </div>

      {/* The count on the first tab is the menu badge's own number: same source, same condition (published, no reply) */}
      <FormTabs
        tabs={[
          { id: "pending", label: counts.reviews === undefined ? t("tabs.pendingNoCount") : t("tabs.pending", { count: counts.reviews }) },
          { id: "all", label: t("tabs.all") },
        ]}
        active={tab}
        onChange={(id) => setTab(id as ReviewTab)}
      />

      <DataTable<AdminReview>
        /* Another tab or narrowing is another query: start the table fresh */
        key={`${tab}:${product ?? ""}:${userId ?? ""}`}
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchData}
        searchPlaceholder={t("table.searchPlaceholder")}
        filters={filters}
        sortOptions={sortOptions}
        emptyMessage={(filtered) =>
          filtered ? t("table.empty.filtered") : tab === "pending" ? t("table.empty.pending") : t("table.empty.none")
        }
      />

      {detail && <ReviewDetailPanel review={detail} onClose={closeDetail} onChanged={handleChanged} onGone={handleGone} />}
    </div>
  );
}

function FilterChip({ label, clearLabel, href }: { label: string; clearLabel: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 py-1.5 px-3 pointer-coarse:min-h-11 rounded-full bg-[var(--bg-elevated)] text-xs font-semibold font-primary text-[var(--text-secondary)] no-underline"
    >
      {label}
      <X size={12} aria-label={clearLabel} />
    </Link>
  );
}
