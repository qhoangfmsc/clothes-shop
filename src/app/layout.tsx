import type { Metadata } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "./_components/Toast";
import RouteTransition from "./_components/RouteTransition";
import "./globals.css";

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
        <ToastProvider position="bottom-center">
          <RouteTransition />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
