"use client";

import { useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import MoneyText from "@/src/app/[locale]/_components/MoneyText";
import { moneyOf } from "@/src/lib/money";
import { Link } from "@/src/i18n/navigation";
import { ModalShell, ModalBody, FormSection } from "@/src/app/[locale]/_components/AdminFormKit";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import { PERMISSIONS } from "@/src/lib/permissions";
import RefundBadge from "../../refunds/_components/RefundBadge";
import { REJECTABLE_STATUSES, type ReturnRequest } from "../_common/types";
import ApproveReturnModal from "./ApproveReturnModal";
import ReceiveReturnModal from "./ReceiveReturnModal";
import RejectReturnModal from "./RejectReturnModal";
import ReturnBadge from "./ReturnBadge";

interface ReturnDetailPanelProps {
  request: ReturnRequest;
  onClose: () => void;
  /** An action succeeded: the request as the BE now has it (the list should refresh too) */
  onChanged: (request: ReturnRequest) => void;
}

const ACTION_BUTTON =
  "py-2 px-4 pointer-coarse:min-h-11 text-sm font-semibold font-primary rounded-sm border-0 cursor-pointer hover:opacity-90";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3 py-1.5">
      <span className="shrink-0 text-xs text-[var(--text-muted)] font-primary font-medium">{label}</span>
      <span className="min-w-0 text-sm text-[var(--text-primary)] font-primary text-right break-words">{children}</span>
    </div>
  );
}

