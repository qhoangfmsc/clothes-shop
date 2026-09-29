import AdminLayoutClient from "./AdminLayoutClient";

export const metadata = {
  title: "Admin — DOOVAN",
  description: "Admin dashboard for DOOVAN",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
