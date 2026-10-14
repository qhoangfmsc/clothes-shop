"use client";

import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  PUBLISHED: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
  HIDDEN: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
};

/** Visibility of one review: shown to the public or hidden by the store */
export default function ReviewStatusBadge({ status }: { status: string }) {
  const t = useTranslations("admin.reviews.status");
  return (
    <span
      className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary whitespace-nowrap ${
        STYLES[status] ?? "bg-[rgba(107,101,96,0.08)] text-[var(--text-muted)]"
      }`}
    >
      {t.has(status as never) ? t(status as never) : status}
    </span>
  );
}
