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
  PRODUCT_VIEW: "PRODUCT_VIEW",

  /* Categories */
  CATEGORY_CREATE: "CATEGORY_CREATE",
  CATEGORY_UPDATE: "CATEGORY_UPDATE",
  CATEGORY_DELETE: "CATEGORY_DELETE",
  CATEGORY_VIEW: "CATEGORY_VIEW",

  /* Collections */
  COLLECTION_CREATE: "COLLECTION_CREATE",
  COLLECTION_UPDATE: "COLLECTION_UPDATE",
  COLLECTION_DELETE: "COLLECTION_DELETE",
  COLLECTION_VIEW: "COLLECTION_VIEW",

  /* Orders */
  ORDER_ADMIN_VIEW: "ORDER_ADMIN_VIEW",
  ORDER_ADMIN_UPDATE_STATUS: "ORDER_ADMIN_UPDATE_STATUS",

  /* Users */
  USER_ADMIN_VIEW: "USER_ADMIN_VIEW",
  USER_ADMIN_UPDATE: "USER_ADMIN_UPDATE",

  /* Site Config */
  SITE_CONFIG_VIEW: "SITE_CONFIG_VIEW",
  SITE_CONFIG_UPSERT: "SITE_CONFIG_UPSERT",
  SITE_CONFIG_DELETE: "SITE_CONFIG_DELETE",

  /* Payments (bank-transfer reconciliation) */
  PAYMENT_ADMIN_VIEW: "PAYMENT_ADMIN_VIEW",
  PAYMENT_ADMIN_CONFIRM: "PAYMENT_ADMIN_CONFIRM",
  PAYMENT_ADMIN_REFUND: "PAYMENT_ADMIN_REFUND",
  PAYMENT_ADMIN_CREATE_QR: "PAYMENT_ADMIN_CREATE_QR",

  /* Returns (customer return requests) */
  RETURN_ADMIN_VIEW: "RETURN_ADMIN_VIEW",
  RETURN_ADMIN_PROCESS: "RETURN_ADMIN_PROCESS",

  /* Product reviews (moderation and the store's replies) */
  REVIEW_ADMIN_VIEW: "REVIEW_ADMIN_VIEW",
  REVIEW_ADMIN_MODERATE: "REVIEW_ADMIN_MODERATE",
  REVIEW_ADMIN_REPLY: "REVIEW_ADMIN_REPLY",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/* ── Role → Permissions mapping ── */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_DELETE,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.CATEGORY_CREATE,
    PERMISSIONS.CATEGORY_UPDATE,
    PERMISSIONS.CATEGORY_DELETE,
    PERMISSIONS.CATEGORY_VIEW,
    PERMISSIONS.COLLECTION_CREATE,
    PERMISSIONS.COLLECTION_UPDATE,
    PERMISSIONS.COLLECTION_DELETE,
    PERMISSIONS.COLLECTION_VIEW,
    PERMISSIONS.ORDER_ADMIN_VIEW,
    PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS,
    PERMISSIONS.USER_ADMIN_VIEW,
    PERMISSIONS.USER_ADMIN_UPDATE,
    PERMISSIONS.SITE_CONFIG_VIEW,
    PERMISSIONS.SITE_CONFIG_UPSERT,
    PERMISSIONS.SITE_CONFIG_DELETE,
    PERMISSIONS.PAYMENT_ADMIN_VIEW,
    PERMISSIONS.PAYMENT_ADMIN_CONFIRM,
    PERMISSIONS.PAYMENT_ADMIN_REFUND,
    PERMISSIONS.PAYMENT_ADMIN_CREATE_QR,
    PERMISSIONS.RETURN_ADMIN_VIEW,
    PERMISSIONS.RETURN_ADMIN_PROCESS,
    PERMISSIONS.REVIEW_ADMIN_VIEW,
    PERMISSIONS.REVIEW_ADMIN_MODERATE,
    PERMISSIONS.REVIEW_ADMIN_REPLY,
  ],
  user: [],
};

