import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dateText, msg } from "@/tests/_support/messages";
import { mediaFile, renderMedia, type RenderMediaOptions } from "./media-kit";

/* Uploading (by button and by drag and drop), looking at, saving and removing pictures, and the storage check (specs/admin/media.md, flows AMD-3 to AMD-7E). */

const M = (key: string) => msg(`admin.media.${key}`);
const png = (name = "new.png", type = "image/png") => new File([name], name, { type });
const uploadInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const rowOf = (text: string) => screen.getByText(text, { selector: "p.font-semibold" }).closest("tr") as HTMLElement;
const dropZone = () => screen.getByRole("heading", { level: 1, name: M("page.title") }).closest(".relative") as HTMLElement;
const files = (list: File[]) => ({ dataTransfer: { types: ["Files"], files: list } });
const ONE = { pages: [{ data: [mediaFile({ id: "m-1", name: "photo.png" })], total: 1 }] } satisfies RenderMediaOptions;

const THREE = { pages: [{ data: [mediaFile({ id: "a", name: "a.png" }), mediaFile({ id: "b", name: "b.png" }), mediaFile({ id: "c", name: "c.png" })], total: 3 }] } satisfies RenderMediaOptions;

async function ready(options: RenderMediaOptions = ONE, name = "photo.png") {
  const view = await renderMedia(options);
  await screen.findByText(name, { selector: "p.font-semibold" });
  return view;
}

