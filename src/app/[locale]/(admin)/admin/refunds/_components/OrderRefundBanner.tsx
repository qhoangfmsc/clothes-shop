"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/src/i18n/navigation";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { createRefund, fetchOrderOpenRefunds } from "../_common/moduleSlice";

interface OrderRefundBannerProps {
  orderId: string;
  /** Called after a refund request was created, so the order list can refresh */
  onCreated?: () => void;
}

/** Shown on a cancelled order that is still `paid`: the money has not gone back. Links to the refund queue and,
 *  when no request is waiting, offers to open one. */
export default function OrderRefundBanner({ orderId, onCreated }: OrderRefundBannerProps) {
  const t = useTranslations("admin.refunds.banner");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.refunds.isUpdating);
  /* `null` = still checking */
  const [openCount, setOpenCount] = useState<number | null>(null);

  const load = useCallback(() => {
    dispatch(fetchOrderOpenRefunds(orderId))
      .unwrap()
      .then(setOpenCount)
      .catch(() => setOpenCount(null));
  }, [dispatch, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      await dispatch(createRefund(orderId)).unwrap();
      toast.success(t("created", { id: orderId }));
      load();
      onCreated?.();
    } catch (err) {
      toast.error(toErrorMessage(err, t("createFailed")));
    }
  };

  return (
    <div
      role="status"
      className="mx-6 mt-6 rounded-lg border border-[var(--accent-rose)] bg-[rgba(212,165,165,0.12)] p-3 flex flex-col gap-2 font-primary"
    >
      <p className="m-0 flex items-start gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[var(--accent-rose)]" />
        {t("title")}
      </p>
      <p className="m-0 text-xs text-[var(--text-secondary)] leading-[150%]">
        {openCount ? t("waiting") : t("missing")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/refunds?orderId=${encodeURIComponent(orderId)}`}
          className="text-xs font-semibold text-[var(--accent-primary)] no-underline hover:underline pointer-coarse:min-h-11 inline-flex items-center"
        >
          {t("open")}
        </Link>
        {openCount === 0 && (
          <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_REFUND}>
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleCreate}
              className="py-1.5 px-3 pointer-coarse:min-h-11 text-xs font-semibold font-primary rounded-sm border-0 cursor-pointer bg-[var(--accent-primary)] text-[var(--text-on-gold)] hover:opacity-90 disabled:opacity-50"
            >
              {t("create")}
            </button>
          </RoleGuard>
        )}
      </div>
    </div>
  );
}
