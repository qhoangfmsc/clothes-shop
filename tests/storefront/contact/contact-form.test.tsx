import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import OrderRequestForm from "@/src/app/[locale]/(public)/contact/_components/OrderRequestForm";
import { dateText, msg } from "@/tests/_support/messages";
import { orderProduct, readMailto, recordNavigation, renderContact } from "./contact-kit";

/* The custom-order form: what is checked, what is typed in, and the email it builds (specs/storefront/contact.md, flows CT-3 to CT-5E). */

const C = (key: string, locale: "vi" | "en" = "vi") => msg(`public.contact.${key}`, locale);
let nav: ReturnType<typeof recordNavigation>;
afterEach(() => nav?.restore());

/* The address is recorded only after the page is up: the providers read `window.location` while starting */
async function show(product: ReturnType<typeof orderProduct> | null, locale?: "vi" | "en") {
  const view = await renderContact(<OrderRequestForm product={product} />, { locale });
  nav?.restore();
  nav = recordNavigation();
  return view;
}
const form = (product = orderProduct(), locale?: "vi" | "en") => show(product, locale);
const note = () => screen.getByPlaceholderText(C("form.design.placeholder"));
const nameField = () => screen.getByPlaceholderText(C("form.contact.namePlaceholder"));
const phoneField = () => screen.getByPlaceholderText(C("form.contact.phonePlaceholder"));
const measure = (key: string, unit = "cm") => screen.getByLabelText(`${C(`form.measurements.${key}`)} (${unit})`);
const send = () => userEvent.click(screen.getByRole("button", { name: C("form.actions.sendEmail") }));
async function fill(over: { note?: string; name?: string; phone?: string } = {}) {
  await userEvent.type(note(), over.note ?? "A red silk dress");
  await userEvent.type(nameField(), over.name ?? "Mai");
  await userEvent.type(phoneField(), over.phone ?? "0901234567");
}

describe("CT-3 what is asked", () => {
  it("has the fields of the request: measurements and weight, quantity, a date, the wish, the name and the phone", async () => {
    await form();

    for (const key of ["height", "bust", "waist", "hips"]) expect(measure(key)).toBeInTheDocument();
    expect(measure("weight", "kg")).toBeInTheDocument();
    expect(screen.getByText(C("form.quantity.label"))).toBeInTheDocument();
    expect(screen.getByText(C("form.neededBy.label"))).toBeInTheDocument();
    expect(note()).toBeInTheDocument();
    expect(nameField()).toHaveAttribute("autocomplete", "name");
    expect(phoneField()).toHaveAttribute("type", "tel");
    expect(screen.getByRole("button", { name: C("form.actions.sendEmail") })).toHaveAttribute("type", "submit");
  });

  it("puts the product next to the form when there is one, and not when there is none", async () => {
    const view = await form(orderProduct({ name: "Silk dress" }));
    expect(screen.getByRole("heading", { level: 3, name: "Silk dress" })).toBeInTheDocument();
    view.unmount();

    await show(null);

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await form(orderProduct(), "en");

    expect(screen.getByRole("button", { name: C("form.actions.sendEmail", "en") })).toBeInTheDocument();
  });
});

describe("CT-4 measurements, weight, quantity and date", () => {
  it("takes only digits, points and commas in a measurement, and at most five characters", async () => {
    await form();

    await userEvent.type(measure("height"), "1a6,5.99");

    expect(measure("height")).toHaveValue("16,5.");
  });

  it("takes the weight the same way", async () => {
    await form();

    await userEvent.type(measure("weight", "kg"), "5x4");

    expect(measure("weight", "kg")).toHaveValue("54");
  });

  it("keeps each measurement apart", async () => {
    await form();

    await userEvent.type(measure("bust"), "88");
    await userEvent.type(measure("waist"), "66");

    expect(measure("bust")).toHaveValue("88");
    expect(measure("waist")).toHaveValue("66");
    expect(measure("hips")).toHaveValue("");
  });

  it("counts the quantity from one to ten, with each end switched off", async () => {
    await form();
    const less = screen.getByRole("button", { name: C("form.quantity.decrease") });
    const more = screen.getByRole("button", { name: C("form.quantity.increase") });
    expect(less).toBeDisabled();

    for (let i = 0; i < 12; i += 1) if (!more.hasAttribute("disabled")) await userEvent.click(more);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(more).toBeDisabled();
    await userEvent.click(less);

    expect(screen.getByText("9")).toBeInTheDocument();
    expect(more).toBeEnabled();
  });

  it("does not let a date before today be chosen", async () => {
    const { container } = await form();

    const min = container.querySelector<HTMLInputElement>('input[type="date"]')!.min;

    expect(min).toBe(new Date().toISOString().slice(0, 10));
  });

  it("counts the letters of the wish against the limit", async () => {
    await form();

    await userEvent.type(note(), "Hello");

    expect(screen.getByText("5/1000")).toBeInTheDocument();
    expect(note()).toHaveAttribute("maxlength", "1000");
    expect(nameField()).toHaveAttribute("maxlength", "80");
    expect(phoneField()).toHaveAttribute("maxlength", "20");
  });
});

