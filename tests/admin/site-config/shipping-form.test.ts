import { describe, expect, it } from "vitest";
import {
  SHIPPING_LIMITS,
  parseShippingValue,
  serializeShippingForm,
  shippingInfoToForm,
  validateShippingForm,
  type ShippingConfigForm,
} from "@/src/app/[locale]/(admin)/admin/site-config/_types/shipping/shipping-form";
import { shippingInfo } from "@/tests/_support/fixtures";

/* The shipping form model: reading, checking and writing the config (specs/admin/site-config.md, flow ASC-6). */

const stored = {
  freeShippingThresholdVnd: 1_500_000,
  methods: [
    { id: "standard", name: "Standard", description: "Usual", estimatedDays: "3-5 days", priceVnd: 30_000, icon: "truck" },
    { id: "express", name: "Express", description: "", estimatedDays: "1-2 days", priceVnd: 60_000, icon: "express" },
    { id: "store-pickup", name: "Pickup", description: "", estimatedDays: "Today", priceVnd: 0, icon: "store" },
  ],
  returnPolicy: { days: 14, description: "Two weeks", conditions: ["Unworn", "With tags"] },
};
const form = (over: Partial<ShippingConfigForm> = {}): ShippingConfigForm => ({ ...parseShippingValue(JSON.stringify(stored))!, ...over });
const withMethod = (index: number, patch: Record<string, string>) => {
  const base = form();
  return { ...base, methods: base.methods.map((m, i) => (i === index ? { ...m, ...patch } : m)) };
};
const withReturn = (patch: Record<string, string>) => {
  const base = form();
  return { ...base, returnPolicy: { ...base.returnPolicy!, ...patch } };
};

describe("ASC-6 reading a saved config", () => {
  it("turns the stored text into form fields: money grouped with dots, conditions one to a line", () => {
    const parsed = parseShippingValue(JSON.stringify(stored))!;

    expect(parsed.threshold).toBe("1.500.000");
    expect(parsed.methods.map((m) => [m.id, m.name, m.price, m.icon])).toEqual([["standard", "Standard", "30.000", "truck"], ["express", "Express", "60.000", "express"], ["store-pickup", "Pickup", "0", "store"]]);
    expect(parsed.returnPolicy).toEqual({ days: "14", description: "Two weeks", conditions: "Unworn\nWith tags" });
  });

  it("leaves the threshold empty when it is null, and the return policy unknown when absent", () => {
    const parsed = parseShippingValue(JSON.stringify({ ...stored, freeShippingThresholdVnd: null, returnPolicy: undefined }))!;

    expect(parsed.threshold).toBe("");
    expect(parsed.returnPolicy).toBeNull();
  });

  it.each([
    ["nothing", undefined],
    ["an empty text", ""],
    ["text that is not JSON", "{oops"],
    ["JSON that is not an object", "[1]"],
    ["a config without methods", JSON.stringify({ freeShippingThresholdVnd: null })],
    ["a config missing a method", JSON.stringify({ methods: stored.methods.slice(0, 2) })],
    ["a method with an unknown icon", JSON.stringify({ methods: stored.methods.map((m) => ({ ...m, icon: "rocket" })) })],
  ])("gives no form for %s", (_label, value) => {
    expect(parseShippingValue(value)).toBeNull();
  });

  it("reads a method in any order, and takes text it cannot read as empty and money it cannot read as empty", () => {
    const messy = { methods: [{ id: "store-pickup", name: 5, description: null, estimatedDays: undefined, priceVnd: 1.5, icon: "store" }, stored.methods[1], stored.methods[0]], returnPolicy: { days: "x", description: 3, conditions: ["ok", 7] } };

    const parsed = parseShippingValue(JSON.stringify(messy))!;

    expect(parsed.methods.map((m) => m.id)).toEqual(["standard", "express", "store-pickup"]);
    expect(parsed.methods[2]).toMatchObject({ name: "", description: "", estimatedDays: "", price: "" });
    expect(parsed.returnPolicy).toEqual({ days: "", description: "", conditions: "ok" });
  });

  it("builds the form from what customers currently get", () => {
    const built = shippingInfoToForm(shippingInfo({ freeShippingThresholdVnd: 2_000_000, returnPolicy: { days: 7, description: "Week", conditions: ["Unworn"] } }))!;

    expect(built.threshold).toBe("2.000.000");
    expect(built.methods[0]).toMatchObject({ id: "standard", name: "Giao tiêu chuẩn", price: "30.000" });
    expect(built.returnPolicy).toEqual({ days: "7", description: "Week", conditions: "Unworn" });
    expect(shippingInfoToForm(null)).toBeNull();
  });
});

