import { describe, expect, it } from "vitest";
import { useAddressFieldLabel, useOrderPaymentStatusLabel, useOrderStatusLabel, useRoleLabel } from "@/src/i18n/use-labels";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* Words for values the BE sends (specs/platform/i18n.md, flows I18-7 and I18-7E). */

const labels: Record<string, (value: string) => string> = {};
function Probe() {
  labels.order = useOrderStatusLabel();
  labels.payment = useOrderPaymentStatusLabel();
  labels.address = useAddressFieldLabel();
  labels.role = useRoleLabel();
  return null;
}

describe("I18-7 labels follow the language", () => {
  it.each(["vi", "en"] as const)("order status, payment status, address field and role in %s", async (locale) => {
    await renderApp(<Probe />, { locale });

    expect(labels.order("pending")).toBe(msg("common.orderStatus.pending", locale));
    expect(labels.order("completed")).toBe(msg("common.orderStatus.completed", locale));
    expect(labels.payment("paid")).toBe(msg("common.orderPaymentStatus.paid", locale));
    expect(labels.address("city")).toBe(msg("common.addressField.city", locale));
    expect(labels.role("admin")).toBe(msg("common.role.admin", locale));
  });

  it("the two languages really differ", async () => {
    await renderApp(<Probe />, { locale: "vi" });
    const vietnamese = labels.order("pending");
    await renderApp(<Probe />, { locale: "en" });

    expect(labels.order("pending")).not.toBe(vietnamese);
  });
});

describe("I18-7E values nobody has translated yet", () => {
  it("are shown as the BE sent them, so a new status still appears", async () => {
    await renderApp(<Probe />);

    expect(labels.order("awaiting_pickup")).toBe("awaiting_pickup");
    expect(labels.payment("partially_refunded")).toBe("partially_refunded");
    expect(labels.address("region")).toBe("region");
    expect(labels.role("auditor")).toBe("auditor");
  });

  it("an empty value stays empty", async () => {
    await renderApp(<Probe />);

    expect(labels.order("")).toBe("");
  });
});
