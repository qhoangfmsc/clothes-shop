"use client";

import { useTranslations } from "next-intl";
import { RETURN_STATUS_CONFIG } from "../_common/constants";
import type { ReturnStatus } from "../_common/types";

/** Coloured pill for a return request's state */
export default function ReturnStatusBadge({ status }: { status: string }) {
  const t = useTranslations("private.returns.status");
  const config = RETURN_STATUS_CONFIG[status as ReturnStatus] ?? RETURN_STATUS_CONFIG.REQUESTED;
  const Icon = config.icon;

  return (
    <span
      className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full border font-primary text-[0.6875rem] font-medium tracking-[0.04em] uppercase whitespace-nowrap"
      style={{ color: config.color, borderColor: config.color }}
    >
      <Icon size={12} />
      {t.has(status as never) ? t(status as never) : status}
    </span>
  );
}
