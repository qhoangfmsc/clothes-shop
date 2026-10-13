"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import { FormTabs } from "@/src/app/[locale]/_components/AdminFormKit";
import { useRefreshShipping } from "@/src/hooks/use-api";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import type { SiteConfigType } from "@/src/types/site-config";
import { fetchSiteConfigKeys, fetchSiteConfigList, deleteSiteConfig } from "./_common/moduleSlice";
import type { SiteConfigRow } from "./_common/types";
import { CONFIG_TYPE_ORDER, CONFIG_TYPE_VIEWS } from "./_types/registry";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

/** Site config, one tab per config type (banners, shipping & returns…). Each type owns its form and status
 *  line in `_types/<type>/`; this page only lists the keys of the chosen type and opens the right editor. */
export default function SiteConfigContent() {
  const t = useTranslations("admin.siteConfig");
  const toErrorMessage = useErrorMessage();
  /* Config keys come from the API; an unknown key shows its raw name */
  const keyLabel = (key: string) =>
    t.has(`keys.${key}.label` as never) ? t(`keys.${key}.label` as never) : key;
  const keyDescription = (key: string) =>
    t.has(`keys.${key}.description` as never) ? t(`keys.${key}.description` as never) : "";
  const { toast } = useToast();
  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const refreshShipping = useRefreshShipping();
  const { keys, items, isListLoading } = useAppSelector((s) => s.siteConfig);

  /* Guard against React Strict Mode's dev-only double-invoke of mount effects
     (mirrors the fetchingRef pattern in DataTable.tsx) */
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    dispatch(fetchSiteConfigKeys());
    dispatch(fetchSiteConfigList());
  }, [dispatch]);

  /* ── Merge known keys + saved configs into rows, then group them by type ── */
  const rows: SiteConfigRow[] = useMemo(
    () => keys.map((k) => ({ key: k.key, type: k.type, config: items.find((c) => c.key === k.key) ?? null })),
    [keys, items]
  );
  /* Only types that have an editor and at least one key get a tab */
  const types = CONFIG_TYPE_ORDER.filter((type) => CONFIG_TYPE_VIEWS[type] && rows.some((r) => r.type === type));
  const [chosenType, setChosenType] = useState<SiteConfigType | null>(null);
  const activeType = chosenType && types.includes(chosenType) ? chosenType : (types[0] ?? null);
  const activeRows = rows.filter((r) => r.type === activeType);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editingRow = rows.find((r) => r.key === editingKey) ?? null;
  const Editor = editingRow ? CONFIG_TYPE_VIEWS[editingRow.type]?.Editor : undefined;

  const handleReset = async (row: SiteConfigRow) => {
    const view = CONFIG_TYPE_VIEWS[row.type];
    if (!view) return;
    const ok = await confirm({
      title: t("confirmDelete.title"),
      message: t(`confirmDelete.${view.deleteMessage}`),
      confirmLabel: t("card.delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await dispatch(deleteSiteConfig(row.key)).unwrap();
      /* Customer pages keep the shipping info for 5 min: make them read the defaults again */
      if (row.type === "SHIPPING") await refreshShipping();
      toast.success(t("toast.deleted"));
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.deleteFailed")));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">
          {t("page.title")}
        </h1>
        <p className="text-xs text-[var(--text-muted)] font-primary mt-1">{t("page.subtitle")}</p>
      </div>

      {isListLoading ? (
        <p className="text-sm text-[var(--text-muted)] font-primary">{t("page.loading")}</p>
      ) : (
        <>
          {types.length > 1 && (
            <FormTabs
              tabs={types.map((type) => ({ id: type, label: t(`types.${type}.label` as never) }))}
              active={activeType ?? ""}
              onChange={(id) => setChosenType(id as SiteConfigType)}
            />
          )}
          {activeType && (
            <p className="m-0 -mt-2 text-xs text-[var(--text-muted)] font-primary">
              {t(`types.${activeType}.description` as never)}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRows.map((row) => {
              const Summary = CONFIG_TYPE_VIEWS[row.type]?.Summary;
              return (
                <div
                  key={row.key}
                  className="flex flex-col gap-3 p-5 border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-secondary)]"
                >
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-heading)] font-primary">
                      {keyLabel(row.key)}
                    </span>
                    <p className="text-xs text-[var(--text-muted)] font-primary mt-1">{keyDescription(row.key)}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-primary text-[var(--text-secondary)]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        row.config ? "bg-[var(--color-sage)]" : "bg-[var(--text-disabled)]"
                      }`}
                    />
                    {Summary && <Summary config={row.config} />}
                  </div>

                  <div className="flex gap-2 mt-1">
                    <RoleGuard permission={PERMISSIONS.SITE_CONFIG_UPSERT}>
                      <button
                        className="flex-1 py-2 px-3 pointer-coarse:min-h-11 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-xs font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setEditingKey(row.key)}
                      >
                        {t("card.edit")}
                      </button>
                    </RoleGuard>
                    {row.config && (
                      <RoleGuard permission={PERMISSIONS.SITE_CONFIG_DELETE}>
                        <button
                          className="py-2 px-3 pointer-coarse:min-h-11 bg-transparent border border-[var(--border-subtle)] text-[var(--accent-rose)] rounded-lg text-xs font-primary cursor-pointer"
                          onClick={() => handleReset(row)}
                        >
                          {t("card.delete")}
                        </button>
                      </RoleGuard>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {editingRow && Editor && (
        <Editor
          configKey={editingRow.key}
          title={keyLabel(editingRow.key)}
          savedValue={editingRow.config?.value}
          onClose={() => setEditingKey(null)}
        />
      )}
    </div>
  );
}
