"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  Minus,
  MoreHorizontal,
  PackageX,
  Plus,
  RefreshCw,
  Ruler,
  Shirt,
  Undo2,
} from "lucide-react";
import { Link, useRouter } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useShipping } from "@/src/hooks/use-api";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { errorCodeOf } from "@/src/i18n/error-message";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import { CARD_CLASS, GROUP_TITLE_CLASS, SECTION_CARD_CLASS } from "../../checkout/_common/checkout";
import OptionList, { type OptionRow } from "../../checkout/_components/OptionList";
import type { Order } from "../../orders/_common/types";
import OrderThumb from "../../orders/_components/OrderThumb";
import { RETURN_NOTE_MAX } from "../_common/constants";
import { RETURN_REASONS, type ReturnReason } from "../_common/types";
import { useReturnEligibility } from "../_common/use-return-eligibility";

const ease = [0.25, 0.1, 0.25, 1] as const;

const SHELL_CLASS = "min-h-screen pt-[96px] sm:pt-[104px] pb-8 bg-[var(--bg-primary)]";
const WRAP_CLASS = "max-w-[1080px] mx-auto px-4 sm:px-6";
const ICON_BUTTON =
  "w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center cursor-pointer hover:border-[var(--text-disabled)] disabled:opacity-40 disabled:cursor-not-allowed";

const REASON_ICONS: Record<ReturnReason, React.ReactNode> = {
  WRONG_SIZE: <Ruler size={16} />,
  CHANGED_MIND: <RefreshCw size={16} />,
  DEFECTIVE: <AlertTriangle size={16} />,
  WRONG_ITEM: <Shirt size={16} />,
  OTHER: <MoreHorizontal size={16} />,
};

type FieldErrors = Partial<Record<"items" | "reason", string>>;

