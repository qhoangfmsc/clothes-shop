"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronRight, CreditCard, Package } from "lucide-react";
import { Link, useRouter } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  cartItemKey,
  fetchCart,
  selectSelectedCartItems,
  selectSelectedTotalPrice,
  selectSelectedTotalItems,
  removeItems,
} from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { trackEvent } from "@/src/lib/analytics";
import {
  INITIAL_ADDRESS,
  PICKUP_FIELDS,
  REQUIRED_FIELDS,
  resolveCartItemIds,
  fieldId,
  validateAddress,
  type AddressErrors,
  type AddressForm,
} from "./_common/checkout";
import type { PaymentMethod } from "./_common/payment";
import { useOrderQuote } from "./_common/use-order-quote";
import { useShipping } from "@/src/hooks/use-api";
import type { ShippingMethodId } from "@/src/types/shipping";
import OrderSummary from "./_components/OrderSummary";
import PaymentMethodSection from "./_components/PaymentMethodSection";
import ShippingMethodSection from "./_components/ShippingMethodSection";
import ShippingForm from "./_components/ShippingForm";

const ease = [0.25, 0.1, 0.25, 1] as const;

const SHELL_CLASS = "min-h-screen pt-[96px] sm:pt-[104px] pb-8 bg-[var(--bg-primary)]";

