"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import {
  ModalShell,
  ModalBody,
  FormSection,
  FormField,
  FormActions,
  inputClass,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { useRefreshShipping, useShipping } from "@/src/hooks/use-api";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import type { ConfigEditorProps } from "../registry";
import { upsertSiteConfig } from "../../_common/moduleSlice";
import { SHIPPING_ICONS } from "@/src/types/shipping";
import {
  SHIPPING_LIMITS,
  parseShippingValue,
  serializeShippingForm,
  shippingInfoToForm,
  validateShippingForm,
  type ShippingConfigForm,
  type ShippingFieldError,
  type ShippingFormErrors,
  type ShippingMethodForm,
} from "./shipping-form";

/** Opens with the saved config, or — when nothing is saved — with what customers currently get from the API */
export default function ShippingConfigModal({ configKey, title, savedValue, onClose }: ConfigEditorProps) {
  const t = useTranslations("admin.siteConfig.shipping");
  const { shipping, isLoading } = useShipping();
  /* A saved value from before the return policy existed has none: take what customers currently get, so
     saving never resets it to the BE default */
  const initial = useMemo(() => {
    const served = shippingInfoToForm(shipping);
    const saved = parseShippingValue(savedValue);
    if (!saved) return served;
    return saved.returnPolicy ? saved : { ...saved, returnPolicy: served?.returnPolicy ?? null };
  }, [savedValue, shipping]);

  return (
    <ModalShell title={title} onClose={onClose} maxWidthClass="max-w-180">
      {initial ? (
        <ShippingConfigFormBody configKey={configKey} initial={initial} onClose={onClose} />
      ) : (
        <p className="p-6 text-sm text-[var(--text-muted)] font-primary">
          {isLoading ? t("loading") : t("loadFailed")}
        </p>
      )}
    </ModalShell>
  );
}

