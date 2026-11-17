import { describe, expect, it } from "vitest";
import { errorCodeOf, errorMessage, errorText } from "@/src/i18n/error-message";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* Turning a caught error into text (specs/platform/i18n.md, flows I18-6 and I18-6E). */

let toText: ReturnType<typeof useErrorMessage>;
function Probe() {
  toText = useErrorMessage();
  return null;
}

describe("I18-6 the error codes the BE sends", () => {
  it.each(["vi", "en"] as const)("a known numeric errorCode gets its translation in %s", async (locale) => {
    await renderApp(<Probe />, { locale });

    expect(toText({ errorCode: 1001, message: "server text" }, "fallback")).toBe(msg("shared.errors.byCode.1001", locale));
  });

  it("reads the code from `code` (a numeric string), which is what survives Redux's error serializer", async () => {
    await renderApp(<Probe />);

    expect(toText({ code: "1101", message: "server text" }, "fallback")).toBe(msg("shared.errors.byCode.1101"));
  });

  it("works on a real Error that carries the code", async () => {
    await renderApp(<Probe />);
    const error = Object.assign(new Error("server text"), { errorCode: 1303 });

    expect(toText(error, "fallback")).toBe(msg("shared.errors.byCode.1303"));
  });

  it("the plain-code helpers read the shapes the app throws", () => {
    expect(errorCodeOf({ errorCode: 1001 })).toBe(1001);
    expect(errorCodeOf({ code: "1601" })).toBe(1601);
    expect(errorText({ message: "hello" })).toBe("hello");
    expect(errorText(new Error("boom"))).toBe("boom");
  });
});

describe("I18-6E errors without a known code", () => {
  it("shows the server's own text when the code has no translation", async () => {
    await renderApp(<Probe />);

    expect(toText({ errorCode: 77777, message: "Server says no" }, "fallback")).toBe("Server says no");
  });

  it("shows the translated fallback when there is no code and no text", async () => {
    await renderApp(<Probe />);

    expect(toText(new Error(""), "Đã có lỗi")).toBe("Đã có lỗi");
    expect(toText({}, "Đã có lỗi")).toBe("Đã có lỗi");
  });

  it("shows the translated fallback, not the browser's own words, when the network is gone", async () => {
    await renderApp(<Probe />);

    expect(toText(new TypeError("Failed to fetch"), "Đã có lỗi")).toBe("Đã có lỗi");
    expect(toText({ name: "TypeError", message: "Failed to fetch" }, "Đã có lỗi")).toBe("Đã có lỗi");
    expect(toText(Object.assign(new TypeError("Failed to fetch"), { errorCode: 1303 }), "Đã có lỗi")).toBe(msg("shared.errors.byCode.1303"));
  });

  it.each([null, undefined, "plain string", 42, true])("shows the fallback for %j, which is not an error object", async (thing) => {
    await renderApp(<Probe />);

    expect(toText(thing, "fallback")).toBe("fallback");
  });

  it("a code that is not a whole number is ignored", async () => {
    await renderApp(<Probe />);

    expect(errorCodeOf({ errorCode: "1001" })).toBeUndefined();
    expect(errorCodeOf({ code: "12.5" })).toBeUndefined();
    expect(errorCodeOf({ code: "abc" })).toBeUndefined();
    expect(errorCodeOf({})).toBeUndefined();
    expect(errorCodeOf(null)).toBeUndefined();
    expect(errorCodeOf("1001")).toBeUndefined();
    expect(toText({ errorCode: "1001", message: "text" }, "fallback")).toBe("text");
  });

  it("a message that is not a string is ignored", () => {
    expect(errorText({ message: 5 })).toBe("");
    expect(errorText(new TypeError("Failed to fetch"))).toBe("");
    expect(errorText({ name: "TypeError", message: "Failed to fetch" })).toBe("");
    expect(errorText(new Error("boom"))).toBe("boom");
    expect(errorText(null)).toBe("");
    expect(errorText("text")).toBe("");
  });

  it("the older helper trusts only a real Error with a message", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(errorMessage(new Error(""), "fallback")).toBe("fallback");
    expect(errorMessage({ message: "plain object" }, "fallback")).toBe("fallback");
  });

  it("the returned function stays the same between renders and changes with the language", async () => {
    const vi1 = await renderApp(<Probe />, { locale: "vi" });
    const first = toText;
    vi1.rerender(<Probe />);
    expect(toText).toBe(first);
    vi1.unmount();

    await renderApp(<Probe />, { locale: "en" });
    expect(toText).not.toBe(first);
  });
});
