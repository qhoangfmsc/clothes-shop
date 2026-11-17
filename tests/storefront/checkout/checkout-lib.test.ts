import { describe, expect, it } from "vitest";
import {
  EXTRA_FIELDS,
  INITIAL_ADDRESS,
  PICKUP_FIELDS,
  REQUIRED_FIELDS,
  fieldId,
  isRequiredField,
  resolveCartItemIds,
  validateAddress,
  type AddressForm,
} from "@/src/app/[locale]/(private)/checkout/_common/checkout";
import { PAYMENT_POLL_INTERVAL_MS, isSafeQrUrl, normalizePaymentStatus } from "@/src/app/[locale]/(private)/checkout/_common/payment";
import { cartLine } from "@/tests/_support/fixtures";

/* Address rules and payment helpers, with no screen (specs/storefront/checkout.md, flows CHK-1 to CHK-2E). */

const FILLED: AddressForm = { ...INITIAL_ADDRESS, fullName: "Mai", phone: "0901234567", addressLine1: "1 Le Loi", city: "Ho Chi Minh" };

describe("CHK-1 checking the address", () => {
  it("accepts a delivery address with the four required fields", () => {
    expect(validateAddress(FILLED, false)).toEqual({});
  });

  it("does not need the optional fields: second line, province, postal code, notes", () => {
    expect(validateAddress({ ...FILLED, addressLine2: "", province: "", postalCode: "", notes: "" }, false)).toEqual({});
  });

  it("accepts a pick-up with only a name and a phone", () => {
    expect(validateAddress({ ...INITIAL_ADDRESS, fullName: "Mai", phone: "0901234567" }, true)).toEqual({});
  });

  it("starts with the country filled in as Vietnam and everything else empty", () => {
    expect(INITIAL_ADDRESS).toEqual({ fullName: "", phone: "", addressLine1: "", addressLine2: "", city: "", province: "", postalCode: "", country: "Vietnam", notes: "" });
  });

  it("knows which fields are required, which are pick-up fields and which hide behind 'more details'", () => {
    expect(REQUIRED_FIELDS).toEqual(["fullName", "phone", "addressLine1", "city"]);
    expect(PICKUP_FIELDS).toEqual(["fullName", "phone"]);
    expect(EXTRA_FIELDS).toEqual(["addressLine2", "postalCode", "country"]);
    expect(isRequiredField("city")).toBe(true);
    expect(isRequiredField("province")).toBe(false);
    expect(fieldId("addressLine1")).toBe("checkout-addressLine1");
  });
});

describe("CHK-1E an address that is not complete", () => {
  it("names every missing required field, and only those", () => {
    expect(validateAddress({ ...FILLED, phone: "", city: "" }, false)).toEqual({ phone: true, city: true });
    expect(validateAddress(INITIAL_ADDRESS, false)).toEqual({ fullName: true, phone: true, addressLine1: true, city: true });
  });

  it("counts a field with only spaces as empty", () => {
    expect(validateAddress({ ...FILLED, fullName: "   ", addressLine1: "\t " }, false)).toEqual({ fullName: true, addressLine1: true });
  });

  it("for a pick-up asks only for name and phone, whatever is in the address fields", () => {
    expect(validateAddress(INITIAL_ADDRESS, true)).toEqual({ fullName: true, phone: true });
    expect(validateAddress({ ...INITIAL_ADDRESS, fullName: "Mai", phone: " " }, true)).toEqual({ phone: true });
  });
});

describe("CHK-1 matching bag lines to the BE cart", () => {
  const server = [cartLine({ productId: "a", serverItemId: "srv-a" }), cartLine({ productId: "b", serverItemId: "srv-b" }), cartLine({ productId: "c", serverItemId: "srv-c" })];

  it("gives the BE's id of each reviewed line, in the BE's order", () => {
    const reviewed = [cartLine({ productId: "c" }), cartLine({ productId: "a" })];

    expect(resolveCartItemIds(server, reviewed)).toEqual(["srv-a", "srv-c"]);
  });

  it("tells a size or colour apart: the same product in another size is another line", () => {
    const reviewed = [cartLine({ productId: "a", size: "L" })];

    expect(resolveCartItemIds(server, reviewed)).toBeNull();
  });

  it("gives an empty list for nothing reviewed", () => {
    expect(resolveCartItemIds(server, [])).toEqual([]);
  });
});

describe("CHK-1E bag lines the BE does not have", () => {
  it("returns null when a reviewed line is missing from the BE cart", () => {
    const server = [cartLine({ productId: "a", serverItemId: "srv-a" })];

    expect(resolveCartItemIds(server, [cartLine({ productId: "a" }), cartLine({ productId: "gone" })])).toBeNull();
  });

  it("returns null when the BE line has no id", () => {
    expect(resolveCartItemIds([cartLine({ productId: "a" })], [cartLine({ productId: "a" })])).toBeNull();
  });

  it("returns null for an empty BE cart", () => {
    expect(resolveCartItemIds([], [cartLine()])).toBeNull();
  });
});

describe("CHK-2 payment helpers", () => {
  it.each([
    ["PENDING", "PENDING"],
    ["PAID", "PAID"],
    ["EXPIRED", "EXPIRED"],
    ["CANCELLED", "CANCELLED"],
    ["paid", "PAID"],
    ["Expired", "EXPIRED"],
    ["cancelled", "CANCELLED"],
  ])("reads %s as %s", (raw, expected) => {
    expect(normalizePaymentStatus(raw)).toBe(expected);
  });

  it("asks the BE every three seconds", () => {
    expect(PAYMENT_POLL_INTERVAL_MS).toBe(3000);
  });

  it.each([
    "https://img.vietqr.io/image/970436-0123-compact.png?amount=380000",
    "HTTPS://IMG.VIETQR.IO/x.png",
    "data:image/png;base64,iVBORw0KGgo=",
    "data:image/jpeg;base64,/9j/4AAQ",
    "data:image/jpg;base64,/9j/4AAQ",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/webp;base64,UklGR",
  ])("accepts the QR address %s", (url) => {
    expect(isSafeQrUrl(url)).toBe(true);
  });
});

describe("CHK-2E payment values that cannot be trusted", () => {
  it.each([["PROCESSING"], ["succeeded"], [""], [null], [undefined], [42], [{}]])("reads %o as still waiting, never as paid", (raw) => {
    expect(normalizePaymentStatus(raw)).toBe("PENDING");
  });

  it.each([
    ["a plain http address", "http://img.vietqr.io/x.png"],
    ["a script", "javascript:alert(1)"],
    ["an HTML page", "data:text/html;base64,PGgxPg=="],
    ["an image type that is not allowed", "data:image/gif;base64,R0lGOD"],
    ["a data image with no encoding part", "data:image/png,abc"],
    ["a protocol-less address", "//img.vietqr.io/x.png"],
    ["an empty address", ""],
    ["an https address that does not start the text", " https://img.vietqr.io/x.png"],
  ])("refuses %s", (_what, url) => {
    expect(isSafeQrUrl(url)).toBe(false);
  });
});
