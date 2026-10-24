import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API } from "@/tests/_support/api";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { categoriesApi, category, renderCategories, subCategory, type RenderCategoriesOptions } from "./categories-kit";

/* Adding, changing and removing a category, and its sub-categories (specs/admin/categories.md, flows ACT-5 to ACT-8E). */

const C = (key: string) => msg(`admin.categories.${key}`);
const form = (title: string) => screen.getByRole("heading", { level: 2, name: title }).closest(".fixed") as HTMLElement;
const createForm = () => form(C("form.titleCreate"));
const editForm = () => form(C("form.titleEdit"));
const titleBox = (box: HTMLElement) => within(box).getByPlaceholderText(C("form.placeholders.title"));
const descBox = (box: HTMLElement) => within(box).getByPlaceholderText(C("form.placeholders.description"));
const heroBox = (box: HTMLElement) => within(box).getByPlaceholderText(msg("admin.components.imageFields.url.placeholder"));
const priorityBox = (box: HTMLElement) => box.querySelector("input[disabled]") as HTMLInputElement;
const toSubs = (box: HTMLElement) => userEvent.click(within(box).getByRole("button", { name: C("form.tabs.subcategories") }));
const toInfo = (box: HTMLElement) => userEvent.click(within(box).getByRole("button", { name: C("form.tabs.info") }));
const addSub = (box: HTMLElement) => userEvent.click(within(box).getByRole("button", { name: C("subcategories.add") }));

async function openCreate(options: RenderCategoriesOptions = {}) {
  const view = await renderCategories({ pages: [{ data: [category()], total: 1 }], ...options });
  await screen.findByText("Tops");
  await userEvent.click(screen.getByRole("button", { name: new RegExp(C("page.add")) }));
  await screen.findByRole("heading", { level: 2, name: C("form.titleCreate") });
  return view;
}

async function openEdit(source = category(), options: RenderCategoriesOptions = {}) {
  const view = await renderCategories({ pages: [{ data: [source], total: 1 }], ...options });
  await screen.findByText(source.title);
  await userEvent.click(within(screen.getByText(source.title).closest("tr") as HTMLElement).getByRole("button", { name: msg("admin.components.crud.edit") }));
  await screen.findByRole("heading", { level: 2, name: C("form.titleEdit") });
  return view;
}

