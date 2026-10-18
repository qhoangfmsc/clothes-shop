"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/src/lib/api";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import {
  PAYMENT_POLL_INTERVAL_MS,
  normalizePaymentStatus,
  type PaymentAmount,
  type PaymentSession,
  type PaymentStatus,
} from "./payment";

export type PaymentPhase = "loading" | "pending" | "paid" | "expired" | "cancelled" | "error";

const PHASE_BY_STATUS: Record<PaymentStatus, PaymentPhase> = {
  PENDING: "pending",
  PAID: "paid",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
};

/* Polling cannot recover from these: stop and show the error instead of retrying forever */
const FATAL_POLL_STATUSES = new Set([401, 403, 404]);

type RawSession = Omit<PaymentSession, "status"> & { status: string };

/**
 * Payment session of one order. On mount it asks for the QR (`POST /api/payments/qr` returns the same
 * session until it expires, so a reload keeps the QR), then polls the status every `PAYMENT_POLL_INTERVAL_MS`
 * while it is `PENDING`. Polling stops on a final status, once `expiresAt` has passed, and on unmount.
 */
export function usePaymentSession(orderId: string, enabled: boolean) {
  const { apiFetch } = useApiAuth();
  const [phase, setPhase] = useState<PaymentPhase>("loading");
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  /* Latest amount the BE reported (QR session or status answer), so the page never loses the figure */
  const [amount, setAmount] = useState<PaymentAmount | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  /* Codes of earlier sessions of this order that expired and were replaced: a shopper may still have paid one */
  const [previousCodes, setPreviousCodes] = useState<string[]>([]);
  const sessionRef = useRef<PaymentSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  /* Bumped on every (re)start and on unmount so a late response of an older request is dropped */
  const runRef = useRef(0);

  const fetchStatus = useCallback(async (): Promise<PaymentStatus> => {
    const res = await apiFetch<{ data: { status: string } & PaymentAmount }>(
      `/api/payments/${encodeURIComponent(orderId)}/status`
    );
    if (!res.data) throw new Error("");
    const { amountVnd, amountUsd } = res.data;
    setAmount({ amountVnd, amountUsd });
    return normalizePaymentStatus(res.data.status);
  }, [apiFetch, orderId]);

  /* Create the QR session, or get the active one back (the BE owns amount, content and expiry) */
  const createSession = useCallback(async (): Promise<PaymentSession> => {
    const res = await apiFetch<{ data: RawSession }>("/api/payments/qr", {
      method: "POST",
      body: { orderId },
    });
    if (!res.data) throw new Error("");
    const { amountVnd, amountUsd } = res.data;
    setAmount({ amountVnd, amountUsd });
    return { ...res.data, status: normalizePaymentStatus(res.data.status) };
  }, [apiFetch, orderId]);

  const start = useCallback(async () => {
    const run = ++runRef.current;
    setPhase("loading");
    setError(null);
    setConnectionLost(false);
    try {
      const created = await createSession();
      if (run !== runRef.current) return;
      setSession(created);
      setPhase(PHASE_BY_STATUS[created.status]);
    } catch (err) {
      if (run !== runRef.current) return;
      /* An order that is already paid or cancelled can refuse a new QR: its status tells which */
      try {
        const status = await fetchStatus();
        if (run !== runRef.current) return;
        if (status === "PAID" || status === "CANCELLED") {
          setPhase(PHASE_BY_STATUS[status]);
          return;
        }
      } catch {
        /* keep the error of the QR request */
      }
      if (run !== runRef.current) return;
      setError(err);
      setPhase("error");
    }
  }, [fetchStatus, createSession]);

  /* New QR session after the previous one expired. Throws so the caller can toast. */
  const recreate = useCallback(async () => {
    const run = ++runRef.current;
    setIsCreating(true);
    try {
      const created = await createSession();
      if (run !== runRef.current) return;
      const old = sessionRef.current?.transferContent;
      if (old && old !== created.transferContent) {
        setPreviousCodes((codes) => (codes.includes(old) ? codes : [...codes, old]));
      }
      setSession(created);
      setConnectionLost(false);
      setPhase(PHASE_BY_STATUS[created.status]);
    } finally {
      setIsCreating(false);
    }
  }, [createSession]);

  /* Drops any response still in flight (unmount, or the next start) */
  const invalidate = useCallback(() => {
    runRef.current++;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void start();
    return invalidate;
  }, [enabled, start, invalidate]);

  const expiresAt = session?.expiresAt ?? null;

  /* Poll while waiting for the transfer. Each request starts only after the previous one finished. */
  useEffect(() => {
    if (phase !== "pending") return;
    const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
    const hasExpired = () => !Number.isNaN(expiresAtMs) && Date.now() >= expiresAtMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let inFlight = false;

    function schedule() {
      /* Wake up right after the code expires instead of up to one interval later */
      const untilExpiry = expiresAtMs - Date.now();
      const delay = untilExpiry > 0 ? Math.min(PAYMENT_POLL_INTERVAL_MS, untilExpiry + 200) : PAYMENT_POLL_INTERVAL_MS;
      timer = setTimeout(tick, delay);
    }

    async function tick() {
      if (stopped || inFlight) return;
      /* Hidden tab: no requests, the visibility handler checks right away on return */
      if (document.hidden) {
        schedule();
        return;
      }
      inFlight = true;
      try {
        const status = await fetchStatus();
        if (stopped) return;
        setConnectionLost(false);
        if (status !== "PENDING") {
          setPhase(PHASE_BY_STATUS[status]);
          return;
        }
        /* Still unpaid after expiry: stop and offer a new code. Checked after the status so a payment
           that landed right before expiry still wins. */
        if (hasExpired()) {
          setPhase("expired");
          return;
        }
      } catch (err) {
        if (stopped) return;
        if (err instanceof ApiError && FATAL_POLL_STATUSES.has(err.status)) {
          setError(err);
          setPhase("error");
          return;
        }
        setConnectionLost(true);
      } finally {
        inFlight = false;
      }
      schedule();
    }

    function onVisible() {
      if (document.hidden || inFlight) return;
      clearTimeout(timer);
      void tick();
    }

    document.addEventListener("visibilitychange", onVisible);
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phase, expiresAt, fetchStatus]);

  return { phase, session, amount, error, connectionLost, isCreating, previousCodes, retry: start, recreate };
}
