"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Package,
  CheckCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useCartStore } from "@/src/store/cart";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import UnauthenticatedState from "@/src/app/_components/UnauthenticatedState";
import { useToast } from "@/src/app/_components/Toast";
import "./checkout.css";

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
  const { isAuthenticated, isLoading, user } = useAuth();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const totalItems = useCartStore((s) => s.totalItems());
  const clearCart = useCartStore((s) => s.clearCart);
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
    if (!address.fullName.trim()) errs.fullName = "Full name is required";
    if (!address.phone.trim()) errs.phone = "Phone number is required";
    if (!address.addressLine1.trim()) errs.addressLine1 = "Street address is required";
    if (!address.city.trim()) errs.city = "City is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [address]);

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
      if (!addressId) throw new Error("Failed to save address");

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
      clearCart();
      setStep("success");
      toast.success("Order placed successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to place order";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, apiFetch, address, clearCart, toast]);

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
      <main className="checkout-page">
        <div className="checkout-page__inner">
          <div className="checkout-skeleton" />
        </div>
      </main>
    );
  }

  /* Not authenticated */
  if (!isAuthenticated) {
    return (
      <main className="checkout-page">
        <UnauthenticatedState />
      </main>
    );
  }

  /* Empty cart */
  if (items.length === 0 && step !== "success") {
    return (
      <main className="checkout-page">
        <div className="checkout-page__inner">
          <div className="checkout-empty">
            <Package size={40} style={{ color: "var(--text-disabled)" }} />
            <h2 className="checkout-empty__title">Nothing to checkout</h2>
            <p className="checkout-empty__text">Add items to your bag first</p>
            <Link href="/shop" className="checkout-empty__cta">
              Browse Shop <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-page__inner">
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
              className="checkout-page__back"
            >
              <ArrowLeft size={16} />
              {step === "review" ? "Edit Address" : "Back to Bag"}
            </Link>
          )}
        </motion.div>

        {/* Steps indicator */}
        {step !== "success" && (
          <div className="checkout-steps">
            <div className={`checkout-steps__step ${step === "address" ? "checkout-steps__step--active" : "checkout-steps__step--done"}`}>
              <MapPin size={14} />
              <span>Address</span>
            </div>
            <div className="checkout-steps__line" />
            <div className={`checkout-steps__step ${step === "review" ? "checkout-steps__step--active" : ""}`}>
              <Package size={14} />
              <span>Review</span>
            </div>
          </div>
        )}

        {/* ── Step 1: Address ── */}
        {step === "address" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease] }}
            className="checkout-form"
          >
            <h1 className="checkout-form__title">Shipping Address</h1>

            <div className="checkout-form__grid">
              {/* ── Contact Section ── */}
              <p className="checkout-form__section-label checkout-field--full">Contact Information</p>

              <div className="checkout-field">
                <label className="checkout-field__label">Full Name *</label>
                <input
                  type="text"
                  className={`checkout-field__input ${errors.fullName ? "checkout-field__input--error" : ""}`}
                  value={address.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <span className="checkout-field__error">
                    <AlertCircle size={12} /> {errors.fullName}
                  </span>
                )}
              </div>

              <div className="checkout-field">
                <label className="checkout-field__label">Phone Number *</label>
                <input
                  type="tel"
                  className={`checkout-field__input ${errors.phone ? "checkout-field__input--error" : ""}`}
                  value={address.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="0123 456 789"
                />
                {errors.phone && (
                  <span className="checkout-field__error">
                    <AlertCircle size={12} /> {errors.phone}
                  </span>
                )}
              </div>

              {/* ── Address Section ── */}
              <p className="checkout-form__section-label checkout-field--full">Delivery Address</p>

              <div className="checkout-field checkout-field--full">
                <label className="checkout-field__label">Street Address *</label>
                <input
                  type="text"
                  className={`checkout-field__input ${errors.addressLine1 ? "checkout-field__input--error" : ""}`}
                  value={address.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                  placeholder="House number, street name..."
                />
                {errors.addressLine1 && (
                  <span className="checkout-field__error">
                    <AlertCircle size={12} /> {errors.addressLine1}
                  </span>
                )}
              </div>

              <div className="checkout-field checkout-field--full">
                <label className="checkout-field__label">Apt / Suite / Floor</label>
                <input
                  type="text"
                  className="checkout-field__input"
                  value={address.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                  placeholder="Apartment, suite, floor, building..."
                />
              </div>

              <div className="checkout-field">
                <label className="checkout-field__label">City / District *</label>
                <input
                  type="text"
                  className={`checkout-field__input ${errors.city ? "checkout-field__input--error" : ""}`}
                  value={address.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="City or district"
                />
                {errors.city && (
                  <span className="checkout-field__error">
                    <AlertCircle size={12} /> {errors.city}
                  </span>
                )}
              </div>

              <div className="checkout-field">
                <label className="checkout-field__label">Province</label>
                <input
                  type="text"
                  className="checkout-field__input"
                  value={address.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  placeholder="Province or state"
                />
              </div>

              <div className="checkout-field">
                <label className="checkout-field__label">Postal Code</label>
                <input
                  type="text"
                  className="checkout-field__input"
                  value={address.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  placeholder="Postal / ZIP code"
                />
              </div>

              <div className="checkout-field">
                <label className="checkout-field__label">Country</label>
                <input
                  type="text"
                  className="checkout-field__input"
                  value={address.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Country"
                />
              </div>

              {/* ── Additional ── */}
              <div className="checkout-field checkout-field--full">
                <label className="checkout-field__label">Delivery Notes</label>
                <textarea
                  className="checkout-field__input checkout-field__textarea"
                  value={address.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Gate code, landmark, special instructions..."
                  rows={3}
                />
              </div>
            </div>

            <button
              type="button"
              className="checkout-form__submit"
              onClick={handleContinueToReview}
            >
              Continue to Review <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Review ── */}
        {step === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [...ease] }}
            className="checkout-review"
          >
            <h1 className="checkout-review__title">Review Your Order</h1>

            {/* Address summary */}
            <div className="checkout-review__section">
              <h3 className="checkout-review__section-title">
                <MapPin size={16} /> Shipping To
              </h3>
              <div className="checkout-review__address">
                <p><strong>{address.fullName}</strong></p>
                <p>{address.phone}</p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                  {address.city}
                  {address.province ? `, ${address.province}` : ""}
                  {address.postalCode ? ` ${address.postalCode}` : ""}
                </p>
                {address.country && address.country !== "Vietnam" && <p>{address.country}</p>}
                {address.notes && <p className="checkout-review__notes">Note: {address.notes}</p>}
              </div>
            </div>

            {/* Items */}
            <div className="checkout-review__section">
              <h3 className="checkout-review__section-title">
                <Package size={16} /> Items ({totalItems})
              </h3>
              <div className="checkout-review__items">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.size}-${item.color}`}
                    className="checkout-review__item"
                  >
                    <div className="checkout-review__item-img">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="48px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="checkout-review__item-info">
                      <span className="checkout-review__item-name">{item.name}</span>
                      <span className="checkout-review__item-meta">
                        {item.size} · {item.color} · Qty {item.quantity}
                      </span>
                    </div>
                    <span className="checkout-review__item-price">
                      ${(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="checkout-review__total">
              <span>Total</span>
              <span>${totalPrice.toLocaleString()}</span>
            </div>

            <p className="checkout-review__payment-note">
              Payment will be arranged after order confirmation. Our team will contact you via phone or email with payment details.
            </p>

            <button
              type="button"
              className="checkout-review__place-btn"
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </button>
          </motion.div>
        )}

        {/* ── Step 3: Success ── */}
        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [...ease] }}
            className="checkout-success"
          >
            <div className="checkout-success__icon-wrap">
              <CheckCircle size={48} style={{ color: "var(--accent-sage)" }} />
            </div>
            <h1 className="checkout-success__title">Order Placed!</h1>
            <p className="checkout-success__text">
              Thank you for your order. We&apos;ll contact you shortly to confirm payment and delivery details.
            </p>
            {orderId && (
              <p className="checkout-success__order-id">
                Order ID: <strong>{orderId}</strong>
              </p>
            )}
            <div className="checkout-success__actions">
              <Link href="/orders" className="checkout-success__cta">
                View My Orders <ChevronRight size={14} />
              </Link>
              <Link href="/shop" className="checkout-success__secondary">
                Continue Shopping
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
