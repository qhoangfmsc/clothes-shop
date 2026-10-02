"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, X, ImageIcon, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import {
  FormModalShell,
  FormSection,
  FormField,
  FormActions,
  inputClass,
} from "@/src/app/_components/AdminFormKit";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchSiteConfigKeys,
  fetchSiteConfigList,
  upsertSiteConfig,
  deleteSiteConfig,
} from "./_common/moduleSlice";
import {
  SITE_CONFIG_KEY_LABELS,
  SITE_CONFIG_KEY_DESCRIPTIONS,
  EMPTY_BANNER_ITEM,
} from "./_common/constants";
import type { SiteConfigRow } from "./_common/types";
import type { BannerItem, BannerResponsiveImages } from "@/src/types/site-config";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function SiteConfigContent() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { keys, items, isListLoading, isUpdating } = useAppSelector((s) => s.siteConfig);

  /* Guard against React Strict Mode's dev-only double-invoke of mount effects
     (mirrors the fetchingRef pattern in DataTable.tsx) */
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    dispatch(fetchSiteConfigKeys());
    dispatch(fetchSiteConfigList());
  }, [dispatch]);

  /* ── Merge known keys + saved configs into display rows ── */
  const rows: SiteConfigRow[] = useMemo(
    () =>
      keys.map((k) => {
        const config = items.find((c) => c.key === k.key) ?? null;
        let bannerCount = 0;
        if (config?.value) {
          try {
            const parsed = JSON.parse(config.value);
            if (Array.isArray(parsed)) bannerCount = parsed.length;
          } catch {
            bannerCount = 0;
          }
        }
        return { key: k.key, type: k.type, config, bannerCount };
      }),
    [keys, items]
  );

  /* ── Modal / form state ── */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [bannerItems, setBannerItems] = useState<BannerItem[]>([]);
  /* Which banner cards are collapsed down to just their header — lets admins
     tuck away banners they're done configuring so the ones they're actively
     working on don't get lost in a long list. */
  const [collapsedBanners, setCollapsedBanners] = useState<Set<number>>(new Set());
  const editingRow = rows.find((r) => r.key === editingKey) ?? null;

  const openEdit = (row: SiteConfigRow) => {
    setEditingKey(row.key);
    setCollapsedBanners(new Set());
    if (row.config?.value) {
      try {
        const parsed = JSON.parse(row.config.value);
        setBannerItems(Array.isArray(parsed) ? parsed : []);
      } catch {
        setBannerItems([]);
      }
    } else {
      setBannerItems([]);
    }
  };

  const closeModal = () => {
    setEditingKey(null);
    setBannerItems([]);
    setCollapsedBanners(new Set());
  };

  const toggleBannerCollapse = (i: number) =>
    setCollapsedBanners((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  /* ── Banner item helpers ── */
  const addBanner = () => setBannerItems((p) => [...p, { ...EMPTY_BANNER_ITEM }]);

  const updBanner = (i: number, field: keyof BannerItem, value: string) =>
    setBannerItems((p) => {
      const next = [...p];
      next[i] = { ...next[i], [field]: value };
      return next;
    });

  const updBannerResponsiveImage = (
    i: number,
    breakpoint: keyof BannerResponsiveImages,
    value: string
  ) =>
    setBannerItems((p) => {
      const next = [...p];
      next[i] = {
        ...next[i],
        responsiveImages: { ...next[i].responsiveImages, [breakpoint]: value },
      };
      return next;
    });

  const rmBanner = (i: number) => setBannerItems((p) => p.filter((_, j) => j !== i));

  /* ── Save / Reset ── */
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;
    if (bannerItems.some((b) => !b.image.trim())) {
      toast.error("Every banner needs a Desktop image");
      return;
    }
    try {
      /* Drop empty responsive overrides so unfilled fields don't bloat the
         stored JSON with `{ mobile: "", tablet: "", ... }` noise. */
      const cleaned = bannerItems.map((b) => {
        const responsiveImages = Object.fromEntries(
          Object.entries(b.responsiveImages ?? {}).filter(([, v]) => v?.trim())
        );
        return {
          ...b,
          responsiveImages: Object.keys(responsiveImages).length > 0 ? responsiveImages : undefined,
        };
      });
      const value = JSON.stringify(cleaned);
      await dispatch(upsertSiteConfig({ key: editingKey, value })).unwrap();
      toast.success("Config saved");
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleReset = async (key: string) => {
    if (!confirm("Delete this config? The page will fall back to its default content.")) return;
    try {
      await dispatch(deleteSiteConfig(key)).unwrap();
      toast.success("Config deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">
          Site Config
        </h1>
        <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
          Banners &amp; content configured for the public pages.
        </p>
      </div>

      {isListLoading ? (
        <p className="text-sm text-[var(--text-muted)] font-primary">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col gap-3 p-5 border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-secondary)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-[var(--text-heading)] font-primary">
                    {SITE_CONFIG_KEY_LABELS[row.key] ?? row.key}
                  </span>
                  <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
                    {SITE_CONFIG_KEY_DESCRIPTIONS[row.key] ?? ""}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] py-0.5 px-2 rounded-full bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]">
                  {row.type}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-primary text-[var(--text-secondary)]">
                {row.config ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage)]" />
                    Configured — {row.bannerCount} banner{row.bannerCount !== 1 ? "s" : ""}
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-disabled)]" />
                    Empty
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-1">
                <RoleGuard permission={PERMISSIONS.SITE_CONFIG_UPSERT}>
                  <button
                    className="flex-1 py-2 px-3 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-xs font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openEdit(row)}
                  >
                    Edit
                  </button>
                </RoleGuard>
                {row.config && (
                  <RoleGuard permission={PERMISSIONS.SITE_CONFIG_DELETE}>
                    <button
                      className="py-2 px-3 bg-transparent border border-[var(--border-subtle)] text-[var(--accent-rose)] rounded-lg text-xs font-primary cursor-pointer"
                      onClick={() => handleReset(row.key)}
                    >
                      Delete
                    </button>
                  </RoleGuard>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════ MODAL FORM ═══════════════ */}
      {editingRow && (
        <FormModalShell
          title={SITE_CONFIG_KEY_LABELS[editingRow.key] ?? editingRow.key}
          onClose={closeModal}
          maxWidthClass="max-w-180"
        >
          <form onSubmit={handleSave} className="p-6 flex flex-col gap-5 overflow-auto">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-[var(--text-secondary)] font-primary flex items-center gap-1.5">
                <ImageIcon size={14} /> Banners ({bannerItems.length})
              </span>
              <button
                type="button"
                className="flex items-center gap-1 py-1 px-2.5 bg-transparent border border-[var(--border-subtle)] rounded-sm text-xs font-primary text-[var(--text-secondary)] cursor-pointer"
                onClick={addBanner}
              >
                <Plus size={12} /> Add banner
              </button>
            </div>

            {bannerItems.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-3">
                No banners yet. Click &quot;Add banner&quot; to start — leave it empty and the page
                keeps its built-in default.
              </p>
            )}

            {bannerItems.map((b, i) => {
              const isCollapsed = collapsedBanners.has(i);
              return (
                <div
                  key={i}
                  className="relative border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col gap-4"
                >
                  <button
                    type="button"
                    className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 border-0 bg-transparent cursor-pointer text-[var(--accent-rose)]"
                    onClick={() => rmBanner(i)}
                  >
                    <X size={13} />
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-2 bg-transparent border-0 p-0 pr-8 cursor-pointer text-left"
                    onClick={() => toggleBannerCollapse(i)}
                  >
                    {isCollapsed ? (
                      <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0" />
                    ) : (
                      <ChevronUp size={14} className="text-[var(--text-muted)] shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-[var(--text-muted)] font-primary shrink-0">
                      Banner {i + 1}
                    </span>
                    {isCollapsed && (
                      <>
                        <span className="text-[var(--border-light)] shrink-0">|</span>
                        <span className="flex items-center gap-3 overflow-hidden">
                          {[
                            { label: "Desktop", has: !!b.image?.trim() },
                            { label: "Tablet", has: !!b.responsiveImages?.tablet?.trim() },
                            { label: "Mobile", has: !!b.responsiveImages?.mobile?.trim() },
                          ].map(({ label, has }) => (
                            <span
                              key={label}
                              className={`flex items-center gap-1 text-xs font-primary whitespace-nowrap ${
                                has
                                  ? "text-[var(--text-secondary)]"
                                  : "text-[var(--text-disabled)] opacity-40"
                              }`}
                            >
                              {has ? (
                                <Check size={12} className="text-[var(--color-sage)] shrink-0" />
                              ) : (
                                <span className="w-3 shrink-0" />
                              )}
                              {label}
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                  </button>

                  {!isCollapsed && (
                    <>
                      <FormSection title="Banner images">
                        <FormField
                          label="Desktop"
                          required
                          info="Laptop / PC, ≥ 1024px — also the fallback for tablet & mobile"
                        >
                          <input
                            className={inputClass}
                            value={b.image}
                            onChange={(e) => updBanner(i, "image", e.target.value)}
                            placeholder="https://... or /images/..."
                            required
                          />
                        </FormField>

                        <FormField
                          label="Tablet"
                          info="iPad / tablets, ≥ 640px — optional, falls back to Desktop"
                        >
                          <input
                            className={inputClass}
                            value={b.responsiveImages?.tablet ?? ""}
                            onChange={(e) => updBannerResponsiveImage(i, "tablet", e.target.value)}
                            placeholder="https://... or /images/..."
                          />
                        </FormField>

                        <FormField
                          label="Mobile"
                          info="Phones, < 640px — optional, falls back to Tablet, then Desktop"
                        >
                          <input
                            className={inputClass}
                            value={b.responsiveImages?.mobile ?? ""}
                            onChange={(e) => updBannerResponsiveImage(i, "mobile", e.target.value)}
                            placeholder="https://... or /images/..."
                          />
                        </FormField>
                      </FormSection>

                      <FormSection title="Content">
                        <FormField label="Label" info="Small label above the title (optional)">
                          <input
                            className={inputClass}
                            value={b.label ?? ""}
                            onChange={(e) => updBanner(i, "label", e.target.value)}
                          />
                        </FormField>
                        <FormField label="Title" info="Heading (optional)">
                          <input
                            className={inputClass}
                            value={b.title ?? ""}
                            onChange={(e) => updBanner(i, "title", e.target.value)}
                          />
                        </FormField>
                        <FormField label="Subtitle" info="Short description (optional)">
                          <input
                            className={inputClass}
                            value={b.subtitle ?? ""}
                            onChange={(e) => updBanner(i, "subtitle", e.target.value)}
                          />
                        </FormField>
                        <FormField label="CTA Label" info='e.g. "Shop Now"'>
                          <input
                            className={inputClass}
                            value={b.ctaLabel ?? ""}
                            onChange={(e) => updBanner(i, "ctaLabel", e.target.value)}
                          />
                        </FormField>
                        <FormField label="CTA Href" info="e.g. /shop">
                          <input
                            className={inputClass}
                            value={b.ctaHref ?? ""}
                            onChange={(e) => updBanner(i, "ctaHref", e.target.value)}
                            placeholder="/shop"
                          />
                        </FormField>
                      </FormSection>
                    </>
                  )}
                </div>
              );
            })}

            <FormActions onCancel={closeModal} isSaving={isUpdating} submitLabel="Save" />
          </form>
        </FormModalShell>
      )}
    </div>
  );
}