function ShippingConfigFormBody({
  configKey,
  initial,
  onClose,
}: {
  configKey: string;
  initial: ShippingConfigForm;
  onClose: () => void;
}) {
  const t = useTranslations("admin.siteConfig");
  const tForm = useTranslations("admin.siteConfig.shipping");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const refreshShipping = useRefreshShipping();
  const isUpdating = useAppSelector((s) => s.siteConfig.isUpdating);

  const [form, setForm] = useState<ShippingConfigForm>(initial);
  const [errors, setErrors] = useState<ShippingFormErrors>({});

  const clearError = (path: string) =>
    setErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });

  const setThreshold = (value: string) => {
    setForm((prev) => ({ ...prev, threshold: value }));
    clearError("threshold");
  };

  const setReturnField = (field: "days" | "description" | "conditions", value: string) => {
    setForm((prev) => (prev.returnPolicy ? { ...prev, returnPolicy: { ...prev.returnPolicy, [field]: value } } : prev));
    clearError(`returnPolicy.${field}`);
  };

  const setMethod = <K extends keyof ShippingMethodForm>(index: number, field: K, value: ShippingMethodForm[K]) => {
    setForm((prev) => ({
      ...prev,
      methods: prev.methods.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
    clearError(`${form.methods[index].id}.${field}`);
  };

  const errorText = (error: ShippingFieldError | undefined) => {
    if (!error) return null;
    if (error.kind === "tooLong") return tForm("errors.tooLong", { max: error.max });
    if (error.kind === "tooBig") return tForm("errors.tooBig", { max: SHIPPING_LIMITS.money });
    if (error.kind === "range") return tForm("errors.range", { max: error.max });
    if (error.kind === "tooMany") return tForm("errors.tooMany", { max: error.max });
    return tForm(`errors.${error.kind}`);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateShippingForm(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error(tForm("toast.invalid"));
      return;
    }
    try {
      await dispatch(upsertSiteConfig({ key: configKey, value: serializeShippingForm(form) })).unwrap();
      /* Customer pages keep the shipping info for 5 min: make them read the new fees */
      await refreshShipping();
      toast.success(t("toast.saved"));
      onClose();
    } catch (err) {
      /* A 400 (code 1503) carries the BE's list of invalid fields in its message: shown as is */
      toast.error(toErrorMessage(err, t("toast.saveFailed")));
    }
  };

  const fieldError = (path: string) => {
    const message = errorText(errors[path]);
    return message ? <span className="text-xs text-[var(--accent-rose)] font-primary">{message}</span> : null;
  };

  return (
    <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
      <ModalBody>
        <p className="m-0 flex items-start gap-2 text-xs text-[var(--text-muted)] font-primary leading-[150%]">
          <Info size={14} className="shrink-0 mt-0.5" />
          {tForm("notice")}
        </p>

        <FormSection title={tForm("free.section")}>
          <FormField label={tForm("free.threshold")} info={tForm("free.thresholdInfo")}>
            <input
              className={inputClass}
              inputMode="decimal"
              value={form.threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={tForm("free.placeholder")}
              aria-invalid={Boolean(errors.threshold)}
            />
            {fieldError("threshold")}
          </FormField>
        </FormSection>

        {form.returnPolicy && (
          <FormSection title={tForm("returns.section")}>
            <FormField label={tForm("returns.days")} required info={tForm("returns.daysInfo")}>
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.returnPolicy.days}
                onChange={(e) => setReturnField("days", e.target.value)}
                aria-invalid={Boolean(errors["returnPolicy.days"])}
              />
              {fieldError("returnPolicy.days")}
            </FormField>
            <FormField label={tForm("returns.description")} info={tForm("returns.descriptionInfo")}>
              <textarea
                className={`${inputClass} resize-y`}
                rows={2}
                value={form.returnPolicy.description}
                maxLength={SHIPPING_LIMITS.returnDescription}
                onChange={(e) => setReturnField("description", e.target.value)}
              />
              {fieldError("returnPolicy.description")}
            </FormField>
            <FormField label={tForm("returns.conditions")} info={tForm("returns.conditionsInfo")}>
              <textarea
                className={`${inputClass} resize-y`}
                rows={4}
                value={form.returnPolicy.conditions}
                onChange={(e) => setReturnField("conditions", e.target.value)}
              />
              {fieldError("returnPolicy.conditions")}
            </FormField>
          </FormSection>
        )}

        {form.methods.map((m, i) => (
          <div
            key={m.id}
            className="border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-heading)] font-primary">
                {tForm(`methods.${m.id}`)}
              </span>
              <span
                className="text-[10px] font-bold tracking-[0.04em] py-0.5 px-2 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                title={tForm("idReadonly")}
              >
                {m.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={tForm("fields.name")} required>
                <input
                  className={inputClass}
                  value={m.name}
                  maxLength={SHIPPING_LIMITS.name}
                  onChange={(e) => setMethod(i, "name", e.target.value)}
                  aria-invalid={Boolean(errors[`${m.id}.name`])}
                />
                {fieldError(`${m.id}.name`)}
              </FormField>

              <FormField label={tForm("fields.estimatedDays")} required>
                <input
                  className={inputClass}
                  value={m.estimatedDays}
                  maxLength={SHIPPING_LIMITS.estimatedDays}
                  onChange={(e) => setMethod(i, "estimatedDays", e.target.value)}
                  aria-invalid={Boolean(errors[`${m.id}.estimatedDays`])}
                />
                {fieldError(`${m.id}.estimatedDays`)}
              </FormField>

              <FormField label={tForm("fields.price")} required info={tForm("fields.priceInfo")}>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={m.price}
                  onChange={(e) => setMethod(i, "price", e.target.value)}
                  aria-invalid={Boolean(errors[`${m.id}.price`])}
                />
                {fieldError(`${m.id}.price`)}
              </FormField>

              <FormField label={tForm("fields.icon")} required>
                <select
                  className={inputClass}
                  value={m.icon}
                  onChange={(e) => setMethod(i, "icon", e.target.value as ShippingMethodForm["icon"])}
                >
                  {SHIPPING_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {tForm(`icons.${icon}`)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label={tForm("fields.description")}>
              <input
                className={inputClass}
                value={m.description}
                maxLength={SHIPPING_LIMITS.description}
                onChange={(e) => setMethod(i, "description", e.target.value)}
                aria-invalid={Boolean(errors[`${m.id}.description`])}
              />
              {fieldError(`${m.id}.description`)}
            </FormField>
          </div>
        ))}
      </ModalBody>

      <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("form.save")} />
    </form>
  );
}
