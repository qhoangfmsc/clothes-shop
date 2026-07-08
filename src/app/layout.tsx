import type { Metadata } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "./_components/Toast";
import { QuickAddProvider } from "./_components/QuickAddDrawer";
import { LoginPromptProvider } from "./_components/LoginPromptModal";
import CartFAB from "./_components/CartFAB";
import RouteTransition from "./_components/RouteTransition";
import Providers from "./_components/Providers";
import "./globals.css";
import "../styles/cart-fab.css";

const quicheDisplay = localFont({
  src: "../assets/fonts/QuicheDisplay-Regular.otf",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-quiche-display",
});

export const metadata: Metadata = {
  title: "Ori Baebi — Haute Couture Collection",
  description:
    "Discover Ori Baebi's exclusive haute couture collection. Luxury bags, apparel & accessories designed for the global fashion runway.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${quicheDisplay.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <ToastProvider position="bottom-center">
            <LoginPromptProvider>
              <QuickAddProvider>
                <RouteTransition />
                <CartFAB />
                {children}
              </QuickAddProvider>
            </LoginPromptProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
