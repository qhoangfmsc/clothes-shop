/* ═══════════════════════════════════════════════════════════
   PERMISSION SYSTEM — Role-Based Access Control

   Mirrors BE permission constants.
   Usage:
     import { hasPermission, PERMISSIONS } from "@/src/lib/permissions";
     if (hasPermission(user, PERMISSIONS.PRODUCT_CREATE)) { ... }
   ═══════════════════════════════════════════════════════════ */

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/* ── Permissions — match BE enum exactly ── */
export const PERMISSIONS = {
  /* Products */
  PRODUCT_CREATE: "PRODUCT_CREATE",
  PRODUCT_UPDATE: "PRODUCT_UPDATE",
  PRODUCT_DELETE: "PRODUCT_DELETE",

  /* Categories */
  CATEGORY_CREATE: "CATEGORY_CREATE",
  CATEGORY_UPDATE: "CATEGORY_UPDATE",
  CATEGORY_DELETE: "CATEGORY_DELETE",

  /* Collections */
  COLLECTION_CREATE: "COLLECTION_CREATE",
  COLLECTION_UPDATE: "COLLECTION_UPDATE",
  COLLECTION_DELETE: "COLLECTION_DELETE",

  /* Orders */
  ORDER_ADMIN_VIEW: "ORDER_ADMIN_VIEW",
  ORDER_ADMIN_UPDATE_STATUS: "ORDER_ADMIN_UPDATE_STATUS",

  /* Users */
  USER_ADMIN_VIEW: "USER_ADMIN_VIEW",
  USER_ADMIN_UPDATE: "USER_ADMIN_UPDATE",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/* ── Role → Permissions mapping ── */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_DELETE,
    PERMISSIONS.CATEGORY_CREATE,
    PERMISSIONS.CATEGORY_UPDATE,
    PERMISSIONS.CATEGORY_DELETE,
    PERMISSIONS.COLLECTION_CREATE,
    PERMISSIONS.COLLECTION_UPDATE,
    PERMISSIONS.COLLECTION_DELETE,
    PERMISSIONS.ORDER_ADMIN_VIEW,
    PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS,
    PERMISSIONS.USER_ADMIN_VIEW,
    PERMISSIONS.USER_ADMIN_UPDATE,
  ],
  user: [],
};

/* ── Permission name → numeric code mapping (matches BE Permission enum) ── */
export const PERMISSION_CODES: Record<Permission, number> = {
  [PERMISSIONS.PRODUCT_CREATE]: 6000,
  [PERMISSIONS.PRODUCT_UPDATE]: 6001,
  [PERMISSIONS.PRODUCT_DELETE]: 6002,
  [PERMISSIONS.CATEGORY_CREATE]: 7000,
  [PERMISSIONS.CATEGORY_UPDATE]: 7001,
  [PERMISSIONS.CATEGORY_DELETE]: 7002,
  [PERMISSIONS.COLLECTION_CREATE]: 8000,
  [PERMISSIONS.COLLECTION_UPDATE]: 8001,
  [PERMISSIONS.COLLECTION_DELETE]: 8002,
  [PERMISSIONS.ORDER_ADMIN_VIEW]: 9000,
  [PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS]: 9001,
  [PERMISSIONS.USER_ADMIN_VIEW]: 10000,
  [PERMISSIONS.USER_ADMIN_UPDATE]: 10001,
};

/** Convert FE permission string names → BE numeric codes */
export function permissionsToCodes(perms: Permission[]): number[] {
  return perms.map((p) => PERMISSION_CODES[p]).filter(Boolean);
}

/** Convert BE numeric codes → FE permission string names */
export function codesToPermissions(codes: number[]): Permission[] {
  const reverse = new Map(Object.entries(PERMISSION_CODES).map(([k, v]) => [v, k as Permission]));
  return codes.map((c) => reverse.get(c)).filter(Boolean) as Permission[];
}

/* ── Permission labels (for display) ── */
export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.PRODUCT_CREATE]: "Create Products",
  [PERMISSIONS.PRODUCT_UPDATE]: "Update Products",
  [PERMISSIONS.PRODUCT_DELETE]: "Delete Products",
  [PERMISSIONS.CATEGORY_CREATE]: "Create Categories",
  [PERMISSIONS.CATEGORY_UPDATE]: "Update Categories",
  [PERMISSIONS.CATEGORY_DELETE]: "Delete Categories",
  [PERMISSIONS.COLLECTION_CREATE]: "Create Collections",
  [PERMISSIONS.COLLECTION_UPDATE]: "Update Collections",
  [PERMISSIONS.COLLECTION_DELETE]: "Delete Collections",
  [PERMISSIONS.ORDER_ADMIN_VIEW]: "View Orders",
  [PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS]: "Update Order Status",
  [PERMISSIONS.USER_ADMIN_VIEW]: "View Users",
  [PERMISSIONS.USER_ADMIN_UPDATE]: "Manage Users",
};

/* ── Permission groups (for display) ── */
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Products",
    permissions: [
      PERMISSIONS.PRODUCT_CREATE,
      PERMISSIONS.PRODUCT_UPDATE,
      PERMISSIONS.PRODUCT_DELETE,
    ],
  },
  {
    label: "Categories",
    permissions: [
      PERMISSIONS.CATEGORY_CREATE,
      PERMISSIONS.CATEGORY_UPDATE,
      PERMISSIONS.CATEGORY_DELETE,
    ],
  },
  {
    label: "Collections",
    permissions: [
      PERMISSIONS.COLLECTION_CREATE,
      PERMISSIONS.COLLECTION_UPDATE,
      PERMISSIONS.COLLECTION_DELETE,
    ],
  },
  {
    label: "Orders",
    permissions: [PERMISSIONS.ORDER_ADMIN_VIEW, PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS],
  },
  {
    label: "Users",
    permissions: [PERMISSIONS.USER_ADMIN_VIEW, PERMISSIONS.USER_ADMIN_UPDATE],
  },
];

/* ── Minimal user shape ── */
export interface UserWithRole {
  role: string;
  status?: string;
  permissions?: string[];
}

/* ── Helper functions ── */

/** Check if user has a specific role */
export function hasRole(user: UserWithRole | null | undefined, role: Role): boolean {
  if (!user) return false;
  return user.role === role;
}

/** Check if user has a specific permission (checks both role-level and user-level permissions) */
export function hasPermission(
  user: UserWithRole | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;

  /* User-level permissions override (BE sends per-user permissions array) */
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }

  /* Fall back to role-level permissions */
  const role = user.role as Role;
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.includes(permission);
}

/** Check if user has ALL of the given permissions */
export function hasAllPermissions(
  user: UserWithRole | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

/** Check if user has ANY of the given permissions */
export function hasAnyPermission(
  user: UserWithRole | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/** Get all permissions for a user (user-level first, then role-level) */
export function getUserPermissions(user: UserWithRole | null | undefined): Permission[] {
  if (!user) return [];
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions as Permission[];
  }
  return ROLE_PERMISSIONS[user.role as Role] ?? [];
}

/** Check if user can access admin at all */
export function canAccessAdmin(user: UserWithRole | null | undefined): boolean {
  if (!user) return false;
  return user.role === ROLES.ADMIN || hasAnyPermission(user, Object.values(PERMISSIONS));
}

/** Get readable role label */
export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: "Administrator",
    user: "Customer",
  };
  return map[role] ?? role;
}