describe("ACT-5 adding a category", () => {
  it("opens an empty form on the info tab, showing the rank it will get (the last one plus one)", async () => {
    const { calls } = await openCreate({ last: category({ priority: 7 }) });
    const box = createForm();

    await waitFor(() => expect(priorityBox(box)).toHaveValue("8"));
    expect(titleBox(box)).toHaveValue("");
    expect(descBox(box)).toHaveValue("");
    expect(heroBox(box)).toHaveValue("");
    expect(priorityBox(box)).toBeDisabled();
    expect(priorityBox(box)).toHaveAttribute("readonly");
    expect(within(box).getByRole("button", { name: C("form.priorityInfo") })).toBeInTheDocument();
    expect(Object.fromEntries(calls.priorityAsks[0])).toEqual({ sort: "-priority", limit: "1" });
  });

  it("shows rank 1 when there is no category yet, and nothing when the rank cannot be found out", async () => {
    const none = await openCreate({ last: null });
    await waitFor(() => expect(priorityBox(createForm())).toHaveValue("1"));
    none.unmount();

    await openCreate({ last: 500 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(priorityBox(createForm())).toHaveValue("");
  });

  it("forgets the rank of the last time it was opened", async () => {
    await openCreate({ last: category({ priority: 7 }) });
    await waitFor(() => expect(priorityBox(createForm())).toHaveValue("8"));
    await userEvent.click(within(createForm()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    categoriesApi({ last: 500 });

    await userEvent.click(screen.getByRole("button", { name: new RegExp(C("page.add")) }));
    await screen.findByRole("heading", { level: 2, name: C("form.titleCreate") });

    await waitFor(() => expect(priorityBox(createForm())).toHaveValue(""));
  });

  it("makes the slug from the title, without accents, spaces and symbols, with Vietnamese đ as d", async () => {
    const { calls } = await openCreate();
    const box = createForm();

    await userEvent.type(titleBox(box), "Đầm Công Sở & Váy!");
    await userEvent.click(within(box).getByRole("button", { name: C("form.submitCreate") }));

    await waitFor(() => expect(calls.creates).toHaveLength(1));
    expect(calls.creates[0].slug).toBe("dam-cong-so-vay");
  });

  it("takes dashes off both ends of the slug", async () => {
    const { calls } = await openCreate();
    const box = createForm();
    await userEvent.type(titleBox(box), "!Shoes!");

    await userEvent.click(within(box).getByRole("button", { name: C("form.submitCreate") }));

    await waitFor(() => expect(calls.creates[0].slug).toBe("shoes"));
  });

  it("sends the slug, title, description and hero image (trimmed, or null when empty) and no rank", async () => {
    const { calls } = await openCreate();
    const box = createForm();
    await userEvent.type(titleBox(box), "Shoes");
    await userEvent.type(descBox(box), "For feet");

    await userEvent.click(within(box).getByRole("button", { name: C("form.submitCreate") }));

    await waitFor(() => expect(calls.creates).toEqual([{ slug: "shoes", title: "Shoes", description: "For feet", heroImage: null, subcategories: [] }]));
  });

  it("trims the hero image address", async () => {
    const { calls } = await openCreate();
    const box = createForm();
    await userEvent.type(titleBox(box), "Shoes");
    await userEvent.type(heroBox(box), "  https://img.example/a.jpg  ");

    await userEvent.click(within(box).getByRole("button", { name: C("form.submitCreate") }));

    await waitFor(() => expect(calls.creates[0].heroImage).toBe("https://img.example/a.jpg"));
  });

  it("tells the admin, closes the form and reloads the table when it worked", async () => {
    const { calls } = await openCreate();
    const before = calls.lists.length;
    await userEvent.type(titleBox(createForm()), "Shoes");

    await userEvent.click(within(createForm()).getByRole("button", { name: C("form.submitCreate") }));

    expect(await screen.findByText(C("toast.created"))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: C("form.titleCreate") })).not.toBeInTheDocument());
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("will not send without a title (the browser stops it)", async () => {
    const { calls } = await openCreate();

    await userEvent.click(within(createForm()).getByRole("button", { name: C("form.submitCreate") }));

    expect(calls.creates).toEqual([]);
    expect(titleBox(createForm())).toBeRequired();
  });

  it("keeps the saving label and the button off while it is on its way", async () => {
    await openCreate();
    server.use(http.post(`${API}/api/admin/categories`, async () => {
      await delay(300);
      return HttpResponse.json({ data: category({ id: "c-new" }) });
    }));
    await userEvent.type(titleBox(createForm()), "Shoes");

    await userEvent.click(within(createForm()).getByRole("button", { name: C("form.submitCreate") }));

    expect(await within(createForm()).findByRole("button", { name: msg("admin.components.formKit.saving") })).toBeDisabled();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: C("form.titleCreate") })).not.toBeInTheDocument());
  });

  it("explains a refusal in the BE's words or its own, and keeps the form with what was typed", async () => {
    const first = await openCreate({ refuse: { create: { status: 409, body: { message: "Slug taken" } } } });
    await userEvent.type(titleBox(createForm()), "Shoes");
    await userEvent.click(within(createForm()).getByRole("button", { name: C("form.submitCreate") }));
    expect(await screen.findByText("Slug taken")).toBeInTheDocument();
    expect(titleBox(createForm())).toHaveValue("Shoes");
    first.unmount();

    await openCreate({ refuse: { create: { status: 500, body: {} } } });
    await userEvent.type(titleBox(createForm()), "Shoes");
    await userEvent.click(within(createForm()).getByRole("button", { name: C("form.submitCreate") }));
    expect(await screen.findByText(C("toast.saveFailed"))).toBeInTheDocument();
  });

  it("closes with Cancel and the next new form starts empty", async () => {
    await openCreate();
    await userEvent.type(titleBox(createForm()), "Draft");
    await toSubs(createForm());
    await addSub(createForm());

    await userEvent.click(within(createForm()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: C("form.titleCreate") })).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: new RegExp(C("page.add")) }));
    await screen.findByRole("heading", { level: 2, name: C("form.titleCreate") });

    expect(titleBox(createForm())).toHaveValue("");
    await toSubs(createForm());
    expect(within(createForm()).getByText(C("subcategories.empty"))).toBeInTheDocument();
  });
});

