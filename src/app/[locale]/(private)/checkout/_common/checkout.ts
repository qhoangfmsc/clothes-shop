import { cartItemKey } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import type { CartItem } from "@/src/app/[locale]/(private)/cart/_common/types";
import type { ShippingMethodId } from "@/src/types/shipping";

export interface AddressForm {
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

export type AddressField = Exclude<keyof AddressForm, "notes">;
export type AddressErrors = Partial<Record<AddressField, boolean>>;

export const INITIAL_ADDRESS: AddressForm = {
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

/** Asked for up front; the rest sits under "more details" so the form stays short */
export const EXTRA_FIELDS: readonly AddressField[] = ["addressLine2", "postalCode", "country"];

/** Fields the BE requires, in the order they appear on the form (the first invalid one gets focus) */
export const REQUIRED_FIELDS = ["fullName", "phone", "addressLine1", "city"] as const;

export type RequiredAddressField = (typeof REQUIRED_FIELDS)[number];

export const isRequiredField = (field: AddressField): field is RequiredAddressField =>
  (REQUIRED_FIELDS as readonly AddressField[]).includes(field);

/** Store pickup only needs who collects the order (`pickupContact`): name and phone */
export const PICKUP_FIELDS: readonly AddressField[] = ["fullName", "phone"];

export function validateAddress(address: AddressForm, pickup: boolean): AddressErrors {
  const errors: AddressErrors = {};
  for (const field of pickup ? PICKUP_FIELDS : REQUIRED_FIELDS) {
    if (!address[field].trim()) errors[field] = true;
  }
  return errors;
}

/** DOM id of a form field (used to move focus to the first invalid one) */
export const fieldId = (field: AddressField) => `checkout-${field}`;

export const CARD_CLASS =
  "bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] p-5 sm:p-6";

/** Left-hand section cards: tighter than `CARD_CLASS` so the whole page fits one screen */
export const SECTION_CARD_CLASS =
  "bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] p-4 sm:p-5 min-w-0";

/** Heading of a left-hand section card */
export const GROUP_TITLE_CLASS =
  "m-0 mb-3 font-primary text-base text-[var(--text-heading)] tracking-[-0.02em] font-semibold";

export const CARD_TITLE_CLASS =
  "m-0 mb-5 font-display font-normal text-lg text-[var(--text-heading)] tracking-[-0.04em] leading-none";

/** Result of `POST /api/orders/quote`: what the order would cost for the chosen method */
export interface OrderQuote {
  shippingMethod: ShippingMethodId;
  subtotal: number;
  shippingFee: number;
  total: number;
  /** The fee is 0 because the subtotal reached the threshold */
  freeShipping: boolean;
  /** `null` = free shipping is switched off */
  freeShippingThreshold: number | null;
  /** Rate of the bank transfer: VND per 1 unit of the shop currency; `null` when payment is not configured */
  vndPerUnit: number | null;
  /** `total` in VND, what the QR asks for (rate fixed when the QR is created); `null` like `vndPerUnit` */
  amountVnd: number | null;
}

/** Server ids of the reviewed lines in the freshly read server cart; `null` when a line is missing there */
export function resolveCartItemIds(serverCart: CartItem[], reviewed: CartItem[]): string[] | null {
  const reviewedKeys = new Set(reviewed.map(cartItemKey));
  const ids = serverCart
    .filter((line) => reviewedKeys.has(cartItemKey(line)))
    .flatMap((line) => (line.serverItemId ? [line.serverItemId] : []));
  return ids.length === reviewed.length ? ids : null;
}
