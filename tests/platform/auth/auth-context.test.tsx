import { render, screen, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AuthProvider, readLastGoogleEmail, readLastPage, useAuth, type AuthUser } from "@/src/contexts/auth-context";
import { API, ACCESS_KEY, REFRESH_KEY, seedSession } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";

/* `AuthProvider` turns tokens into "who is signed in". Flows ID-1 … ID-6 of specs/platform/auth.md. */


const USER: AuthUser = {
  id: "u1",
  email: "mai@example.com",
  name: "Mai",
  image: null,
  provider: "google",
  providerId: "g1",
  role: "user",
  status: "active",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

let auth: ReturnType<typeof useAuth>;

function Probe() {
  auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="user">{auth.user?.email ?? "none"}</span>
    </div>
  );
}

function mount() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

const ready = () => waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

describe("ID-1 restoring the session on load", () => {
  it("signs the user in when /me accepts the stored token", async () => {
    seedSession({ access: "tok", refresh: "r1" });
    let auth: string | null = null;
    server.use(
      http.get(`${API}/api/auth/me`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ user: USER });
      })
    );

    mount();
    await ready();

    expect(screen.getByTestId("user")).toHaveTextContent("mai@example.com");
    expect(auth).toBe("Bearer tok");
  });

  it("stays signed out, without calling the API, when there is no token", async () => {
    mount();
    await ready();

    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
});

describe("ID-2 token no longer accepted", () => {
  it("refreshes, stores the new access token and signs in with the user from the refresh answer", async () => {
    seedSession({ access: "old", refresh: "r1" });
    server.use(
      http.get(`${API}/api/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.post(`${API}/api/auth/refresh`, async ({ request }) => {
        expect(await request.json()).toEqual({ refreshToken: "r1" });
        return HttpResponse.json({ accessToken: "new", user: USER });
      })
    );

    mount();
    await ready();

    expect(screen.getByTestId("user")).toHaveTextContent("mai@example.com");
    expect(localStorage.getItem(ACCESS_KEY)).toBe("new");
    expect(localStorage.getItem(REFRESH_KEY)).toBe("r1");
  });

  it("clears both tokens and stays signed out when the refresh fails too", async () => {
    seedSession({ access: "old", refresh: "r1" });
    server.use(
      http.get(`${API}/api/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({}, { status: 401 }))
    );

    mount();
    await ready();

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it("clears the tokens when there is no refresh token to try", async () => {
    seedSession({ access: "old" });
    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json({}, { status: 401 })));

    mount();
    await ready();

    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
  });
});

describe("ID-3 login", () => {
  it("stores both tokens, the account hint and the user", async () => {
    server.use(
      http.post(`${API}/api/auth/google`, async ({ request }) => {
        expect(await request.json()).toEqual({ idToken: "google-code" });
        return HttpResponse.json({ accessToken: "a1", refreshToken: "r1", user: USER });
      })
    );
    mount();
    await ready();

    await act(() => auth.login("google-code"));

    expect(screen.getByTestId("user")).toHaveTextContent("mai@example.com");
    expect(localStorage.getItem(ACCESS_KEY)).toBe("a1");
    expect(localStorage.getItem(REFRESH_KEY)).toBe("r1");
    expect(readLastGoogleEmail()).toBe("mai@example.com");
  });

  it("throws an ApiError with the BE message and leaves the user signed out", async () => {
    server.use(http.post(`${API}/api/auth/google`, () => HttpResponse.json({ message: "bad code", errorCode: 1001 }, { status: 400 })));
    mount();
    await ready();

    await expect(act(() => auth.login("x"))).rejects.toMatchObject({ message: "bad code", status: 400, errorCode: 1001 });
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
});

describe("ID-4 logout", () => {
  it("drops the tokens and the user but keeps the account hint", async () => {
    seedSession({ access: "tok", refresh: "r1" });
    localStorage.setItem("clothes_shop_last_google_email", "mai@example.com");
    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json({ user: USER })));
    mount();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("mai@example.com"));

    act(() => auth.logout());

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(readLastGoogleEmail()).toBe("mai@example.com");
  });
});

describe("ID-5 session expired elsewhere", () => {
  it("signs the user out when the session-expired event fires", async () => {
    seedSession({ access: "tok" });
    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json({ user: USER })));
    mount();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("mai@example.com"));

    act(() => {
      window.dispatchEvent(new Event("auth:session-expired"));
    });

    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
});

describe("ID-6 last page", () => {
  it("records the path and query of the page being viewed", async () => {
    navigation.pathname = "/shop/dresses";
    window.history.pushState({}, "", "/vi/shop/dresses?sort=-price");
    mount();
    await ready();

    expect(readLastPage()).toBe("/shop/dresses?sort=-price");
  });

  it.each(["/login", "/unauthorized", "/login/extra"])("never records %s", async (path) => {
    navigation.pathname = path;
    mount();
    await ready();

    expect(readLastPage()).toBeUndefined();
  });

  it.each(["//evil.example", "https://evil.example", "relative"])("ignores a stored value that is not an app path (%s)", (stored) => {
    localStorage.setItem("clothes_shop_last_page", stored);
    expect(readLastPage()).toBeUndefined();
  });
});
