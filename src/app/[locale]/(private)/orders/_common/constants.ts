import { CheckCircle, Clock, Truck, XCircle, type LucideIcon } from "lucide-react";
import type { OrderStatus } from "@/src/types/enums";

/** Colour + icon per order status. The visible label comes from `common.orderStatus`. */
export const STATUS_CONFIG: Record<OrderStatus, { color: string; icon: LucideIcon }> = {
  pending: { color: "var(--accent-primary)", icon: Clock },
  confirmed: { color: "var(--accent-blue)", icon: CheckCircle },
  shipping: { color: "var(--accent-sage)", icon: Truck },
  delivered: { color: "var(--accent-sage)", icon: CheckCircle },
  completed: { color: "var(--accent-sage)", icon: CheckCircle },
  cancelled: { color: "var(--color-deep-rose)", icon: XCircle },
};
