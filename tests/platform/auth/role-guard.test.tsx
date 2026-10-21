import { cleanup, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AdminGuard, RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import { PERMISSIONS } from "@/src/lib/permissions";
import { API } from "@/tests/_support/api";
import { IDENTITIES, signInAs, type IdentityName } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* RoleGuard and AdminGuard decide what each identity sees (specs/platform/auth.md, flows GUARD-1 … GUARD-6).
   Content shows as "SECRET", the fallback as "NOPE". The limited admin holds only ORDER_ADMIN_VIEW. */

const SECRET = "SECRET";
const NOPE = "NOPE";
const { ORDER_ADMIN_VIEW, PRODUCT_VIEW, PRODUCT_DELETE } = PERMISSIONS;

type GuardProps = Omit<React.ComponentProps<typeof RoleGuard>, "children" | "fallback">;

/** Renders `<RoleGuard {...props}>` for an identity and says what that identity ended up seeing. */
const sees = async (identity: IdentityName, props: GuardProps) => {
  cleanup(); // a test may ask several times; each answer is about a fresh render
  await renderApp(
    <RoleGuard {...props} fallback={<p>{NOPE}</p>}>
      <p>{SECRET}</p>
    </RoleGuard>,
    { as: identity }
  );
  return screen.queryByText(SECRET) ? SECRET : screen.queryByText(NOPE) ? NOPE : "nothing";
};

describe("GUARD-1 … GUARD-4 RoleGuard by identity", () => {
  it.each([
    ["guest", NOPE],
    ["user", NOPE],
    ["adminFull", SECRET],
    ["adminLimited", SECRET],
  ] as const)("role='admin': %s sees %s", async (identity, expected) => {
    expect(await sees(identity, { role: "admin" })).toBe(expected);
  });

  it.each([
    ["guest", NOPE],
    ["user", NOPE],
    ["adminFull", SECRET],
    ["adminLimited", NOPE],
  ] as const)("permission=PRODUCT_DELETE: %s sees %s", async (identity, expected) => {
    expect(await sees(identity, { permission: PRODUCT_DELETE })).toBe(expected);
  });

  it.each([
    ["guest", NOPE],
    ["user", NOPE],
    ["adminFull", SECRET],
    ["adminLimited", SECRET],
  ] as const)("permission=ORDER_ADMIN_VIEW: %s sees %s", async (identity, expected) => {
    expect(await sees(identity, { permission: ORDER_ADMIN_VIEW })).toBe(expected);
  });

  it.each([
    ["adminFull", SECRET],
    ["adminLimited", NOPE],
    ["user", NOPE],
    ["guest", NOPE],
  ] as const)("permissions (all of) ORDER_ADMIN_VIEW + PRODUCT_VIEW: %s sees %s", async (identity, expected) => {
    expect(await sees(identity, { permissions: [ORDER_ADMIN_VIEW, PRODUCT_VIEW] })).toBe(expected);
  });

  it.each([
    ["adminFull", SECRET],
    ["adminLimited", SECRET],
    ["user", NOPE],
    ["guest", NOPE],
  ] as const)("anyPermission ORDER_ADMIN_VIEW or PRODUCT_VIEW: %s sees %s", async (identity, expected) => {
    expect(await sees(identity, { anyPermission: [ORDER_ADMIN_VIEW, PRODUCT_VIEW] })).toBe(expected);
  });

  it("with several conditions, all must hold: the right role but a missing permission is refused", async () => {
    expect(await sees("adminLimited", { role: "admin", permission: PRODUCT_DELETE })).toBe(NOPE);
    expect(await sees("adminFull", { role: "admin", permission: PRODUCT_DELETE })).toBe(SECRET);
  });

  it("with no condition at all, any signed-in user passes and a guest does not", async () => {
    expect(await sees("user", {})).toBe(SECRET);
    expect(await sees("guest", {})).toBe(NOPE);
  });

  it("hides the content and shows nothing when no fallback is given", async () => {
    const { container } = await renderApp(<RoleGuard role="admin"><p>{SECRET}</p></RoleGuard>, { as: "user" });

    expect(screen.queryByText(SECRET)).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
});

describe("GUARD-5 while the session is being checked", () => {
  it("shows the checking text, not the content and not the fallback", async () => {
    await renderApp(<RoleGuard role="admin" fallback={<p>{NOPE}</p>}><p>{SECRET}</p></RoleGuard>, { as: "adminFull", waitForAuth: false });

    expect(screen.getByText(msg("admin.components.guards.checking"))).toBeInTheDocument();
    expect(screen.queryByText(SECRET)).toBeNull();
    expect(screen.queryByText(NOPE)).toBeNull();
    expect(await screen.findByText(SECRET)).toBeInTheDocument();
  });

  it("shows the caller's own loading element instead of the default", async () => {
    await renderApp(<RoleGuard role="admin" loading={<p>wait…</p>}><p>{SECRET}</p></RoleGuard>, { as: "adminFull", waitForAuth: false });

    expect(screen.getByText("wait…")).toBeInTheDocument();
    expect(screen.queryByText(msg("admin.components.guards.checking"))).toBeNull();
  });
});

describe("GUARD-6 the session cannot be confirmed", () => {
  it("treats a visitor whose /me and refresh both fail as a guest", async () => {
    signInAs("adminFull");
    server.use(
      http.get(`${API}/api/auth/me`, () => HttpResponse.json({ message: "boom" }, { status: 500 })),
      http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({}, { status: 401 }))
    );

    await renderApp(<RoleGuard role="admin" fallback={<p>{NOPE}</p>}><p>{SECRET}</p></RoleGuard>, { as: null });

    expect(screen.getByText(NOPE)).toBeInTheDocument();
    expect(screen.queryByText(SECRET)).toBeNull();
  });
});

describe("GUARD-1 … GUARD-4 AdminGuard by identity", () => {
  const denied = () => screen.queryByText(msg("admin.components.guards.denied.title"));

  it.each(["guest", "user"] as const)("%s gets the access-denied block, not the content", async (identity) => {
    await renderApp(<AdminGuard><p>{SECRET}</p></AdminGuard>, { as: identity });

    expect(denied()).toBeInTheDocument();
    expect(screen.getByText(msg("admin.components.guards.denied.message"))).toBeInTheDocument();
    expect(screen.queryByText(SECRET)).toBeNull();
  });

  it.each(["adminFull", "adminLimited"] as const)("%s sees the content", async (identity) => {
    await renderApp(<AdminGuard><p>{SECRET}</p></AdminGuard>, { as: identity });

    expect(screen.getByText(SECRET)).toBeInTheDocument();
    expect(denied()).toBeNull();
  });

  it("lets a customer account that was given explicit permissions in (staff)", async () => {
    await renderApp(<AdminGuard><p>{SECRET}</p></AdminGuard>, { as: { ...IDENTITIES.user!, permissions: [PRODUCT_VIEW] } });

    expect(screen.getByText(SECRET)).toBeInTheDocument();
  });

  it("shows the caller's fallback in place of the default block", async () => {
    await renderApp(<AdminGuard fallback={<p>{NOPE}</p>}><p>{SECRET}</p></AdminGuard>, { as: "user" });

    expect(screen.getByText(NOPE)).toBeInTheDocument();
    expect(denied()).toBeNull();
  });

  it("shows the checking text while the session is unknown", async () => {
    await renderApp(<AdminGuard><p>{SECRET}</p></AdminGuard>, { as: "adminFull", waitForAuth: false });

    expect(screen.getByText(msg("admin.components.guards.checking"))).toBeInTheDocument();
  });
});
