import SiteHeader from "@/src/app/_components/SiteHeader";

export const metadata = {
  title: "Checkout — Ori Baebi",
  description: "Complete your order from Ori Baebi.",
};

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
