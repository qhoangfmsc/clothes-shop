"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, PlugZap, RefreshCw } from "lucide-react";
import type { AnalyticsErrorReason } from "@/src/types/analytics";
import { ENV_VARS, VERCEL_TOKENS_URL } from "../_common/constants";

type StatusCardProps =
  | { kind: "not_configured"; missing: string[] }
  | { kind: "error"; reason: AnalyticsErrorReason | "forbidden" | "network"; onRetry: () => void };

const CODE = "font-mono text-xs bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-[var(--radius-sm)]";

/** Shown instead of the report when it cannot be built: setup instructions or a plain-language error. */
export default function StatusCard(props: StatusCardProps) {
  const t = useTranslations("admin.analytics.status");
  const configured = props.kind === "error";

  return (
    <div className="flex flex-col gap-[var(--space-4)] max-w-[40rem] mx-auto py-[var(--space-10)] px-[var(--space-8)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] font-primary">
      <div className="flex items-center gap-[var(--space-3)] text-[var(--accent-primary)]">
        {configured ? <AlertTriangle size={22} aria-hidden /> : <PlugZap size={22} aria-hidden />}
        <h2 className="m-0 font-display text-lg font-normal text-[var(--text-heading)]">
          {t(configured ? `error.${props.reason}.title` : "notConfigured.title")}
        </h2>
      </div>

      {props.kind === "not_configured" ? (
        <>
          <p className="m-0 text-sm text-[var(--text-secondary)] leading-relaxed">
            {t("notConfigured.description")}
          </p>
          <ol className="m-0 pl-5 flex flex-col gap-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>
              {t.rich("notConfigured.steps.token", {
                link: (chunks) => (
                  <a
                    href={VERCEL_TOKENS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text-brand)] underline"
                  >
                    {chunks}
                  </a>
                ),
                token: ENV_VARS.token,
                code: (chunks) => <code className={CODE}>{chunks}</code>,
              })}
            </li>
            <li>
              {t.rich("notConfigured.steps.project", {
                projectId: ENV_VARS.projectId,
                teamId: ENV_VARS.teamId,
                code: (chunks) => <code className={CODE}>{chunks}</code>,
              })}
            </li>
            <li>
              {t.rich("notConfigured.steps.plan", {
                plan: ENV_VARS.plan,
                code: (chunks) => <code className={CODE}>{chunks}</code>,
              })}
            </li>
            <li>{t("notConfigured.steps.redeploy")}</li>
          </ol>
          {props.missing.length > 0 && (
            <p className="m-0 text-xs text-[var(--text-muted)]">
              {t.rich("notConfigured.missing", {
                names: props.missing.join(", "),
                code: (chunks) => <code className={CODE}>{chunks}</code>,
              })}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="m-0 text-sm text-[var(--text-secondary)] leading-relaxed">
            {t(`error.${props.reason}.message`)}
          </p>
          <button
            type="button"
            onClick={props.onRetry}
            className="self-start inline-flex items-center gap-2 py-2 px-4 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-none rounded-[var(--radius-md)] text-sm font-semibold font-primary cursor-pointer"
          >
            <RefreshCw size={14} aria-hidden />
            {t("retry")}
          </button>
        </>
      )}
    </div>
  );
}
