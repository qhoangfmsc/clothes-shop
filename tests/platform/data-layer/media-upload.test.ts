import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { uploadMediaFile } from "@/src/hooks/use-media-upload";
import { API, seedSession } from "@/tests/_support/api";
import { signInAs } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";

/* Admin upload to the BE media endpoint (flows UPL-1 and UPL-1E). */

const UPLOADED = { id: "m1", name: "a.png", mimeType: "image/png", sizeOriginal: 4, url: "https://x.supabase.co/storage/v1/object/public/media/a.png" };
const file = () => new File(["data"], "a.png", { type: "image/png" });

describe("UPL-1 an admin with every permission uploads", () => {
  it("posts the file as multipart with the token and returns the stored media", async () => {
    signInAs("adminFull");
    let seen: { auth: string | null; type: string | null; text: string } | null = null;
    server.use(
      http.post(`${API}/api/admin/media`, async ({ request }) => {
        const form = await request.formData();
        seen = { auth: request.headers.get("authorization"), type: request.headers.get("content-type"), text: await (form.get("file") as Blob).text() };
        return HttpResponse.json({ data: UPLOADED });
      })
    );

    await expect(uploadMediaFile(file())).resolves.toEqual(UPLOADED);
    expect(seen).toEqual({ auth: "Bearer test-access", type: expect.stringMatching(/^multipart\/form-data; boundary=/), text: "data" });
  });
});

describe("UPL-1E uploads that fail", () => {
  it("a guest sends no Authorization header and the 401 is thrown, not refreshed", async () => {
    let auth: string | null = "unset";
    server.use(
      http.post(`${API}/api/admin/media`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
      })
    ); // no refresh handler: MSW fails the test if one is attempted

    await expect(uploadMediaFile(file())).rejects.toMatchObject({ name: "ApiError", status: 401, message: "Unauthorized" });
    expect(auth).toBeNull();
  });

  it("an expired token is not renewed: the 401 is thrown and the tokens stay", async () => {
    seedSession({ access: "old", refresh: "r1" });
    server.use(http.post(`${API}/api/admin/media`, () => HttpResponse.json({ message: "jwt expired" }, { status: 401 })));

    await expect(uploadMediaFile(file())).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem("clothes_shop_refresh_token")).toBe("r1");
  });

  it("an admin without the permission gets the 403 from the BE", async () => {
    seedSession({ access: "limited-token" });
    server.use(http.post(`${API}/api/admin/media`, () => HttpResponse.json({ message: "Forbidden", errorCode: 403001 }, { status: 403 })));

    await expect(uploadMediaFile(file())).rejects.toMatchObject({ status: 403, message: "Forbidden", errorCode: 403001, code: "403001" });
  });

  it("carries the BE's error code, e.g. storage not configured", async () => {
    signInAs("adminFull");
    server.use(http.post(`${API}/api/admin/media`, () => HttpResponse.json({ message: "Storage off", errorCode: 1601 }, { status: 503 })));

    await expect(uploadMediaFile(file())).rejects.toMatchObject({ status: 503, errorCode: 1601 });
  });

  it("has an empty message when the BE sends none, so the UI shows its own text", async () => {
    signInAs("adminFull");
    server.use(http.post(`${API}/api/admin/media`, () => new HttpResponse("oops", { status: 500 })));

    await expect(uploadMediaFile(file())).rejects.toMatchObject({ status: 500, message: "" });
  });
});
