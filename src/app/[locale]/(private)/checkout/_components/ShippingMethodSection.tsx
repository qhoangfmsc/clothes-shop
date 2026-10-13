"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Home, Truck, Zap } from "lucide-react";
import type { ShippingIcon, ShippingMethod, ShippingMethodId } from "@/src/types/shipping";
import { GROUP_TITLE_CLASS, SECTION_CARD_CLASS } from "../_common/checkout";
import OptionList, { type OptionRow } from "./OptionList";

const ICONS: Record<ShippingIcon, typeof Truck> = { truck: Truck, express: Zap, store: Home };

interface ShippingMethodSectionProps {
  /** `null` while the methods are loading or when they failed (see `failed`) */
  methods: ShippingMethod[] | null;
  failed: boolean;
  value: ShippingMethodId;
  onChange: (method: ShippingMethodId) => void;
  /** The quote says the subtotal reached the free-shipping threshold (it applies to every method) */
  freeShipping: boolean;
}

/** Delivery choice. Names, descriptions and delivery times are the store's own text from the shipping config. */
export default function ShippingMethodSection({
  methods,
  failed,
  value,
  onChange,
  freeShipping,
}: ShippingMethodSectionProps) {
  const t = useTranslations("private.checkout.delivery");
  const format = useFormatter();

  const options: OptionRow<ShippingMethodId>[] = (methods ?? []).map((method) => {
    const Icon = ICONS[method.icon];
    const free = freeShipping || method.price === 0;
    return {
      value: method.id,
      icon: <Icon size={18} />,
      title: method.name,
      meta: method.estimatedDays,
      trailing: (
        <span
          className={`font-primary text-sm font-medium tracking-[-0.02em] ${
            free ? "text-[var(--accent-sage)]" : "text-[var(--text-heading)]"
          }`}
        >
          {free ? t("free") : format.number(method.price, "price")}
        </span>
      ),
    };
  });

  return (
    <fieldset className={`${SECTION_CARD_CLASS} m-0`}>
      <legend className="sr-only">{t("title")}</legend>
      <h2 className={GROUP_TITLE_CLASS} aria-hidden="true">
        {t("title")}
      </h2>

      {methods === null ? (
        <p className="m-0 font-primary text-sm text-[var(--text-muted)]">{failed ? t("loadFailed") : t("loading")}</p>
      ) : (
        <OptionList name="shippingMethod" value={value} options={options} onChange={onChange} />
      )}
    </fieldset>
  );
}
