import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { product } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { renderProducts } from "./products-kit";

/* The product form: create, edit, variants, images and delete (specs/admin/products.md, flows APR-4 to APR-9E). */

const P = (key: string) => msg(`admin.products.${key}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const addButton = () => screen.getByRole("button", { name: new RegExp(P("page.add")) });
const modal = () => screen.getByRole("heading", { level: 2, name: /Sản phẩm mới|Sửa sản phẩm/ }).closest(".fixed") as HTMLElement;
const field = (label: string) => within(within(modal()).getByText(label).closest("div.flex-col") as HTMLElement);
const submit = (name = P("form.submitCreate")) => screen.getByRole("button", { name });
const tab = (id: string) => userEvent.click(within(modal()).getByRole("button", { name: P(`form.tabs.${id}`) }));
const nameInput = () => within(modal()).getByPlaceholderText(P("form.placeholders.name"));
const priceInput = () => within(modal()).getByPlaceholderText(P("form.placeholders.price"));
const categorySelect = () => field(P("form.fields.category")).getByRole("combobox") as HTMLSelectElement;
const subSelect = () => field(P("form.fields.subcategory")).getByRole("combobox") as HTMLSelectElement;

async function openCreate(options: Parameters<typeof renderProducts>[0] = {}) {
  const view = await renderProducts({ pages: [{ data: [product({ name: "Dress" })], total: 1 }], ...options });
  await screen.findByText("Dress");
  await waitFor(() => expect(view.calls.categories.length).toBeGreaterThan(0));
  await userEvent.click(addButton());
  await within(modal()).findByRole("option", { name: "Tops" });
  return view;
}

async function fillBasics(name = "Áo thun trắng", price = "350000", categoryId = "c2") {
  await userEvent.type(nameInput(), name);
  await userEvent.type(priceInput(), price);
  await userEvent.selectOptions(categorySelect(), categoryId);
}

const EMPTY_PAYLOAD = { description: "", images: [], badge: null, status: "active", material: "", care: "", sizes: [], colors: [], tags: [], originalPriceVnd: null };

describe("APR-4 a new product", () => {
  it("opens an empty form on the first tab with the categories to choose from", async () => {
    await openCreate();

    expect(screen.getByRole("heading", { level: 2, name: P("form.titleCreate") })).toBeInTheDocument();
    expect(nameInput()).toHaveValue("");
    expect(priceInput()).toHaveValue("");
    expect(within(categorySelect()).getAllByRole("option").map((o) => o.textContent)).toEqual([P("form.options.selectCategory"), "Tops", "Bags"]);
    expect(subSelect()).toBeDisabled();
    expect(submit()).toBeEnabled();
    expect(within(modal()).getByRole("button", { name: P("form.tabs.general") }).className).toContain("border-[var(--accent-primary)]");
  });

  it("creates it with the whole-dong price, the slug made from the name and everything else as typed", async () => {
    const { calls } = await openCreate();
    await fillBasics("Áo thun trắng", "350000", "c2");
    expect(priceInput()).toHaveValue("350.000");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates).toHaveLength(1));
    expect(calls.creates[0]).toEqual({ ...EMPTY_PAYLOAD, name: "Áo thun trắng", slug: "ao-thun-trang", priceVnd: 350_000, categoryId: "c2", subcategoryId: null });
    expect(await screen.findByText(P("toast.created"))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: P("form.titleCreate") })).not.toBeInTheDocument());
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(1));
  });

  it("sends the struck-through price when there is one", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await userEvent.type(field(P("form.fields.originalPrice")).getByRole("textbox"), "450000");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ priceVnd: 350_000, originalPriceVnd: 450_000 }));
  });

  it("makes the slug again from every change of the name", async () => {
    const { calls } = await openCreate();
    await userEvent.type(nameInput(), "  Đầm  Lụa! ");
    await userEvent.type(priceInput(), "1000");
    await userEvent.selectOptions(categorySelect(), "c2");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ slug: "dam-lua" }));
  });

  it("asks for the sub-category when the category has some, and sends it when chosen", async () => {
    const { calls } = await openCreate();
    await fillBasics("Shirt", "100000", "c1");
    expect(subSelect()).toBeEnabled();
    expect(within(subSelect()).getAllByRole("option").map((o) => o.textContent)).toEqual([P("form.options.noneDash"), "Shirts"]);

    await userEvent.click(submit());
    expect(await screen.findByText(P("toast.subcategoryRequired"))).toBeInTheDocument();
    expect(calls.creates).toEqual([]);
    await userEvent.selectOptions(subSelect(), "s1");
    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ categoryId: "c1", subcategoryId: "s1" }));
  });

  it("forgets the sub-category when the category changes", async () => {
    await openCreate();
    await userEvent.selectOptions(categorySelect(), "c1");
    await userEvent.selectOptions(subSelect(), "s1");

    await userEvent.selectOptions(categorySelect(), "c2");

    expect(subSelect()).toBeDisabled();
    await userEvent.selectOptions(categorySelect(), "c1");
    expect(subSelect()).toHaveValue("");
  });

  it("sends the status and the badge that were chosen", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await userEvent.selectOptions(field(P("form.fields.status")).getByRole("combobox"), "disabled");
    await userEvent.selectOptions(field(P("form.fields.badge")).getByRole("combobox"), "limited");
    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.description")), "Soft");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ status: "disabled", badge: "limited", description: "Soft" }));
  });

  it("offers the sub-category 'none' as no sub-category even for a category that has some", async () => {
    const { calls } = await openCreate({ categories: [{ ...(await import("./products-kit")).category(), subcategories: [] }] });
    await fillBasics("Plain", "1000", "c1");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ subcategoryId: null }));
  });
});

describe("APR-4E a product that cannot be saved", () => {
  it.each([
    ["zero", "0"],
    ["more than a billion", "1000000001"],
  ])("refuses a price of %s, says so under the field and sends nothing", async (_label, price) => {
    const { calls } = await openCreate();
    await fillBasics("Item", price);

    await userEvent.click(submit());

    expect(await within(modal()).findByText(P("form.errors.price"))).toBeInTheDocument();
    expect(priceInput()).toHaveAttribute("aria-invalid", "true");
    expect(calls.creates).toEqual([]);
  });

  it("refuses a decimal price as it is typed", async () => {
    await openCreate();

    await userEvent.type(priceInput(), "350000");
    await userEvent.type(priceInput(), ",");

    expect(await within(modal()).findByText(P("form.errors.price"))).toBeInTheDocument();
    expect(priceInput()).toHaveValue("350.000");
  });

  it("takes the error away when the price is typed again", async () => {
    await openCreate();
    await fillBasics("Item", "0");
    await userEvent.click(submit());
    await within(modal()).findByText(P("form.errors.price"));

    await userEvent.type(priceInput(), "5");

    expect(within(modal()).queryByText(P("form.errors.price"))).not.toBeInTheDocument();
  });

  it("refuses a struck-through price below the price, or above a billion", async () => {
    const { calls } = await openCreate();
    await fillBasics("Item", "500000");
    const original = field(P("form.fields.originalPrice")).getByRole("textbox");
    await userEvent.type(original, "400000");

    await userEvent.click(submit());
    expect(await within(modal()).findByText(P("form.errors.originalPrice"))).toBeInTheDocument();
    expect(within(modal()).queryByText(P("form.errors.price"))).not.toBeInTheDocument();
    await userEvent.clear(original);
    await userEvent.type(original, "1000000001");
    await userEvent.click(submit());

    expect(await within(modal()).findByText(P("form.errors.originalPrice"))).toBeInTheDocument();
    expect(calls.creates).toEqual([]);
  });

  it("accepts a struck-through price equal to the price", async () => {
    const { calls } = await openCreate();
    await fillBasics("Item", "500000");
    await userEvent.type(field(P("form.fields.originalPrice")).getByRole("textbox"), "500000");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ priceVnd: 500_000, originalPriceVnd: 500_000 }));
  });

  it("takes the admin back to the first tab to see a price error", async () => {
    await openCreate();
    await fillBasics("Item", "0");
    await tab("variants");
    expect(within(modal()).queryByPlaceholderText(P("form.placeholders.price"))).not.toBeInTheDocument();

    await userEvent.click(submit());

    expect(await within(modal()).findByText(P("form.errors.price"))).toBeInTheDocument();
    expect(within(modal()).getByRole("button", { name: P("form.tabs.general") }).className).toContain("border-[var(--accent-primary)]");
  });

  it("says why when the BE refuses, and keeps the form open with what was typed", async () => {
    const { calls } = await openCreate({ refuse: { status: 400, body: { message: "Slug already used", errorCode: 99999 } } });
    await fillBasics();

    await userEvent.click(submit());

    expect(await screen.findByText("Slug already used")).toBeInTheDocument();
    expect(calls.creates).toHaveLength(1);
    expect(nameInput()).toHaveValue("Áo thun trắng");
    expect(submit()).toBeEnabled();
  });

  it("uses its own words when the BE says nothing", async () => {
    await openCreate({ refuse: { status: 500, body: {} } });
    await fillBasics();

    await userEvent.click(submit());

    expect(await screen.findByText(P("toast.saveFailed"))).toBeInTheDocument();
  });
});

describe("APR-5 closing the form", () => {
  it.each([
    ["the X button", () => userEvent.click(within(modal()).getByRole("button", { name: msg("admin.components.formKit.close") }))],
    ["Cancel", () => userEvent.click(within(modal()).getByRole("button", { name: msg("admin.components.formKit.cancel") }))],
    ["a click on the dark area", async () => void fireEvent.click(modal())],
  ])("closes with %s and starts clean the next time", async (_label, close) => {
    await openCreate();
    await userEvent.type(nameInput(), "Half typed");

    await close();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: P("form.titleCreate") })).not.toBeInTheDocument());
    await userEvent.click(addButton());

    expect(await within(modal()).findByPlaceholderText(P("form.placeholders.name"))).toHaveValue("");
  });

  it("locks the save button while a save is on its way", async () => {
    const { server } = await import("@/tests/_support/msw-server");
    const { http, HttpResponse } = await import("msw");
    const { API } = await import("@/tests/_support/api");
    await openCreate();
    let release!: () => void;
    server.use(
      http.post(`${API}/api/admin/products`, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json({ data: { id: "x" } });
      })
    );
    await fillBasics();

    await userEvent.click(submit());

    expect(await screen.findByRole("button", { name: msg("admin.components.formKit.saving") })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: P("form.titleCreate") })).not.toBeInTheDocument());
  });
});

describe("APR-6 editing a product", () => {
  const existing = product({
    id: "p7",
    name: "Silk dress",
    slug: "silk-dress",
    priceVnd: 1_350_000,
    originalPriceVnd: 1_500_000,
    originalPriceUsd: 57.7,
    images: ["https://cdn.test/a.png"],
    badge: "limited",
    status: "disabled",
    description: "Soft silk",
    material: "Silk",
    care: "Hand wash",
    sizes: ["S", "M"],
    colors: [{ name: "Red", hex: "#ff0000" }],
    tags: ["summer"],
  });

  async function openEdit() {
    const view = await renderProducts({ pages: [{ data: [existing], total: 1 }] });
    await screen.findByText("Silk dress");
    await waitFor(() => expect(view.calls.categories.length).toBeGreaterThan(0));
    await userEvent.click(within(screen.getByText("Silk dress").closest("tr") as HTMLElement).getByTitle(msg("admin.components.crud.edit")));
    await within(modal()).findByRole("option", { name: "Tops" });
    return view;
  }

  it("opens with everything filled in, prices grouped with dots", async () => {
    await openEdit();

    expect(screen.getByRole("heading", { level: 2, name: P("form.titleEdit") })).toBeInTheDocument();
    expect(nameInput()).toHaveValue("Silk dress");
    expect(priceInput()).toHaveValue("1.350.000");
    expect(field(P("form.fields.originalPrice")).getByRole("textbox")).toHaveValue("1.500.000");
    expect(categorySelect()).toHaveValue("c1");
    expect(subSelect()).toHaveValue("s1");
    expect(field(P("form.fields.status")).getByRole("combobox")).toHaveValue("disabled");
    expect(field(P("form.fields.badge")).getByRole("combobox")).toHaveValue("limited");
    expect(within(modal()).getByPlaceholderText(P("form.placeholders.description"))).toHaveValue("Soft silk");
    expect(submit(P("form.submitUpdate"))).toBeInTheDocument();
  });

  it("sends the changes to that product and says it was updated", async () => {
    const { calls } = await openEdit();
    await userEvent.clear(priceInput());
    await userEvent.type(priceInput(), "1200000");

    await userEvent.click(submit(P("form.submitUpdate")));

    await waitFor(() => expect(calls.updates).toHaveLength(1));
    expect(calls.updates[0].id).toBe("p7");
    expect(calls.updates[0].body).toMatchObject({
      name: "Silk dress",
      priceVnd: 1_200_000,
      originalPriceVnd: 1_500_000,
      categoryId: "c1",
      subcategoryId: "s1",
      badge: "limited",
      status: "disabled",
      sizes: ["S", "M"],
      colors: [{ name: "Red", hex: "#ff0000" }],
      tags: ["summer"],
      images: ["https://cdn.test/a.png"],
    });
    expect(calls.creates).toEqual([]);
    expect(await screen.findByText(P("toast.updated"))).toBeInTheDocument();
  });

  it("drops the struck-through price when its box is emptied", async () => {
    const { calls } = await openEdit();
    await userEvent.clear(field(P("form.fields.originalPrice")).getByRole("textbox"));

    await userEvent.click(submit(P("form.submitUpdate")));

    await waitFor(() => expect(calls.updates[0].body).toMatchObject({ originalPriceVnd: null }));
  });

  it("opens with the first tab and clean helper boxes even after another product was edited", async () => {
    await openEdit();
    await tab("variants");
    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.colorName")), "Half");
    await userEvent.click(within(modal()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await userEvent.click(within(screen.getByText("Silk dress").closest("tr") as HTMLElement).getByTitle(msg("admin.components.crud.edit")));

    expect(within(modal()).getByRole("button", { name: P("form.tabs.general") }).className).toContain("border-[var(--accent-primary)]");
    await tab("variants");
    expect(within(modal()).getByPlaceholderText(P("form.placeholders.colorName"))).toHaveValue("");
  });

  it("shows a product without a category with the empty choice", async () => {
    await renderProducts({ pages: [{ data: [product({ name: "Orphan", category: null, subcategory: null })], total: 1 }] });
    await screen.findByText("Orphan");
    await userEvent.click(within(screen.getByText("Orphan").closest("tr") as HTMLElement).getByTitle(msg("admin.components.crud.edit")));
    await within(modal()).findByRole("option", { name: "Tops" });

    expect(categorySelect()).toHaveValue("");
  });

  it("says why when the BE refuses the update", async () => {
    await renderProducts({ pages: [{ data: [existing], total: 1 }], refuse: { status: 409, body: { message: "Changed elsewhere" } } });
    await screen.findByText("Silk dress");
    await userEvent.click(within(screen.getByText("Silk dress").closest("tr") as HTMLElement).getByTitle(msg("admin.components.crud.edit")));
    await within(modal()).findByRole("option", { name: "Tops" });

    await userEvent.click(submit(P("form.submitUpdate")));

    expect(await screen.findByText("Changed elsewhere")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: P("form.titleEdit") })).toBeInTheDocument();
  });
});

describe("APR-7 sizes, colours and tags", () => {
  it("picks sizes from the groups, takes one off, and clears all with the count shown", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await tab("variants");
    const size = (name: string) => within(modal()).getByRole("button", { name: new RegExp(`^${name}$`) });
    expect(within(modal()).queryByRole("button", { name: /Xóa tất cả/ })).not.toBeInTheDocument();

    await userEvent.click(size("S"));
    await userEvent.click(size("M"));
    await userEvent.click(size("One Size"));
    await userEvent.click(size("M"));
    expect(within(modal()).getByRole("button", { name: "Xóa tất cả (2)" })).toBeInTheDocument();
    expect(size("S").className).toContain("bg-[var(--accent-sage)]");
    await userEvent.click(size("32"));
    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ sizes: ["S", "One Size", "32"] }));
  });

  it("clears every size at once", async () => {
    await openCreate();
    await tab("variants");
    await userEvent.click(within(modal()).getByRole("button", { name: /^L$/ }));
    await userEvent.click(within(modal()).getByRole("button", { name: /^XL$/ }));

    await userEvent.click(within(modal()).getByRole("button", { name: "Xóa tất cả (2)" }));

    expect(within(modal()).queryByRole("button", { name: /Xóa tất cả/ })).not.toBeInTheDocument();
  });

  it("adds a size of its own on Enter, in capitals, once, and ignores an empty one", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await tab("variants");
    const box = within(modal()).getByPlaceholderText(P("form.placeholders.customSize"));

    await userEvent.type(box, "{Enter}");
    await userEvent.type(box, " 3xl {Enter}");
    expect(box).toHaveValue("");
    await userEvent.type(box, "3XL{Enter}");
    await userEvent.clear(box);
    await userEvent.type(box, "m{Enter}");
    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ sizes: ["3XL", "M"] }));
  });

  it("does not submit the form when Enter is pressed in the size, colour or tag boxes", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await tab("variants");

    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.customSize")), "xs{Enter}");
    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.colorName")), "Teal{Enter}");
    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.tag")), "chic{Enter}");

    await wait(100);
    expect(calls.creates).toEqual([]);
  });

  it("adds a colour with its name and picked value, by the plus button or Enter, and shows it with a remove button", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await tab("variants");
    expect(within(modal()).getByText(P("form.colors.empty"))).toBeInTheDocument();
    const name = within(modal()).getByPlaceholderText(P("form.placeholders.colorName"));

    await userEvent.type(name, "Night blue");
    fireEvent.change(modal().querySelector('input[type="color"]') as HTMLInputElement, { target: { value: "#112233" } });
    await userEvent.click(within(modal()).getByRole("button", { name: P("form.colors.add") }));
    expect(name).toHaveValue("");
    expect(modal().querySelector('input[type="color"]')).toHaveValue("#333333");
    await userEvent.type(name, "Sand{Enter}");

    expect(within(modal()).getByText("#112233")).toBeInTheDocument();
    expect(within(modal()).getByText("Night blue")).toBeInTheDocument();
    expect(within(modal()).queryByText(P("form.colors.empty"))).not.toBeInTheDocument();
    await userEvent.click(submit());
    await waitFor(() => expect(calls.creates[0]).toMatchObject({ colors: [{ name: "Night blue", hex: "#112233" }, { name: "Sand", hex: "#333333" }] }));
  });

  it("ignores an empty colour name, and refuses a name that exists whatever its case", async () => {
    await openCreate();
    await tab("variants");
    const name = within(modal()).getByPlaceholderText(P("form.placeholders.colorName"));

    await userEvent.click(within(modal()).getByRole("button", { name: P("form.colors.add") }));
    expect(within(modal()).getByText(P("form.colors.empty"))).toBeInTheDocument();
    await userEvent.type(name, "Red{Enter}");
    await userEvent.type(name, "RED{Enter}");

    expect(await screen.findByText(P("toast.colorExists"))).toBeInTheDocument();
    expect(within(modal()).getAllByRole("button", { name: "Xóa Red" })).toHaveLength(1);
    expect(name).toHaveValue("RED");
  });

  it("takes a colour off", async () => {
    await openCreate();
    await tab("variants");
    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.colorName")), "Red{Enter}");
    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.colorName")), "Blue{Enter}");

    await userEvent.click(within(modal()).getByRole("button", { name: "Xóa Red" }));

    expect(within(modal()).queryByRole("button", { name: "Xóa Red" })).not.toBeInTheDocument();
    expect(within(modal()).getByRole("button", { name: "Xóa Blue" })).toBeInTheDocument();
  });

  it("adds a tag from the suggestions, which then stop being offered, or one typed in lower case once", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await tab("variants");

    await userEvent.click(within(modal()).getByRole("button", { name: "+ summer" }));
    expect(within(modal()).queryByRole("button", { name: "+ summer" })).not.toBeInTheDocument();
    const box = within(modal()).getByPlaceholderText(P("form.placeholders.tag"));
    await userEvent.type(box, " Chic {Enter}");
    expect(box).toHaveValue("");
    await userEvent.type(box, "chic{Enter}");
    expect(box).toHaveValue("chic");
    await userEvent.clear(box);
    await userEvent.type(box, "{Enter}");
    await userEvent.type(box, "summer{Enter}");
    expect(box).toHaveValue("summer");
    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ tags: ["summer", "chic"] }));
  });

  it("takes a tag off, and offers the suggestion again", async () => {
    await openCreate();
    await tab("variants");
    await userEvent.click(within(modal()).getByRole("button", { name: "+ winter" }));

    await userEvent.click(within(modal()).getByRole("button", { name: "Xóa thẻ winter" }));

    expect(within(modal()).getByRole("button", { name: "+ winter" })).toBeInTheDocument();
  });

  it("sends the material and the care text", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await tab("variants");
    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.material")), "Cotton");
    await userEvent.type(within(modal()).getByPlaceholderText(P("form.placeholders.care")), "Cold wash");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ material: "Cotton", care: "Cold wash" }));
  });

  it("keeps what was set on one tab when the admin goes to another and back", async () => {
    await openCreate();
    await fillBasics("Kept", "1000");
    await tab("images");
    await tab("general");

    expect(nameInput()).toHaveValue("Kept");
  });
});

describe("APR-8 the pictures", () => {
  it("adds a picture by its address and sends the list", async () => {
    const { calls } = await openCreate();
    await fillBasics();
    await tab("images");

    await userEvent.type(within(modal()).getByPlaceholderText(msg("admin.components.imageFields.list.urlPlaceholder")), "https://cdn.test/new.png{Enter}");
    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates[0]).toMatchObject({ images: ["https://cdn.test/new.png"] }));
  });
});

describe("APR-9 deleting a product", () => {
  const open = async (options: Parameters<typeof renderProducts>[0] = {}) => {
    const view = await renderProducts({ pages: [{ data: [product({ id: "p1", name: "Dress" })], total: 1 }], ...options });
    await screen.findByText("Dress");
    return view;
  };
  const deleteButton = () => within(screen.getByText("Dress").closest("tr") as HTMLElement).getByTitle(msg("admin.components.crud.delete"));

  it("asks with the product's name (a dangerous question), then deletes, says so and refreshes the table", async () => {
    const { calls } = await open();

    await userEvent.click(deleteButton());

    const box = await screen.findByRole("alertdialog");
    expect(box).toHaveTextContent(P("confirmDelete.title"));
    expect(box).toHaveTextContent('Xóa "Dress"?');
    expect(calls.deletes).toEqual([]);
    expect(within(box).getByRole("button", { name: msg("admin.components.crud.delete") }).className).toContain("bg-[var(--accent-rose)]");
    await userEvent.click(within(box).getByRole("button", { name: msg("admin.components.crud.delete") }));

    await waitFor(() => expect(calls.deletes).toEqual(["p1"]));
    expect(await screen.findByText(P("toast.deleted"))).toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(1));
  });

  it("sends nothing when the admin backs out", async () => {
    const { calls } = await open();
    await userEvent.click(deleteButton());

    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await wait(150);
    expect(calls.deletes).toEqual([]);
    expect(calls.lists).toHaveLength(1);
  });

  it("says why when the BE refuses, and does not refresh the table", async () => {
    const { calls } = await open({ refuse: { status: 409, body: { message: "Product is in an order" } } });
    await userEvent.click(deleteButton());

    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("admin.components.crud.delete") }));

    expect(await screen.findByText("Product is in an order")).toBeInTheDocument();
    await wait(100);
    expect(calls.lists).toHaveLength(1);
  });

  it("uses its own words when the BE says nothing", async () => {
    await open({ refuse: { status: 500, body: {} } });
    await userEvent.click(deleteButton());

    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("admin.components.crud.delete") }));

    expect(await screen.findByText(P("toast.deleteFailed"))).toBeInTheDocument();
  });
});
