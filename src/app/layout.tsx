import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter_Tight } from "next/font/google";
import { ToastProvider } from "./_components/Toast";
import { ConfirmProvider } from "./_components/ConfirmDialog";
import { SystemPasswordPromptProvider } from "./_components/SystemPasswordPrompt";
import { QuickAddProvider } from "./_components/QuickAddDrawer";
import { LoginPromptProvider } from "./_components/LoginPromptModal";
import CartFAB from "./_components/CartFAB";
import RouteTransition from "./_components/RouteTransition";
import Providers from "./_components/Providers";
import { CustomCursor } from "./_components/cursor";
import AppwritePing from "./_components/AppwritePing";
import "./globals.css";

const quicheDisplay = localFont({
  src: "../assets/fonts/QuicheDisplay-Regular.otf",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-quiche-display",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: "500",
  display: "swap",
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: "DOOVAN — Haute Couture Collection",
  description:
    "Discover DOOVAN's exclusive haute couture collection. Luxury bags, apparel & accessories designed for the global fashion runway.",
  openGraph: {
    images: [
      {
        url: "/brand/brand_og.png",
        width: 1200,
        height: 630,
        alt: "Website thumbnail",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/brand_og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${quicheDisplay.variable} ${interTight.variable}`}
      suppressHydrationWarning
    >
      <body>
        <AppwritePing />
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
                  </QuickAddProvider>
                </LoginPromptProvider>
              </SystemPasswordPromptProvider>
            </ConfirmProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
