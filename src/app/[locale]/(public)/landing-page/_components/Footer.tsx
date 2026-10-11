"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("public.landing.footer");
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
      <span>{t("privacy")}</span>
    </div>
  );
}