/** One return request with everything needed to decide, and the actions its status allows */
export default function ReturnDetailPanel({ request, onClose, onChanged }: ReturnDetailPanelProps) {
  const t = useTranslations("admin.returns.detail");
  const tReason = useTranslations("admin.returns.reason");
  const format = useFormatter();
  const { format: formatMoney } = useMoney();
  const [action, setAction] = useState<"approve" | "reject" | "receive" | null>(null);

  const { order, refund } = request;
  const date = (iso: string) => format.dateTime(new Date(iso), "dateTime");
  const done = (updated: ReturnRequest) => {
    setAction(null);
    onChanged(updated);
  };

  const canReject = REJECTABLE_STATUSES.includes(request.status);
  const hasActions = request.status === "REQUESTED" || request.status === "APPROVED";

  return (
    <>
      <ModalShell title={t("title", { id: request.id })} onClose={onClose} maxWidthClass="max-w-160">
        <ModalBody>
          {/* Money to send back: the screen's whole point once the parcel is in */}
          {refund && (
            <div className="rounded-lg border border-[var(--accent-primary)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-2 font-primary">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[var(--text-muted)]">{t("refund.expected")}</span>
                <RefundBadge status={refund.status} />
              </div>
              <MoneyText
                money={moneyOf(refund, "amount")}
                className="text-[var(--text-primary)]"
                amountClassName="text-xl font-semibold"
              />
              {refund.bankReference && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  {t("refund.reference", { ref: refund.bankReference })}
                  <CopyButton value={refund.bankReference} label={t("refund.referenceLabel")} />
                </span>
              )}
              {request.shippingRefunded && (
                <span className="text-xs text-[var(--text-muted)]">{t("refund.withShipping")}</span>
              )}
              <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_VIEW}>
                <Link
                  href={`/admin/refunds?orderId=${encodeURIComponent(request.orderId)}`}
                  className="self-start text-xs font-semibold text-[var(--accent-primary)] no-underline hover:underline pointer-coarse:min-h-11 inline-flex items-center"
                >
                  {t("refund.open")}
                </Link>
              </RoleGuard>
            </div>
          )}

          <FormSection title={t("request.section")}>
            <Row label={t("request.status")}>
              <ReturnBadge status={request.status} />
            </Row>
            <Row label={t("request.createdAt")}>{date(request.createdAt)}</Row>
            <Row label={t("request.reason")}>{tReason(request.reason)}</Row>
            {request.note && <Row label={t("request.note")}>{request.note}</Row>}
            {request.adminNote && <Row label={t("request.adminNote")}>{request.adminNote}</Row>}
            {request.approvedAt && <Row label={t("request.approvedAt")}>{date(request.approvedAt)}</Row>}
            {request.receivedAt && <Row label={t("request.receivedAt")}>{date(request.receivedAt)}</Row>}
          </FormSection>

          {order && (
            <FormSection title={t("order.section")}>
              <Row label={t("order.id")}>
                <Link
                  href={`/admin/orders?orderId=${encodeURIComponent(order.id)}`}
                  className="font-mono font-semibold text-[var(--accent-primary)] no-underline hover:underline"
                >
                  #{order.id}
                </Link>
              </Row>
              <Row label={t("order.customer")}>
                {[order.customer.fullName, order.customer.phone].filter(Boolean).join(" · ") || "—"}
              </Row>
              <Row label={t("order.total")}>
                <MoneyText money={moneyOf(order, "total")} />
              </Row>
              <Row label={t("order.shippingFee")}>
                <MoneyText money={moneyOf(order, "shippingFee")} amountClassName="font-normal" />
              </Row>
              <Row label={t("order.deliveredAt")}>{order.deliveredAt ? date(order.deliveredAt) : "—"}</Row>
              <Row label={t("order.payment")}>
                <OrderPaymentBadge status={order.paymentStatus} />
              </Row>
            </FormSection>
          )}

          <FormSection title={t("items.section")}>
            <ul className="m-0 p-0 list-none flex flex-col gap-3">
              {request.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-semibold font-primary text-[var(--text-primary)] break-words">
                      {item.productName}
                    </span>
                    <span className="text-xs font-primary text-[var(--text-muted)]">
                      {[item.size, item.color].filter(Boolean).join(" · ")}
                      {item.priceVnd !== null && item.priceUsd !== null && ` · ${formatMoney({ vnd: item.priceVnd, usd: item.priceUsd })}`}
                    </span>
                  </div>
                  <span className="shrink-0 text-right text-xs font-primary text-[var(--text-secondary)]">
                    {t("items.asked", { quantity: item.quantity })}
                    {item.acceptedQuantity !== null && (
                      <>
                        <br />
                        <span className="font-semibold text-[var(--text-primary)]">
                          {t("items.accepted", { quantity: item.acceptedQuantity })}
                        </span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </FormSection>
        </ModalBody>

        {hasActions && (
          <RoleGuard permission={PERMISSIONS.RETURN_ADMIN_PROCESS}>
            <div className="shrink-0 flex flex-wrap justify-end gap-3 py-3 px-4 sm:py-4 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--border-subtle)]">
              {canReject && (
                <button
                  type="button"
                  className={`${ACTION_BUTTON} bg-[var(--bg-elevated)] text-[var(--text-secondary)]`}
                  onClick={() => setAction("reject")}
                >
                  {t("actions.reject")}
                </button>
              )}
              {request.status === "REQUESTED" && (
                <button
                  type="button"
                  className={`${ACTION_BUTTON} bg-[var(--accent-primary)] text-[var(--text-on-gold)]`}
                  onClick={() => setAction("approve")}
                >
                  {t("actions.approve")}
                </button>
              )}
              {request.status === "APPROVED" && (
                <button
                  type="button"
                  className={`${ACTION_BUTTON} bg-[var(--accent-primary)] text-[var(--text-on-gold)]`}
                  onClick={() => setAction("receive")}
                >
                  {t("actions.receive")}
                </button>
              )}
            </div>
          </RoleGuard>
        )}
      </ModalShell>

      {action === "approve" && <ApproveReturnModal request={request} onClose={() => setAction(null)} onDone={done} />}
      {action === "reject" && <RejectReturnModal request={request} onClose={() => setAction(null)} onDone={done} />}
      {action === "receive" && <ReceiveReturnModal request={request} onClose={() => setAction(null)} onDone={done} />}
    </>
  );
}
