"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import {
  ModalShell,
  ModalBody,
  FormField,
  FormActions,
  inputClass,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { useRefreshShipping } from "@/src/hooks/use-api";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import type { ConfigEditorProps } from "../registry";
import { upsertSiteConfig } from "../../_common/moduleSlice";
import {
  EXCHANGE_RATE_LIMITS,
  parseExchangeRateValue,
  serializeExchangeRate,
  validateExchangeRate,
  type ExchangeRateError,
} from "./exchange-rate-form";

/** The VND-per-USD rate the BE uses for every USD figure. Opens with the saved rate, or empty when none is saved. */
export default function ExchangeRateModal({ configKey, title, savedValue, onClose }: ConfigEditorProps) {
  const t = useTranslations("admin.siteConfig");
  const tForm = useTranslations("admin.siteConfig.exchangeRate");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const refreshShipping = useRefreshShipping();
  const isUpdating = useAppSelector((s) => s.siteConfig.isUpdating);

  const saved = parseExchangeRateValue(savedValue);
  const [text, setText] = useState(saved === null ? "" : String(saved));
  const [error, setError] = useState<ExchangeRateError | null>(null);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateExchangeRate(text);
    if (found) {
      setError(found);
      return;
    }
    try {
      await dispatch(upsertSiteConfig({ key: configKey, value: serializeExchangeRate(text) })).unwrap();
      /* The shipping info customers see carries USD prices: make it read them at the new rate */
      await refreshShipping();
      toast.success(t("toast.saved"));
      onClose();
    } catch (err) {
      /* A 400 (code 1503) carries the BE's list of invalid fields in its message: shown as is */
      toast.error(toErrorMessage(err, t("toast.saveFailed")));
    }
  };

  return (
    <ModalShell title={title} onClose={onClose} maxWidthClass="max-w-120">
      <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
        <ModalBody>

          <FormField label={tForm("field")} required>
            <input
              className={inputClass}
              inputMode="decimal"
              autoComplete="off"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              aria-invalid={error !== null}
              required
            />
            {error && (
              <span role="alert" className="text-xs text-[var(--accent-rose)] font-primary">
                {tForm(`errors.${error}`, EXCHANGE_RATE_LIMITS)}
              </span>
            )}
          </FormField>
        </ModalBody>

        <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("form.save")} />
      </form>
    </ModalShell>
  );
}