export default function NewReturnContent() {
  const t = useTranslations("private.returns.form");
  const tReason = useTranslations("private.returns.reason");
  const tIneligible = useTranslations("private.returns.ineligible");
  const format = useFormatter();
  const { toast } = useToast();
  const toErrorMessage = useErrorMessage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? undefined;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { apiFetch } = useApiAuth();
  const { shipping } = useShipping();
  const { eligibility, isLoading: eligibilityLoading, error: eligibilityError, reload } = useReturnEligibility(
    orderId,
    isAuthenticated
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  /* orderItemId → quantity to send back; absent or 0 = line not returned */
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !orderId) {
      setOrderLoading(false);
      return;
    }
    apiFetch<{ data: Order }>(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((res) => setOrder(res.data ?? null))
      .catch((err) => toast.error(toErrorMessage(err, t("toast.loadFailed"))))
      .finally(() => setOrderLoading(false));
  }, [isAuthenticated, orderId, apiFetch, t, toast, toErrorMessage]);

  const returnable = new Map((eligibility?.items ?? []).map((item) => [item.orderItemId, item.returnableQuantity]));
  const selectedCount = Object.values(quantities).filter((q) => q > 0).length;
  const policy = shipping?.returnPolicy;

  const setQuantity = (orderItemId: string, value: number, max: number) => {
    const next = Math.max(0, Math.min(max, value));
    setQuantities((prev) => ({ ...prev, [orderItemId]: next }));
    setErrors((prev) => (prev.items ? { ...prev, items: undefined } : prev));
  };

  const handleSubmit = async () => {
    if (isSubmitting || !orderId) return;
    const found: FieldErrors = {};
    if (selectedCount === 0) found.items = t("errors.items");
    if (!reason) found.reason = t("errors.reason");
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ data: { id: string } }>("/api/returns", {
        method: "POST",
        body: {
          orderId,
          reason,
          ...(note.trim() ? { note: note.trim() } : {}),
          items: Object.entries(quantities)
            .filter(([, quantity]) => quantity > 0)
            .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
        },
      });
      toast.success(t("toast.created"));
      router.replace(res.data?.id ? `/returns/${encodeURIComponent(res.data.id)}` : "/returns");
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.failed")));
      /* 1802 / 1803: what can still be returned changed (another request, an expired window): show the real numbers */
      const code = errorCodeOf(err);
      if (code === 1802 || code === 1803) {
        setQuantities({});
        reload();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonOptions: OptionRow<ReturnReason>[] = RETURN_REASONS.map((value) => ({
    value,
    icon: REASON_ICONS[value],
    title: tReason(value),
  }));

  if (authLoading || eligibilityLoading || orderLoading) {
    return (
      <main className={SHELL_CLASS}>
        <div className={WRAP_CLASS}>
          <div className="h-[400px] rounded-lg bg-[var(--color-champagne-cream)] animate-[checkout-shimmer_1.5s_ease_infinite] motion-reduce:animate-none" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={SHELL_CLASS}>
        <UnauthenticatedState />
      </main>
    );
  }

  const backHref = orderId ? `/orders/${encodeURIComponent(orderId)}` : "/orders";
  const backLink = (
    <Link
      href={backHref}
      className="inline-flex items-center gap-2 min-h-11 self-start font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-primary)] motion-reduce:transition-none"
    >
      <ArrowLeft size={16} />
      {t("back")}
    </Link>
  );

  /* No order, or the order cannot be returned (anymore): say why instead of an empty form */
  if (!orderId || !order || !eligibility || !eligibility.eligible) {
    return (
      <main className={SHELL_CLASS}>
        <div className={`${WRAP_CLASS} max-w-[640px] flex flex-col gap-3`}>
          {backLink}
          <div className="flex flex-col items-center gap-3 py-12 px-6 text-center bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)]">
            <PackageX size={40} style={{ color: "var(--text-disabled)" }} />
            <h1 className="m-0 font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">
              {t("unavailable.title")}
            </h1>
            <p className="m-0 max-w-[380px] font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
              {eligibility?.reason
                ? tIneligible(eligibility.reason)
                : eligibilityError
                  ? toErrorMessage(eligibilityError, t("unavailable.description"))
                  : t("unavailable.description")}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={SHELL_CLASS}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [...ease] }}
        className={`${WRAP_CLASS} flex flex-col gap-3`}
      >
        <div className="flex flex-col gap-2">
          {backLink}
          <h1 className="flex items-center gap-3 m-0 font-display font-normal text-2xl sm:text-3xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            <Undo2 size={24} style={{ color: "var(--accent-primary)" }} />
            {t("title")}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-3 sm:gap-4 items-start">
          <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
            {/* Lines */}
            <section className={SECTION_CARD_CLASS}>
              <h2 className={GROUP_TITLE_CLASS}>{t("items.title")}</h2>
              <ul className="m-0 p-0 list-none flex flex-col gap-3">
                {order.items.map((item) => {
                  const max = returnable.get(item.id) ?? 0;
                  const quantity = quantities[item.id] ?? 0;
                  const selected = quantity > 0;
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 p-2.5 rounded-md border ${
                        selected
                          ? "border-[var(--accent-primary)] bg-[var(--color-champagne-cream)]"
                          : "border-[var(--border-light)] bg-[var(--bg-primary)]"
                      } ${max === 0 ? "opacity-60" : ""}`}
                    >
                      <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={max === 0}
                          onChange={(e) => setQuantity(item.id, e.target.checked ? 1 : 0, max)}
                          className="w-5 h-5 shrink-0 accent-[var(--accent-primary)]"
                        />
                        <OrderThumb src={item.productImage} alt={item.productName} />
                        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className="font-primary text-sm text-[var(--text-primary)] font-medium tracking-[-0.02em] line-clamp-2">
                            {item.productName}
                          </span>
                          <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                            {[item.size, item.color].filter(Boolean).join(" · ")} ·{" "}
                            {max === 0 ? t("items.alreadyRequested") : t("items.max", { max, total: item.quantity })}
                          </span>
                        </span>
                      </label>
                      {selected && (
                        <span className="shrink-0 inline-flex items-center gap-2">
                          <button
                            type="button"
                            className={ICON_BUTTON}
                            onClick={() => setQuantity(item.id, quantity - 1, max)}
                            aria-label={t("items.decrease")}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-5 text-center font-primary text-sm font-medium text-[var(--text-heading)]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            className={ICON_BUTTON}
                            disabled={quantity >= max}
                            onClick={() => setQuantity(item.id, quantity + 1, max)}
                            aria-label={t("items.increase")}
                          >
                            <Plus size={14} />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {errors.items && (
                <p role="alert" className="m-0 mt-2 font-primary text-xs text-[var(--color-deep-rose)]">
                  {errors.items}
                </p>
              )}
            </section>

            {/* Reason + note */}
            <section className={SECTION_CARD_CLASS}>
              <h2 className={GROUP_TITLE_CLASS}>{t("reason.title")}</h2>
              <OptionList
                name="return-reason"
                value={reason ?? ("" as ReturnReason)}
                options={reasonOptions}
                onChange={(value) => {
                  setReason(value);
                  setErrors((prev) => (prev.reason ? { ...prev, reason: undefined } : prev));
                }}
              />
              {errors.reason && (
                <p role="alert" className="m-0 mt-2 font-primary text-xs text-[var(--color-deep-rose)]">
                  {errors.reason}
                </p>
              )}
              <label className="flex flex-col gap-1.5 mt-4">
                <span className="font-primary text-xs text-[var(--text-muted)] tracking-[0.04em]">{t("note.label")}</span>
                <textarea
                  rows={3}
                  value={note}
                  maxLength={RETURN_NOTE_MAX}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full resize-y py-2.5 px-3.5 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
                <span className="self-end font-primary text-[11px] text-[var(--text-disabled)]">
                  {note.length}/{RETURN_NOTE_MAX}
                </span>
              </label>
            </section>
          </div>

          {/* Policy + submit */}
          <aside className={`${CARD_CLASS} flex flex-col gap-3.5 lg:sticky lg:top-[96px]`}>
            <h2 className="m-0 font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              {t("policy.title")}
            </h2>
            {eligibility.deadline && (
              <p className="m-0 py-2 px-3 rounded-md bg-[var(--color-sage-cream)] font-primary text-xs text-[var(--accent-sage)] font-medium tracking-[-0.02em]">
                {t("policy.deadline", { date: format.dateTime(new Date(eligibility.deadline), "dateTime") })}
              </p>
            )}
            {policy ? (
              <div className="flex flex-col gap-2 font-primary text-xs text-[var(--text-secondary)] tracking-[-0.02em] leading-[150%]">
                <p className="m-0">{policy.description}</p>
                {policy.conditions.length > 0 && (
                  <ul className="m-0 pl-4 flex flex-col gap-0.5">
                    {policy.conditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="m-0 font-primary text-xs text-[var(--text-muted)]">
                {t("policy.window", { days: eligibility.returnWindowDays })}
              </p>
            )}
            <p className="m-0 pt-3 border-t border-[var(--border-subtle)] font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
              {t("sizeHint")}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center justify-center w-full min-h-12 py-3.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase border-none cursor-pointer shadow-[var(--shadow-gold-sm)] transition-all duration-150 enabled:hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none"
            >
              {isSubmitting ? t("submitting") : t("submit")}
            </button>
          </aside>
        </div>
      </motion.div>
    </main>
  );
}
