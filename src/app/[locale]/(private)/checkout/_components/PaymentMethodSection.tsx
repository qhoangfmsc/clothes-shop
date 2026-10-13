"use client";

import { useTranslations } from "next-intl";
import { Handshake, QrCode } from "lucide-react";
import { GROUP_TITLE_CLASS, SECTION_CARD_CLASS } from "../_common/checkout";
import type { PaymentMethod } from "../_common/payment";
import OptionList, { type OptionRow } from "./OptionList";

interface PaymentMethodSectionProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export default function PaymentMethodSection({ value, onChange }: PaymentMethodSectionProps) {
  const t = useTranslations("private.checkout.method");

  const options: OptionRow<PaymentMethod>[] = [
    { value: "vietqr", icon: <QrCode size={18} />, title: t("options.vietqr.title") },
    { value: "later", icon: <Handshake size={18} />, title: t("options.later.title") },
  ];

  return (
    <fieldset className={`${SECTION_CARD_CLASS} m-0`}>
      <legend className="sr-only">{t("title")}</legend>
      <h2 className={GROUP_TITLE_CLASS} aria-hidden="true">
        {t("title")}
      </h2>
      <OptionList name="paymentMethod" value={value} options={options} onChange={onChange} />
    </fieldset>
  );
}
