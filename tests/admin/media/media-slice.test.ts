import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadMediaFile } from "@/src/app/[locale]/(admin)/admin/media/_common/download";
import { MEDIA_NOT_CONFIGURED_CODE, MEDIA_SORT_OPTIONS } from "@/src/app/[locale]/(admin)/admin/media/_common/constants";
import { clearError, deleteMediaFile, deleteMediaFiles, fetchMediaList, pingMedia } from "@/src/app/[locale]/(admin)/admin/media/_common/moduleSlice";
import { makeStore } from "@/src/store";
import { mediaApi, mediaFile } from "./media-kit";

/* The media store, the save-to-disk helper and the constants (specs/admin/media.md, flows AMD-9 and AMD-10). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().media;

describe("AMD-9 the media store", () => {
  it("asks with the search, sort and page it was given and keeps the list and the total", async () => {
    const calls = mediaApi({ pages: [{ data: [mediaFile()], total: 4 }] });
    const store = makeStore();

    await store.dispatch(fetchMediaList({ search: "pho", sort: "-size", page: 1, limit: 25 }));

    expect(Object.fromEntries(calls.lists[0])).toEqual({ search: "pho", sort: "-size", limit: "25" });
    expect(state(store)).toMatchObject({ items: [expect.objectContaining({ id: "m-1" })], total: 4, page: 1, limit: 25, isListLoading: false });
  });

  it("is loading while it waits", async () => {
    mediaApi({ pages: [{ data: [], total: 0 }] });
    const store = makeStore();

    const pending = store.dispatch(fetchMediaList({ page: 1, limit: 25 }));
    expect(state(store).isListLoading).toBe(true);
    await pending;

    expect(state(store).isListLoading).toBe(false);
  });

  it("rejects with the BE's words and code, and remembers the words, which the page can clear", async () => {
    mediaApi({ failListFrom: 1, listRefusal: { status: 503, body: { message: "no storage", errorCode: MEDIA_NOT_CONFIGURED_CODE } } });
    const store = makeStore();

    const result = await store.dispatch(fetchMediaList({ page: 1, limit: 25 }));

    expect(result.payload).toEqual({ message: "no storage", errorCode: 1601 });
    expect(state(store).error).toBe("no storage");
    expect(state(store).isListLoading).toBe(false);
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("falls back to the plain error text when the BE gave no words", async () => {
    mediaApi({ failListFrom: 1, listRefusal: { status: 500, body: {} } });
    const store = makeStore();

    const result = await store.dispatch(fetchMediaList({ page: 1, limit: 25 }));

    expect(result.payload).toEqual({ message: "", errorCode: undefined });
    expect(state(store).error).toBeTruthy();
  });

  it("turns an error that is not from the BE into its text", async () => {
    mediaApi();
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const store = makeStore();

    const result = await store.dispatch(fetchMediaList({ page: 1, limit: 25 }));
    spy.mockRestore();

    expect(result.payload).toEqual({ message: "Failed to fetch" });
  });

  it("deletes one file by its id, and gives back the id", async () => {
    const calls = mediaApi();
    const store = makeStore();

    const result = await store.dispatch(deleteMediaFile("m-9"));

    expect(calls.deletes).toEqual(["m-9"]);
    expect(result.payload).toBe("m-9");
    expect(state(store).isDeleting).toBe(false);
  });

  it("is busy only while a delete waits, and keeps the words when refused, forgetting them on the next try", async () => {
    mediaApi({ refuseDelete: { "m-1": { status: 409, body: { message: "In use" } } } });
    const store = makeStore();

    const pending = store.dispatch(deleteMediaFile("m-1"));
    expect(state(store).isDeleting).toBe(true);
    const result = await pending;
    expect(state(store).isDeleting).toBe(false);
    expect(result.payload).toEqual({ message: "In use", errorCode: undefined });
    expect(state(store).error).toBe("In use");

    const again = store.dispatch(deleteMediaFile("m-2"));
    expect(state(store).error).toBeNull();
    await again;
  });

  it("deletes many and counts how many worked and how many did not, without rejecting", async () => {
    const calls = mediaApi({ refuseDelete: { b: { status: 500, body: {} } } });
    const store = makeStore();

    const pending = store.dispatch(deleteMediaFiles(["a", "b", "c"]));
    expect(state(store).isDeleting).toBe(true);
    const result = await pending;

    expect(result.payload).toEqual({ succeeded: 2, failed: 1 });
    expect(calls.deletes.sort()).toEqual(["a", "b", "c"]);
    expect(state(store).isDeleting).toBe(false);
    expect(state(store).error).toBeNull();
  });

  it("pings the storage, busy only while it waits, and rejects with the words when it fails", async () => {
    const calls = mediaApi({ ping: { status: 503, body: { message: "Bucket missing", errorCode: 1601 } } });
    const store = makeStore();

    const pending = store.dispatch(pingMedia());
    expect(state(store).isPinging).toBe(true);
    const result = await pending;

    expect(calls.pings).toBe(1);
    expect(result.payload).toEqual({ message: "Bucket missing", errorCode: 1601 });
    expect(state(store).isPinging).toBe(false);

    mediaApi();
    expect((await store.dispatch(pingMedia())).type).toBe("media/ping/fulfilled");
    expect(state(store).isPinging).toBe(false);
  });

  it("starts empty with the shared page size", () => {
    expect(state(makeStore())).toMatchObject({ items: [], total: 0, page: 1, limit: 25, isListLoading: false, isPinging: false, isDeleting: false });
  });
});

describe("AMD-10 saving a file to disk", () => {
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let clicked: HTMLAnchorElement[];

  beforeEach(() => {
    clicked = [];
    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
      expect(document.body.contains(this)).toBe(true);
    });
  });

  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    vi.restoreAllMocks();
  });

  it("fetches the file through the media address and clicks a link that downloads it under its name", async () => {
    const calls = mediaApi();

    await downloadMediaFile({ name: "my photo.png", url: "https://x.supabase.co/storage/v1/object/public/media/photo.png" });

    expect(calls.downloads).toEqual(["photo.png"]);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("my photo.png");
    expect(clicked[0].href).toBe("blob:fake");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect(document.body.contains(clicked[0])).toBe(false);
  });

  it("throws and saves nothing when the file cannot be fetched", async () => {
    mediaApi({ download: 404 });

    await expect(downloadMediaFile({ name: "a.png", url: "https://x.supabase.co/storage/v1/object/public/media/a.png" })).rejects.toThrow();

    expect(clicked).toEqual([]);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("AMD-9 the constants", () => {
  it("knows the BE code for storage that is not set up, and six ways to sort", () => {
    expect(MEDIA_NOT_CONFIGURED_CODE).toBe(1601);
    expect(MEDIA_SORT_OPTIONS.map((o) => o.value)).toEqual(["-createdAt", "createdAt", "name", "-name", "-size", "size"]);
  });
});
