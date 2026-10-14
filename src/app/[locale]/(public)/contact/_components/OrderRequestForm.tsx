"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, Mail } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { buildMailto } from "@/src/lib/contact";
import { buildOrderRequest } from "../_common/build-order-request";
import {
  EMPTY_ORDER_REQUEST,
  MAX_NOTE_LENGTH,
  MAX_PHONE_DIGITS,
  MAX_QUANTITY,
  MIN_PHONE_DIGITS,
} from "../_common/constants";
import type {
  MeasurementKey,
  OrderProduct,
  OrderRequestErrors,
  OrderRequestValues,
} from "../_common/types";
import ProductSummaryCard from "./ProductSummaryCard";

const inputClass =
  "w-full rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 py-2.5 font-primary text-sm tracking-[-0.02em] text-[var(--text-primary)] outline-none transition-colors duration-150 placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.15)] motion-reduce:transition-none";

/** Body fields in display order; `startsRow` puts the field in the first column of a new row. */
const MEASUREMENT_FIELDS: {
  key: MeasurementKey | "weight";
  unit: "unit" | "weightUnit";
  startsRow?: boolean;
}[] = [
  { key: "height", unit: "unit" },
  { key: "weight", unit: "weightUnit" },
  { key: "bust", unit: "unit", startsRow: true },
  { key: "waist", unit: "unit" },
  { key: "hips", unit: "unit" },
];

const errorBorder = "!border-[var(--color-deep-rose)]";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-primary text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="font-primary text-xs leading-[150%] tracking-[-0.02em] text-[var(--text-muted)]">
          {hint}
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1 font-primary text-xs tracking-[-0.02em] text-[var(--color-deep-rose)]">
          <AlertCircle size={12} aria-hidden="true" /> {error}
        </span>
      )}
    </div>
  );
}

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="m-0 border-b border-[var(--border-subtle)] pb-3 font-display text-xl font-normal tracking-[-0.04em] text-[var(--text-heading)]">
    {children}
  </h2>
);

interface OrderRequestFormProps {
  /** The product being ordered, or `null` when the page was opened without one. */
  product: OrderProduct | null;
}

/** Custom-order request. Everything is free-form — the piece is made for this shopper, so there are no
 *  size / colour pickers: a design request, optional body measurements, quantity, a date and contact
 *  details, turned into a ready-to-send email (`mailto:`). Nothing is sent to our servers. */
