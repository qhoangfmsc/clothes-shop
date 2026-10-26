import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Providers from "@/src/app/[locale]/_components/Providers";
import VercelTelemetry from "@/src/app/[locale]/_components/VercelTelemetry";
import { useAuth } from "@/src/contexts/auth-context";
import { useAppSelector } from "@/src/store/hooks";
import { signInAs } from "@/tests/_support/identities";

type BeforeSend = (event: { url: string; type?: string }) => { url: string } | null;
const captured = vi.hoisted(() => ({ analytics: undefined as undefined | ((event: { url: string }) => { url: string } | null), speed: undefined as undefined | ((event: { url: string }) => { url: string } | null) }));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: (props: { beforeSend: BeforeSend }) => {
    captured.analytics = props.beforeSend;
    return <i data-testid="analytics" />;
  },
}));
vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: (props: { beforeSend: BeforeSend }) => {
    captured.speed = props.beforeSend;
    return <i data-testid="speed" />;
  },
}));

/* The providers every page sits in, and the traffic counters (specs/platform/app-shell.md, flows SHL-17 to SHL-18E). */

describe("SHL-17 measuring visits", () => {
  const send = (which: "analytics" | "speed", url: string) => captured[which]!({ url });

  it("counts visits and speed, with one counter each", () => {
    render(<VercelTelemetry />);

    expect(screen.getByTestId("analytics")).toBeInTheDocument();
    expect(screen.getByTestId("speed")).toBeInTheDocument();
  });

  it.each([["analytics"], ["speed"]] as const)("%s lets a shop page through as it is", (which) => {
    render(<VercelTelemetry />);
    const event = { url: "https://doovan.vn/vi/shop/tops" };

    expect(captured[which]!(event)).toBe(event);
  });

  it.each([["analytics"], ["speed"]] as const)("%s drops the admin's own work, in either language, at any depth", (which) => {
    render(<VercelTelemetry />);

    for (const url of ["https://doovan.vn/vi/admin", "https://doovan.vn/en/admin/orders", "https://doovan.vn/vi/admin/orders/o-1?tab=x", "http://localhost:3000/en/admin/"]) {
      expect(send(which, url)).toBeNull();
    }
  });

  it.each([["analytics"], ["speed"]] as const)("%s counts pages that only look like the admin's", (which) => {
    render(<VercelTelemetry />);

    for (const url of ["https://doovan.vn/vi/administrator", "https://doovan.vn/vi/shop/admin", "https://doovan.vn/admin", "https://doovan.vn/fr/admin", "https://doovan.vn/vi/blog/admin/x"]) {
      expect(send(which, url)?.url).toBe(url);
    }
  });

  it("counts an event whose address cannot be read, rather than losing it", () => {
    render(<VercelTelemetry />);

    expect(send("analytics", "not a url")).toEqual({ url: "not a url" });
  });
});

function Probe() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const wishlist = useAppSelector((state) => state.wishlist.items.length);
  return (
    <p data-testid="probe">
      {isLoading ? "loading" : isAuthenticated ? `in:${user?.email}` : "out"}|{wishlist}
    </p>
  );
}

describe("SHL-18 the providers", () => {
  it("give every page the saved lists and the session: a visitor is signed out", async () => {
    signInAs("guest");

    render(
      <Providers>
        <Probe />
      </Providers>
    );

    expect(await screen.findByText("out|0")).toBeInTheDocument();
  });

  it("know a signed-in customer", async () => {
    signInAs("user");

    render(
      <Providers>
        <Probe />
      </Providers>
    );

    expect(await screen.findByText("in:mai@example.com|0")).toBeInTheDocument();
  });

  it("hold the page in between", async () => {
    signInAs("guest");

    render(
      <Providers>
        <span>the page</span>
      </Providers>
    );

    expect(screen.getByText("the page")).toBeInTheDocument();
  });
});
