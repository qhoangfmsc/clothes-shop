import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "@/src/lib/api";

/* ERR-1 and ERR-2: how a failed BE response becomes an ApiError. Spec: specs/platform/data-layer.md. */

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("ERR-1 toApiError", () => {
  it("copies message, status and the BE error code", async () => {
    const error = await toApiError(json({ message: "Storage off", errorCode: 1601 }, 503));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Storage off", status: 503, errorCode: 1601, code: "1601", name: "ApiError" });
  });

  it("leaves code undefined when the BE sends no error code", async () => {
    const error = await toApiError(json({ message: "nope" }, 400));

    expect(error.errorCode).toBeUndefined();
    expect(error.code).toBeUndefined();
  });
});

describe("ERR-2 fallbacks", () => {
  it("uses a status message when the body has no message", async () => {
    expect((await toApiError(json({}, 500))).message).toBe("API error: 500");
  });

  it("uses a status message when the body is not JSON", async () => {
    expect((await toApiError(new Response("<html>bad gateway</html>", { status: 502 }))).message).toBe("API error: 502");
  });

  it("treats an empty message like a missing one", async () => {
    expect((await toApiError(json({ message: "" }, 404))).message).toBe("API error: 404");
  });
});
