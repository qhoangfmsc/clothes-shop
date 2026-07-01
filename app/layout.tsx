import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
