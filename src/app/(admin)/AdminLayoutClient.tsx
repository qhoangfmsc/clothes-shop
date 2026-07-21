"use client";

import { type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Shirt,
  FolderTree,
  Layers,
  ShoppingBag,
  Users,
  LogOut,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { AdminGuard } from "@/src/app/_components/RoleGuard";
import { hasPermission, PERMISSIONS } from "@/src/lib/permissions";

/* ── Sidebar nav grouped by domain ── */
const NAV_GROUPS = [
  {
    label: "Catalog",
    items: [
      {
        href: "/admin/products",
        label: "Products",
        icon: Shirt,
        permission: PERMISSIONS.PRODUCT_CREATE,
      },
      {
        href: "/admin/categories",
        label: "Categories",
        icon: FolderTree,
        permission: PERMISSIONS.CATEGORY_CREATE,
      },
      {
        href: "/admin/collections",
        label: "Collections",
        icon: Layers,
        permission: PERMISSIONS.COLLECTION_CREATE,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        href: "/admin/orders",
        label: "Orders",
        icon: ShoppingBag,
        permission: PERMISSIONS.ORDER_ADMIN_VIEW,
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        permission: PERMISSIONS.USER_ADMIN_VIEW,
      },
    ],
  },
];

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  /* Filter items by permission within each group, skip empty groups */
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(user, item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <AdminGuard
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] gap-4 p-[var(--space-8)]">
          <div className="flex flex-col items-center text-center gap-[var(--space-4)] max-w-[400px] py-[var(--space-12)] px-[var(--space-8)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
            <span className="text-[40px]">🔒</span>
            <h2 className="font-display text-xl text-[var(--text-heading)] font-normal m-0">
              Admin Access Required
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-primary leading-relaxed m-0">
              Your account does not have administrator privileges. Please contact an admin if you
              believe this is a mistake.
            </p>
            <Link
              href="/"
              className="py-2 px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] no-underline rounded-[var(--radius-md)] text-sm font-semibold font-primary"
            >
              Back to Store
            </Link>
          </div>
        </div>
      }
    >
      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        {/* Sidebar — sticky, independent scroll */}
        <aside className="w-[240px] min-w-[240px] bg-[var(--color-obsidian)] text-[var(--text-on-dark)] flex flex-col p-[var(--space-6)] gap-[var(--space-8)] fixed top-0 left-0 h-screen overflow-y-auto z-20">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 no-underline text-[var(--text-on-dark)]"
            >
              <span className="text-xl text-[var(--accent-primary)]">✦</span>
              <span className="font-display text-md text-[var(--text-on-dark)]">Ori Baebi</span>
            </Link>
            <span className="text-[9px] font-bold tracking-[0.15em] text-[var(--color-obsidian)] bg-[var(--accent-primary)] py-0.5 px-2 rounded-[var(--radius-pill)]">
              ADMIN
            </span>
          </div>

          <nav className="flex flex-col gap-0.5 flex-1">
            {/* Dashboard — always visible */}
            <Link
              href="/admin"
              className={`flex items-center gap-2.5 py-2.5 px-3 rounded-[var(--radius-md)] no-underline text-sm font-primary font-medium transition-all duration-[var(--duration-fast)] border-l-2 ${
                pathname === "/admin"
                  ? "text-[var(--accent-primary)] bg-[rgba(201,169,110,0.15)] border-l-[var(--accent-primary)] font-semibold"
                  : "text-white/45 border-l-transparent"
              }`}
            >
              <LayoutDashboard size={16} className="opacity-70 shrink-0" />
              <span>Dashboard</span>
            </Link>

            {/* Grouped nav sections */}
            {visibleGroups.map((group, gi) => (
              <div key={group.label}>
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25 font-primary pt-[var(--space-5)] px-[var(--space-2)] pb-[var(--space-1)]">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 py-2.5 px-3 rounded-[var(--radius-md)] no-underline text-sm font-primary font-medium transition-all duration-[var(--duration-fast)] border-l-2 ${
                        isActive
                          ? "text-[var(--accent-primary)] bg-[rgba(201,169,110,0.15)] border-l-[var(--accent-primary)] font-semibold"
                          : "text-white/45 border-l-transparent"
                      }`}
                    >
                      <Icon size={16} className="opacity-70 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {gi < visibleGroups.length - 1 && (
                  <div className="h-px bg-white/5 my-[var(--space-2)]" />
                )}
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 pt-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[var(--text-on-dark)] overflow-hidden text-ellipsis whitespace-nowrap">
                {user?.name ?? user?.email}
              </span>
              <span className="text-xs text-[var(--color-ash)] overflow-hidden text-ellipsis whitespace-nowrap">
                {user?.email}
              </span>
              <span
                className={`text-[9px] font-bold tracking-[0.1em] uppercase py-0.5 px-2 rounded-[var(--radius-pill)] self-start mt-0.5 ${
                  user?.role === "admin"
                    ? "bg-[rgba(201,169,110,0.2)] text-[var(--accent-primary)]"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {user?.role}
              </span>
            </div>
            <button
              className="flex items-center gap-2 bg-transparent border border-white/10 text-white/55 py-2 px-3 rounded-[var(--radius-md)] cursor-pointer text-xs font-primary font-medium transition-all duration-[var(--duration-fast)] hover:text-white/80 hover:border-white/20"
              onClick={handleLogout}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 min-h-screen ml-[240px]">
          <div className="flex items-center gap-[var(--space-4)] py-[var(--space-4)] px-[var(--space-8)] border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] sticky top-0 z-10">
            <button
              className="hidden bg-transparent border-none text-[var(--text-primary)] cursor-pointer p-1"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-0 text-xs text-[var(--text-muted)] font-primary">
              {pathname
                .split("/")
                .filter(Boolean)
                .map((seg, i, arr) => {
                  const isLast = i === arr.length - 1;
                  return (
                    <span key={i} className="inline-flex items-center gap-0">
                      {i > 0 && <ChevronRight size={11} className="mx-1.5 opacity-35 shrink-0" />}
                      <span
                        className={
                          isLast
                            ? "text-[var(--text-primary)] font-semibold capitalize"
                            : "text-[var(--text-muted)] capitalize"
                        }
                      >
                        {seg.charAt(0).toUpperCase() + seg.slice(1)}
                      </span>
                    </span>
                  );
                })}
            </div>
          </div>
          <div className="p-[var(--space-8)] flex-1">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