describe("ACT-6 changing a category", () => {
  const source = category({ id: "c-9", title: "Tops", slug: "tops", description: "Upper", heroImage: "https://img.example/h.jpg", priority: 4, subcategories: [subCategory({ id: "s-1", slug: "shirts", label: "Shirts", description: "Buttons", count: 5 })] });

  it("opens with what is saved, and the saved rank, which cannot be changed", async () => {
    await openEdit(source);
    const box = editForm();

    expect(titleBox(box)).toHaveValue("Tops");
    expect(descBox(box)).toHaveValue("Upper");
    expect(heroBox(box)).toHaveValue("https://img.example/h.jpg");
    expect(priorityBox(box)).toHaveValue("4");
    expect(priorityBox(box)).toBeDisabled();
  });

  it("shows an empty hero image field for a category with none", async () => {
    await openEdit(category({ heroImage: null }));

    expect(heroBox(editForm())).toHaveValue("");
  });

  it("does not ask for the next rank", async () => {
    const { calls } = await openEdit(source);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(calls.priorityAsks).toEqual([]);
  });

  it("sends the change to that category with the sub-categories stripped of id, count and dates, tells the admin, closes and reloads", async () => {
    const { calls } = await openEdit(source);
    const before = calls.lists.length;
    await userEvent.type(descBox(editForm()), " text");

    await userEvent.click(within(editForm()).getByRole("button", { name: C("form.submitUpdate") }));

    await waitFor(() => expect(calls.updates).toEqual([{ id: "c-9", body: { slug: "tops", title: "Tops", description: "Upper text", heroImage: "https://img.example/h.jpg", subcategories: [{ slug: "shirts", label: "Shirts", description: "Buttons" }] } }]));
    expect(await screen.findByText(C("toast.updated"))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: C("form.titleEdit") })).not.toBeInTheDocument());
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("makes the slug again from the new title", async () => {
    const { calls } = await openEdit(source);
    await userEvent.clear(titleBox(editForm()));
    await userEvent.type(titleBox(editForm()), "Áo Khoác");

    await userEvent.click(within(editForm()).getByRole("button", { name: C("form.submitUpdate") }));

    await waitFor(() => expect(calls.updates[0].body.slug).toBe("ao-khoac"));
  });

  it("explains a refusal in the BE's words or its own, and keeps the form", async () => {
    const first = await openEdit(source, { refuse: { update: { status: 409, body: { message: "Slug taken" } } } });
    await userEvent.click(within(editForm()).getByRole("button", { name: C("form.submitUpdate") }));
    expect(await screen.findByText("Slug taken")).toBeInTheDocument();
    expect(editForm()).toBeInTheDocument();
    first.unmount();

    await openEdit(source, { refuse: { update: { status: 500, body: {} } } });
    await userEvent.click(within(editForm()).getByRole("button", { name: C("form.submitUpdate") }));
    expect(await screen.findByText(C("toast.saveFailed"))).toBeInTheDocument();
  });

  it("closes with the X button and by a click on the dark area, but not by a click inside", async () => {
    await openEdit(source);
    await userEvent.click(editForm().firstElementChild as HTMLElement);
    expect(editForm()).toBeInTheDocument();

    await userEvent.click(within(editForm()).getByRole("button", { name: msg("admin.components.formKit.close") }));

    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: C("form.titleEdit") })).not.toBeInTheDocument());
  });

  it("starts the new category form empty after a change was made", async () => {
    await openEdit(source);
    await userEvent.click(within(editForm()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: C("form.titleEdit") })).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: new RegExp(C("page.add")) }));
    await screen.findByRole("heading", { level: 2, name: C("form.titleCreate") });

    expect(titleBox(createForm())).toHaveValue("");
    expect(heroBox(createForm())).toHaveValue("");
  });
});

