import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ScopedMessages from "@/src/i18n/ScopedMessages";
import { routing } from "@/src/i18n/routing";
import { withBrand } from "@/src/i18n/metadata";
import AdminLayoutClient from "./AdminLayoutClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "admin.shell.meta" });
  return {
    title: withBrand(t("title")),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <ScopedMessages scope="admin">
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </ScopedMessages>
  );
}
