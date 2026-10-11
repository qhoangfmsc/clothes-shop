"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/src/i18n/navigation";
import { useRouter } from "@/src/i18n/navigation";
import {
  ArrowLeft,
  MapPin,
  Package,
  CheckCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  selectCartItems,
  selectTotalPrice,
  selectTotalItems,
  clearCart,
} from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { errorMessage } from "@/src/i18n/error-message";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface AddressForm {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  notes: string;
}

const INITIAL_ADDRESS: AddressForm = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Vietnam",
  notes: "",
};

type CheckoutStep = "address" | "review" | "success";

export default function CheckoutContent() {
  const t = useTranslations("private.checkout");
  const format = useFormatter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const totalPrice = useAppSelector(selectTotalPrice);
  const totalItems = useAppSelector(selectTotalItems);
  const { apiFetch } = useApiAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<CheckoutStep>("address");
  const [address, setAddress] = useState<AddressForm>({
    ...INITIAL_ADDRESS,
    fullName: user?.name ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});

  /* Validate address — only BE-required fields */
  const validateAddress = useCallback((): boolean => {
    const errs: Partial<Record<keyof AddressForm, string>> = {};
    if (!address.fullName.trim()) errs.fullName = t("address.errors.fullName");
    if (!address.phone.trim()) errs.phone = t("address.errors.phone");
    if (!address.addressLine1.trim()) errs.addressLine1 = t("address.errors.street");
    if (!address.city.trim()) errs.city = t("address.errors.city");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [address, t]);

  /* Step 1 → 2 */
  const handleContinueToReview = useCallback(() => {
    if (!validateAddress()) return;
    setStep("review");
  }, [validateAddress]);

  /* Step 2 → Place order */
  const handlePlaceOrder = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      /* 1) Save address → get addressId */
      const addrRes = await apiFetch<{ data: { id: string } }>("/api/addresses", {
        method: "POST",
        body: {
          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || undefined,
          city: address.city,
          province: address.province || undefined,
          postalCode: address.postalCode || undefined,
          country: address.country || "Vietnam",
        },
      });

      const addressId = addrRes.data?.id;
      if (!addressId) throw new Error(t("toast.addressFailed"));

      /* 2) Place order using addressId */
      const orderRes = await apiFetch<{ data: { id: string } }>("/api/orders", {
        method: "POST",
        body: {
          addressId,
          shippingMethod: "standard",
          note: address.notes || undefined,
        },
      });

      setOrderId(orderRes.data?.id ?? null);
      dispatch(clearCart());
      setStep("success");
      toast.success(t("toast.placed"));
    } catch (err: unknown) {
      toast.error(errorMessage(err, t("toast.failed")));
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, apiFetch, address, dispatch, toast, t]);

  const updateField = useCallback(
    (field: keyof AddressForm, value: string) => {
      setAddress((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  /* Loading */
  if (isLoading) {
    return (
      <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 flex flex-col gap-6">
          <div className="h-[400px] rounded-lg bg-[var(--color-champagne-cream)] animate-[checkout-shimmer_1.5s_ease_infinite] motion-reduce:animate-none" />
        </div>
      </main>
    );
  }

  /* Not authenticated */
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
        <UnauthenticatedState />
      </main>
    );
  }

  /* Empty cart */
  if (items.length === 0 && step !== "success") {
    return (
      <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-5 py-16 px-6 text-center">
            <Package size={40} style={{ color: "var(--text-disabled)" }} />
            <h2 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">
              {t("empty.title")}
            </h2>
            <p className="font-primary text-base text-[var(--text-muted)]">
              {t("empty.description")}
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-full border border-[var(--border-light)] font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium"
            >
              {t("empty.browse")} <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-[120px] pb-16 bg-[var(--bg-primary)]">
      <div className="max-w-[640px] mx-auto px-4 sm:px-6 flex flex-col gap-6">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [...ease] }}
        >
          {step !== "success" && (
            <Link
              href={step === "review" ? "#" : "/cart"}
              onClick={(e) => {
                if (step === "review") {
                  e.preventDefault();
                  setStep("address");
                }
              }}
              className="inline-flex items-center gap-2 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-primary)] motion-reduce:transition-none"
            >
              <ArrowLeft size={16} />
              {step === "review" ? t("back.editAddress") : t("back.toBag")}
            </Link>
          )}
        </motion.div>

        {/* Steps indicator */}
        {step !== "success" && (
          <div className="flex items-center gap-3 justify-center py-4">
            <div
              className={`flex items-center gap-1.5 font-primary text-xs tracking-[0.08em] uppercase font-medium ${
                step === "address"
                  ? "text-[var(--accent-primary)]"
                  : step === "review"
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-disabled)]"
              }`}
            >
              <MapPin size={14} />
              <span>{t("steps.address")}</span>
            </div>
            <div className="w-10 h-px bg-[var(--border-light)]" />
            <div
              className={`flex items-center gap-1.5 font-primary text-xs tracking-[0.08em] uppercase font-medium ${
                step === "review"
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--text-disabled)]"
              }`}
            >
              <Package size={14} />
              <span>{t("steps.review")}</span>
            </div>
          </div>
        )}

        {/* ── Step 1: Address ── */}
        {step === "address" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease] }}
            className="px-6 py-8 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
          >
            <h1 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em] leading-none mb-6">
              {t("address.title")}
            </h1>

            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4">
              {/* ── Contact Section ── */}
              <p className="col-span-full font-primary text-xs text-[var(--text-muted)] tracking-[0.12em] uppercase font-medium m-0 pt-2 border-t border-[var(--border-subtle)] first:border-t-0 first:pt-0">
                {t("address.contactSection")}
              </p>

              <div className="flex flex-col gap-1">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.fullName")} *
                </label>
                <input
                  type="text"
                  className={`py-2.5 px-4 rounded-md border bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none ${
                    errors.fullName
                      ? "border-[var(--color-deep-rose)]"
                      : "border-[var(--border-light)]"
                  }`}
                  value={address.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder={t("address.placeholders.fullName")}
                />
                {errors.fullName && (
                  <span className="flex items-center gap-1 font-primary text-xs text-[var(--color-deep-rose)] tracking-[-0.02em]">
                    <AlertCircle size={12} /> {errors.fullName}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.phone")} *
                </label>
                <input
                  type="tel"
                  className={`py-2.5 px-4 rounded-md border bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none ${
                    errors.phone
                      ? "border-[var(--color-deep-rose)]"
                      : "border-[var(--border-light)]"
                  }`}
                  value={address.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder={t("address.placeholders.phone")}
                />
                {errors.phone && (
                  <span className="flex items-center gap-1 font-primary text-xs text-[var(--color-deep-rose)] tracking-[-0.02em]">
                    <AlertCircle size={12} /> {errors.phone}
                  </span>
                )}
              </div>

              {/* ── Address Section ── */}
              <p className="col-span-full font-primary text-xs text-[var(--text-muted)] tracking-[0.12em] uppercase font-medium m-0 pt-2 border-t border-[var(--border-subtle)]">
                {t("address.deliverySection")}
              </p>

              <div className="flex flex-col gap-1 col-span-full">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.street")} *
                </label>
                <input
                  type="text"
                  className={`py-2.5 px-4 rounded-md border bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none ${
                    errors.addressLine1
                      ? "border-[var(--color-deep-rose)]"
                      : "border-[var(--border-light)]"
                  }`}
                  value={address.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                  placeholder={t("address.placeholders.street")}
                />
                {errors.addressLine1 && (
                  <span className="flex items-center gap-1 font-primary text-xs text-[var(--color-deep-rose)] tracking-[-0.02em]">
                    <AlertCircle size={12} /> {errors.addressLine1}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 col-span-full">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.line2")}
                </label>
                <input
                  type="text"
                  className="py-2.5 px-4 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none"
                  value={address.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                  placeholder={t("address.placeholders.line2")}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.city")} *
                </label>
                <input
                  type="text"
                  className={`py-2.5 px-4 rounded-md border bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none ${
                    errors.city
                      ? "border-[var(--color-deep-rose)]"
                      : "border-[var(--border-light)]"
                  }`}
                  value={address.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder={t("address.placeholders.city")}
                />
                {errors.city && (
                  <span className="flex items-center gap-1 font-primary text-xs text-[var(--color-deep-rose)] tracking-[-0.02em]">
                    <AlertCircle size={12} /> {errors.city}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.province")}
                </label>
                <input
                  type="text"
                  className="py-2.5 px-4 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none"
                  value={address.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  placeholder={t("address.placeholders.province")}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.postalCode")}
                </label>
                <input
                  type="text"
                  className="py-2.5 px-4 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none"
                  value={address.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  placeholder={t("address.placeholders.postalCode")}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.country")}
                </label>
                <input
                  type="text"
                  className="py-2.5 px-4 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none"
                  value={address.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder={t("address.placeholders.country")}
                />
              </div>

              {/* ── Additional ── */}
              <div className="flex flex-col gap-1 col-span-full">
                <label className="font-primary text-xs text-[var(--text-secondary)] tracking-[0.04em] uppercase font-medium">
                  {t("address.notes")}
                </label>
                <textarea
                  className="py-2.5 px-4 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] resize-y min-h-[72px] motion-reduce:transition-none"
                  value={address.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder={t("address.placeholders.notes")}
                  rows={3}
                />
              </div>
            </div>

            <button
              type="button"
              className="flex items-center justify-center gap-2 w-full mt-6 py-3.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase border-none cursor-pointer shadow-[var(--shadow-gold-sm)] transition-all duration-150 hover:opacity-90 hover:-translate-y-px motion-reduce:transition-none motion-reduce:animate-none"
              onClick={handleContinueToReview}
            >
              {t("address.continue")} <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Review ── */}
        {step === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease] }}
            className="flex flex-col gap-6"
          >
            <h1 className="font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              {t("review.title")}
            </h1>

            {/* Address summary */}
            <div className="py-5 px-6 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)]">
              <h3 className="flex items-center gap-2 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <MapPin size={16} /> {t("review.shippingTo")}
              </h3>
              <div className="font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] leading-[160%]">
                <p className="m-0"><strong>{address.fullName}</strong></p>
                <p className="m-0">{address.phone}</p>
                <p className="m-0">{address.addressLine1}</p>
                {address.addressLine2 && <p className="m-0">{address.addressLine2}</p>}
                <p className="m-0">
                  {address.city}
                  {address.province ? `, ${address.province}` : ""}
                  {address.postalCode ? ` ${address.postalCode}` : ""}
                </p>
                {address.country && address.country !== "Vietnam" && <p className="m-0">{address.country}</p>}
                {address.notes && (
                  <p className="mt-2 text-[var(--text-muted)] italic">
                    {t("review.note", { note: address.notes })}
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="py-5 px-6 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)]">
              <h3 className="flex items-center gap-2 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <Package size={16} /> {t("review.items", { count: totalItems })}
              </h3>
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.size}-${item.color}`}
                    className="flex items-center gap-3"
                  >
                    <div className="relative w-12 h-16 rounded-sm overflow-hidden bg-[var(--color-champagne-cream)] shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="48px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.name}
                      </span>
                      <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                        {t("review.itemMeta", { size: item.size, color: item.color, quantity: item.quantity })}
                      </span>
                    </div>
                    <span className="font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em] shrink-0">
                      {format.number(item.price * item.quantity, "price")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-5 px-6 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] font-primary text-base text-[var(--text-heading)] font-medium tracking-[-0.02em]">
              <span>{t("review.total")}</span>
              <span>{format.number(totalPrice, "price")}</span>
            </div>

            <p className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[140%] text-center p-4 bg-[var(--color-champagne-cream)] rounded-md border border-[var(--border-subtle)]">
              {t("review.paymentNote")}
            </p>

            <button
              type="button"
              className="flex items-center justify-center w-full py-3.5 px-6 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase border-none cursor-pointer shadow-[var(--shadow-gold-sm)] transition-all duration-150 enabled:hover:opacity-90 enabled:hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:animate-none"
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("review.placing") : t("review.place")}
            </button>
          </motion.div>
        )}

        {/* ── Step 3: Success ── */}
        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [...ease] }}
            className="flex flex-col items-center gap-5 py-16 px-6 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-[var(--color-sage-cream)] flex items-center justify-center border border-[var(--border-subtle)]">
              <CheckCircle size={48} style={{ color: "var(--accent-sage)" }} />
            </div>
            <h1 className="font-display font-normal text-2xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              {t("success.title")}
            </h1>
            <p className="font-primary text-base text-[var(--text-secondary)] tracking-[-0.02em] leading-[140%] max-w-[380px]">
              {t("success.description")}
            </p>
            {orderId && (
              <p className="font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em]">
                {t.rich("success.orderId", { id: orderId, strong: (chunks) => <strong>{chunks}</strong> })}
              </p>
            )}
            <div className="flex flex-col items-center gap-3 mt-4">
              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 py-3 px-7 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] font-primary text-sm font-medium tracking-[-0.02em] uppercase no-underline shadow-[var(--shadow-gold-sm)] transition-opacity duration-150 hover:opacity-90 motion-reduce:transition-none"
              >
                {t("success.viewOrders")} <ChevronRight size={14} />
              </Link>
              <Link
                href="/shop"
                className="font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-accent)] motion-reduce:transition-none"
              >
                {t("success.continue")}
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