export default function OrderRequestForm({ product }: OrderRequestFormProps) {
  const t = useTranslations("public.contact");
  const format = useFormatter();
  const [values, setValues] = useState<OrderRequestValues>(EMPTY_ORDER_REQUEST);
  const [errors, setErrors] = useState<OrderRequestErrors>({});

  const set = <K extends keyof OrderRequestValues>(key: K, value: OrderRequestValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  const setMeasurement = (key: MeasurementKey, value: string) =>
    setValues((prev) => ({ ...prev, measurements: { ...prev.measurements, [key]: value } }));

  const validate = (): boolean => {
    const digits = values.phone.replace(/\D/g, "").length;
    const next: OrderRequestErrors = {
      ...(!values.note.trim() && { note: true }),
      ...(!values.fullName.trim() && { fullName: true }),
      ...((digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) && { phone: true }),
    };
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSendEmail = () => {
    if (!validate()) return;
    const { subject, body } = buildOrderRequest((key, params) => t(key as never, params as never), {
      product,
      values,
      formatDate: (iso) => format.dateTime(new Date(`${iso}T12:00:00`), "long"),
    });
    window.location.href = buildMailto(subject, body);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className={`grid gap-10 lg:items-start ${product ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]" : ""}`}
    >
      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendEmail();
        }}
        noValidate
      >
        <section className="flex flex-col gap-5">
          <SectionTitle>{t("form.details.title")}</SectionTitle>

          <Field label={t("form.measurements.title")}>
            {/* One 3-column grid so every input is the same width: height + weight on the first row,
                the three girths start a new row. */}
            <div className="grid grid-cols-3 gap-3">
              {MEASUREMENT_FIELDS.map(({ key, unit, startsRow }) => (
                <label
                  key={key}
                  className={`flex flex-col gap-1 ${startsRow ? "col-start-1" : ""}`}
                >
                  <span className="font-primary text-xs tracking-[-0.02em] text-[var(--text-muted)]">
                    {t(`form.measurements.${key}`)} ({t(`form.measurements.${unit}`)})
                  </span>
                  <input
                    inputMode="decimal"
                    className={inputClass}
                    value={key === "weight" ? values.weight : values.measurements[key]}
                    maxLength={5}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^\d.,]/g, "");
                      if (key === "weight") set("weight", next);
                      else setMeasurement(key, next);
                    }}
                  />
                </label>
              ))}
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("form.quantity.label")}>
              <div className="inline-flex w-fit items-center overflow-hidden rounded-full border border-[var(--border-light)]">
                <button
                  type="button"
                  className="h-10 w-10 cursor-pointer border-none bg-transparent text-[15px] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-30"
                  onClick={() => set("quantity", Math.max(1, values.quantity - 1))}
                  disabled={values.quantity <= 1}
                  aria-label={t("form.quantity.decrease")}
                >
                  −
                </button>
                <span className="w-10 text-center font-primary text-[15px] font-medium text-[var(--text-heading)]">
                  {values.quantity}
                </span>
                <button
                  type="button"
                  className="h-10 w-10 cursor-pointer border-none bg-transparent text-[15px] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-30"
                  onClick={() => set("quantity", Math.min(MAX_QUANTITY, values.quantity + 1))}
                  disabled={values.quantity >= MAX_QUANTITY}
                  aria-label={t("form.quantity.increase")}
                >
                  +
                </button>
              </div>
            </Field>

            <Field label={t("form.neededBy.label")}>
              <input
                type="date"
                className={inputClass}
                min={today}
                value={values.neededBy}
                onChange={(e) => set("neededBy", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <SectionTitle>{t("form.design.title")}</SectionTitle>
          <Field
            label={`${t("form.design.label")} *`}
            error={errors.note ? t("form.errors.note") : undefined}
          >
            <textarea
              className={`${inputClass} min-h-[180px] resize-y leading-[160%] ${errors.note ? errorBorder : ""}`}
              value={values.note}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(e) => set("note", e.target.value)}
              placeholder={t("form.design.placeholder")}
            />
            <span className="self-end font-primary text-xs text-[var(--text-muted)]">
              {t("form.design.counter", { count: values.note.length, max: MAX_NOTE_LENGTH })}
            </span>
          </Field>
        </section>

        <section className="flex flex-col gap-5">
          <SectionTitle>{t("form.contact.title")}</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={`${t("form.contact.name")} *`}
              error={errors.fullName ? t("form.errors.name") : undefined}
            >
              <input
                className={`${inputClass} ${errors.fullName ? errorBorder : ""}`}
                value={values.fullName}
                maxLength={80}
                autoComplete="name"
                onChange={(e) => set("fullName", e.target.value)}
                placeholder={t("form.contact.namePlaceholder")}
              />
            </Field>
            <Field
              label={`${t("form.contact.phone")} *`}
              error={errors.phone ? t("form.errors.phone") : undefined}
            >
              <input
                type="tel"
                className={`${inputClass} ${errors.phone ? errorBorder : ""}`}
                value={values.phone}
                maxLength={20}
                autoComplete="tel"
                onChange={(e) => set("phone", e.target.value)}
                placeholder={t("form.contact.phonePlaceholder")}
              />
            </Field>
          </div>
        </section>

        <button
          type="submit"
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 self-start rounded-full border-none bg-[var(--accent-primary)] px-8 py-3.5 font-primary text-sm font-medium uppercase tracking-[-0.02em] text-[var(--text-on-gold)] shadow-[var(--shadow-gold-sm)] transition-all duration-150 hover:-translate-y-px hover:opacity-90 motion-reduce:transition-none sm:w-auto"
        >
          <Mail size={16} aria-hidden="true" />
          {t("form.actions.sendEmail")}
        </button>
      </form>

      {product && (
        <aside className="order-first lg:sticky lg:top-[110px] lg:order-none">
          <ProductSummaryCard product={product} />
        </aside>
      )}
    </div>
  );
}
