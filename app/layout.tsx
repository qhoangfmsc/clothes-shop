import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRMPT — Archive Collection",
  description:
    "Explore the PRMPT Archive Collection. A curated fashion experience.",
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontWeight: 500,
        }}
      >
        {children}
      </body>
    </html>
  );
}
