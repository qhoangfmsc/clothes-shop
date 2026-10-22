import { render, screen } from "@testing-library/react";
import { useMessages } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import ScopedMessages from "@/src/i18n/ScopedMessages";
import { pickMessages } from "@/src/i18n/messages";
import { MESSAGES } from "@/tests/_support/messages";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "vi",
  getMessages: async () => (await import("@/tests/_support/messages")).MESSAGES.vi,
}));

/* Which translations reach the browser (specs/platform/i18n.md, flows I18-5 and I18-5E). */

function Keys() {
  return <p data-testid="keys">{Object.keys(useMessages()).sort().join(",")}</p>;
}

async function shown(scope: "public" | "private" | "admin") {
  render(await ScopedMessages({ scope, children: <Keys /> }));
  return screen.getByTestId("keys").textContent;
}

describe("I18-5 pickMessages", () => {
  it("keeps exactly the groups it is asked for", () => {
    expect(Object.keys(pickMessages(MESSAGES.vi, ["common", "admin"])).sort()).toEqual(["admin", "common"]);
  });

  it("keeps the content of each group whole, not another group's", () => {
    const picked = pickMessages(MESSAGES.en, ["common", "admin", "shared"]);

    expect(picked.common).toBe(MESSAGES.en.common);
    expect(picked.admin).toBe(MESSAGES.en.admin);
    expect(picked.shared).toBe(MESSAGES.en.shared);
  });
});

describe("I18-5 ScopedMessages", () => {
  it.each([
    ["public", "auth,common,public,shared"],
    ["private", "auth,common,private,shared"],
    ["admin", "admin,auth,common,shared"],
  ] as const)("the %s layout sends %s", async (scope, groups) => {
    expect(await shown(scope)).toBe(groups);
  });
});

describe("I18-5E a visitor never gets another role's translations", () => {
  it("the storefront does not receive the admin or customer-account texts", async () => {
    const groups = (await shown("public"))!.split(",");

    expect(groups).not.toContain("admin");
    expect(groups).not.toContain("private");
  });

  it("the admin area does not receive the storefront texts", async () => {
    const groups = (await shown("admin"))!.split(",");

    expect(groups).not.toContain("public");
    expect(groups).not.toContain("private");
  });
});
