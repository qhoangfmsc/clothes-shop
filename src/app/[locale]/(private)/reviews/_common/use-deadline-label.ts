"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { daysUntil } from "./constants";

/** "N days left to review" for a `reviewDeadline`; "last day" once less than a day remains */
export function useDeadlineLabel() {
  const t = useTranslations("shared.reviews.deadline");
  return useCallback(
    (deadline: string) => {
      const days = daysUntil(deadline);
      return days > 0 ? t("daysLeft", { days }) : t("lastDay");
    },
    [t]
  );
}
