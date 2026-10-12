"use client";

import { useOrderStatusLabel } from "@/src/i18n/use-labels";
import type { OrderStatus } from "@/src/types/enums";
import { STATUS_CONFIG } from "../_common/constants";

/** Coloured status pill shared by the order list and the order detail page.
 *  Styles (`.order-status-badge`) live in each page's own <style> block. */
export default function OrderStatusBadge({ status }: { status: string }) {
  const statusLabel = useOrderStatusLabel();
  const config = STATUS_CONFIG[status as OrderStatus] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className="order-status-badge" style={{ color: config.color, borderColor: config.color }}>
      <Icon size={12} />
      {statusLabel(status)}
    </span>
  );
}
