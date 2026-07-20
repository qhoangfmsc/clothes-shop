"use client";

import { type ReactNode } from "react";
import { ShieldX, Loader2 } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  canAccessAdmin,
  type Permission,
} from "@/src/lib/permissions";

/* ═══════════════════════════════════════════════════════════
   ROLE GUARD — Declarative authorization wrapper

   Usage:
     // By role
     <RoleGuard role="admin">
       <AdminContent />
     </RoleGuard>

     // By single permission
     <RoleGuard permission="products:write">
       <EditProductForm />
     </RoleGuard>

     // By multiple permissions (ALL required)
     <RoleGuard permissions={["products:write", "products:read"]}>
       <ProductManager />
     </RoleGuard>

     // By multiple permissions (ANY sufficient)
     <RoleGuard anyPermission={["orders:read", "users:read"]}>
       <DataViewer />
     </RoleGuard>

     // Custom fallback
     <RoleGuard permission="products:delete" fallback={<p>No delete access</p>}>
       <DeleteButton />
     </RoleGuard>
   ═══════════════════════════════════════════════════════════ */

interface RoleGuardProps {
  children: ReactNode;

  /** Require specific role */
  role?: string;

  /** Require specific permission */
  permission?: Permission;

  /** Require ALL of these permissions */
  permissions?: Permission[];

  /** Require ANY of these permissions */
  anyPermission?: Permission[];

  /** Custom fallback when unauthorized (default: hidden) */
  fallback?: ReactNode;

  /** Show a loading spinner while auth is resolving */
  loading?: ReactNode;
}

export function RoleGuard({
  children,
  role,
  permission,
  permissions,
  anyPermission,
  fallback = null,
  loading,
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  /* ── Loading state ── */
  if (isLoading) {
    return loading ?? <DefaultLoading />;
  }

  if (!user) return <>{fallback}</>;

  /* ── Check authorization ── */
  let authorized = true;

  if (role) {
    authorized = user.role === role;
  }

  if (authorized && permission) {
    authorized = hasPermission(user, permission);
  }

  if (authorized && permissions) {
    authorized = hasAllPermissions(user, permissions);
  }

  if (authorized && anyPermission) {
    authorized = hasAnyPermission(user, anyPermission);
  }

  if (!authorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/* ═══════════════════════════════════════════════════════════
   ADMIN GUARD — Convenience wrapper for full admin access
   ═══════════════════════════════════════════════════════════ */

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <DefaultLoading />;
  }

  if (!canAccessAdmin(user)) {
    return fallback ? <>{fallback}</> : <UnauthorizedBlock />;
  }

  return <>{children}</>;
}

/* ═══════════════════════════════════════════════════════════
   Internal: Default states
   ═══════════════════════════════════════════════════════════ */

function DefaultLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-16)",
        gap: 12,
      }}
    >
      <Loader2
        size={20}
        style={{
          animation: "spin 0.8s linear infinite",
          color: "var(--text-muted)",
        }}
      />
      <span
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-primary)",
        }}
      >
        Checking permissions...
      </span>
    </div>
  );
}

function UnauthorizedBlock() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-16)",
        gap: "var(--space-4)",
        textAlign: "center",
      }}
    >
      <ShieldX size={40} style={{ color: "var(--text-disabled)" }} />
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-lg)",
          color: "var(--text-heading)",
          fontWeight: 400,
        }}
      >
        Access Denied
      </h2>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-primary)",
          maxWidth: 360,
        }}
      >
        You do not have permission to access this page. Please contact an administrator if you
        believe this is a mistake.
      </p>
    </div>
  );
}
