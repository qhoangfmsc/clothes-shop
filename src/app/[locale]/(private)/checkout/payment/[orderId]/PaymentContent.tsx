"use client";

import { useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Link } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { isSafeQrUrl } from "../../_common/payment";
import { usePaymentSession } from "../../_common/use-payment-session";
import DetailRow from "../../_components/DetailRow";
import PaymentAmountBlock from "../../_components/PaymentAmountBlock";
import PaymentCountdown from "../../_components/PaymentCountdown";

const ease = [0.25, 0.1, 0.25, 1] as const;

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-1.5 min-h-11 py-3 px-7 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline border-none cursor-pointer shadow-[var(--shadow-gold-sm)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none";
const SECONDARY_LINK =
  "inline-flex items-center justify-center min-h-11 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-accent)] motion-reduce:transition-none";

function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="min-h-screen pt-[104px] sm:pt-[120px] pb-10 bg-[var(--bg-primary)]">
      <div
        className={`${wide ? "max-w-[880px]" : "max-w-[640px]"} mx-auto px-4 sm:px-6 flex flex-col gap-6`}
      >
        {children}
      </div>
    </main>
  );
}

function ResultPanel({
  icon,
  title,
  description,
  orderLabel,
  extra,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  orderLabel?: ReactNode;
  /** Extra block under the order id (e.g. the transfer code) */
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [...ease] }}
      className="flex flex-col items-center gap-5 py-16 px-2 sm:px-6 text-center"
      role="status"
    >
      <div className="w-24 h-24 rounded-full bg-[var(--color-champagne-cream)] flex items-center justify-center border border-[var(--border-subtle)]">
        {icon}
      </div>
      <h1 className="font-display font-normal text-2xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
        {title}
      </h1>
      <p className="m-0 font-primary text-base text-[var(--text-secondary)] tracking-[-0.02em] leading-[140%] max-w-[380px]">
        {description}
      </p>
      {orderLabel && (
        <p className="m-0 font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] break-all">
          {orderLabel}
        </p>
      )}
      {extra}
      <div className="flex flex-col items-center gap-2 mt-4">{children}</div>
    </motion.div>
  );
}

/** A transfer code in a small bordered card with a copy icon: what the shopper quotes if payment needs follow-up */
function CodeCard({ code, label }: { code: string; label: string }) {
  return (
    <div className="w-full max-w-[380px] px-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <DetailRow label={label} value={code} copyable />
    </div>
  );
}

