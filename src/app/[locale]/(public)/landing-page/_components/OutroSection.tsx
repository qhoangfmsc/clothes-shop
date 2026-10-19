"use client";

import { useTranslations } from "next-intl";

export default function OutroSection() {
  const t = useTranslations("public.landing.outro");
  return (
    <div
      id="outro-overlay"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 12,
        background: "var(--bg-primary)",
        opacity: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
          position: "relative",
        }}
        className="px-6 sm:px-8 lg:px-12"
      >
        {/* Decorative top accent line */}
        <div
          style={{
            width: 1,
            height: "3rem",
            background: "var(--accent-primary)",
            opacity: 0.4,
            marginBottom: "var(--space-8)",
          }}
          className="hidden sm:block"
        />

        {/* Main heading — editorial split */}
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            color: "var(--text-heading)",
            letterSpacing: "-0.04em",
            lineHeight: "110%",
          }}
          className="text-[2.375rem] sm:text-[4.25rem] lg:text-[6rem]"
        >
          <span style={{ display: "block" }}>{t("titleLine1")}</span>
          <span
            style={{
              display: "block",
              color: "var(--accent-primary)",
            }}
          >
            {t("titleLine2")}
          </span>
        </h2>

        {/* Decorative divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            margin: "var(--space-8) 0",
          }}
          className="sm:my-10 lg:my-12"
        >
          <div
            style={{
              height: 1,
              background: "var(--border-subtle)",
            }}
            className="w-8 sm:w-16 lg:w-24"
          />
          <div
            style={{
              width: "0.375rem",
              height: "0.375rem",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent-primary)",
              opacity: 0.6,
            }}
          />
          <div
            style={{
              height: 1,
              background: "var(--border-subtle)",
            }}
            className="w-8 sm:w-16 lg:w-24"
          />
        </div>

        {/* Subtitle */}
        <p
          style={{
            color: "var(--text-secondary)",
            letterSpacing: "-0.02em",
            lineHeight: "180%",
            fontFamily: "var(--font-primary)",
            fontWeight: 500,
          }}
          className="text-[0.75rem] sm:text-[0.875rem] lg:text-[0.9375rem] max-w-[17.5rem] sm:max-w-[25rem] lg:max-w-[27.5rem]"
        >
          {t("subtitle")}
          <br />
          {t("subtitleLine2")}
        </p>

        {/* Decorative bottom accent line */}
        <div
          style={{
            width: 1,
            height: "3rem",
            background: "var(--accent-primary)",
            opacity: 0.4,
            marginTop: "var(--space-8)",
          }}
          className="hidden sm:block"
        />
      </div>
    </div>
  );
}
