import { describe, expect, it } from "vitest";
import { buildOrderRequest, type Translate } from "@/src/app/[locale]/(public)/contact/_common/build-order-request";
import { EMPTY_ORDER_REQUEST } from "@/src/app/[locale]/(public)/contact/_common/constants";
import type { OrderRequestValues } from "@/src/app/[locale]/(public)/contact/_common/types";
import { buildMailto } from "@/src/lib/contact";
import { MESSAGES, msg } from "@/tests/_support/messages";
import { orderProduct, readMailto } from "./contact-kit";
import { createTranslator } from "next-intl";

/* The text of a custom-order request and the mailto address it travels in (specs/storefront/contact.md, flows CT-1 to CT-2E). */

const translator = (locale: "vi" | "en" = "vi"): Translate => {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "public.contact" });
  return (key, values) => t(key as never, values as never);
};
const values = (over: Partial<OrderRequestValues> = {}): OrderRequestValues => ({ ...EMPTY_ORDER_REQUEST, note: "A red silk dress", fullName: "Mai", phone: "0901234567", ...over });
const build = (over: Partial<OrderRequestValues> = {}, product = orderProduct(), locale: "vi" | "en" = "vi") =>
  buildOrderRequest(translator(locale), { product, values: values(over), formatDate: (iso) => `<${iso}>` });
const M = (key: string, locale: "vi" | "en" = "vi") => msg(`public.contact.message.${key}`, locale);

describe("CT-1 the request text", () => {
  it("opens with a greeting and the reason, and closes with thanks and the name", () => {
    const { body } = build();

    const lines = body.split("\n\n");
    expect(lines[0]).toBe(M("greeting"));
    expect(lines[1]).toBe(M("intro"));
    expect(lines.at(-1)).toBe(`${M("closing")}\nMai`);
  });

  it("names the product, its reference and its address under the product heading", () => {
    const { body } = build();

    expect(body).toContain(`${M("sections.product")}\n  ${M("labels.product")}: Silk dress\n  ${M("labels.reference")}: SKU-1\n  ${M("labels.link")}: https://doovan.test/vi/shop/tops/shirts/p1`);
  });

  it("leaves out the reference when the product has none", () => {
    const { body } = build({}, orderProduct({ sku: "" }));

    expect(body).not.toContain(M("labels.reference"));
    expect(body).toContain(M("labels.link"));
  });

  it("leaves out the whole product section when no product is meant", () => {
    const { body } = build({}, null as never);

    expect(body).not.toContain(M("sections.product"));
  });

  it("puts the wish under its heading, each line indented, trimmed", () => {
    const { body } = build({ note: "  Line one\nLine two  " });

    expect(body).toContain(`${M("sections.design")}\n  Line one\n  Line two\n\n`);
  });

  it("leaves out the design section when there is no wish", () => {
    const { body } = build({ note: "   " });

    expect(body).not.toContain(M("sections.design"));
  });

  it("lists the measurements that were given, in order, with their names, trimmed, joined by dots", () => {
    const { body } = build({ measurements: { height: " 165 ", bust: " 88", waist: "66", hips: "90" } });

    expect(body).toContain(`${M("labels.measurements")}: ${M("measurements.height")} 165 · ${M("measurements.bust")} 88 · ${M("measurements.waist")} 66 · ${M("measurements.hips")} 90`);
  });

  it("leaves out a measurement that is only spaces", () => {
    const { body } = build({ measurements: { height: "165", bust: "   ", waist: "", hips: "" } });

    expect(body).toContain(`${M("labels.measurements")}: ${M("measurements.height")} 165\n`);
    expect(body).not.toContain(M("measurements.bust"));
  });

  it("leaves out the measurements row when none was given", () => {
    const { body } = build();

    expect(body).not.toContain(M("labels.measurements"));
  });

  it("gives the weight when it was written, and always the quantity", () => {
    const { body } = build({ weight: " 54 ", quantity: 3 });

    expect(body).toContain(`  ${M("labels.weight")}: 54`);
    expect(body).toContain(`  ${M("labels.quantity")}: 3`);
    expect(build().body).not.toContain(M("labels.weight"));
    expect(build().body).toContain(`  ${M("labels.quantity")}: 1`);
  });

  it("gives the date the order is needed by, written in the visitor's way, only when one was chosen", () => {
    expect(build({ neededBy: "2026-12-24" }).body).toContain(`  ${M("labels.neededBy")}: <2026-12-24>`);
    expect(build().body).not.toContain(M("labels.neededBy"));
  });

  it("gives the name and the phone under the contact heading, trimmed, each only when written", () => {
    const { body } = build({ fullName: " Mai ", phone: " 0901 234 567 " });

    expect(body).toContain(`${M("sections.contact")}\n  ${M("labels.name")}: Mai\n  ${M("labels.phone")}: 0901 234 567`);
    const without = build({ fullName: "", phone: "" }).body;
    expect(without).not.toContain(M("sections.contact"));
    expect(without.endsWith(M("closing"))).toBe(true);
  });

  it("separates the sections with a blank line", () => {
    const { body } = build({ neededBy: "2026-12-24", weight: "54" });

    expect(body.split("\n\n")).toHaveLength(7);
  });

  it("is in English for the English site", () => {
    const { subject, body } = build({}, orderProduct(), "en");

    expect(subject).toBe(msg("public.contact.message.subject", "en").replace("{product}", "Silk dress"));
    expect(body.startsWith(M("greeting", "en"))).toBe(true);
  });
});

describe("CT-1 the subject", () => {
  it("names the product when there is one", () => {
    expect(build().subject).toBe(M("subject").replace("{product}", "Silk dress"));
  });

  it("is the general one when there is none", () => {
    expect(build({}, null as never).subject).toBe(M("subjectGeneric"));
  });
});

describe("CT-2 the mail address", () => {
  it("is the shop's inbox with nothing else when there is no subject or text", () => {
    expect(buildMailto()).toBe("mailto:contact@doovan.vn");
  });

  it("carries the subject and the text, with %20 for spaces and not +", () => {
    const href = buildMailto("Hello there", "Line one\nLine two");

    expect(href).toContain("subject=Hello%20there");
    expect(href).not.toContain("+");
    expect(readMailto(href)).toEqual({ address: "contact@doovan.vn", subject: "Hello there", body: "Line one\nLine two" });
  });

  it("carries only the subject, or only the text, when only that is given", () => {
    expect(buildMailto("Hi")).toBe("mailto:contact@doovan.vn?subject=Hi");
    expect(buildMailto(undefined, "Body")).toBe("mailto:contact@doovan.vn?body=Body");
    expect(buildMailto("", "")).toBe("mailto:contact@doovan.vn");
  });

  it("keeps a plus sign of the text as a plus sign", () => {
    expect(buildMailto("A+B")).toContain("subject=A%2BB");
  });
});
