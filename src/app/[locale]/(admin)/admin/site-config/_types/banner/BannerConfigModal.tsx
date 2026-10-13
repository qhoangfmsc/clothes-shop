"use client";

import { useState, type FormEvent } from "react";
import { Plus, X, ImageIcon, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { ImageUrlField } from "@/src/app/[locale]/_components/ImageUrlField";
import {
  ModalShell,
  ModalBody,
  FormSection,
  FormField,
  FormActions,
  inputClass,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { upsertSiteConfig } from "../../_common/moduleSlice";
import type { ConfigEditorProps } from "../registry";
import { EMPTY_BANNER_ITEM, parseBannerValue } from "./banner-form";
import type { BannerItem, BannerResponsiveImages } from "@/src/types/site-config";

/** Editor of a BANNER config: the list of banners of one page (images per screen size + text + button) */
export default function BannerConfigModal({ configKey, title, savedValue, onClose }: ConfigEditorProps) {
  const t = useTranslations("admin.siteConfig");
  const toErrorMessage = useErrorMessage();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isUpdating = useAppSelector((s) => s.siteConfig.isUpdating);

  const [bannerItems, setBannerItems] = useState<BannerItem[]>(() => parseBannerValue(savedValue));
  /* Which banner cards are collapsed down to just their header — lets admins tuck away banners they are
     done with so the ones they are working on do not get lost in a long list. */
  const [collapsedBanners, setCollapsedBanners] = useState<Set<number>>(new Set());

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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (bannerItems.some((b) => !b.image.trim())) {
      toast.error(t("toast.desktopRequired"));
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
      await dispatch(upsertSiteConfig({ key: configKey, value })).unwrap();
      toast.success(t("toast.saved"));
      onClose();
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.saveFailed")));
    }
  };

  return (
        <ModalShell title={title} onClose={onClose} maxWidthClass="max-w-180">
          <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
            <ModalBody>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text-secondary)] font-primary flex items-center gap-1.5">
                  <ImageIcon size={14} /> {t("form.banners", { count: bannerItems.length })}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 py-1 px-2.5 bg-transparent border border-[var(--border-subtle)] rounded-sm text-xs font-primary text-[var(--text-secondary)] cursor-pointer"
                  onClick={addBanner}
                >
                  <Plus size={12} /> {t("form.addBanner")}
                </button>
              </div>

              {bannerItems.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] py-3">{t("form.emptyHint")}</p>
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
                      aria-label={t("form.removeBanner")}
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
                        {t("form.bannerN", { index: i + 1 })}
                      </span>
                      {isCollapsed && (
                        <>
                          <span className="text-[var(--border-light)] shrink-0">|</span>
                          <span className="flex items-center gap-3 overflow-hidden">
                            {[
                              { label: t("form.images.desktop"), has: !!b.image?.trim() },
                              {
                                label: t("form.images.tablet"),
                                has: !!b.responsiveImages?.tablet?.trim(),
                              },
                              {
                                label: t("form.images.mobile"),
                                has: !!b.responsiveImages?.mobile?.trim(),
                              },
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
                        <FormSection title={t("form.images.section")}>
                          <FormField
                            label={t("form.images.desktop")}
                            required
                            info={t("form.images.desktopInfo")}
                          >
                            <ImageUrlField
                              value={b.image}
                              onChange={(url) => updBanner(i, "image", url)}
                            />
                          </FormField>

                          <FormField
                            label={t("form.images.tablet")}
                            info={t("form.images.tabletInfo")}
                          >
                            <ImageUrlField
                              value={b.responsiveImages?.tablet ?? ""}
                              onChange={(url) => updBannerResponsiveImage(i, "tablet", url)}
                            />
                          </FormField>

                          <FormField
                            label={t("form.images.mobile")}
                            info={t("form.images.mobileInfo")}
                          >
                            <ImageUrlField
                              value={b.responsiveImages?.mobile ?? ""}
                              onChange={(url) => updBannerResponsiveImage(i, "mobile", url)}
                            />
                          </FormField>
                        </FormSection>

                        <FormSection title={t("form.content.section")}>
                          <FormField
                            label={t("form.content.label")}
                            info={t("form.content.labelInfo")}
                          >
                            <input
                              className={inputClass}
                              value={b.label ?? ""}
                              onChange={(e) => updBanner(i, "label", e.target.value)}
                            />
                          </FormField>
                          <FormField
                            label={t("form.content.title")}
                            info={t("form.content.titleInfo")}
                          >
                            <input
                              className={inputClass}
                              value={b.title ?? ""}
                              onChange={(e) => updBanner(i, "title", e.target.value)}
                            />
                          </FormField>
                          <FormField
                            label={t("form.content.subtitle")}
                            info={t("form.content.subtitleInfo")}
                          >
                            <input
                              className={inputClass}
                              value={b.subtitle ?? ""}
                              onChange={(e) => updBanner(i, "subtitle", e.target.value)}
                            />
                          </FormField>
                          <FormField
                            label={t("form.content.ctaLabel")}
                            info={t("form.content.ctaLabelInfo")}
                          >
                            <input
                              className={inputClass}
                              value={b.ctaLabel ?? ""}
                              onChange={(e) => updBanner(i, "ctaLabel", e.target.value)}
                            />
                          </FormField>
                          <FormField
                            label={t("form.content.ctaHref")}
                            info={t("form.content.ctaHrefInfo")}
                          >
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
            </ModalBody>

            <FormActions onCancel={onClose} isSaving={isUpdating} submitLabel={t("form.save")} />
          </form>
        </ModalShell>
  );
}