export default function CheckoutContent() {
  const t = useTranslations("private.checkout");
  const toErrorMessage = useErrorMessage();
  const { isAuthenticated, isLoading, user } = useAuth();
  const dispatch = useAppDispatch();
  /* Only the items ticked in the bag are ordered; the rest stay in the bag */
  const items = useAppSelector(selectSelectedCartItems);
  const totalPrice = useAppSelector(selectSelectedTotalPrice);
  const totalItems = useAppSelector(selectSelectedTotalItems);
  const { apiFetch } = useApiAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [address, setAddress] = useState<AddressForm>({
    ...INITIAL_ADDRESS,
    fullName: user?.name ?? "",
  });
  const [errors, setErrors] = useState<AddressErrors>({});
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("vietqr");
  const [isSubmitting, setIsSubmitting] = useState(false);
  /* The order exists and the page is leaving: keep the skeleton instead of flashing the empty bag */
  const [isRedirecting, setIsRedirecting] = useState(false);
  const beginTrackedRef = useRef(false);

  const pickup = shippingMethod === "store-pickup";
  const { shipping, isError: shippingFailed } = useShipping();
  const selectedMethod = shipping?.methods.find((m) => m.id === shippingMethod);
  const {
    quote,
    error: quoteError,
    isLoading: quoteLoading,
  } = useOrderQuote(items, shippingMethod, isAuthenticated);
  /* An answer for another method is not the price of this one */
  const currentQuote = quote?.shippingMethod === shippingMethod ? quote : null;

  /* The session can resolve after the first render: prefill the name only while it is still empty */
  useEffect(() => {
    const name = user?.name;
    if (!name) return;
    setAddress((prev) => (prev.fullName ? prev : { ...prev, fullName: name }));
  }, [user?.name]);

  useEffect(() => {
    if (beginTrackedRef.current || !isAuthenticated || items.length === 0) return;
    beginTrackedRef.current = true;
    trackEvent("begin_checkout", { items: totalItems, value: totalPrice });
  }, [isAuthenticated, items.length, totalItems, totalPrice]);

  const updateField = useCallback((field: keyof AddressForm, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (field in prev ? { ...prev, [field]: undefined } : prev));
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    if (isSubmitting) return;

    const invalid = validateAddress(address, pickup);
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid);
      const first = (pickup ? PICKUP_FIELDS : REQUIRED_FIELDS).find((field) => invalid[field as keyof typeof invalid]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      /* The server cart decides what can be ordered: ids kept locally can be stale (item already
         ordered or removed elsewhere, another account), so read the current ones first and order
         exactly the lines the shopper reviewed. */
      const serverCart = await dispatch(fetchCart()).unwrap();
      const cartItemIds = resolveCartItemIds(serverCart, items);
      if (!cartItemIds) {
        toast.error(t("toast.itemsNotSynced"));
        return;
      }

      /* Delivery needs a saved address (addressId); store pickup only needs who collects the order */
      let recipient: { addressId: string } | { pickupContact: { fullName: string; phone: string } };
      if (pickup) {
        recipient = { pickupContact: { fullName: address.fullName.trim(), phone: address.phone.trim() } };
      } else {
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
        recipient = { addressId };
      }

      const orderRes = await apiFetch<{ data: { id: string } }>("/api/orders", {
        method: "POST",
        body: {
          ...recipient,
          shippingMethod,
          note: address.notes || undefined,
          cartItemIds,
        },
      });

      const orderId = orderRes.data?.id ?? null;
      if (orderId) trackEvent("purchase", { orderId, value: totalPrice });
      setIsRedirecting(true);
      dispatch(removeItems(items.map(cartItemKey)));
      toast.success(t("toast.placed"));

      /* The order id lives in the URL, so a reload keeps the payment session / the order page */
      const encoded = orderId ? encodeURIComponent(orderId) : null;
      if (!encoded) router.replace("/orders");
      else if (paymentMethod === "vietqr") router.replace(`/checkout/payment/${encoded}`);
      else router.replace(`/orders/${encoded}`);
    } catch (err: unknown) {
      toast.error(toErrorMessage(err, t("toast.failed")));
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, address, items, totalPrice, pickup, shippingMethod, paymentMethod, apiFetch, dispatch, router, toast, t, toErrorMessage]);

  if (isLoading || isRedirecting) {
    return (
      <main className={SHELL_CLASS}>
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6">
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

  if (items.length === 0) {
    return (
      <main className={SHELL_CLASS}>
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 flex flex-col items-center gap-5 py-16 text-center">
          <Package size={40} style={{ color: "var(--text-disabled)" }} />
          <h1 className="m-0 font-display font-normal text-xl text-[var(--text-heading)] tracking-[-0.04em]">
            {t("empty.title")}
          </h1>
          <p className="m-0 font-primary text-base text-[var(--text-muted)]">{t("empty.description")}</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 min-h-11 py-2.5 px-5 rounded-full border border-[var(--border-light)] font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium"
          >
            {t("empty.browse")} <ChevronRight size={14} />
          </Link>
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
        className="max-w-[1080px] mx-auto px-4 sm:px-6 flex flex-col gap-3"
      >
        {/* Same header as the bag page: way back, then the page title */}
        <div className="flex flex-col gap-2">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 min-h-11 self-start font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase no-underline font-medium transition-colors duration-150 hover:text-[var(--text-primary)] motion-reduce:transition-none"
          >
            <ArrowLeft size={16} />
            {t("page.back")}
          </Link>
          <h1 className="flex items-center gap-3 m-0 font-display font-normal text-2xl sm:text-3xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            <CreditCard size={24} style={{ color: "var(--accent-primary)" }} />
            {t("page.title")}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-3 sm:gap-4 items-start">
          {/* Three sections in the order a shopper fills them: who and where → how it ships → how it is paid */}
          <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
            <ShippingForm address={address} errors={errors} pickup={pickup} onChange={updateField} />
            <ShippingMethodSection
              methods={shipping?.methods ?? null}
              failed={shippingFailed}
              value={shippingMethod}
              onChange={setShippingMethod}
              freeShipping={currentQuote?.freeShipping ?? false}
            />
            <PaymentMethodSection value={paymentMethod} onChange={setPaymentMethod} />
          </div>

          <div className="min-w-0 lg:sticky lg:top-[96px]">
            <OrderSummary
              items={items}
              totalItems={totalItems}
              totalPrice={totalPrice}
              quote={currentQuote}
              quoteLoading={quoteLoading || (!currentQuote && !quoteError)}
              quoteFailed={Boolean(quoteError) && !quoteLoading}
              method={selectedMethod}
              paymentMethod={paymentMethod}
              isSubmitting={isSubmitting}
              onPlaceOrder={handlePlaceOrder}
            />
          </div>
        </div>
      </motion.div>
    </main>
  );
}
