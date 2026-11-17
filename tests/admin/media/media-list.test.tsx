import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { dateText, msg } from "@/tests/_support/messages";
import { mediaFile, renderMedia } from "./media-kit";

/* The media table, its errors, and the storage that is not set up yet (specs/admin/media.md, flows AMD-1 to AMD-2E). */

const M = (key: string) => msg(`admin.media.${key}`);
const rowOf = (text: string) => screen.getByText(text, { selector: "p.font-semibold" }).closest("tr") as HTMLElement;
const last = <T,>(items: T[]) => items[items.length - 1];

describe("AMD-1 the table", () => {
  it("opens newest first, 25 to a page, with the total", async () => {
    const { calls } = await renderMedia({ pages: [{ data: [mediaFile()], total: 12 }] });

    await screen.findByText("photo.png", { selector: "p.font-semibold" });

    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(screen.getByText("12 ảnh được lưu trong Supabase Storage")).toBeInTheDocument();
  });

  it("shows each file with its picture (through the media proxy), name, type, size and when it was uploaded", async () => {
    await renderMedia({ pages: [{ data: [mediaFile({ sizeOriginal: 2048 })], total: 1 }] });
    await screen.findByText("photo.png", { selector: "p.font-semibold" });
    const row = rowOf("photo.png");

    const picture = within(row).getByAltText("photo.png");
    expect(picture).toHaveAttribute("src", "/media/photo.png");
    expect(picture).toHaveAttribute("loading", "lazy");
    expect(within(row).getByText("PNG", { selector: "span.rounded-full" })).toBeInTheDocument();
    expect(within(row).getByText("2 KB", { selector: "span.whitespace-nowrap" })).toBeInTheDocument();
    expect(within(row).getByText(dateText("2026-03-05T05:00:00.000Z", "dateTime"))).toBeInTheDocument();
  });

  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1023, "1.023 B"],
    [1024, "1 KB"],
    [1536, "1,5 KB"],
    [1587, "1,5 KB"],
    [5 * 1024 * 1024, "5 MB"],
    [3 * 1024 ** 3, "3 GB"],
    [3 * 1024 ** 4, "3.072 GB"],
  ])("writes %d bytes as %s", async (bytes, text) => {
    await renderMedia({ pages: [{ data: [mediaFile({ sizeOriginal: bytes })], total: 1 }] });
    await screen.findByText("photo.png", { selector: "p.font-semibold" });

    expect(within(rowOf("photo.png")).getByText(text, { selector: "span.whitespace-nowrap" })).toBeInTheDocument();
  });

  it("writes the type as the part after the slash in capitals, and cuts a suffix like +xml", async () => {
    await renderMedia({ pages: [{ data: [mediaFile({ id: "a", name: "a.svg", mimeType: "image/svg+xml" }), mediaFile({ id: "b", name: "b.webp", mimeType: "image/webp" }), mediaFile({ id: "c", name: "c.bin", mimeType: "weird" })], total: 3 }] });
    await screen.findByText("a.svg", { selector: "p.font-semibold" });

    expect(within(rowOf("a.svg")).getByText("SVG", { selector: "span.rounded-full" })).toBeInTheDocument();
    expect(within(rowOf("b.webp")).getByText("WEBP", { selector: "span.rounded-full" })).toBeInTheDocument();
    expect(within(rowOf("c.bin")).getByText("WEIRD", { selector: "span.rounded-full" })).toBeInTheDocument();
  });

  it("repeats the type and size under the name on a phone", async () => {
    await renderMedia({ pages: [{ data: [mediaFile({ sizeOriginal: 1536 })], total: 1 }] });
    await screen.findByText("photo.png", { selector: "p.font-semibold" });

    const line = within(rowOf("photo.png")).getByText("PNG · 1,5 KB");

    expect(line.className).toContain("sm:hidden");
  });

  it("hides the type, size and date columns on narrower screens", async () => {
    await renderMedia({ pages: [{ data: [mediaFile()], total: 1 }] });
    await screen.findByText("photo.png", { selector: "p.font-semibold" });
    const header = (key: string) => screen.getByRole("columnheader", { name: M(`table.columns.${key}`), hidden: true }).className;

    expect(header("type")).toContain("hidden md:table-cell");
    expect(header("size")).toContain("hidden sm:table-cell");
    expect(header("uploaded")).toContain("hidden lg:table-cell");
    expect(header("name")).not.toContain("hidden");
  });

  it("searches and sorts six ways", async () => {
    const { calls } = await renderMedia({ pages: [{ data: [mediaFile()], total: 1 }] });
    await screen.findByText("photo.png", { selector: "p.font-semibold" });

    expect(within(screen.getByRole("combobox", { name: msg("admin.components.dataTable.sort.label") })).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["-createdAt", "createdAt", "name", "-name", "-size", "size"]);
    await userEvent.type(screen.getByPlaceholderText(M("table.searchPlaceholder")), "pho");
    await waitFor(() => expect(last(calls.lists).get("search")).toBe("pho"));
  });

  it("writes sizes and dates in English in English", async () => {
    await renderMedia({ locale: "en", pages: [{ data: [mediaFile({ sizeOriginal: 1536 })], total: 1 }] });
    await screen.findByText("photo.png", { selector: "p.font-semibold" });

    expect(within(rowOf("photo.png")).getByText("1.5 KB", { selector: "span.whitespace-nowrap" })).toBeInTheDocument();
    expect(screen.getByText(msg("admin.media.page.upload", "en"))).toBeInTheDocument();
  });

  it("selects rows, shows how many are chosen, and clears the choice", async () => {
    await renderMedia({ pages: [{ data: [mediaFile({ id: "a", name: "a.png" }), mediaFile({ id: "b", name: "b.png" })], total: 2 }] });
    await screen.findByText("a.png", { selector: "p.font-semibold" });

    await userEvent.click(within(rowOf("a.png")).getByRole("checkbox"));
    await userEvent.click(within(rowOf("b.png")).getByRole("checkbox"));

    expect(screen.getByText("Đã chọn 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.dataTable.selection.clear") }));
    expect(screen.queryByText("Đã chọn 2")).not.toBeInTheDocument();
  });
});

