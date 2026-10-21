import { describe, expect, it } from "vitest";
import { mapMediaUrls, toMediaUrl } from "@/src/lib/media-url";

/* Hides the Supabase address behind the same-origin /media proxy (flows MED-1 and MED-1E). */

const STORAGE = "https://abc.supabase.co/storage/v1/object/public/media";

describe("MED-1 toMediaUrl", () => {
  it.each([
    [`${STORAGE}/products/a.jpg`, "/media/products/a.jpg"],
    [`${STORAGE}/a.jpg`, "/media/a.jpg"],
    [`${STORAGE}/deep/path/to/b.png`, "/media/deep/path/to/b.png"],
    [`http://abc.supabase.co/storage/v1/object/public/other-bucket/c.webp`, "/media/c.webp"],
    [`${STORAGE}/with%20space.jpg`, "/media/with%20space.jpg"],
  ])("%s becomes %s", (url, mapped) => {
    expect(toMediaUrl(url)).toBe(mapped);
  });

  it("drops the host and the bucket, so neither reaches the page", () => {
    expect(toMediaUrl(`${STORAGE}/a.jpg`)).not.toContain("supabase");
    expect(toMediaUrl(`${STORAGE}/a.jpg`)).not.toContain("/media/media");
  });
});

describe("MED-1 mapMediaUrls", () => {
  it("maps every string of a payload, in objects and arrays at any depth", () => {
    const payload = {
      data: [{ id: "1", images: [`${STORAGE}/a.jpg`, `${STORAGE}/b.jpg`], category: { heroImage: `${STORAGE}/h.jpg` } }],
      total: 1,
    };

    expect(mapMediaUrls(payload)).toEqual({
      data: [{ id: "1", images: ["/media/a.jpg", "/media/b.jpg"], category: { heroImage: "/media/h.jpg" } }],
      total: 1,
    });
  });

  it("maps a bare string and a bare array", () => {
    expect(mapMediaUrls(`${STORAGE}/a.jpg`)).toBe("/media/a.jpg");
    expect(mapMediaUrls([`${STORAGE}/a.jpg`, "text"])).toEqual(["/media/a.jpg", "text"]);
  });

  it("returns new objects and leaves the input untouched", () => {
    const input = { image: `${STORAGE}/a.jpg` };

    const output = mapMediaUrls(input);

    expect(output).not.toBe(input);
    expect(input.image).toBe(`${STORAGE}/a.jpg`);
  });
});

describe("MED-1E things that are not Supabase images", () => {
  it.each([
    ["https://cdn.example.com/a.jpg"],
    ["/media/already-mapped.jpg"],
    ["/assets/local.png"],
    ["data:image/png;base64,AAAA"],
    ["blob:http://localhost/1234"],
    [`${STORAGE}/`],
    ["https://abc.supabase.co/storage/v1/object/sign/media/a.jpg"],
    ["not a url"],
    [""],
  ])("%j is returned as it is", (value) => {
    expect(toMediaUrl(value)).toBe(value);
  });

  it.each([null, undefined])("%s stays %s", (value) => {
    expect(toMediaUrl(value)).toBe(value);
  });

  it("leaves numbers, booleans and null inside a payload alone", () => {
    expect(mapMediaUrls({ n: 3, b: false, z: null, u: undefined, list: [1, true, null] })).toEqual({ n: 3, b: false, z: null, u: undefined, list: [1, true, null] });
  });

  it("copes with an empty object and an empty array", () => {
    expect(mapMediaUrls({})).toEqual({});
    expect(mapMediaUrls([])).toEqual([]);
  });
});
