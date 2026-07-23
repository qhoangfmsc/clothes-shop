import AdminLayoutClient from "./AdminLayoutClient";

export const metadata = {
  title: "Admin — Ori Baebi",
  description: "Admin dashboard for Ori Baebi",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
