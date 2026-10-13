"use client";

import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import type { SiteConfig, SiteConfigType } from "@/src/types/site-config";
import BannerConfigModal from "./banner/BannerConfigModal";
import { parseBannerValue } from "./banner/banner-form";
import ShippingConfigModal from "./shipping/ShippingConfigModal";

/** What every type's editor receives: the key it edits and what is saved for it */
export interface ConfigEditorProps {
  configKey: string;
  title: string;
  /** Saved `value` of the key, when there is one */
  savedValue: string | undefined;
  onClose: () => void;
}

export interface ConfigTypeView {
  /** The type's own form, opened from the card of a key of this type */
  Editor: ComponentType<ConfigEditorProps>;
  /** The status line of a card ("Configured — 2 banners", "Using default values"…) */
  Summary: ComponentType<{ config: SiteConfig | null }>;
  /** Message under `admin.siteConfig.confirmDelete` asked before deleting a key of this type */
  deleteMessage: "message" | "shippingMessage";
}

function BannerSummary({ config }: { config: SiteConfig | null }) {
  const t = useTranslations("admin.siteConfig.card");
  if (!config) return <>{t("empty")}</>;
  return <>{t("configured", { count: parseBannerValue(config.value).length })}</>;
}

function ShippingSummary({ config }: { config: SiteConfig | null }) {
  const t = useTranslations("admin.siteConfig.card");
  return <>{config ? t("shippingConfigured") : t("shippingDefault")}</>;
}

/** One entry per config type that has an editor. A new type = its folder here + one line below. */
export const CONFIG_TYPE_VIEWS: Partial<Record<SiteConfigType, ConfigTypeView>> = {
  BANNER: { Editor: BannerConfigModal, Summary: BannerSummary, deleteMessage: "message" },
  SHIPPING: { Editor: ShippingConfigModal, Summary: ShippingSummary, deleteMessage: "shippingMessage" },
};

/** Order of the tabs */
export const CONFIG_TYPE_ORDER: readonly SiteConfigType[] = ["BANNER", "SHIPPING"];