describe("AMD-3 uploading with the button", () => {
  it("only offers pictures, several at a time, and sends each file with the token", async () => {
    const { calls } = await ready();

    expect(uploadInput()).toHaveAttribute("accept", "image/*");
    expect(uploadInput()).toHaveAttribute("multiple");
    await userEvent.upload(uploadInput(), [png("a.png"), png("b.png")]);

    await waitFor(() => expect(calls.uploads.map((u) => u.name).sort()).toEqual(["a.png", "b.png"]));
    expect(calls.uploads[0].auth).toMatch(/^Bearer /);
    expect(calls.uploads[0].type).toBe("image/png");
  });

  it("says how many were uploaded, goes back to page one and reloads the table", async () => {
    const { calls } = await ready();
    const before = calls.lists.length;

    await userEvent.upload(uploadInput(), [png("a.png"), png("b.png")]);

    expect(await screen.findByText("Đã tải lên 2 ảnh")).toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
    expect(last(calls.lists).has("page")).toBe(false);
  });

  it("goes back to the first page of the newest files after an upload made from another page", async () => {
    const { calls } = await ready({ pages: [{ data: [mediaFile({ id: "m-1", name: "photo.png" })], total: 60 }, { data: [mediaFile({ id: "m-2", name: "second.png" })], total: 60 }] });
    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.dataTable.pagination.next") }));
    await screen.findByText("second.png", { selector: "p.font-semibold" });

    await userEvent.upload(uploadInput(), [png("new.png")]);

    expect(await screen.findByText("photo.png", { selector: "p.font-semibold" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("second.png", { selector: "p.font-semibold" })).not.toBeInTheDocument());
    expect(last(calls.lists).has("page")).toBe(false);
  });

  it("shows the busy label and keeps the button off while uploading", async () => {
    await ready({ ...ONE, uploadDelayMs: 300 });

    await userEvent.upload(uploadInput(), [png()]);

    const busy = await screen.findByRole("button", { name: M("page.uploading") });
    expect(busy).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: M("page.upload") })).toBeEnabled());
  });

  it("opens the file chooser from the Upload button", async () => {
    await ready();
    const click = vi.spyOn(uploadInput(), "click");

    await userEvent.click(screen.getByRole("button", { name: M("page.upload") }));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("clears the chooser so the same file can be chosen again", async () => {
    const { calls } = await ready();

    await userEvent.upload(uploadInput(), [png("a.png")]);
    await waitFor(() => expect(calls.uploads).toHaveLength(1));

    expect(uploadInput().value).toBe("");
  });

  it("says why when the only file is refused, in the BE's words (a known code) or its own, and does not reload", async () => {
    const first = await ready({ ...ONE, refuseUpload: { "big.png": { status: 413, body: { message: "server", errorCode: 1606 } } } });
    const before = first.calls.lists.length;
    await userEvent.upload(uploadInput(), [png("big.png")]);
    expect(await screen.findByText(msg("shared.errors.byCode.1606"))).toBeInTheDocument();
    expect(screen.queryByText(/Đã tải lên/)).not.toBeInTheDocument();
    expect(first.calls.lists.length).toBe(before);
    first.unmount();

    await ready({ ...ONE, refuseUpload: { "bad.png": { status: 500, body: {} } } });
    await userEvent.upload(uploadInput(), [png("bad.png")]);
    expect(await screen.findByText(M("toast.uploadFailed"))).toBeInTheDocument();
  });

  it("reports the ones that worked and the ones that did not, when only some failed", async () => {
    const { calls } = await ready({ ...ONE, refuseUpload: { "bad.png": { status: 413, body: { message: "server", errorCode: 1606 } } } });
    const before = calls.lists.length;

    await userEvent.upload(uploadInput(), [png("ok.png"), png("bad.png")]);

    expect(await screen.findByText("Đã tải lên 1 ảnh")).toBeInTheDocument();
    expect(await screen.findByText(msg("shared.errors.byCode.1606"))).toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("gathers several failures into one message with the count and the first reason", async () => {
    const { calls } = await ready({ ...ONE, refuseUpload: { "a.png": { status: 413, body: { message: "server", errorCode: 1606 } }, "b.png": { status: 500, body: { message: "other" } } } });
    const before = calls.lists.length;

    await userEvent.upload(uploadInput(), [png("a.png"), png("b.png")]);

    expect(await screen.findByText(new RegExp(`^2 ảnh tải lên thất bại — .+`))).toBeInTheDocument();
    expect(screen.queryByText(/Đã tải lên/)).not.toBeInTheDocument();
    expect(calls.lists.length).toBe(before);
  });
});

describe("AMD-4 dragging pictures onto the page", () => {
  it("shows the drop hint while files are dragged over, also over nested elements, and hides it when they leave", async () => {
    await ready();
    const zone = dropZone();

    fireEvent.dragEnter(zone, files([]));
    expect(screen.getByText(M("page.dropHint"))).toBeInTheDocument();
    fireEvent.dragEnter(zone, files([]));
    fireEvent.dragLeave(zone, files([]));
    expect(screen.getByText(M("page.dropHint"))).toBeInTheDocument();
    fireEvent.dragLeave(zone, files([]));
    expect(screen.queryByText(M("page.dropHint"))).not.toBeInTheDocument();
  });

  it("ignores a drag that does not carry files (text, a link)", async () => {
    await ready();

    fireEvent.dragEnter(dropZone(), { dataTransfer: { types: ["text/plain"], files: [] } });

    expect(screen.queryByText(M("page.dropHint"))).not.toBeInTheDocument();
  });

  it("allows the drop by cancelling the browser's own handling, only for files", async () => {
    await ready();
    const withFiles = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(withFiles, "dataTransfer", { value: { types: ["Files"], files: [] } });
    const withText = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(withText, "dataTransfer", { value: { types: ["text/plain"], files: [] } });

    act(() => void dropZone().dispatchEvent(withFiles));
    act(() => void dropZone().dispatchEvent(withText));

    expect(withFiles.defaultPrevented).toBe(true);
    expect(withText.defaultPrevented).toBe(false);
  });

  it("uploads the dropped pictures and hides the hint", async () => {
    const { calls } = await ready();
    fireEvent.dragEnter(dropZone(), files([]));

    fireEvent.drop(dropZone(), files([png("a.png"), png("b.png")]));

    await waitFor(() => expect(calls.uploads).toHaveLength(2));
    expect(screen.queryByText(M("page.dropHint"))).not.toBeInTheDocument();
    expect(await screen.findByText("Đã tải lên 2 ảnh")).toBeInTheDocument();
  });

  it("starts the hint from nothing again after a drop", async () => {
    await ready();
    fireEvent.dragEnter(dropZone(), files([]));
    fireEvent.dragEnter(dropZone(), files([]));
    fireEvent.drop(dropZone(), files([png()]));

    fireEvent.dragEnter(dropZone(), files([]));
    fireEvent.dragLeave(dropZone(), files([]));

    expect(screen.queryByText(M("page.dropHint"))).not.toBeInTheDocument();
  });

  it("tells the admin that only pictures can be uploaded, and sends nothing, when no dropped file is one", async () => {
    const { calls } = await ready();

    fireEvent.drop(dropZone(), files([png("doc.pdf", "application/pdf")]));

    expect(await screen.findByText(M("toast.onlyImages"))).toBeInTheDocument();
    expect(calls.uploads).toEqual([]);
  });

  it("uploads only the pictures among the dropped files", async () => {
    const { calls } = await ready();

    fireEvent.drop(dropZone(), files([png("doc.pdf", "application/pdf"), png("ok.png")]));

    await waitFor(() => expect(calls.uploads.map((u) => u.name)).toEqual(["ok.png"]));
  });

  it("ignores a drop of something that is not a file", async () => {
    const { calls } = await ready();

    fireEvent.drop(dropZone(), { dataTransfer: { types: ["text/plain"], files: [png()] } });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.uploads).toEqual([]);
  });

  it("ignores a drop while an upload is still on its way", async () => {
    const { calls } = await ready({ ...ONE, uploadDelayMs: 300 });
    fireEvent.drop(dropZone(), files([png("first.png")]));
    await screen.findByRole("button", { name: M("page.uploading") });

    fireEvent.drop(dropZone(), files([png("second.png")]));

    await waitFor(() => expect(screen.getByRole("button", { name: M("page.upload") })).toBeEnabled());
    expect(calls.uploads.map((u) => u.name)).toEqual(["first.png"]);
  });

  it("does not react to files dragged over a page that could not load", async () => {
    await renderMedia({ failListFrom: 1, listRefusal: { status: 500, body: { message: "boom" } } });
    await screen.findByText("boom");

    fireEvent.dragEnter(dropZone(), files([]));

    expect(screen.queryByText(M("page.dropHint"))).not.toBeInTheDocument();
  });
});

describe("AMD-5 looking at a picture", () => {
  it("opens it large, with its name, size and date, from the picture or from the eye button", async () => {
    await ready({ pages: [{ data: [mediaFile({ sizeOriginal: 1536 })], total: 1 }] });
    const row = rowOf("photo.png");

    await userEvent.click(within(row).getAllByTitle(M("table.preview"))[0]);

    const big = document.querySelector("img.object-contain") as HTMLImageElement;
    expect(big).toHaveAttribute("src", "/media/photo.png");
    expect(big).toHaveAttribute("alt", "photo.png");
    const caption = big.parentElement as HTMLElement;
    expect(within(caption).getByText("photo.png")).toBeInTheDocument();
    expect(within(caption).getByText("1,5 KB")).toBeInTheDocument();
    expect(within(caption).getByText(dateText("2026-03-05T05:00:00.000Z", "dateTime"))).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.close") }));
    expect(document.querySelector("img.object-contain")).toBeNull();

    await userEvent.click(within(row).getAllByTitle(M("table.preview"))[1]);
    expect(document.querySelector("img.object-contain")).not.toBeNull();
  });
});

describe("AMD-6 saving a picture", () => {
  let anchors: HTMLAnchorElement[];
  let created: string[];
  let revoked: string[];
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

  beforeEach(() => {
    anchors = [];
    created = [];
    revoked = [];
    URL.createObjectURL = vi.fn(() => {
      created.push("blob:fake");
      return "blob:fake";
    });
    URL.revokeObjectURL = vi.fn((url: string) => void revoked.push(url));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      anchors.push(this);
    });
  });

  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    vi.restoreAllMocks();
  });

  it("fetches the picture and saves it under its own name, then tidies up", async () => {
    const { calls } = await ready({ pages: [{ data: [mediaFile({ name: "photo.png" })], total: 1 }] });

    await userEvent.click(within(rowOf("photo.png")).getByTitle(M("table.download")));

    await waitFor(() => expect(anchors).toHaveLength(1));
    expect(calls.downloads).toEqual(["photo.png"]);
    expect(anchors[0].download).toBe("photo.png");
    expect(anchors[0].href).toBe("blob:fake");
    expect(revoked).toEqual(["blob:fake"]);
    expect(document.body.contains(anchors[0])).toBe(false);
  });

  it("keeps the button off while the picture is on its way, then turns it on again", async () => {
    await ready({ pages: [{ data: [mediaFile({ name: "photo.png" })], total: 1 }], downloadDelayMs: 300 });

    await userEvent.click(within(rowOf("photo.png")).getByTitle(M("table.download")));

    await waitFor(() => expect(within(rowOf("photo.png")).getByTitle(M("table.download"))).toBeDisabled());
    await waitFor(() => expect(within(rowOf("photo.png")).getByTitle(M("table.download"))).toBeEnabled());
    expect(anchors).toHaveLength(1);
  });

  it("says it could not be saved when the picture cannot be fetched, and saves nothing", async () => {
    await ready({ ...ONE, download: 404 });

    await userEvent.click(within(rowOf("photo.png")).getByTitle(M("table.download")));

    expect(await screen.findByText(M("toast.downloadFailed"))).toBeInTheDocument();
    expect(anchors).toEqual([]);
    expect(within(rowOf("photo.png")).getByTitle(M("table.download"))).toBeEnabled();
  });

  it("saves from the large view too", async () => {
    await ready();
    await userEvent.click(within(rowOf("photo.png")).getAllByTitle(M("table.preview"))[0]);

    const lightbox = document.querySelector(".z-200") as HTMLElement;

    await userEvent.click(within(lightbox).getByRole("button", { name: M("table.download") }));

    await waitFor(() => expect(anchors).toHaveLength(1));
    expect(anchors[0].download).toBe("photo.png");
  });
});

