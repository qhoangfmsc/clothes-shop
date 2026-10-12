"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/src/i18n/navigation";
import { Link } from "@/src/i18n/navigation";
import {
  LayoutDashboard,
  Shirt,
  FolderTree,
  Layers,
  ShoppingBag,
  Users,
  Settings,
  ImageIcon,
  LogOut,
  ChevronRight,
  Menu,
  X,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { AdminGuard } from "@/src/app/[locale]/_components/RoleGuard";
import { AdminPasswordGate } from "@/src/app/[locale]/_components/AdminPasswordGate";
import { hasPermission, PERMISSIONS, type Permission } from "@/src/lib/permissions";
import { useRoleLabel } from "@/src/i18n/use-labels";

/* ── Sidebar nav grouped by domain ── */
interface NavItem {
  href: string;
  key:
    | "products"
    | "categories"
    | "collections"
    | "orders"
    | "users"
    | "analytics"
    | "siteConfig"
    | "media";
  icon: LucideIcon;
  permission?: Permission;
}

interface NavGroup {
  key: "catalog" | "management" | "system";
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "catalog",
    items: [
      {
        href: "/admin/products",
        key: "products",
        icon: Shirt,
        permission: PERMISSIONS.PRODUCT_VIEW,
      },
      {
        href: "/admin/categories",
        key: "categories",
        icon: FolderTree,
        permission: PERMISSIONS.CATEGORY_VIEW,
      },
      {
        href: "/admin/collections",
        key: "collections",
        icon: Layers,
        permission: PERMISSIONS.COLLECTION_VIEW,
      },
    ],
  },
  {
    key: "management",
    items: [
      {
        href: "/admin/orders",
        key: "orders",
        icon: ShoppingBag,
        permission: PERMISSIONS.ORDER_ADMIN_VIEW,
      },
      {
        href: "/admin/users",
        key: "users",
        icon: Users,
        permission: PERMISSIONS.USER_ADMIN_VIEW,
      },
      {
        href: "/admin/analytics",
        key: "analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    key: "system",
    items: [
      {
        href: "/admin/site-config",
        key: "siteConfig",
        icon: Settings,
        permission: PERMISSIONS.SITE_CONFIG_VIEW,
      },
      {
        href: "/admin/media",
        key: "media",
        icon: ImageIcon,
      },
    ],
  },
];

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const t = useTranslations("admin.shell");
  const roleLabel = useRoleLabel();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /* Below `lg` the sidebar is an off-canvas drawer. It is open only for the page it was opened on,
     so navigating (a link tap, back/forward) closes it without an effect. */
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => {
    setMenuPath(null);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuPath(null);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  /* Direct URL access must honour the same permission the sidebar uses to show the link */
  const requiredPermission = NAV_GROUPS.flatMap((g) => g.items).find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )?.permission;
  const routeAllowed = !requiredPermission || hasPermission(user, requiredPermission);

  /* Filter items by permission within each group, skip empty groups */
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(user, item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    /* Order matters: check permissions first, so a user who is not allowed in is
       never asked for the system password. The password gate is the last step. */
    <AdminGuard
      fallback={
        <AccessDeniedScreen
          title={t("denied.adminRequired.title")}
          message={t("denied.adminRequired.message")}
        />
      }
    >
      {routeAllowed ? (
        <AdminPasswordGate>
          <div className="flex h-dvh overflow-hidden bg-[var(--bg-primary)]">
            {/* Backdrop behind the drawer (below lg only) */}
            <div
              aria-hidden="true"
              onClick={closeMenu}
              className={`lg:hidden fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${
                menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />
            {/* Sidebar — off-canvas drawer below lg, fixed column from lg; independent scroll */}
            <aside
              id="admin-sidebar"
              className={`w-[min(280px,85vw)] lg:w-[240px] lg:min-w-[240px] bg-[var(--color-obsidian)] text-[var(--text-on-dark)] flex flex-col p-[var(--space-6)] pb-[max(var(--space-6),env(safe-area-inset-bottom))] gap-[var(--space-8)] fixed top-0 left-0 h-dvh overflow-y-auto z-40 lg:z-20 transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none ${
                menuOpen ? "translate-x-0 visible" : "max-lg:-translate-x-full max-lg:invisible"
              }`}
            >
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2 no-underline text-[var(--text-on-dark)]"
                >
                  <span className="text-xl text-[var(--accent-primary)]">✦</span>
                  <span className="font-display text-md text-[var(--text-on-dark)]">DOOVAN</span>
                </Link>
                <span className="flex items-center gap-2">
                  <span className="text-[9px] font-bold tracking-[0.15em] text-[var(--color-obsidian)] bg-[var(--accent-primary)] py-0.5 px-2 rounded-[var(--radius-pill)]">
                    {t("badge")}
                  </span>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="lg:hidden flex items-center justify-center size-11 -mr-2 border-0 bg-transparent text-white/70 cursor-pointer"
                    aria-label={t("closeMenu")}
                    onClick={closeMenu}
                  >
                    <X size={20} />
                  </button>
                </span>
              </div>

              <nav className="flex flex-col gap-0.5 flex-1">
                {/* Dashboard — always visible */}
                <Link
                  href="/admin"
                  className={`flex items-center gap-2.5 py-2.5 px-3 pointer-coarse:min-h-11 rounded-[var(--radius-md)] no-underline text-sm font-primary font-medium transition-all duration-[var(--duration-fast)] border-l-2 ${
                    pathname === "/admin"
                      ? "text-[var(--accent-primary)] bg-[rgba(201,169,110,0.15)] border-l-[var(--accent-primary)] font-semibold"
                      : "text-white/45 border-l-transparent"
                  }`}
                >
                  <LayoutDashboard size={16} className="opacity-70 shrink-0" />
                  <span>{t("nav.dashboard")}</span>
                </Link>

                {/* Grouped nav sections */}
                {visibleGroups.map((group, gi) => (
                  <div key={group.key}>
                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25 font-primary pt-[var(--space-5)] px-[var(--space-2)] pb-[var(--space-1)]">
                      {t(`nav.groups.${group.key}`)}
                    </div>
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2.5 py-2.5 px-3 pointer-coarse:min-h-11 rounded-[var(--radius-md)] no-underline text-sm font-primary font-medium transition-all duration-[var(--duration-fast)] border-l-2 ${
                            isActive
                              ? "text-[var(--accent-primary)] bg-[rgba(201,169,110,0.15)] border-l-[var(--accent-primary)] font-semibold"
                              : "text-white/45 border-l-transparent"
                          }`}
                        >
                          <Icon size={16} className="opacity-70 shrink-0" />
                          <span>{t(`nav.items.${item.key}`)}</span>
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
                    {user ? roleLabel(user.role) : null}
                  </span>
                </div>
                <button
                  className="flex items-center gap-2 bg-transparent border border-white/10 text-white/55 py-2 px-3 pointer-coarse:min-h-11 rounded-[var(--radius-md)] cursor-pointer text-xs font-primary font-medium transition-all duration-[var(--duration-fast)] hover:text-white/80 hover:border-white/20"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  <span>{t("logout")}</span>
                </button>
              </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden lg:ml-[240px]">
              <div className="shrink-0 flex items-center gap-2 lg:gap-[var(--space-4)] py-2 px-4 sm:px-6 lg:py-[var(--space-4)] lg:px-[var(--space-8)] border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <button
                  ref={menuButtonRef}
                  type="button"
                  className="lg:hidden flex items-center justify-center size-11 -ml-2 shrink-0 bg-transparent border-none text-[var(--text-primary)] cursor-pointer"
                  aria-label={t("menu")}
                  aria-expanded={menuOpen}
                  aria-controls="admin-sidebar"
                  onClick={() => setMenuPath(pathname)}
                >
                  <Menu size={20} />
                </button>
                <div className="flex min-w-0 items-center gap-0 overflow-x-auto whitespace-nowrap [scrollbar-width:none] text-xs text-[var(--text-muted)] font-primary">
                  {pathname
                    .split("/")
                    .filter(Boolean)
                    .map((seg, i, arr) => {
                      const isLast = i === arr.length - 1;
                      return (
                        <span key={i} className="inline-flex items-center gap-0">
                          {i > 0 && (
                            <ChevronRight size={11} className="mx-1.5 opacity-35 shrink-0" />
                          )}
                          <span
                            className={
                              isLast
                                ? "text-[var(--text-primary)] font-semibold capitalize"
                                : "text-[var(--text-muted)] capitalize"
                            }
                          >
                            {t.has(`breadcrumb.${seg}` as never)
                              ? t(`breadcrumb.${seg}` as never)
                              : seg}
                          </span>
                        </span>
                      );
                    })}
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-[var(--space-8)] flex-1 min-h-0 overflow-y-auto">{children}</div>
            </main>
          </div>
        </AdminPasswordGate>
      ) : (
        <AccessDeniedScreen title={t("denied.route.title")} message={t("denied.route.message")} />
      )}
    </AdminGuard>
  );
}

function AccessDeniedScreen({ title, message }: { title: string; message: string }) {
  const t = useTranslations("admin.shell.denied");
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[var(--bg-primary)] gap-4 p-4 sm:p-[var(--space-8)]">
      <div className="flex flex-col items-center text-center gap-[var(--space-4)] max-w-[400px] py-[var(--space-12)] px-6 sm:px-[var(--space-8)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
        <span className="text-[40px]">🔒</span>
        <h2 className="font-display text-xl text-[var(--text-heading)] font-normal m-0">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] font-primary leading-relaxed m-0">
          {message}
        </p>
        <Link
          href="/"
          className="py-2 px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] no-underline rounded-[var(--radius-md)] text-sm font-semibold font-primary"
        >
          {t("backToStore")}
        </Link>
      </div>
    </div>
  );
}