describe("ACT-7 sub-categories", () => {
  it("counts them in the heading, says there are none, and adds an empty one", async () => {
    await openCreate();
    const box = createForm();
    await toSubs(box);
    expect(within(box).getByText(C("subcategories.empty"))).toBeInTheDocument();
    expect(within(box).getByText("Danh mục con (0)")).toBeInTheDocument();

    await addSub(box);
    await addSub(box);

    expect(within(box).getByText("Danh mục con (2)")).toBeInTheDocument();
    expect(within(box).queryByText(C("subcategories.empty"))).not.toBeInTheDocument();
    expect(within(box).getByText("Danh mục con 1")).toBeInTheDocument();
    expect(within(box).getByText("Danh mục con 2")).toBeInTheDocument();
    expect(within(box).getAllByPlaceholderText(C("subcategories.label"))).toHaveLength(2);
  });

  it("makes each slug from its own name and sends name, slug and description only", async () => {
    const { calls } = await openCreate();
    const box = createForm();
    await userEvent.type(titleBox(box), "Tops");
    await toSubs(box);
    await addSub(box);
    await addSub(box);
    const labels = within(box).getAllByPlaceholderText(C("subcategories.label"));
    const descriptions = within(box).getAllByPlaceholderText(C("subcategories.description"));
    await userEvent.type(labels[0], "Áo Sơ Mi");
    await userEvent.type(descriptions[0], "Cotton");
    await userEvent.type(labels[1], "Vests");

    await userEvent.click(within(box).getByRole("button", { name: C("form.submitCreate") }));

    await waitFor(() => expect(calls.creates).toHaveLength(1));
    expect(calls.creates[0].subcategories).toEqual([
      { slug: "ao-so-mi", label: "Áo Sơ Mi", description: "Cotton" },
      { slug: "vests", label: "Vests", description: "" },
    ]);
  });

  it("removes the one asked for and keeps the others", async () => {
    await openEdit(category({ subcategories: [subCategory({ id: "s-1", label: "Shirts", slug: "shirts" }), subCategory({ id: "s-2", label: "Vests", slug: "vests" }), subCategory({ id: "s-3", label: "Coats", slug: "coats" })] }));
    const box = editForm();
    await toSubs(box);

    await userEvent.click(within(box).getAllByRole("button", { name: C("subcategories.remove") })[1]);

    expect(within(box).getAllByPlaceholderText(C("subcategories.label")).map((i) => (i as HTMLInputElement).value)).toEqual(["Shirts", "Coats"]);
    expect(within(box).getByText("Danh mục con (2)")).toBeInTheDocument();
  });

  it("shows the saved sub-categories for editing, and keeps them when switching tabs", async () => {
    await openEdit(category({ subcategories: [subCategory({ label: "Shirts", description: "Buttons" })] }));
    const box = editForm();
    await toSubs(box);
    expect(within(box).queryByPlaceholderText(C("form.placeholders.title"))).not.toBeInTheDocument();
    await userEvent.type(within(box).getByPlaceholderText(C("subcategories.description")), "!");

    await toInfo(box);
    expect(titleBox(box)).toHaveValue("Tops");
    await toSubs(box);

    expect(within(box).getByPlaceholderText(C("subcategories.label"))).toHaveValue("Shirts");
    expect(within(box).getByPlaceholderText(C("subcategories.description"))).toHaveValue("Buttons!");
  });

  it("opens on the info tab each time", async () => {
    await openEdit();
    await toSubs(editForm());
    await userEvent.click(within(editForm()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: C("form.titleEdit") })).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.crud.edit") }));
    await screen.findByRole("heading", { level: 2, name: C("form.titleEdit") });

    expect(titleBox(editForm())).toBeInTheDocument();
  });

  it("edits a saved sub-category's name without changing the saved copy in the table", async () => {
    await openEdit(category({ subcategories: [subCategory({ label: "Shirts" })] }));
    await toSubs(editForm());

    await userEvent.type(within(editForm()).getByPlaceholderText(C("subcategories.label")), "x");

    expect(within(screen.getByText("Tops").closest("tr") as HTMLElement).getByText("Shirts")).toBeInTheDocument();
  });
});

describe("ACT-8 removing a category", () => {
  const removeButton = () => screen.getByRole("button", { name: msg("admin.components.crud.delete") });

  it("asks first, naming the category, then deletes it, tells the admin and reloads the table", async () => {
    const { calls } = await renderCategories({ pages: [{ data: [category({ id: "c-4", title: "Tops" })], total: 1 }] });
    await screen.findByText("Tops");
    const before = calls.lists.length;

    await userEvent.click(removeButton());
    const box = await screen.findByRole("alertdialog");
    expect(within(box).getByText(C("confirmDelete.title"))).toBeInTheDocument();
    expect(within(box).getByText('Xóa "Tops"?')).toBeInTheDocument();
    expect(calls.deletes).toEqual([]);
    const confirm = within(box).getByRole("button", { name: msg("admin.components.crud.delete") });
    expect(confirm.className).toContain("bg-[var(--accent-rose)]");
    await userEvent.click(confirm);

    await waitFor(() => expect(calls.deletes).toEqual(["c-4"]));
    expect(await screen.findByText(C("toast.deleted"))).toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("does nothing when the question is answered No", async () => {
    const { calls } = await renderCategories({ pages: [{ data: [category()], total: 1 }] });
    await screen.findByText("Tops");
    const before = calls.lists.length;

    await userEvent.click(removeButton());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.deletes).toEqual([]);
    expect(calls.lists.length).toBe(before);
  });

  it("explains a refusal in the BE's words or its own, and does not reload", async () => {
    const first = await renderCategories({ pages: [{ data: [category()], total: 1 }], refuse: { delete: { status: 409, body: { message: "Still has products" } } } });
    await screen.findByText("Tops");
    await userEvent.click(removeButton());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("admin.components.crud.delete") }));
    expect(await screen.findByText("Still has products")).toBeInTheDocument();
    first.unmount();

    await renderCategories({ pages: [{ data: [category()], total: 1 }], refuse: { delete: { status: 500, body: {} } } });
    await screen.findByText("Tops");
    await userEvent.click(removeButton());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("admin.components.crud.delete") }));
    expect(await screen.findByText(C("toast.deleteFailed"))).toBeInTheDocument();
  });
});
