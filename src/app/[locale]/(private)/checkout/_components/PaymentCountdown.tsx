"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";

/** Time left of the QR session. Display only: the BE alone decides when the session is expired. */
export default function PaymentCountdown({ expiresAt }: { expiresAt: string }) {
  const t = useTranslations("private.checkout.payment.countdown");
  const target = Date.parse(expiresAt);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function tick() {
      const left = Math.max(0, target - Date.now());
      setRemainingMs(left);
      if (left > 0) timer = setTimeout(tick, 1000);
    }

    tick();
    return () => clearTimeout(timer);
  }, [target]);

  if (remainingMs === null) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const time = `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;

  return (
    <p className="m-0 inline-flex items-center justify-center gap-1.5 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
      <Clock size={14} />
      {remainingMs > 0 ? t("remaining", { time }) : t("ended")}
    </p>
  );
}
