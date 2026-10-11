"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  crumbs: Crumb[];
}

export default function BreadcrumbNav({ crumbs }: BreadcrumbNavProps) {
  const t = useTranslations("public.shop.components.breadcrumb");
  return (
    <nav className="flex items-center gap-2 py-5 px-4 sm:py-6 sm:px-6 lg:py-8 lg:px-8 font-primary text-xs tracking-[0.06em] uppercase font-medium" aria-label={t("aria")}>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.label} className="flex items-center gap-2">
            {idx > 0 && <span className="text-[var(--text-disabled)] text-[10px]">◆</span>}
            {isLast || !crumb.href ? (
              <span className="text-[var(--text-primary)]">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-[var(--text-muted)] no-underline hover:text-[var(--accent-primary)] transition-colors duration-150">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