describe("CT-4E what is wrong before sending", () => {
  it("asks for the wish, the name and the phone when all are missing, and sends nothing", async () => {
    await form();

    await send();

    expect(await screen.findByText(C("form.errors.note"))).toBeInTheDocument();
    expect(screen.getByText(C("form.errors.name"))).toBeInTheDocument();
    expect(screen.getByText(C("form.errors.phone"))).toBeInTheDocument();
    expect(nav.sent.href).toBe("");
  });

  it("asks only for what is missing", async () => {
    await form();
    await userEvent.type(note(), "A dress");
    await userEvent.type(phoneField(), "0901234567");

    await send();

    expect(await screen.findByText(C("form.errors.name"))).toBeInTheDocument();
    expect(screen.queryByText(C("form.errors.note"))).not.toBeInTheDocument();
    expect(screen.queryByText(C("form.errors.phone"))).not.toBeInTheDocument();
    expect(nav.sent.href).toBe("");
  });

  it("does not count spaces as a wish or a name", async () => {
    await form();
    await userEvent.type(note(), "   ");
    await userEvent.type(nameField(), "   ");
    await userEvent.type(phoneField(), "0901234567");

    await send();

    expect(await screen.findByText(C("form.errors.note"))).toBeInTheDocument();
    expect(screen.getByText(C("form.errors.name"))).toBeInTheDocument();
  });

  it.each([["1234567", true], ["12345678", false], ["123456789012345", false], ["1234567890123456", true], ["+84 946-841-344", false], ["abc", true], ["abcdefghij", true], ["1234567abc", true]])("takes the phone %s as %s", async (phone, wrong) => {
    await form();
    await fill({ phone });

    await send();

    if (wrong) expect(await screen.findByText(C("form.errors.phone"))).toBeInTheDocument();
    else expect(nav.sent.href).toContain("mailto:");
    if (wrong) expect(nav.sent.href).toBe("");
  });

  it("marks the field that is wrong, and takes the mark away once the form is right", async () => {
    await form();
    await send();
    expect(note().className).toContain("border-[var(--color-deep-rose)]");

    await fill();
    await send();

    expect(screen.queryByText(C("form.errors.note"))).not.toBeInTheDocument();
    expect(note().className).not.toContain("border-[var(--color-deep-rose)]");
  });
});

describe("CT-5 the email", () => {
  it("sends the visitor to an email to the shop with the request written out, when the form is right", async () => {
    await form(orderProduct({ name: "Silk dress", sku: "SKU-9" }));
    await fill({ note: "Red, long sleeves", name: "Mai", phone: "0901 234 567" });
    await userEvent.type(measure("height"), "165");
    await userEvent.type(measure("weight", "kg"), "54");
    await userEvent.click(screen.getByRole("button", { name: C("form.quantity.increase") }));

    await send();

    const mail = readMailto(nav.sent.href);
    expect(mail.address).toBe("contact@doovan.vn");
    expect(mail.subject).toBe(C("message.subject").replace("{product}", "Silk dress"));
    expect(mail.body).toContain("Silk dress");
    expect(mail.body).toContain("SKU-9");
    expect(mail.body).toContain("  Red, long sleeves");
    expect(mail.body).toContain(`${C("message.labels.measurements")}: ${C("message.measurements.height")} 165`);
    expect(mail.body).toContain(`${C("message.labels.weight")}: 54`);
    expect(mail.body).toContain(`${C("message.labels.quantity")}: 2`);
    expect(mail.body).toContain(`${C("message.labels.phone")}: 0901 234 567`);
  });

  it("writes the date it is needed by in the visitor's way", async () => {
    const { container } = await form();
    await fill();
    const date = container.querySelector<HTMLInputElement>('input[type="date"]')!;
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    await userEvent.type(date, tomorrow);

    await send();

    expect(readMailto(nav.sent.href).body).toContain(`  ${C("message.labels.neededBy")}: ${dateText(new Date(`${tomorrow}T12:00:00`).toISOString(), "long")}`);
  });

  it("asks without a product too, with the general subject", async () => {
    await show(null);
    await fill();

    await send();

    const mail = readMailto(nav.sent.href);
    expect(mail.subject).toBe(C("message.subjectGeneric"));
    expect(mail.body).not.toContain(C("message.sections.product"));
  });

  it("submits with the Enter key from a field, like the button", async () => {
    await form();
    await fill();

    await userEvent.type(nameField(), "{Enter}");

    expect(nav.sent.href).toContain("mailto:");
  });

  it("does not open anything by itself: nothing leaves the page before the form is sent", async () => {
    await form();
    await fill();

    expect(nav.sent.href).toBe("");
    expect(within(document.body).queryByRole("alert")).not.toBeInTheDocument();
  });
});
