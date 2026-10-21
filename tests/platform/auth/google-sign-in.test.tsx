import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import GoogleSignInButton from "@/src/app/[locale]/(auth)/login/_components/GoogleSignInButton";
import { useAuth } from "@/src/contexts/auth-context";
import { API, ACCESS_KEY } from "@/tests/_support/api";
import { google } from "@/tests/_support/google";
import { IDENTITIES } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* The Google button on /login, in the login prompt and on the sign-in wall (specs/platform/auth.md, flows
   GSI-1 … GSI-5). Google's popup is a stand-in; the test plays its outcome with google.succeed / google.fail. */

function Who() {
  const { user } = useAuth();
  return <p data-testid="who">{user ? user.email : "nobody"}</p>;
}

const button = () => screen.getByRole("button", { name: msg("auth.login.google.continue") });
const accept = () => userEvent.click(screen.getByRole("checkbox"));
const googleAnswers = (reply: () => Response) => server.use(http.post(`${API}/api/auth/google`, reply));
const signedIn = () => HttpResponse.json({ accessToken: "a1", refreshToken: "r1", user: IDENTITIES.user });

async function openPopup(props: { redirectAfterLogin?: boolean } = {}) {
  await renderApp(
    <>
      <Who />
      <GoogleSignInButton {...props} />
    </>
  );
  await accept();
  await userEvent.click(button());
  expect(google.opened).toBe(1);
}

describe("GSI-1 the terms gate, for a guest (khách)", () => {
  it("is locked, with a hint, until the terms are accepted", async () => {
    await renderApp(<GoogleSignInButton />);

    expect(button()).toBeDisabled();
    expect(screen.getByText(msg("auth.login.consent.hint"))).toBeInTheDocument();
    await userEvent.click(button());
    expect(google.opened).toBe(0);
  });

  it("unlocks when the terms are accepted and locks again when the tick is removed", async () => {
    await renderApp(<GoogleSignInButton />);

    await accept();
    expect(button()).toBeEnabled();
    expect(screen.queryByText(msg("auth.login.consent.hint"))).toBeNull();

    await accept();
    expect(button()).toBeDisabled();
  });

  it("links the terms and the privacy policy in a new tab", async () => {
    await renderApp(<GoogleSignInButton />);

    expect(screen.getByRole("link", { name: "Điều khoản sử dụng" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Điều khoản sử dụng" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Chính sách bảo mật" })).toHaveAttribute("href", "/privacy");
  });
});

describe("GSI-2 the Google account hint, for a guest (khách)", () => {
  it("points Google at the account used last time", async () => {
    localStorage.setItem("clothes_shop_last_google_email", "mai@example.com");

    await renderApp(<GoogleSignInButton />);

    expect(google.options?.hint).toBe("mai@example.com");
    expect(google.options?.flow).toBe("auth-code");
  });

  it("gives no hint to a first-time visitor", async () => {
    await renderApp(<GoogleSignInButton />);

    expect(google.options?.hint).toBeUndefined();
  });
});

describe("GSI-3 a successful sign-in, for a guest (khách)", () => {
  it("signs the visitor in and stays on the page", async () => {
    googleAnswers(signedIn);
    await openPopup();

    await google.succeed("code-1");

    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("mai@example.com"));
    expect(localStorage.getItem(ACCESS_KEY)).toBe("a1");
    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("sends the Google code to the API", async () => {
    let body: unknown;
    googleAnswers(() => HttpResponse.json({}, { status: 500 }));
    server.use(
      http.post(`${API}/api/auth/google`, async ({ request }) => {
        body = await request.json();
        return signedIn();
      })
    );
    await openPopup();

    await google.succeed("code-77");

    await waitFor(() => expect(body).toEqual({ idToken: "code-77" }));
  });

  it("on the login page (redirectAfterLogin) goes back to the last page, or home when there is none", async () => {
    googleAnswers(signedIn);
    navigation.pathname = "/login"; // where this button redirects from; the page tracker never records /login
    localStorage.setItem("clothes_shop_last_page", "/shop/dresses?sort=-price");
    await openPopup({ redirectAfterLogin: true });

    await google.succeed("code-1");

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/shop/dresses?sort=-price"));
  });

  it("goes home when no page was remembered", async () => {
    googleAnswers(signedIn);
    navigation.pathname = "/login";
    await openPopup({ redirectAfterLogin: true });

    await google.succeed("code-1");

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/"));
  });
});

describe("GSI-4 a failed sign-in, for a guest (khách)", () => {
  it("shows the API's own message and leaves the visitor signed out", async () => {
    googleAnswers(() => HttpResponse.json({ message: "Mã Google không hợp lệ", errorCode: 99999 }, { status: 400 }));
    await openPopup();

    await google.succeed("bad");

    expect(await screen.findByText("Mã Google không hợp lệ")).toBeInTheDocument();
    expect(screen.getByTestId("who")).toHaveTextContent("nobody");
    expect(button()).toBeEnabled();
    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("falls back to the generic message when the API says nothing useful", async () => {
    googleAnswers(() => HttpResponse.json({}, { status: 500 }));
    await openPopup({ redirectAfterLogin: true });

    await google.succeed("bad");

    expect(await screen.findByText(msg("auth.login.google.failed"))).toBeInTheDocument();
    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("says the sign-in was cancelled when the popup is closed", async () => {
    await openPopup();

    google.fail();

    expect(await screen.findByText(msg("auth.login.google.cancelled"))).toBeInTheDocument();
  });

  it("clears an earlier error when the visitor tries again", async () => {
    await openPopup();
    google.fail();
    await screen.findByText(msg("auth.login.google.cancelled"));

    await userEvent.click(button());

    expect(screen.queryByText(msg("auth.login.google.cancelled"))).toBeNull();
  });
});
