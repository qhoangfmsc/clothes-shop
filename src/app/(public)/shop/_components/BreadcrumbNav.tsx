"use client";

import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  crumbs: Crumb[];
}

export default function BreadcrumbNav({ crumbs }: BreadcrumbNavProps) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.label} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {idx > 0 && <span className="breadcrumb__separator">◆</span>}
            {isLast || !crumb.href ? (
              <span className="breadcrumb__current">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="breadcrumb__link">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
