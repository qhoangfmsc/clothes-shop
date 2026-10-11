"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { LEGAL_DOCS } from "@/src/lib/legal";

export default function Footer() {
  const t = useTranslations("public.landing.footer");
  const tLegal = useTranslations("shared.legal");
  return (
    <div
      id="outro-footer"
      style={{
        position: "fixed",
        pointerEvents: "none",
        left: 16,
        mixBlendMode: "exclusion",
        opacity: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        textTransform: "uppercase",
        color: "white",
        letterSpacing: "-0.02em",
      }}
      className="bottom-6 gap-5 justify-between w-[calc(100%-32px)] text-[11px] sm:bottom-8 sm:gap-20 sm:w-auto sm:text-[13px]"
    >
      <span>{t("copyright", { year: new Date().getFullYear() })}</span>
      {/* The bar ignores the pointer so it never blocks the page behind it; the links opt back in */}
      <nav aria-label={tLegal("title")} className="flex gap-4 sm:gap-8" style={{ pointerEvents: "auto" }}>
        {LEGAL_DOCS.slice(0, 2).map((doc) => (
          <Link key={doc.key} href={doc.path} className="text-inherit no-underline">
            {tLegal(doc.key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
