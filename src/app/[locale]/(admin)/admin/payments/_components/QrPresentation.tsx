"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle, X } from "lucide-react";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import { isSafeQrUrl } from "@/src/app/[locale]/(private)/checkout/_common/payment";
import type { AdminQrSession } from "../_common/types";

interface QrPresentationProps {
  qr: AdminQrSession;
  /** The order's payment state came back `paid` */
  paid: boolean;
  onClose: () => void;
}

/** A line of the transfer details, sized to read from across a counter */
function Line({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-primary text-xs sm:text-sm text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium">
        {label}
      </span>
      <span className="flex items-center gap-2 min-w-0">
        <span className="font-primary text-lg sm:text-2xl text-[var(--text-heading)] font-semibold tracking-[-0.02em] break-all">
          {value}
        </span>
        {copyable && <CopyButton value={value} label={label} />}
      </span>
    </div>
  );
}

/**
 * Full-screen view for the customer standing at the counter: only the QR, the amount and the transfer details,
 * on an opaque layer that hides the admin screen behind it. It enters the browser's full screen when it can
 * (no tabs or address bar), and Esc or the small close button leave it. Nothing else of the order or the admin shows.
 */
export default function QrPresentation({ qr, paid, onClose }: QrPresentationProps) {
  const t = useTranslations("admin.payments.orderTab.qr.present");
  const format = useFormatter();
  const layerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const layer = layerRef.current;
    /* Browser full screen is a bonus: iOS Safari and some embedded views refuse it, the layer still covers the page */
    layer?.requestFullscreen?.().catch(() => {});

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) onCloseRef.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);
    layer?.focus();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[300] bg-[var(--bg-primary)] overflow-y-auto outline-none"
    >
      {/* Small and quiet on purpose: the customer is looking at this screen */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        title={t("close")}
        className="fixed top-3 right-3 z-1 w-10 h-10 pointer-coarse:w-12 pointer-coarse:h-12 rounded-full border-0 bg-transparent text-[var(--text-disabled)] flex items-center justify-center cursor-pointer opacity-40 hover:opacity-100 focus-visible:opacity-100"
      >
        <X size={20} />
      </button>

      {paid ? (
        <div role="status" className="min-h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
          <CheckCircle size={96} style={{ color: "var(--accent-sage)" }} />
          <p className="m-0 font-display text-3xl sm:text-5xl text-[var(--text-heading)] tracking-[-0.04em]">{t("paid")}</p>
          <p className="m-0 font-primary text-base sm:text-xl text-[var(--text-secondary)]">{t("thanks")}</p>
        </div>
      ) : (
        <div className="min-h-full grid grid-cols-1 landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-6 sm:gap-10 p-6 sm:p-10 max-w-[1280px] mx-auto">
          <div className="flex flex-col items-center gap-4">
            {isSafeQrUrl(qr.qrUrl) && (
              /* eslint-disable-next-line @next/next/no-img-element -- the QR is a BE-generated image of any host; it must reach the banking app untouched */
              <img
                src={qr.qrUrl}
                alt={t("alt")}
                className="w-full max-w-[min(90vw,60vh)] md:max-w-[min(45vw,75vh)] aspect-square rounded-lg bg-white p-3 border border-[var(--border-subtle)] object-contain"
              />
            )}
            <p className="m-0 font-primary text-sm sm:text-base text-[var(--text-secondary)] text-center">{t("scan")}</p>
          </div>

          <div className="flex flex-col gap-5 min-w-0">
            <div className="flex flex-col gap-1">
              <span className="font-primary text-xs sm:text-sm text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium">
                {t("amount")}
              </span>
              <span className="font-display text-4xl sm:text-6xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
                {format.number(qr.amount, "vnd")}
              </span>
            </div>
            <div className="flex flex-col gap-4 pt-5 border-t border-[var(--border-subtle)]">
              <Line label={t("bank")} value={qr.bankName} />
              <Line label={t("accountName")} value={qr.accountName} />
              <Line label={t("accountNumber")} value={qr.accountNumber} copyable />
              <Line label={t("transferContent")} value={qr.transferContent} copyable />
            </div>
            {qr.expiresAt && (
              <p className="m-0 font-primary text-xs sm:text-sm text-[var(--text-muted)]">
                {t("expires", { date: format.dateTime(new Date(qr.expiresAt), "dateTime") })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
