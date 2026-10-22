import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";
import { Link, usePathname, useRouter } from "@/src/i18n/navigation";
import { useAuth } from "@/src/contexts/auth-context";
import { canAccessAdmin, hasPermission, PERMISSIONS } from "@/src/lib/permissions";
import { API } from "@/tests/_support/api";
import { google } from "@/tests/_support/google";
import { IDENTITIES, LIMITED_PERMISSIONS, signInAs } from "@/tests/_support/identities";
import { navigation } from "@/tests/_support/navigation";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";
import { useGoogleLogin } from "@react-oauth/google";

/* QG-8 and QG-9: the render harness every component test builds on. Spec: specs/platform/dev-tooling.md. */

function Probe() {
  const { user, isLoading, isAuthenticated } = useAuth();
  return (
    <p data-testid="probe">
      {isLoading ? "loading" : isAuthenticated ? `${user?.role}:${user?.email}:${(user?.permissions ?? []).join(",")}` : "guest"}
    </p>
  );
}

function Title() {
  const t = useTranslations("shared.feedback.unauthenticated");
  return <h1>{t("title")}</h1>;
}

const probe = () => screen.getByTestId("probe");

describe("QG-8 the four identities", () => {
  it("defines guest, user, an admin with every permission and an admin with one", () => {
    expect(IDENTITIES.guest).toBeNull();
    expect(IDENTITIES.user).toMatchObject({ role: "user" });
    expect(IDENTITIES.adminFull).toMatchObject({ role: "admin" });
    expect(IDENTITIES.adminFull?.permissions).toBeUndefined();
    expect(IDENTITIES.adminLimited).toMatchObject({ role: "admin", permissions: LIMITED_PERMISSIONS });
    expect(LIMITED_PERMISSIONS).toEqual([PERMISSIONS.ORDER_ADMIN_VIEW]);
  });
});

describe("QG-8 renderApp", () => {
  it("shows a guest without calling the API (an unhandled request would fail the test)", async () => {
    await renderApp(<Probe />);

    expect(probe()).toHaveTextContent("guest");
  });

  it("waits for the session, then shows the component", async () => {
    await renderApp(<Probe />, { as: "user" });

    expect(probe()).toHaveTextContent("user:mai@example.com");
  });

  it("a guest render forgets a session left by an earlier render in the same test", async () => {
    const first = await renderApp(<Probe />, { as: "user" });
    expect(probe()).toHaveTextContent("user:mai@example.com");
    first.unmount();

    await renderApp(<Probe />, { as: "guest" });
    expect(probe()).toHaveTextContent("guest");
  });

  it("can show the loading state instead", async () => {
    await renderApp(<Probe />, { as: "user", waitForAuth: false });

    expect(probe()).toHaveTextContent("loading");
    await screen.findByText("user:mai@example.com:");
  });

  it("rerender keeps the providers around the new element", async () => {
    const { rerender } = await renderApp(<Probe />, { as: "user" });

    rerender(<Title />);

    expect(screen.getByRole("heading")).toHaveTextContent("Phiên đăng nhập đã hết hạn");
  });

  it("returns the signed-in user to the test", async () => {
    const { user } = await renderApp(<Probe />, { as: "adminFull" });

    expect(user).toBe(IDENTITIES.adminFull);
  });

  it("uses the real translations of the chosen locale", async () => {
    const vi = await renderApp(<Title />, { locale: "vi" });
    expect(screen.getByRole("heading")).toHaveTextContent("Phiên đăng nhập đã hết hạn");
    vi.unmount();

    await renderApp(<Title />, { locale: "en" });
    expect(screen.getByRole("heading")).toHaveTextContent("Session Expired");
  });

  it("answers /api/auth/me only for the stored token, as the real API would", async () => {
    signInAs("user");
    const me = (token?: string) => fetch(`${API}/api/auth/me`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

    expect((await me("test-access")).status).toBe(200);
    expect((await me("something-else")).status).toBe(401);
    expect((await me()).status).toBe(401);
  });
});

describe("QG-9 identities seen through the app", () => {
  it.each([
    ["user", "user:mai@example.com:"],
    ["adminFull", "admin:admin@example.com:"],
    ["adminLimited", "admin:staff@example.com:ORDER_ADMIN_VIEW"],
  ] as const)("%s arrives with the right role and permissions", async (identity, text) => {
    await renderApp(<Probe />, { as: identity });

    expect(probe()).toHaveTextContent(text);
  });

  it("the limited admin may enter the admin area but only view orders", async () => {
    const { user } = await renderApp(<Probe />, { as: "adminLimited" });

    expect(canAccessAdmin(user)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.ORDER_ADMIN_VIEW)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.PRODUCT_DELETE)).toBe(false);
  });

  it("a failing /api/auth/me leaves the visitor a guest", async () => {
    signInAs("user");
    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({}, { status: 401 })));

    await renderApp(<Probe />, { as: null });

    expect(probe()).toHaveTextContent("guest");
  });
});

describe("QG-8 stand-ins for the router and Google", () => {
  function Nav() {
    const router = useRouter();
    return (
      <div>
        <span data-testid="path">{usePathname()}</span>
        <Link href="/shop">Shop</Link>
        <button onClick={() => router.push("/cart")}>go</button>
      </div>
    );
  }

  it("renders links as anchors, reports the path and records router calls", async () => {
    navigation.pathname = "/orders";
    const { user: owner } = await renderApp(<Nav />);
    expect(owner).toBeNull();

    expect(screen.getByTestId("path")).toHaveTextContent("/orders");
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    screen.getByRole("button", { name: "go" }).click();
    expect(navigation.router.push).toHaveBeenCalledWith("/cart");
  });

  it("starts every test with a clean router", () => {
    expect(navigation.pathname).toBe("/");
    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("lets a test play Google's popup", async () => {
    let result: string | undefined;
    function Button() {
      const open = useGoogleLogin({ flow: "auth-code", onSuccess: ({ code }) => void (result = code) });
      return <button onClick={() => open()}>google</button>;
    }
    await renderApp(<Button />);

    screen.getByRole("button", { name: "google" }).click();
    expect(google.opened).toBe(1);
    google.succeed("abc");
    expect(result).toBe("abc");
  });
});
