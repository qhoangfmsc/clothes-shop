import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { ToastProvider } from "./_components/Toast";
import { ConfirmProvider } from "./_components/ConfirmDialog";
import { SystemPasswordPromptProvider } from "./_components/SystemPasswordPrompt";
import { QuickAddProvider } from "./_components/QuickAddDrawer";
import { LoginPromptProvider } from "./_components/LoginPromptModal";
import CartFAB from "./_components/CartFAB";
import RouteTransition from "./_components/RouteTransition";
import VercelTelemetry from "./_components/VercelTelemetry";
import Providers from "./_components/Providers";
import { CustomCursor } from "./_components/cursor";
import { LOCALE_LABELS, routing, type AppLocale } from "@/src/i18n/routing";
import { pickMessages } from "@/src/i18n/messages";
import { buildAlternates } from "@/src/i18n/metadata";
import { SITE_URL } from "@/src/lib/site-url";
import "../globals.css";

/* Site typeface: Doovan Display (woff2 = web build, .otf = desktop/design tools). Full Vietnamese coverage, single weight 400.
   Every weight (400, 500, 600…) resolves to this one file; `font-synthesis: none` in globals.css
   stops the browser from faking bold. */
const siteFont = localFont({
  src: "../../assets/fonts/DoovanDisplay.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-site",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shared.site.meta" });

  return {
    /* Turns relative canonical / hreflang / OG image URLs into absolute ones */
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: buildAlternates(locale),
    openGraph: {
      type: "website",
      siteName: "DOOVAN",
      locale: LOCALE_LABELS[locale].ogLocale,
      images: [{ url: "/brand/brand_og.png", width: 1200, height: 630, alt: t("ogAlt") }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/brand/brand_og.png"],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /* Root scopes: everything the always-mounted UI (header, footer, toasts, dialogs,
     login prompt) needs. Route-group layouts add their own scope (public / private / admin). */
  const messages = pickMessages(await getMessages(), ["common", "shared", "auth"]);

  return (
    <html
      lang={locale}
      className={siteFont.variable}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CustomCursor />
          <Providers>
            <ToastProvider position="bottom-center">
              <ConfirmProvider>
                <SystemPasswordPromptProvider>
                  <LoginPromptProvider>
                    <QuickAddProvider>
                      <RouteTransition />
                      <CartFAB />
                      {children}
                      <VercelTelemetry />
                    </QuickAddProvider>
                  </LoginPromptProvider>
                </SystemPasswordPromptProvider>
              </ConfirmProvider>
            </ToastProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