describe("ASC-6 checking the form", () => {
  it("accepts a good form, and a form without a free-shipping threshold or return policy", () => {
    expect(validateShippingForm(form())).toEqual({});
    expect(validateShippingForm(form({ threshold: "", returnPolicy: null }))).toEqual({});
  });

  it.each([
    ["letters", "abc", { kind: "number" }],
    ["a decimal", "1,5", { kind: "number" }],
    ["zero", "0", { kind: "positive" }],
    ["more than a billion", "1.000.000.001", { kind: "tooBig" }],
  ])("refuses a threshold of %s", (_label, threshold, error) => {
    expect(validateShippingForm(form({ threshold })).threshold).toEqual(error);
  });

  it("accepts a threshold of exactly a billion", () => {
    expect(validateShippingForm(form({ threshold: "1.000.000.000" })).threshold).toBeUndefined();
  });

  it("asks for a name and the delivery time, trimmed, up to 100 letters", () => {
    expect(validateShippingForm(withMethod(0, { name: "  " }))["standard.name"]).toEqual({ kind: "required" });
    expect(validateShippingForm(withMethod(1, { estimatedDays: "" }))["express.estimatedDays"]).toEqual({ kind: "required" });
    expect(validateShippingForm(withMethod(0, { name: "a".repeat(101) }))["standard.name"]).toEqual({ kind: "tooLong", max: 100 });
    expect(validateShippingForm(withMethod(0, { name: "a".repeat(100) }))["standard.name"]).toBeUndefined();
    expect(validateShippingForm(withMethod(1, { estimatedDays: "a".repeat(101) }))["express.estimatedDays"]).toEqual({ kind: "tooLong", max: 100 });
  });

  it("lets the description be empty and limits it to 255 letters", () => {
    expect(validateShippingForm(withMethod(2, { description: "" }))["store-pickup.description"]).toBeUndefined();
    expect(validateShippingForm(withMethod(2, { description: "a".repeat(256) }))["store-pickup.description"]).toEqual({ kind: "tooLong", max: 255 });
    expect(validateShippingForm(withMethod(2, { description: "a".repeat(255) }))["store-pickup.description"]).toBeUndefined();
  });

  it("takes a price from zero (free) to a billion, whole dong only", () => {
    expect(validateShippingForm(withMethod(0, { price: "0" }))["standard.price"]).toBeUndefined();
    expect(validateShippingForm(withMethod(0, { price: "" }))["standard.price"]).toEqual({ kind: "number" });
    expect(validateShippingForm(withMethod(0, { price: "12x" }))["standard.price"]).toEqual({ kind: "number" });
    expect(validateShippingForm(withMethod(0, { price: "1.000.000.001" }))["standard.price"]).toEqual({ kind: "tooBig" });
    expect(validateShippingForm(withMethod(0, { price: "1.000.000.000" }))["standard.price"]).toBeUndefined();
  });

  it("asks for a return window of 1 to 365 whole days", () => {
    for (const days of ["", "x", "1.5", "-3"]) expect(validateShippingForm(withReturn({ days }))["returnPolicy.days"], days).toEqual({ kind: "number" });
    for (const days of ["0", "366"]) expect(validateShippingForm(withReturn({ days }))["returnPolicy.days"], days).toEqual({ kind: "range", max: 365 });
    for (const days of ["1", "365", " 30 "]) expect(validateShippingForm(withReturn({ days }))["returnPolicy.days"], days).toBeUndefined();
  });

  it("limits the return description to 500 letters and allows it empty", () => {
    expect(validateShippingForm(withReturn({ description: "" }))["returnPolicy.description"]).toBeUndefined();
    expect(validateShippingForm(withReturn({ description: "a".repeat(501) }))["returnPolicy.description"]).toEqual({ kind: "tooLong", max: 500 });
    expect(validateShippingForm(withReturn({ description: "a".repeat(500) }))["returnPolicy.description"]).toBeUndefined();
  });

  it("allows at most ten conditions, blank lines not counted, each up to 255 letters", () => {
    const lines = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`).join("\n");
    expect(validateShippingForm(withReturn({ conditions: lines(11) }))["returnPolicy.conditions"]).toEqual({ kind: "tooMany", max: 10 });
    expect(validateShippingForm(withReturn({ conditions: lines(10) }))["returnPolicy.conditions"]).toBeUndefined();
    expect(validateShippingForm(withReturn({ conditions: `${lines(10)}\n\n  \n` }))["returnPolicy.conditions"]).toBeUndefined();
    expect(validateShippingForm(withReturn({ conditions: "a".repeat(256) }))["returnPolicy.conditions"]).toEqual({ kind: "tooLong", max: 255 });
    expect(validateShippingForm(withReturn({ conditions: "a".repeat(255) }))["returnPolicy.conditions"]).toBeUndefined();
  });

  it("reports every problem at once, each under its own field", () => {
    const errors = validateShippingForm({ ...withMethod(0, { name: "", price: "x" }), threshold: "0" });

    expect(Object.keys(errors).sort()).toEqual(["standard.name", "standard.price", "threshold"]);
  });

  it("knows the limits it checks", () => {
    expect(SHIPPING_LIMITS).toMatchObject({ name: 100, description: 255, estimatedDays: 100, money: 1_000_000_000, returnDaysMax: 365, returnDescription: 500, returnConditions: 10, returnCondition: 255 });
  });
});

describe("ASC-6 writing the config", () => {
  it("writes exactly the stored shape: whole dong, trimmed texts, conditions as a list", () => {
    const text = serializeShippingForm({ ...form({ threshold: "2.000.000" }), methods: form().methods.map((m) => ({ ...m, name: ` ${m.name} `, description: ` ${m.description} `, estimatedDays: ` ${m.estimatedDays} ` })) });

    expect(JSON.parse(text)).toEqual({ ...stored, freeShippingThresholdVnd: 2_000_000, methods: stored.methods });
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(["freeShippingThresholdVnd", "methods", "returnPolicy"]);
    expect(Object.keys(JSON.parse(text).methods[0]).sort()).toEqual(["description", "estimatedDays", "icon", "id", "name", "priceVnd"]);
  });

  it("writes no threshold as null, and leaves the return policy out when it is not known", () => {
    const parsed = JSON.parse(serializeShippingForm(form({ threshold: "  ", returnPolicy: null })));

    expect(parsed.freeShippingThresholdVnd).toBeNull();
    expect("returnPolicy" in parsed).toBe(false);
  });

  it("drops blank condition lines and trims the others", () => {
    const parsed = JSON.parse(serializeShippingForm(withReturn({ days: " 10 ", description: " d ", conditions: " a \n\n b\n" })));

    expect(parsed.returnPolicy).toEqual({ days: 10, description: "d", conditions: ["a", "b"] });
  });

  it("gives back the same form it read", () => {
    const original = form();

    expect(parseShippingValue(serializeShippingForm(original))).toEqual(original);
  });
});
