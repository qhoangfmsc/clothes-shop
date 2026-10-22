import { describe, expect, it, vi } from "vitest";
import { loadMessages } from "@/src/i18n/messages";

/* The registry's dynamic import() cannot run under Vite, so it is replaced; what is tested is how the files are
   joined into one tree (specs/platform/i18n.md, flow I18-5). */

vi.mock("@/src/i18n/registry", () => {
  const file = (name: string) => async (locale: string) => ({ default: { from: `${locale}:${name}` } });
  return { MESSAGE_FILES: { common: file("common"), "shared/errors": file("shared/errors"), "admin/components/crud": file("admin/components/crud"), "admin/orders": file("admin/orders") } };
});

describe("I18-5 loadMessages", () => {
  it("nests each file under its path: admin/components/crud becomes admin.components.crud", async () => {
    const messages = (await loadMessages("vi")) as unknown as Record<string, unknown>;

    expect(messages).toEqual({
      common: { from: "vi:common" },
      shared: { errors: { from: "vi:shared/errors" } },
      admin: { components: { crud: { from: "vi:admin/components/crud" } }, orders: { from: "vi:admin/orders" } },
    });
  });

  it("loads the files of the language it is asked for", async () => {
    const messages = (await loadMessages("en")) as unknown as { common: { from: string } };

    expect(messages.common.from).toBe("en:common");
  });
});
