import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_STATUS_TRANSITIONS, getSelectableOrderStatuses } from "@/src/types/enums";
import { resolveBannerImage } from "@/src/types/site-config";

/* The few types that carry logic (flows ENU-1 and ENU-1E). */

describe("ENU-1 order status moves", () => {
  it("allows exactly the documented transitions", () => {
    expect(ORDER_STATUS_TRANSITIONS).toEqual({
      pending: ["confirmed", "cancelled"],
      confirmed: ["shipping", "cancelled"],
      shipping: ["delivered"],
      delivered: ["completed"],
      completed: [],
      cancelled: [],
    });
  });

  it("covers every status", () => {
    expect(Object.keys(ORDER_STATUS_TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort());
  });

  it("offers the current status first, then where it can go", () => {
    expect(getSelectableOrderStatuses("pending")).toEqual(["pending", "confirmed", "cancelled"]);
    expect(getSelectableOrderStatuses("shipping")).toEqual(["shipping", "delivered"]);
  });

  it("a final status offers only itself", () => {
    expect(getSelectableOrderStatuses("completed")).toEqual(["completed"]);
    expect(getSelectableOrderStatuses("cancelled")).toEqual(["cancelled"]);
  });

  it("never lets an order jump back or skip a step", () => {
    expect(ORDER_STATUS_TRANSITIONS.shipping).not.toContain("pending");
    expect(ORDER_STATUS_TRANSITIONS.pending).not.toContain("shipping");
    expect(ORDER_STATUS_TRANSITIONS.delivered).not.toContain("cancelled");
  });
});

describe("ENU-1E a status the FE does not know", () => {
  it("offers only itself, so a status added on the BE later still renders", () => {
    expect(getSelectableOrderStatuses("refunded")).toEqual(["refunded"]);
    expect(getSelectableOrderStatuses("")).toEqual([""]);
  });
});

describe("ENU-1 banner image per screen", () => {
  const banner = { image: "desktop.jpg", responsiveImages: { mobile: "mobile.jpg", tablet: "tablet.jpg" } };

  it("desktop always uses the main image", () => {
    expect(resolveBannerImage(banner, "desktop")).toBe("desktop.jpg");
  });

  it("mobile and tablet use their own image", () => {
    expect(resolveBannerImage(banner, "mobile")).toBe("mobile.jpg");
    expect(resolveBannerImage(banner, "tablet")).toBe("tablet.jpg");
  });
});

describe("ENU-1E banners without every image", () => {
  it("mobile falls back to the tablet image, then to the main image", () => {
    expect(resolveBannerImage({ image: "d.jpg", responsiveImages: { tablet: "t.jpg" } }, "mobile")).toBe("t.jpg");
    expect(resolveBannerImage({ image: "d.jpg", responsiveImages: {} }, "mobile")).toBe("d.jpg");
  });

  it("tablet falls back to the main image, never to the mobile one", () => {
    expect(resolveBannerImage({ image: "d.jpg", responsiveImages: { mobile: "m.jpg" } }, "tablet")).toBe("d.jpg");
  });

  it("a banner with no overrides always shows the main image", () => {
    expect(resolveBannerImage({ image: "d.jpg" }, "mobile")).toBe("d.jpg");
    expect(resolveBannerImage({ image: "d.jpg" }, "tablet")).toBe("d.jpg");
  });
});
