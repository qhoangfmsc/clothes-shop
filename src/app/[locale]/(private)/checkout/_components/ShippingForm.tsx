"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, ChevronDown, MapPin } from "lucide-react";
import { CONTACT_ADDRESS, CONTACT_MAPS_URL } from "@/src/lib/contact";
import {
  EXTRA_FIELDS,
  GROUP_TITLE_CLASS,
  SECTION_CARD_CLASS,
  PICKUP_FIELDS,
  fieldId,
  isRequiredField,
  type AddressErrors,
  type AddressField,
  type AddressForm,
} from "../_common/checkout";

interface FieldConfig {
  name: AddressField;
  type?: "text" | "tel";
  autoComplete: string;
  /** Spans both columns from 480px up */
  wide?: boolean;
}

const FIELDS: readonly FieldConfig[] = [
  { name: "fullName", autoComplete: "name" },
  { name: "phone", type: "tel", autoComplete: "tel" },
  { name: "addressLine1", autoComplete: "address-line1", wide: true },
  { name: "city", autoComplete: "address-level2" },
  { name: "province", autoComplete: "address-level1" },
  { name: "addressLine2", autoComplete: "address-line2", wide: true },
  { name: "postalCode", autoComplete: "postal-code" },
  { name: "country", autoComplete: "country-name" },
];

/* Floating label: the label sits in the field as its placeholder and floats up once the field has focus or a value */
const FLOAT_INPUT_CLASS =
  "peer w-full h-[3.25rem] pt-5 pb-1.5 px-4 rounded-md border bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-transparent focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none";
const FLOAT_LABEL_CLASS =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] transition-all duration-150 motion-reduce:transition-none peer-focus:top-[1.0625rem] peer-focus:text-[0.6875rem] peer-not-placeholder-shown:top-[1.0625rem] peer-not-placeholder-shown:text-[0.6875rem]";
const TEXTAREA_CLASS =
  "w-full py-2.5 px-4 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] font-primary text-sm text-[var(--text-primary)] tracking-[-0.02em] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] resize-y motion-reduce:transition-none";

interface ShippingFormProps {
  address: AddressForm;
  errors: AddressErrors;
  /** Store pickup: only the person collecting the order (name + phone) is asked for */
  pickup: boolean;
  onChange: (field: keyof AddressForm, value: string) => void;
}

/** Recipient / delivery address. The common fields come first; apartment, postal code, country and the
 *  order note are one click away so the form stays short. */
export default function ShippingForm({ address, errors, pickup, onChange }: ShippingFormProps) {
  const t = useTranslations("private.checkout.form");
  const tNote = useTranslations("private.checkout.note");
  const label = useTranslations("common.addressField");
  const [showMore, setShowMore] = useState(false);

  const visible = FIELDS.filter(({ name }) => (pickup ? PICKUP_FIELDS.includes(name) : true));
  const core = visible.filter(({ name }) => !EXTRA_FIELDS.includes(name));
  const extra = visible.filter(({ name }) => EXTRA_FIELDS.includes(name));

  const renderField = ({ name, type = "text", autoComplete, wide }: FieldConfig) => {
    const required = isRequiredField(name);
    const invalid = required && Boolean(errors[name]);
    return (
      <div key={name} className={`flex flex-col gap-1 ${wide ? "min-[480px]:col-span-2" : ""}`}>
        <div className="relative">
          <input
            id={fieldId(name)}
            type={type}
            autoComplete={autoComplete}
            value={address[name]}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder=" "
            aria-invalid={invalid}
            aria-describedby={invalid ? `${fieldId(name)}-error` : undefined}
            className={`${FLOAT_INPUT_CLASS} ${invalid ? "border-[var(--color-deep-rose)]" : "border-[var(--border-light)]"}`}
          />
          <label htmlFor={fieldId(name)} className={FLOAT_LABEL_CLASS}>
            {label(name)}
            {required && " *"}
          </label>
        </div>
        {invalid && isRequiredField(name) && (
          <span
            id={`${fieldId(name)}-error`}
            className="flex items-center gap-1 font-primary text-xs text-[var(--color-deep-rose)] tracking-[-0.02em]"
          >
            <AlertCircle size={12} /> {t(`errors.${name}`)}
          </span>
        )}
      </div>
    );
  };

  return (
    <section className={SECTION_CARD_CLASS}>
      <h2 className={GROUP_TITLE_CLASS}>{pickup ? t("pickupTitle") : t("title")}</h2>
      {pickup && (
        <a
          href={CONTACT_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-2 self-start font-primary text-sm leading-[150%] tracking-[-0.02em] text-[var(--text-primary)] no-underline hover:underline"
        >
          <MapPin size={16} aria-hidden="true" className="mt-[0.1875rem] shrink-0" />
          <span>
            <span className="text-[var(--text-muted)]">{t("pickupAt")}</span> {CONTACT_ADDRESS}
          </span>
        </a>
      )}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2.5">{core.map(renderField)}</div>

      <button
        type="button"
        onClick={() => setShowMore((prev) => !prev)}
        aria-expanded={showMore}
        aria-controls="checkout-more-details"
        className="mt-1.5 inline-flex items-center gap-1.5 min-h-11 -mb-2 bg-transparent border-none p-0 font-primary text-xs text-[var(--text-accent)] tracking-[0.04em] uppercase font-medium cursor-pointer hover:underline"
      >
        <ChevronDown
          size={14}
          className={`transition-transform duration-150 motion-reduce:transition-none ${showMore ? "rotate-180" : ""}`}
        />
        {pickup ? t("moreNote") : t("moreDetails")}
      </button>

      {showMore && (
        <div id="checkout-more-details" className="mt-2 grid grid-cols-1 min-[480px]:grid-cols-2 gap-2.5">
          {extra.map(renderField)}
          <div className="flex flex-col gap-1 min-[480px]:col-span-2">
            <textarea
              id="checkout-notes"
              aria-label={tNote("title")}
              value={address.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              placeholder={tNote("placeholder")}
              rows={2}
              className={TEXTAREA_CLASS}
            />
          </div>
        </div>
      )}
    </section>
  );
}
