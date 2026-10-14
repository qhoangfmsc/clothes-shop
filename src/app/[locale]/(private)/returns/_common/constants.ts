import { CheckCircle, Clock, PackageCheck, PackageX, RotateCcw, XCircle, type LucideIcon } from "lucide-react";
import type { ReturnStatus } from "./types";

/** Longest `note` the BE accepts */
export const RETURN_NOTE_MAX = 500;

/** Colour + icon per return status. The visible label comes from `private.returns.status`. */
export const RETURN_STATUS_CONFIG: Record<ReturnStatus, { color: string; icon: LucideIcon }> = {
  REQUESTED: { color: "var(--accent-primary)", icon: Clock },
  APPROVED: { color: "var(--accent-blue)", icon: CheckCircle },
  RECEIVED: { color: "var(--accent-sage)", icon: PackageCheck },
  REFUNDED: { color: "var(--accent-sage)", icon: RotateCcw },
  REJECTED: { color: "var(--color-deep-rose)", icon: XCircle },
  CANCELLED: { color: "var(--text-muted)", icon: PackageX },
};