export default function PaymentContent() {
  const t = useTranslations("private.checkout.payment");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const { orderId } = useParams<{ orderId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { phase, session, amount, error, connectionLost, isCreating, previousCodes, retry, recreate } = usePaymentSession(
    orderId,
    isAuthenticated
  );

  const handleRecreate = useCallback(async () => {
    try {
      await recreate();
    } catch (err: unknown) {
      toast.error(toErrorMessage(err, t("toast.recreateFailed")));
    }
  }, [recreate, toast, toErrorMessage, t]);

  const orderLabel = t.rich("orderId", {
    id: orderId,
    strong: (chunks) => <strong>{chunks}</strong>,
  });
  const orderLink = (
    <Link href={`/orders/${orderId}`} className={SECONDARY_LINK}>
      {t("viewOrder")}
    </Link>
  );

  if (authLoading || (isAuthenticated && phase === "loading")) {
    return (
      <Shell>
        <div
          aria-busy="true"
          aria-label={t("loading")}
          className="h-[480px] rounded-lg bg-[var(--color-champagne-cream)] animate-[checkout-shimmer_1.5s_ease_infinite] motion-reduce:animate-none"
        />
      </Shell>
    );
  }

  if (!isAuthenticated) {
    return (
      <Shell>
        <UnauthenticatedState />
      </Shell>
    );
  }

  if (phase === "paid") {
    return (
      <Shell>
        <ResultPanel
          icon={<CheckCircle size={48} style={{ color: "var(--accent-sage)" }} />}
          title={t("paid.title")}
          description={t("paid.description")}
          orderLabel={orderLabel}
          extra={
            <div className="flex flex-col items-center gap-3 w-full">
              {amount && <PaymentAmountBlock amount={amount} label={t("paid.amount")} />}
              {session && <CodeCard code={session.transferContent} label={t("transferContent")} />}
            </div>
          }
        >
          <Link href={`/orders/${orderId}`} className={PRIMARY_BUTTON}>
            {t("paid.viewOrder")} <ChevronRight size={14} />
          </Link>
          <Link href="/shop" className={SECONDARY_LINK}>
            {t("continue")}
          </Link>
        </ResultPanel>
      </Shell>
    );
  }

  if (phase === "expired") {
    return (
      <Shell>
        <ResultPanel
          icon={<Clock size={44} style={{ color: "var(--text-muted)" }} />}
          title={t("expired.title")}
          description={t("expired.description")}
          orderLabel={orderLabel}
          extra={
            <div className="flex flex-col items-center gap-3 w-full">
              {amount && <PaymentAmountBlock amount={amount} label={t("amount")} />}
              {session && (
                <div className="flex flex-col items-center gap-2 w-full max-w-[380px]">
                  <CodeCard code={session.transferContent} label={t("transferContent")} />
                  <p className="m-0 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
                    {t("expired.oldCodeHint")}
                  </p>
                </div>
              )}
            </div>
          }
        >
          <button
            type="button"
            className={PRIMARY_BUTTON}
            onClick={handleRecreate}
            disabled={isCreating}
          >
            {isCreating ? t("expired.recreating") : t("expired.recreate")}
          </button>
          {orderLink}
        </ResultPanel>
      </Shell>
    );
  }

  if (phase === "cancelled") {
    return (
      <Shell>
        <ResultPanel
          icon={<XCircle size={44} style={{ color: "var(--color-deep-rose)" }} />}
          title={t("cancelled.title")}
          description={t("cancelled.description")}
          orderLabel={orderLabel}
          extra={amount && <PaymentAmountBlock amount={amount} label={t("amount")} />}
        >
          {orderLink}
          <Link href="/shop" className={SECONDARY_LINK}>
            {t("continue")}
          </Link>
        </ResultPanel>
      </Shell>
    );
  }

  if (phase === "error" || !session) {
    return (
      <Shell>
        <ResultPanel
          icon={<AlertCircle size={44} style={{ color: "var(--color-deep-rose)" }} />}
          title={t("error.title")}
          description={toErrorMessage(error, t("error.description"))}
          orderLabel={orderLabel}
        >
          <button type="button" className={PRIMARY_BUTTON} onClick={retry}>
            {t("error.retry")}
          </button>
          {orderLink}
        </ResultPanel>
      </Shell>
    );
  }

  /* Waiting for the transfer: one screen — QR + amount on the left, transfer details on the right */
  return (
    <Shell wide>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [...ease] }}
        className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-5 md:gap-8 p-4 sm:p-6 md:p-8 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
      >
        {/* QR + amount */}
        <div className="flex flex-col items-center gap-3 md:justify-center">
          {isSafeQrUrl(session.qrUrl) && (
            /* eslint-disable-next-line @next/next/no-img-element -- the QR is a BE-generated image of any host; it must reach the banking app untouched, not go through the image optimizer */
            <img
              src={session.qrUrl}
              alt={t("qrAlt")}
              className="w-full max-w-[200px] md:max-w-[260px] aspect-square rounded-md bg-white p-2 border border-[var(--border-subtle)] object-contain"
            />
          )}
          <PaymentAmountBlock amount={amount ?? session} label={t("amount")} />
          {session.expiresAt && <PaymentCountdown expiresAt={session.expiresAt} />}
        </div>

        {/* Title, status, transfer details, guide */}
        <div className="min-w-0 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex flex-col gap-1">
              <h1 className="m-0 font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
                {t("title")}
              </h1>
              <p className="m-0 font-primary text-[11px] text-[var(--text-disabled)] tracking-[0.02em] break-all">
                {orderLabel}
              </p>
            </div>
            <p
              role="status"
              className="m-0 inline-flex items-center gap-2 py-1.5 px-3 rounded-full bg-[var(--color-champagne-cream)] border border-[var(--border-subtle)] font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium"
            >
              <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
              {t("waiting")}
            </p>
          </div>

          <div className="px-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
            <DetailRow label={t("bank")} value={session.bankName} />
            <DetailRow label={t("accountName")} value={session.accountName} />
            <DetailRow label={t("accountNumber")} value={session.accountNumber} copyable />
            <DetailRow label={t("transferContent")} value={session.transferContent} copyable />
          </div>

          {/* Steps from md up; phones only get the one-line hint to keep the page short */}
          <ol className="hidden md:flex m-0 pl-5 flex-col gap-1 font-primary text-xs text-[var(--text-secondary)] tracking-[-0.02em] leading-[150%]">
            <li>{t("guide.step1")}</li>
            <li>{t("guide.step2")}</li>
            <li>{t("guide.step3")}</li>
          </ol>
          <p className="m-0 md:hidden font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
            {t("guide.mobileHint")}
          </p>

          {connectionLost && (
            <p
              role="alert"
              className="m-0 flex items-center gap-2 font-primary text-xs text-[var(--color-deep-rose)] tracking-[-0.02em]"
            >
              <WifiOff size={14} className="shrink-0" />
              {t("connectionLost")}
            </p>
          )}

          {previousCodes.length > 0 && (
            <p className="m-0 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
              {t("previousCodes", { codes: previousCodes.join(", ") })}
            </p>
          )}
        </div>
      </motion.div>
    </Shell>
  );
}