/* ── Permission name → numeric code mapping (matches BE Permission enum) ── */
export const PERMISSION_CODES: Record<Permission, number> = {
  [PERMISSIONS.PRODUCT_CREATE]: 6000,
  [PERMISSIONS.PRODUCT_UPDATE]: 6001,
  [PERMISSIONS.PRODUCT_DELETE]: 6002,
  [PERMISSIONS.PRODUCT_VIEW]: 6003,
  [PERMISSIONS.CATEGORY_CREATE]: 7000,
  [PERMISSIONS.CATEGORY_UPDATE]: 7001,
  [PERMISSIONS.CATEGORY_DELETE]: 7002,
  [PERMISSIONS.CATEGORY_VIEW]: 7003,
  [PERMISSIONS.COLLECTION_CREATE]: 8000,
  [PERMISSIONS.COLLECTION_UPDATE]: 8001,
  [PERMISSIONS.COLLECTION_DELETE]: 8002,
  [PERMISSIONS.COLLECTION_VIEW]: 8003,
  [PERMISSIONS.ORDER_ADMIN_VIEW]: 9000,
  [PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS]: 9001,
  [PERMISSIONS.USER_ADMIN_VIEW]: 10000,
  [PERMISSIONS.USER_ADMIN_UPDATE]: 10001,
  [PERMISSIONS.SITE_CONFIG_VIEW]: 11000,
  [PERMISSIONS.SITE_CONFIG_UPSERT]: 11001,
  [PERMISSIONS.SITE_CONFIG_DELETE]: 11002,
  [PERMISSIONS.PAYMENT_ADMIN_VIEW]: 14000,
  [PERMISSIONS.PAYMENT_ADMIN_CONFIRM]: 14001,
  [PERMISSIONS.PAYMENT_ADMIN_REFUND]: 14002,
  [PERMISSIONS.PAYMENT_ADMIN_CREATE_QR]: 14003,
  [PERMISSIONS.RETURN_ADMIN_VIEW]: 16000,
  [PERMISSIONS.RETURN_ADMIN_PROCESS]: 16001,
  [PERMISSIONS.REVIEW_ADMIN_VIEW]: 18000,
  [PERMISSIONS.REVIEW_ADMIN_MODERATE]: 18001,
  [PERMISSIONS.REVIEW_ADMIN_REPLY]: 18002,
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
  [PERMISSIONS.PRODUCT_VIEW]: "View Products",
  [PERMISSIONS.CATEGORY_CREATE]: "Create Categories",
  [PERMISSIONS.CATEGORY_UPDATE]: "Update Categories",
  [PERMISSIONS.CATEGORY_DELETE]: "Delete Categories",
  [PERMISSIONS.CATEGORY_VIEW]: "View Categories",
  [PERMISSIONS.COLLECTION_CREATE]: "Create Collections",
  [PERMISSIONS.COLLECTION_UPDATE]: "Update Collections",
  [PERMISSIONS.COLLECTION_DELETE]: "Delete Collections",
  [PERMISSIONS.COLLECTION_VIEW]: "View Collections",
  [PERMISSIONS.ORDER_ADMIN_VIEW]: "View Orders",
  [PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS]: "Update Order Status",
  [PERMISSIONS.USER_ADMIN_VIEW]: "View Users",
  [PERMISSIONS.USER_ADMIN_UPDATE]: "Manage Users",
  [PERMISSIONS.SITE_CONFIG_VIEW]: "View Site Config",
  [PERMISSIONS.SITE_CONFIG_UPSERT]: "Update Site Config",
  [PERMISSIONS.SITE_CONFIG_DELETE]: "Delete Site Config",
  [PERMISSIONS.PAYMENT_ADMIN_VIEW]: "View Payments",
  [PERMISSIONS.PAYMENT_ADMIN_CONFIRM]: "Confirm Payments",
  [PERMISSIONS.PAYMENT_ADMIN_REFUND]: "Refund Payments",
  [PERMISSIONS.PAYMENT_ADMIN_CREATE_QR]: "Create Payment QR",
  [PERMISSIONS.RETURN_ADMIN_VIEW]: "View Returns",
  [PERMISSIONS.RETURN_ADMIN_PROCESS]: "Process Returns",
  [PERMISSIONS.REVIEW_ADMIN_VIEW]: "View Reviews",
  [PERMISSIONS.REVIEW_ADMIN_MODERATE]: "Hide / Show Reviews",
  [PERMISSIONS.REVIEW_ADMIN_REPLY]: "Reply to Reviews",
};

/* ── Permission groups (for display) ── */
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Products",
    permissions: [
      PERMISSIONS.PRODUCT_CREATE,
      PERMISSIONS.PRODUCT_UPDATE,
      PERMISSIONS.PRODUCT_DELETE,
      PERMISSIONS.PRODUCT_VIEW,
    ],
  },
  {
    label: "Categories",
    permissions: [
      PERMISSIONS.CATEGORY_CREATE,
      PERMISSIONS.CATEGORY_UPDATE,
      PERMISSIONS.CATEGORY_DELETE,
      PERMISSIONS.CATEGORY_VIEW,
    ],
  },
  {
    label: "Collections",
    permissions: [
      PERMISSIONS.COLLECTION_CREATE,
      PERMISSIONS.COLLECTION_UPDATE,
      PERMISSIONS.COLLECTION_DELETE,
      PERMISSIONS.COLLECTION_VIEW,
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
  {
    label: "Site Config",
    permissions: [
      PERMISSIONS.SITE_CONFIG_VIEW,
      PERMISSIONS.SITE_CONFIG_UPSERT,
      PERMISSIONS.SITE_CONFIG_DELETE,
    ],
  },
  {
    label: "Payments",
    permissions: [
      PERMISSIONS.PAYMENT_ADMIN_VIEW,
      PERMISSIONS.PAYMENT_ADMIN_CONFIRM,
      PERMISSIONS.PAYMENT_ADMIN_REFUND,
      PERMISSIONS.PAYMENT_ADMIN_CREATE_QR,
    ],
  },
  {
    label: "Returns",
    permissions: [PERMISSIONS.RETURN_ADMIN_VIEW, PERMISSIONS.RETURN_ADMIN_PROCESS],
  },
  {
    label: "Reviews",
    permissions: [
      PERMISSIONS.REVIEW_ADMIN_VIEW,
      PERMISSIONS.REVIEW_ADMIN_MODERATE,
      PERMISSIONS.REVIEW_ADMIN_REPLY,
    ],
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