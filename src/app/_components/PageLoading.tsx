/* ═══════════════════════════════════════════════════════════
   PAGE LOADING — Branded loading screen for page transitions
   
   3 variants:
   - "screen"  → Full page branded loading (page navigation)
   - "spinner" → Small spinner for lazy/infinite scroll
   - "inline"  → Inline loading for sections
   ═══════════════════════════════════════════════════════════ */

"use client";

import "@/src/styles/page-loading.css";

type LoadingVariant = "screen" | "spinner" | "inline";

interface PageLoadingProps {
  variant?: LoadingVariant;
  message?: string;
}

/* ── Branded Logo Mark (simplified "O" from Ori) ── */
function LogoMark() {
  return (
    <svg
      className="page-loading__logo"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="var(--accent-primary)"
        strokeWidth="1.5"
        className="page-loading__logo-circle"
      />
      <circle
        cx="24"
        cy="24"
        r="12"
        stroke="var(--accent-primary)"
        strokeWidth="1"
        opacity="0.5"
        className="page-loading__logo-inner"
      />
    </svg>
  );
}

/* ── Full screen branded loading ── */
function ScreenLoading({ message }: { message?: string }) {
  return (
    <div className="page-loading page-loading--screen" role="status" aria-live="polite">
      <div className="page-loading__content">
        <LogoMark />
        <span className="page-loading__brand">Ori Baebi</span>
        {message && (
          <span className="page-loading__message">{message}</span>
        )}
        <div className="page-loading__bar">
          <div className="page-loading__bar-fill" />
        </div>
      </div>
    </div>
  );
}

/* ── Small spinner for lazy load / infinite scroll ── */
function SpinnerLoading({ message }: { message?: string }) {
  return (
    <div className="page-loading page-loading--spinner" role="status" aria-live="polite">
      <div className="page-loading__spinner" />
      {message && (
        <span className="page-loading__spinner-text">{message}</span>
      )}
    </div>
  );
}

/* ── Inline section loading ── */
function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="page-loading page-loading--inline" role="status" aria-live="polite">
      <div className="page-loading__dots">
        <span className="page-loading__dot" />
        <span className="page-loading__dot" />
        <span className="page-loading__dot" />
      </div>
      {message && (
        <span className="page-loading__inline-text">{message}</span>
      )}
    </div>
  );
}

/* ── Main Export ── */
export default function PageLoading({ variant = "screen", message }: PageLoadingProps) {
  switch (variant) {
    case "spinner":
      return <SpinnerLoading message={message} />;
    case "inline":
      return <InlineLoading message={message} />;
    default:
      return <ScreenLoading message={message} />;
  }
}
