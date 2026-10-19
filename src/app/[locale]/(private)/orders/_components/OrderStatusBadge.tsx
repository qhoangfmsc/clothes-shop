"use client";

import { useOrderStatusLabel } from "@/src/i18n/use-labels";
import type { OrderStatus } from "@/src/types/enums";
import { STATUS_CONFIG } from "../_common/constants";

/** Coloured status pill shared by the order list and the order detail page. */
export default function OrderStatusBadge({ status }: { status: string }) {
  const statusLabel = useOrderStatusLabel();
  const config = STATUS_CONFIG[status as OrderStatus] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span
      className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full border font-primary text-[0.6875rem] font-medium tracking-[0.04em] uppercase whitespace-nowrap"
      style={{ color: config.color, borderColor: config.color }}
    >
      <Icon size={12} />
      {statusLabel(status)}
    </span>
  );
}
