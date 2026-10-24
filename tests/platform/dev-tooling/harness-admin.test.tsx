import { describe, expect, it } from "vitest";
import { isSystemUnlocked } from "@/src/lib/system-password-session";
import { PERMISSIONS, hasPermission } from "@/src/lib/permissions";
import { API } from "@/tests/_support/api";
import { countsApi, unlockSystem } from "@/tests/_support/admin";
import { adminOrder, order } from "@/tests/_support/fixtures";
import { IDENTITIES, adminWith } from "@/tests/_support/identities";

/* The helpers for tests of the admin area (specs/platform/dev-tooling.md, flow QG-18). */

describe("QG-18 admin helpers", () => {
  it("adminWith is an admin who has exactly the permissions given", () => {
    const staff = adminWith(PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_UPDATE);

    expect(staff.role).toBe("admin");
    expect(staff.permissions).toEqual([PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_UPDATE]);
    expect(hasPermission(staff, PERMISSIONS.PRODUCT_UPDATE)).toBe(true);
    expect(hasPermission(staff, PERMISSIONS.PRODUCT_DELETE)).toBe(false);
    expect(staff.id).not.toBe(IDENTITIES.adminFull!.id);
    expect(staff.id).not.toBe(IDENTITIES.adminLimited!.id);
  });

  it("unlockSystem opens the admin gate now, or as if it was opened some time ago", () => {
    expect(isSystemUnlocked()).toBe(false);

    unlockSystem();
    expect(isSystemUnlocked()).toBe(true);
    unlockSystem(16 * 60_000);

    expect(isSystemUnlocked()).toBe(false);
    unlockSystem(5 * 60_000);
    expect(isSystemUnlocked()).toBe(true);
  });

  it("countsApi answers the menu's counts, counts the questions, and can fail", async () => {
    const calls = countsApi({ orders: 3 });
    const ok = await fetch(`${API}/api/admin/pending-counts`);
    expect(await ok.json()).toEqual({ data: { orders: 3 } });
    expect(calls.counts).toBe(1);

    countsApi({ status: 403 });
    expect((await fetch(`${API}/api/admin/pending-counts`)).status).toBe(403);
    countsApi("network");
    await expect(fetch(`${API}/api/admin/pending-counts`)).rejects.toThrow();
    const empty = countsApi();
    expect(await (await fetch(`${API}/api/admin/pending-counts`)).json()).toEqual({ data: {} });
    expect(empty.counts).toBe(1);
  });

  it("adminOrder is a customer's order plus the account that placed it, any field can be replaced", () => {
    const placed = adminOrder({ id: "o-9", userId: "u-9" });

    expect(placed).toMatchObject({ id: "o-9", userId: "u-9", status: "pending", paymentStatus: "unpaid", totalVnd: 380_000 });
    expect(placed.items).toHaveLength(1);
    expect(adminOrder().userId).toBe("u-1");
    expect(adminOrder().id).toBe(order().id);
  });
});