describe("AMD-2E nothing to show, or no way to load it", () => {
  it("says there are no pictures yet, with a hint to upload, or that nothing matches the search", async () => {
    await renderMedia({ pages: [{ data: [], total: 0 }] });
    expect(await screen.findByText(M("table.empty"))).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(M("table.searchPlaceholder")), "zzz");

    expect(await screen.findByText(M("table.emptyFiltered"))).toBeInTheDocument();
  });

  it("says why it could not load, with the BE's words, hides the table and the upload button, and tries again", async () => {
    const { calls } = await renderMedia({ failListFrom: 1, listRefusal: { status: 500, body: { message: "Storage exploded" } }, pages: [{ data: [mediaFile()], total: 1 }] });

    expect(await screen.findByText("Storage exploded")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(M("table.searchPlaceholder"))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: M("page.upload") })).not.toBeInTheDocument();
    expect(screen.queryByText(M("notConfigured.title"))).not.toBeInTheDocument();
    const asks = calls.lists.length;

    await userEvent.click(screen.getByRole("button", { name: M("notConfigured.retry") }));

    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(asks));
  });

  it("uses its own words when the BE gives none", async () => {
    await renderMedia({ failListFrom: 1, listRefusal: { status: 500, body: {} } });

    expect(await screen.findByText(M("errors.loadFailed"))).toBeInTheDocument();
  });

  it("shows the set-up guide when the storage is not configured (code 1601), not the generic error", async () => {
    await renderMedia({ failListFrom: 1, listRefusal: { status: 503, body: { message: "no storage", errorCode: 1601 } } });

    expect(await screen.findByRole("heading", { level: 2, name: M("notConfigured.title") })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Supabase dashboard" });
    expect(link).toHaveAttribute("href", "https://supabase.com/dashboard");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("SUPABASE_URL")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
    expect(screen.queryByText(M("errors.loadFailed"))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: M("page.upload") })).not.toBeInTheDocument();
  });

  it("asks again from the guide's own button and shows the table once the storage works", async () => {
    const { calls } = await renderMedia({ failListFrom: 1, listRefusal: { status: 503, body: { message: "no storage", errorCode: 1601 } } });
    await screen.findByRole("heading", { level: 2, name: M("notConfigured.title") });
    const asks = calls.lists.length;

    await userEvent.click(screen.getByRole("button", { name: M("notConfigured.retry") }));

    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(asks));
  });

  it("asks again from the header button when the load failed, and only reloads the table when it did not", async () => {
    const failed = await renderMedia({ failListFrom: 1, listRefusal: { status: 500, body: { message: "boom" } } });
    await screen.findByText("boom");
    const asks = failed.calls.lists.length;
    await userEvent.click(screen.getByRole("button", { name: M("page.refresh") }));
    await waitFor(() => expect(failed.calls.lists.length).toBeGreaterThan(asks));
    failed.unmount();

    const fine = await renderMedia({ pages: [{ data: [mediaFile()], total: 1 }] });
    await screen.findByText("photo.png", { selector: "p.font-semibold" });
    const before = fine.calls.lists.length;
    await userEvent.click(screen.getByRole("button", { name: M("page.refresh") }));
    await waitFor(() => expect(fine.calls.lists.length).toBeGreaterThan(before));
  });

  it.each([
    ["a visitor", "guest", 401, "Không thể tải danh sách ảnh"],
    ["a shopper", "user", 403, "denied"],
  ] as const)("shows %s no file, only why it could not load", async (_label, as, deny, shown) => {
    await renderMedia({ as, deny, pages: [{ data: [mediaFile()], total: 1 }] });

    expect(await screen.findByText(shown)).toBeInTheDocument();
    expect(screen.queryByText("photo.png", { selector: "p.font-semibold" })).not.toBeInTheDocument();
  });
});
