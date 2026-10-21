import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_PERMISSIONS,
  canAccessAdmin,
  getRoleLabel,
  getUserPermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
  type Permission,
} from "@/src/lib/permissions";
import { IDENTITIES } from "@/tests/_support/identities";

/* The permission rules behind every admin screen (specs/platform/auth.md, flows PERM-1 … PERM-5).
   The rules are the FE's view of the BE's; the BE is the authority, the FE only hides what would be refused. */

const ALL = Object.values(PERMISSIONS) as Permission[];
const { guest, user, adminFull, adminLimited } = IDENTITIES;

describe("PERM-1 guest (khách)", () => {
  it.each([null, undefined])("is allowed nothing when the user is %s", (nobody) => {
    expect(hasRole(nobody, "admin")).toBe(false);
    expect(hasRole(nobody, "user")).toBe(false);
    expect(ALL.some((p) => hasPermission(nobody, p))).toBe(false);
    expect(hasAnyPermission(nobody, ALL)).toBe(false);
    expect(hasAllPermissions(nobody, ALL)).toBe(false);
    expect(getUserPermissions(nobody)).toEqual([]);
    expect(canAccessAdmin(nobody)).toBe(false);
  });

  it("keeps the 'all of nothing' rule: asking for no permission is satisfied, even for a guest", () => {
    expect(hasAllPermissions(guest, [])).toBe(true);
    expect(hasAnyPermission(guest, [])).toBe(false);
  });
});

describe("PERM-2 customer (user)", () => {
  it("has the user role and no permission, so no admin access", () => {
    expect(hasRole(user, "user")).toBe(true);
    expect(hasRole(user, "admin")).toBe(false);
    expect(ALL.some((p) => hasPermission(user, p))).toBe(false);
    expect(getUserPermissions(user)).toEqual([]);
    expect(canAccessAdmin(user)).toBe(false);
  });

  it("with explicit permissions is limited to them and can enter the admin area (staff account)", () => {
    const staff = { ...user!, permissions: [PERMISSIONS.PRODUCT_VIEW] };

    expect(hasPermission(staff, PERMISSIONS.PRODUCT_VIEW)).toBe(true);
    expect(hasPermission(staff, PERMISSIONS.PRODUCT_DELETE)).toBe(false);
    expect(canAccessAdmin(staff)).toBe(true);
    expect(hasRole(staff, "admin")).toBe(false);
  });
});

describe("PERM-3 admin with every permission (admin đủ quyền)", () => {
  it("is allowed all permissions through the role", () => {
    expect(ALL.every((p) => hasPermission(adminFull, p))).toBe(true);
    expect(hasAllPermissions(adminFull, ALL)).toBe(true);
    expect(getUserPermissions(adminFull)).toEqual(ALL);
    expect(canAccessAdmin(adminFull)).toBe(true);
    expect(hasRole(adminFull, "admin")).toBe(true);
  });

  it("an empty permission list does not restrict the role: the role's permissions apply", () => {
    const admin = { ...adminFull!, permissions: [] };

    expect(ALL.every((p) => hasPermission(admin, p))).toBe(true);
  });

  it("the role grants exactly the permissions the BE knows (28)", () => {
    expect(ALL).toHaveLength(28);
    expect(ROLE_PERMISSIONS.admin).toEqual(ALL);
    expect(ROLE_PERMISSIONS.user).toEqual([]);
  });
});

describe("PERM-4 admin with some permissions (admin thiếu quyền)", () => {
  const view = PERMISSIONS.ORDER_ADMIN_VIEW;

  it("is limited to the listed permissions, overriding the role", () => {
    expect(hasPermission(adminLimited, view)).toBe(true);
    expect(hasPermission(adminLimited, PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS)).toBe(false);
    expect(ALL.filter((p) => hasPermission(adminLimited, p))).toEqual([view]);
    expect(getUserPermissions(adminLimited)).toEqual([view]);
  });

  it("can still enter the admin area", () => {
    expect(canAccessAdmin(adminLimited)).toBe(true);
    expect(hasRole(adminLimited, "admin")).toBe(true);
  });

  it("'all' fails when one is missing, 'any' passes when one is held", () => {
    expect(hasAllPermissions(adminLimited, [view, PERMISSIONS.PRODUCT_VIEW])).toBe(false);
    expect(hasAnyPermission(adminLimited, [view, PERMISSIONS.PRODUCT_VIEW])).toBe(true);
    expect(hasAnyPermission(adminLimited, [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_DELETE])).toBe(false);
  });
});

describe("PERM-5 unexpected input", () => {
  it("an unknown role gets nothing and no admin access", () => {
    const stranger = { role: "ghost" };

    expect(ALL.some((p) => hasPermission(stranger, p))).toBe(false);
    expect(getUserPermissions(stranger)).toEqual([]);
    expect(canAccessAdmin(stranger)).toBe(false);
  });

  it("an unknown permission is refused even for a full admin", () => {
    expect(hasPermission(adminFull, "NOT_A_PERMISSION" as Permission)).toBe(false);
  });

  it("the FE does not look at the account status: a disabled admin still passes here (the BE refuses the calls)", () => {
    expect(canAccessAdmin({ ...adminFull!, status: "disabled" })).toBe(true);
  });

  it("a user-level list naming an unknown permission grants admin access only through known ones", () => {
    expect(canAccessAdmin({ role: "user", permissions: ["NOT_A_PERMISSION"] })).toBe(false);
  });
});

describe("the permission catalogue", () => {
  it("has a label for every permission and no extra labels", () => {
    expect(Object.keys(PERMISSION_LABELS).sort()).toEqual([...ALL].sort());
  });

  it("lists every permission in exactly one group", () => {
    const grouped = PERMISSION_GROUPS.flatMap((g) => g.permissions);

    expect([...grouped].sort()).toEqual([...ALL].sort());
  });

  it("labels the roles and passes an unknown role through", () => {
    expect(getRoleLabel("admin")).toBe("Administrator");
    expect(getRoleLabel("user")).toBe("Customer");
    expect(getRoleLabel("ghost")).toBe("ghost");
  });
});