describe("AMD-7 removing pictures", () => {
  const confirmButton = async () => within(await screen.findByRole("alertdialog")).getByRole("button", { name: M("table.delete") });

  it("asks first, naming the file, then deletes it, tells the admin and reloads the table", async () => {
    const { calls } = await ready();
    const before = calls.lists.length;

    await userEvent.click(within(rowOf("photo.png")).getByTitle(M("table.delete")));
    const box = await screen.findByRole("alertdialog");
    expect(within(box).getByText(M("confirm.deleteOne.title"))).toBeInTheDocument();
    expect(within(box).getByText('Xóa "photo.png"? Hành động này không thể hoàn tác.')).toBeInTheDocument();
    expect(calls.deletes).toEqual([]);
    const confirm = await confirmButton();
    expect(confirm.className).toContain("bg-[var(--accent-rose)]");
    await userEvent.click(confirm);

    await waitFor(() => expect(calls.deletes).toEqual(["m-1"]));
    expect(await screen.findByText(M("toast.deleted"))).toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("does nothing when the question is answered No", async () => {
    const { calls } = await ready();

    await userEvent.click(within(rowOf("photo.png")).getByTitle(M("table.delete")));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.deletes).toEqual([]);
  });

  it("explains a refusal in the BE's words or its own, and keeps the large view open", async () => {
    const first = await ready({ ...ONE, refuseDelete: { "m-1": { status: 409, body: { message: "In use" } } } });
    await userEvent.click(within(rowOf("photo.png")).getByTitle(M("table.delete")));
    await userEvent.click(await confirmButton());
    expect(await screen.findByText("In use")).toBeInTheDocument();
    first.unmount();

    await ready({ ...ONE, refuseDelete: { "m-1": { status: 500, body: {} } } });
    await userEvent.click(within(rowOf("photo.png")).getByTitle(M("table.delete")));
    await userEvent.click(await confirmButton());
    expect(await screen.findByText(M("toast.deleteFailed"))).toBeInTheDocument();
  });

  it("closes the large view when the file shown in it is deleted", async () => {
    await ready();
    await userEvent.click(within(rowOf("photo.png")).getAllByTitle(M("table.preview"))[0]);
    expect(document.querySelector("img.object-contain")).not.toBeNull();
    await userEvent.click(within(rowOf("photo.png")).getByTitle(M("table.delete")));
    await userEvent.click(await confirmButton());

    await waitFor(() => expect(document.querySelector("img.object-contain")).toBeNull());
  });

  it("keeps the large view of another file when a different one is deleted", async () => {
    await ready(THREE, "a.png");
    await userEvent.click(within(rowOf("a.png")).getAllByTitle(M("table.preview"))[0]);
    await userEvent.click(within(rowOf("b.png")).getByTitle(M("table.delete")));
    await userEvent.click(await confirmButton());

    await screen.findByText(M("toast.deleted"));

    expect(document.querySelector("img.object-contain")).not.toBeNull();
  });
});

describe("AMD-7B removing several pictures at once", () => {
  const choose = async (...names: string[]) => {
    for (const name of names) await userEvent.click(within(rowOf(name)).getByRole("checkbox"));
  };
  const confirmButton = async () => within(await screen.findByRole("alertdialog")).getByRole("button", { name: M("table.delete") });
  const bulkBar = () => screen.getByText(/^Đã chọn \d+$/).parentElement as HTMLElement;

  it("asks with the count, deletes each chosen file, tells the admin, clears the choice and reloads", async () => {
    const { calls } = await ready(THREE, "a.png");
    const before = calls.lists.length;
    await choose("a.png", "c.png");

    await userEvent.click(within(bulkBar()).getByRole("button", { name: M("table.delete") }));
    const box = await screen.findByRole("alertdialog");
    expect(within(box).getByText("Xóa 2 ảnh? Hành động này không thể hoàn tác.")).toBeInTheDocument();
    expect(calls.deletes).toEqual([]);
    expect((await confirmButton()).className).toContain("bg-[var(--accent-rose)]");
    await userEvent.click(await confirmButton());

    await waitFor(() => expect(calls.deletes.sort()).toEqual(["a", "c"]));
    expect(await screen.findByText("Đã xóa 2 ảnh")).toBeInTheDocument();
    expect(screen.queryByText(/xóa thất bại/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Đã chọn/)).not.toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("does nothing when the question is answered No", async () => {
    const { calls } = await ready(THREE, "a.png");
    await choose("a.png");

    await userEvent.click(within(bulkBar()).getByRole("button", { name: M("table.delete") }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.deletes).toEqual([]);
    expect(screen.getByText("Đã chọn 1")).toBeInTheDocument();
  });

  it("reports the ones that were deleted and the ones that were not, one failure not stopping the rest", async () => {
    const { calls } = await ready({ ...THREE, refuseDelete: { b: { status: 409, body: { message: "In use" } } } }, "a.png");
    await choose("a.png", "b.png", "c.png");

    await userEvent.click(within(bulkBar()).getByRole("button", { name: M("table.delete") }));
    await userEvent.click(await confirmButton());

    expect(await screen.findByText("Đã xóa 2 ảnh")).toBeInTheDocument();
    expect(await screen.findByText("1 ảnh xóa thất bại")).toBeInTheDocument();
    expect(calls.deletes.sort()).toEqual(["a", "b", "c"]);
    expect(screen.queryByText(/^Đã chọn/)).not.toBeInTheDocument();
  });

  it("only reports the failure when none could be deleted", async () => {
    await ready({ ...THREE, refuseDelete: { a: { status: 500, body: {} }, b: { status: 500, body: {} }, c: { status: 500, body: {} } } }, "a.png");
    await choose("a.png", "b.png");

    await userEvent.click(within(bulkBar()).getByRole("button", { name: M("table.delete") }));
    await userEvent.click(await confirmButton());

    expect(await screen.findByText("2 ảnh xóa thất bại")).toBeInTheDocument();
    expect(screen.queryByText(/^Đã xóa \d+ ảnh$/)).not.toBeInTheDocument();
  });

});

describe("AMD-8 checking the storage", () => {
  const ping = () => screen.getByRole("button", { name: M("page.ping") });

  it("asks the BE, and tells the admin it works", async () => {
    const { calls } = await ready();

    await userEvent.click(ping());

    expect(await screen.findByText(M("toast.pingOk"))).toBeInTheDocument();
    expect(calls.pings).toBe(1);
  });

  it("tells the admin it does not work, in the BE's words or its own", async () => {
    const first = await ready({ ...ONE, ping: { status: 503, body: { message: "Bucket missing" } } });
    await userEvent.click(ping());
    expect(await screen.findByText("Bucket missing")).toBeInTheDocument();
    first.unmount();

    await ready({ ...ONE, ping: { status: 500, body: {} } });
    await userEvent.click(ping());
    expect(await screen.findByText(M("toast.pingFailed"))).toBeInTheDocument();
  });

  it("keeps the button off while the check is on its way, then turns it on again", async () => {
    await ready();

    await userEvent.click(ping());

    await waitFor(() => expect(ping()).toBeEnabled());
    expect(screen.getByText(M("toast.pingOk"))).toBeInTheDocument();
  });

  it("explains itself with a title on the button", async () => {
    await ready();

    expect(ping()).toHaveAttribute("title", M("page.pingTitle"));
  });
});

const last = <T,>(items: T[]) => items[items.length - 1];
