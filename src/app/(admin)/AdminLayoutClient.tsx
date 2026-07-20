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
      { href: "/admin/products", label: "Products", icon: Shirt, permission: PERMISSIONS.PRODUCT_CREATE },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, permission: PERMISSIONS.CATEGORY_CREATE },
      { href: "/admin/collections", label: "Collections", icon: Layers, permission: PERMISSIONS.COLLECTION_CREATE },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, permission: PERMISSIONS.ORDER_ADMIN_VIEW },
      { href: "/admin/users", label: "Users", icon: Users, permission: PERMISSIONS.USER_ADMIN_VIEW },
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
  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasPermission(user, item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <AdminGuard
      fallback={
        <div style={styles.loadingContainer}>
          <div style={styles.unauthorizedCard}>
            <span style={styles.unauthorizedIcon}>🔒</span>
            <h2 style={styles.unauthorizedTitle}>Admin Access Required</h2>
            <p style={styles.unauthorizedText}>
              Your account does not have administrator privileges. Please contact an admin if you
              believe this is a mistake.
            </p>
            <Link href="/" style={styles.backBtn}>
              Back to Store
            </Link>
          </div>
        </div>
      }
    >
      <div style={styles.wrapper}>
        {/* Sidebar — sticky, independent scroll */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <Link href="/admin" style={styles.brandLink}>
              <span style={styles.brandIcon}>✦</span>
              <span style={styles.brandText}>Ori Baebi</span>
            </Link>
            <span style={styles.adminBadge}>ADMIN</span>
          </div>

          <nav style={styles.nav}>
            {/* Dashboard — always visible */}
            <Link
              href="/admin"
              style={{
                ...styles.navItem,
                ...(pathname === "/admin" ? styles.navItemActive : {}),
              }}
            >
              <LayoutDashboard size={16} style={styles.navIcon} />
              <span>Dashboard</span>
            </Link>

            {/* Grouped nav sections */}
            {visibleGroups.map((group, gi) => (
              <div key={group.label}>
                <div style={styles.navGroupLabel}>{group.label}</div>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        ...styles.navItem,
                        ...(isActive ? styles.navItemActive : {}),
                      }}
                    >
                      <Icon size={16} style={styles.navIcon} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {gi < visibleGroups.length - 1 && <div style={styles.navDivider} />}
              </div>
            ))}
          </nav>

          <div style={styles.sidebarFooter}>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user?.name ?? user?.email}</span>
              <span style={styles.userEmail}>{user?.email}</span>
              <span
                style={{
                  ...styles.roleTag,
                  ...(user?.role === "admin"
                    ? { background: "rgba(201,169,110,0.2)", color: "var(--accent-primary)" }
                    : {}),
                }}
              >
                {user?.role}
              </span>
            </div>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={styles.main}>
          <div style={styles.topBar}>
            <button style={styles.mobileMenuBtn} aria-label="Menu">
              <Menu size={20} />
            </button>
            <div style={styles.breadcrumb}>
              {pathname
                .split("/")
                .filter(Boolean)
                .map((seg, i, arr) => {
                  const isLast = i === arr.length - 1;
                  return (
                    <span key={i} style={styles.breadcrumbItem}>
                      {i > 0 && (
                        <ChevronRight size={11} style={styles.breadcrumbSep} />
                      )}
                      <span style={isLast ? styles.breadcrumbLast : styles.breadcrumbSeg}>
                        {seg.charAt(0).toUpperCase() + seg.slice(1)}
                      </span>
                    </span>
                  );
                })}
            </div>
          </div>
          <div style={styles.content}>{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}

/* ── Inline styles ── */
const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "var(--bg-primary)",
    gap: 16,
    padding: "var(--space-8)",
  },
  unauthorizedCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "var(--space-4)",
    maxWidth: 400,
    padding: "var(--space-12) var(--space-8)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
  },
  unauthorizedIcon: { fontSize: 40 },
  unauthorizedTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-lg)",
    color: "var(--text-heading)",
    fontWeight: 400,
    margin: 0,
  },
  unauthorizedText: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    fontFamily: "var(--font-primary)",
    lineHeight: 1.6,
    margin: 0,
  },
  backBtn: {
    padding: "8px 20px",
    background: "var(--accent-primary)",
    color: "var(--text-on-gold)",
    textDecoration: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontFamily: "var(--font-primary)",
  },

  /* ── Wrapper ── */
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    background: "var(--bg-primary)",
  },

  /* ── Sidebar: fixed, always follows screen ── */
  sidebar: {
    width: 240,
    minWidth: 240,
    background: "var(--color-obsidian)",
    color: "var(--text-on-dark)",
    display: "flex",
    flexDirection: "column",
    padding: "var(--space-6)",
    gap: "var(--space-8)",
    position: "fixed" as const,
    top: 0,
    left: 0,
    height: "100vh",
    overflowY: "auto" as const,
    zIndex: 20,
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandLink: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "var(--text-on-dark)",
  },
  brandIcon: { fontSize: 20, color: "var(--accent-primary)" },
  brandText: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-lg)",
    color: "var(--text-on-dark)",
  },
  adminBadge: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "var(--color-obsidian)",
    background: "var(--accent-primary)",
    padding: "2px 8px",
    borderRadius: "var(--radius-pill)",
  },

  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
    color: "rgba(255,255,255,0.45)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-primary)",
    fontWeight: 500,
    transition: "all var(--duration-fast) var(--ease-default)",
    borderLeft: "2px solid transparent",
  },
  navItemActive: {
    color: "var(--accent-primary)",
    background: "rgba(201, 169, 110, 0.15)",
    borderLeft: "2px solid var(--accent-primary)",
    fontWeight: 600,
  },
  navIcon: { opacity: 0.7, flexShrink: 0 },
  navGroupLabel: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.25)",
    fontFamily: "var(--font-primary)",
    padding: "var(--space-5) var(--space-2) var(--space-1)",
  },
  navDivider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "var(--space-2) 0",
  },

  sidebarFooter: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: "var(--space-4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  },
  userInfo: { display: "flex", flexDirection: "column", gap: 4 },
  userName: {
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    color: "var(--text-on-dark)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userEmail: {
    fontSize: "var(--text-xs)",
    color: "var(--color-ash)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  roleTag: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    padding: "1px 8px",
    borderRadius: "var(--radius-pill)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.5)",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "none",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.55)",
    padding: "8px 12px",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontSize: "var(--text-xs)",
    fontFamily: "var(--font-primary)",
    fontWeight: 500,
    transition: "all var(--duration-fast) var(--ease-default)",
  },

  /* ── Main ── */
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    minHeight: "100vh",
    marginLeft: 240,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-4)",
    padding: "var(--space-4) var(--space-8)",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--bg-primary)",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  mobileMenuBtn: {
    display: "none",
    background: "none",
    border: "none",
    color: "var(--text-primary)",
    cursor: "pointer",
    padding: 4,
  },

  /* ── Breadcrumb — fixed alignment ── */
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 0,
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    fontFamily: "var(--font-primary)",
  },
  breadcrumbItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 0,
  },
  breadcrumbSep: {
    margin: "0 6px",
    opacity: 0.35,
    flexShrink: 0,
  },
  breadcrumbSeg: { color: "var(--text-muted)", textTransform: "capitalize" as const },
  breadcrumbLast: {
    color: "var(--text-primary)",
    fontWeight: 600,
    textTransform: "capitalize" as const,
  },

  content: { padding: "var(--space-8)", flex: 1 },
};
