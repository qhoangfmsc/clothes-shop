import { isValidElement } from "react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout, { generateMetadata } from "@/src/app/[locale]/(admin)/layout";
import AdminLayoutClient from "@/src/app/[locale]/(admin)/AdminLayoutClient";
import { PENDING_COUNT_KEYS, usePendingCounts } from "@/src/app/[locale]/_components/PendingCountsProvider";
import ScopedMessages from "@/src/i18n/ScopedMessages";
import { msg } from "@/tests/_support/messages";

/* The server side of the admin frame: language check, page title, no indexing (specs/admin/admin-shell.md, flows ADM-7 to ADM-8). */

const server = vi.hoisted(() => ({ setRequestLocale: vi.fn(), namespaces: [] as string[] }));

vi.mock("next-intl/server", () => ({
  setRequestLocale: server.setRequestLocale,
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => {
    server.namespaces.push(namespace);
    return (key: string) => `${namespace}.${key}`;
  },
  getLocale: async () => "vi",
  getMessages: async () => ({}),
}));

beforeEach(() => {
  server.setRequestLocale.mockClear();
  server.namespaces = [];
});

const params = (locale: string) => ({ params: Promise.resolve({ locale }) });

describe("ADM-7 the title and the search engines", () => {
  it("has the admin title with the brand and tells search engines to keep out", async () => {
    const metadata = await generateMetadata(params("vi"));

    expect(metadata).toEqual({
      title: "admin.shell.meta.title — DOOVAN",
      description: "admin.shell.meta.description",
      robots: { index: false, follow: false },
    });
    expect(server.namespaces).toEqual(["admin.shell.meta"]);
  });

  it("is a not-found for a language the site does not have", async () => {
    await expect(generateMetadata(params("xx"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("the real title and description exist in both languages", () => {
    for (const locale of ["vi", "en"] as const) {
      expect(msg("admin.shell.meta.title", locale)).not.toBe("");
      expect(msg("admin.shell.meta.description", locale)).not.toBe("");
    }
  });
});

describe("ADM-7E the frame around the pages", () => {
  it("sets the request language and sends only the shared and admin texts to the browser", async () => {
    const tree = await AdminLayout({ children: <p>child</p>, ...params("en") });

    expect(server.setRequestLocale).toHaveBeenCalledWith("en");
    expect(isValidElement(tree)).toBe(true);
    expect(tree.type).toBe(ScopedMessages);
    expect(tree.props.scope).toBe("admin");
    expect(tree.props.children.type).toBe(AdminLayoutClient);
    expect(tree.props.children.props.children.props.children).toBe("child");
  });

  it("is a not-found for a language the site does not have, before anything is set", async () => {
    await expect(AdminLayout({ children: null, ...params("xx") })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(server.setRequestLocale).not.toHaveBeenCalled();
  });
});

describe("ADM-8 the counts outside a provider", () => {
  it("says nothing is waiting and has a refresh that does nothing, so a page can be shown without the frame", () => {
    const { result } = renderHook(() => usePendingCounts());

    expect(result.current.counts).toEqual({});
    expect(() => result.current.refresh()).not.toThrow();
  });

  it("counts five kinds of work", () => {
    expect([...PENDING_COUNT_KEYS]).toEqual(["orders", "payments", "refunds", "returns", "reviews"]);
  });
});
