"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";

export default function ViewButton() {
  const t = useTranslations("public.landing");
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/shop")}
      id="outro-buy"
      style={{
        position: "fixed",
        cursor: "pointer",
        zIndex: 15,
        transformOrigin: "right bottom",
        transform: "scale(1)",
        background: "#000",
        borderRadius: "var(--radius-pill)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--shadow-lg)",
      }}
      className="left-[calc(var(--page-edge)+1rem)] right-[calc(var(--page-edge)+1rem)] bottom-[3.75rem] h-[4.5rem] sm:left-auto sm:right-[calc(var(--page-edge)+2rem)] sm:bottom-8 sm:w-[12.5rem] sm:h-[3.75rem]"
    >
      <span
        className="text-[1.625rem] sm:text-[2rem]"
        style={{
          letterSpacing: "-0.04em",
          color: "var(--color-white)",
          textTransform: "lowercase",
        }}
      >
        {t("viewButton")}
      </span>
    </button>
  );
}
