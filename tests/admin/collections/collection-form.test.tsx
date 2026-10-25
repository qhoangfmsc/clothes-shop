import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API } from "@/tests/_support/api";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { collection, product, renderCollections, type RenderCollectionsOptions } from "./collections-kit";

/* Adding, changing and removing a collection, and choosing its products (specs/admin/collections.md, flows ACL-4 to ACL-8E). */

const L = (key: string) => msg(`admin.collections.${key}`);
const form = (title: string) => screen.getByRole("heading", { level: 2, name: title }).closest(".fixed") as HTMLElement;
const createForm = () => form(L("form.titleCreate"));
const editForm = () => form(L("form.titleEdit"));
const nameBox = (box: HTMLElement) => within(box).getAllByRole("textbox")[0] as HTMLInputElement;
const subtitleBox = (box: HTMLElement) => within(box).getAllByRole("textbox")[1] as HTMLInputElement;
const seasonBox = (box: HTMLElement) => within(box).getByPlaceholderText(L("form.placeholders.season"));
const coverBox = (box: HTMLElement) => within(box).getByPlaceholderText(L("form.placeholders.coverImage"));
const descBox = (box: HTMLElement) => within(box).getByPlaceholderText(L("form.placeholders.description"));
const toProducts = (box: HTMLElement) => userEvent.click(within(box).getByRole("button", { name: L("form.tabs.products") }));
const toInfo = (box: HTMLElement) => userEvent.click(within(box).getByRole("button", { name: L("form.tabs.info") }));
const searchBox = (box: HTMLElement) => within(box).getByPlaceholderText(L("products.searchPlaceholder"));
const PRODUCTS = [
  product({ id: "p1", name: "Silk dress", slug: "silk-dress", priceVnd: 350_000, priceUsd: 13.46 }),
  product({ id: "p2", name: "Linen shirt", slug: "linen-shirt", priceVnd: 200_000, priceUsd: 7.69, images: [], category: null as never }),
  product({ id: "p3", name: "Wool coat", slug: "wool-coat", priceVnd: 900_000, priceUsd: 34.62 }),
  product({ id: "p4", name: "Cashmere scarf", slug: "winter-scarf", priceVnd: 123_000, priceUsd: 4.73 }),
];

async function openCreate(options: RenderCollectionsOptions = {}) {
  const view = await renderCollections({ pages: [{ data: [collection()], total: 1 }], products: PRODUCTS, ...options });
  await screen.findByText("Spring");
  const locale = options.locale ?? "vi";
  await userEvent.click(screen.getByRole("button", { name: new RegExp(msg("admin.collections.page.add", locale)) }));
  await screen.findByRole("heading", { level: 2, name: msg("admin.collections.form.titleCreate", locale) });
  return view;
}

async function openEdit(source = collection(), options: RenderCollectionsOptions = {}) {
  const view = await renderCollections({ pages: [{ data: [source], total: 1 }], products: PRODUCTS, ...options });
  await screen.findByText(source.name);
  await userEvent.click(within(screen.getByText(source.name).closest("tr") as HTMLElement).getByRole("button", { name: msg("admin.components.crud.edit") }));
  await screen.findByRole("heading", { level: 2, name: L("form.titleEdit") });
  return view;
}

describe("ACL-4 adding a collection", () => {
  it("opens an empty form on the info tab", async () => {
    await openCreate();
    const box = createForm();

    expect(nameBox(box)).toHaveValue("");
    expect(subtitleBox(box)).toHaveValue("");
    expect(seasonBox(box)).toHaveValue("");
    expect(coverBox(box)).toHaveValue("");
    expect(descBox(box)).toHaveValue("");
    expect(nameBox(box)).toBeRequired();
    expect(within(box).getByRole("button", { name: L("form.subtitleInfo") })).toBeInTheDocument();
  });

  it("offers the known season as a suggestion for the season field", async () => {
    await openCreate();

    expect(createForm().querySelector("datalist")?.querySelectorAll("option")).toHaveLength(1);
    expect(createForm().querySelector("datalist option")).toHaveAttribute("value", "Limited Edition");
    expect(seasonBox(createForm())).toHaveAttribute("list", createForm().querySelector("datalist")!.id);
  });

  it("makes the slug from the name (accents, đ, symbols), and sends the whole form", async () => {
    const { calls } = await openCreate();
    const box = createForm();
    await userEvent.type(nameBox(box), "Đầm Mùa Hè!");
    await userEvent.type(subtitleBox(box), "Nhẹ nhàng");
    await userEvent.type(seasonBox(box), "Summer 2026");
    await userEvent.type(coverBox(box), "https://img.example/c.jpg");
    await userEvent.type(descBox(box), "Hot days");

    await userEvent.click(within(box).getByRole("button", { name: L("form.submitCreate") }));

    await waitFor(() => expect(calls.creates).toEqual([{ slug: "dam-mua-he", name: "Đầm Mùa Hè!", subtitle: "Nhẹ nhàng", description: "Hot days", image: "https://img.example/c.jpg", productIds: [], season: "Summer 2026" }]));
  });

  it("tells the admin, closes the form and reloads the table when it worked", async () => {
    const { calls } = await openCreate();
    const before = calls.lists.length;
    await userEvent.type(nameBox(createForm()), "Autumn");

    await userEvent.click(within(createForm()).getByRole("button", { name: L("form.submitCreate") }));

    expect(await screen.findByText(L("toast.created"))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: L("form.titleCreate") })).not.toBeInTheDocument());
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("will not send without a name (the browser stops it)", async () => {
    const { calls } = await openCreate();

    await userEvent.click(within(createForm()).getByRole("button", { name: L("form.submitCreate") }));

    expect(calls.creates).toEqual([]);
  });

  it("keeps the saving label and the button off while it is on its way", async () => {
    await openCreate();
    server.use(http.post(`${API}/api/admin/collections`, async () => {
      await delay(300);
      return HttpResponse.json({ data: collection({ id: "col-new" }) });
    }));
    await userEvent.type(nameBox(createForm()), "Autumn");

    await userEvent.click(within(createForm()).getByRole("button", { name: L("form.submitCreate") }));

    expect(await within(createForm()).findByRole("button", { name: msg("admin.components.formKit.saving") })).toBeDisabled();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: L("form.titleCreate") })).not.toBeInTheDocument());
  });

  it("explains a refusal in the BE's words or its own, and keeps the form with what was typed", async () => {
    const first = await openCreate({ refuse: { create: { status: 409, body: { message: "Slug taken" } } } });
    await userEvent.type(nameBox(createForm()), "Autumn");
    await userEvent.click(within(createForm()).getByRole("button", { name: L("form.submitCreate") }));
    expect(await screen.findByText("Slug taken")).toBeInTheDocument();
    expect(nameBox(createForm())).toHaveValue("Autumn");
    first.unmount();

    await openCreate({ refuse: { create: { status: 500, body: {} } } });
    await userEvent.type(nameBox(createForm()), "Autumn");
    await userEvent.click(within(createForm()).getByRole("button", { name: L("form.submitCreate") }));
    expect(await screen.findByText(L("toast.saveFailed"))).toBeInTheDocument();
  });

  it("closes with Cancel and the next new form starts empty, with no product chosen", async () => {
    await openCreate();
    await userEvent.type(nameBox(createForm()), "Draft");
    await toProducts(createForm());
    await userEvent.click(within(createForm()).getByRole("button", { name: /^Silk dress/ }));

    await userEvent.click(within(createForm()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: L("form.titleCreate") })).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: new RegExp(L("page.add")) }));
    await screen.findByRole("heading", { level: 2, name: L("form.titleCreate") });

    expect(nameBox(createForm())).toHaveValue("");
    await toProducts(createForm());
    expect(within(createForm()).getByText("Thêm sản phẩm (đã chọn 0)")).toBeInTheDocument();
  });
});

describe("ACL-5 changing a collection", () => {
  const source = collection({ id: "col-9", name: "Spring", slug: "spring", subtitle: "Bright", description: "Warm", image: "https://img.example/s.jpg", season: "Limited Edition", products: [{ id: "p1" }, { id: "p3" }] });

  it("opens with what is saved", async () => {
    await openEdit(source);
    const box = editForm();

    expect(nameBox(box)).toHaveValue("Spring");
    expect(subtitleBox(box)).toHaveValue("Bright");
    expect(seasonBox(box)).toHaveValue("Limited Edition");
    expect(coverBox(box)).toHaveValue("https://img.example/s.jpg");
    expect(descBox(box)).toHaveValue("Warm");
  });

  it("sends the change to that collection with the whole form, tells the admin, closes and reloads", async () => {
    const { calls } = await openEdit(source);
    const before = calls.lists.length;
    await userEvent.type(descBox(editForm()), " days");

    await userEvent.click(within(editForm()).getByRole("button", { name: L("form.submitUpdate") }));

    await waitFor(() => expect(calls.updates).toEqual([{ id: "col-9", body: { slug: "spring", name: "Spring", subtitle: "Bright", description: "Warm days", image: "https://img.example/s.jpg", productIds: ["p1", "p3"], season: "Limited Edition" } }]));
    expect(await screen.findByText(L("toast.updated"))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: L("form.titleEdit") })).not.toBeInTheDocument());
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("makes the slug again from the new name", async () => {
    const { calls } = await openEdit(source);
    await userEvent.clear(nameBox(editForm()));
    await userEvent.type(nameBox(editForm()), "Mùa Thu");

    await userEvent.click(within(editForm()).getByRole("button", { name: L("form.submitUpdate") }));

    await waitFor(() => expect(calls.updates[0].body.slug).toBe("mua-thu"));
  });

  it("explains a refusal in the BE's words or its own, and keeps the form", async () => {
    const first = await openEdit(source, { refuse: { update: { status: 409, body: { message: "Slug taken" } } } });
    await userEvent.click(within(editForm()).getByRole("button", { name: L("form.submitUpdate") }));
    expect(await screen.findByText("Slug taken")).toBeInTheDocument();
    expect(editForm()).toBeInTheDocument();
    first.unmount();

    await openEdit(source, { refuse: { update: { status: 500, body: {} } } });
    await userEvent.click(within(editForm()).getByRole("button", { name: L("form.submitUpdate") }));
    expect(await screen.findByText(L("toast.saveFailed"))).toBeInTheDocument();
  });

  it("opens a collection with no product list as one with no products", async () => {
    const { calls } = await openEdit(collection({ id: "col-9", products: undefined }));

    await userEvent.click(within(editForm()).getByRole("button", { name: L("form.submitUpdate") }));

    await waitFor(() => expect(calls.updates[0].body.productIds).toEqual([]));
  });

  it("opens on the info tab each time", async () => {
    await openEdit(source);
    await toProducts(editForm());
    await userEvent.click(within(editForm()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: L("form.titleEdit") })).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: msg("admin.components.crud.edit") }));
    await screen.findByRole("heading", { level: 2, name: L("form.titleEdit") });

    expect(seasonBox(editForm())).toBeInTheDocument();
  });

  it("closes with the X button and by a click on the dark area, but not by a click inside", async () => {
    await openEdit(source);
    await userEvent.click(editForm().firstElementChild as HTMLElement);
    expect(editForm()).toBeInTheDocument();

    await userEvent.click(within(editForm()).getByRole("button", { name: msg("admin.components.formKit.close") }));

    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: L("form.titleEdit") })).not.toBeInTheDocument());
  });
});

describe("ACL-6 choosing the products", () => {
  it("asks for up to 200 products, lists them with their category and price, and counts the chosen ones", async () => {
    const { calls } = await openCreate();
    const box = createForm();

    await toProducts(box);

    await waitFor(() => expect(within(box).getByText("Silk dress")).toBeInTheDocument());
    expect(calls.productAsks[0].get("limit")).toBe("200");
    expect(within(box).getByText("Thêm sản phẩm (đã chọn 0)")).toBeInTheDocument();
    expect(within(box).getByText(/tops — 350\.000 VNĐ/)).toBeInTheDocument();
    expect(within(box).getByText(/— — 200\.000 VNĐ/)).toBeInTheDocument();
  });

  it("shows dollars in English", async () => {
    await openCreate({ locale: "en" });
    const box = form(msg("admin.collections.form.titleCreate", "en"));

    await userEvent.click(within(box).getByRole("button", { name: msg("admin.collections.form.tabs.products", "en") }));

    await waitFor(() => expect(within(box).getByText(/tops — \$13\.46/)).toBeInTheDocument());
  });

  it("chooses a product with a click and unchooses it with another, and shows a tick and a chip", async () => {
    const { calls } = await openCreate();
    const box = createForm();
    await userEvent.type(nameBox(box), "Autumn");
    await toProducts(box);

    await userEvent.click(await within(box).findByRole("button", { name: /^Silk dress/ }));
    await userEvent.click(within(box).getByRole("button", { name: /^Wool coat/ }));

    expect(within(box).getByText("Thêm sản phẩm (đã chọn 2)")).toBeInTheDocument();
    expect(within(box).getByRole("button", { name: /^Silk dress/ }).className).toContain("bg-[var(--accent-sage)]");
    expect(within(box).getAllByText("✓")).toHaveLength(2);
    expect(within(box).getByRole("button", { name: L("products.removeProduct").replace("{name}", "Silk dress") })).toBeInTheDocument();
    await userEvent.click(within(box).getByRole("button", { name: /^Silk dress/ }));
    expect(within(box).getByText("Thêm sản phẩm (đã chọn 1)")).toBeInTheDocument();

    await toInfo(box);
    await userEvent.click(within(box).getByRole("button", { name: L("form.submitCreate") }));
    await waitFor(() => expect(calls.creates[0].productIds).toEqual(["p3"]));
  });

  it("removes a chosen product with the chip's own button", async () => {
    await openEdit(collection({ products: [{ id: "p1" }, { id: "p3" }] }));
    const box = editForm();
    await toProducts(box);

    await userEvent.click(await within(box).findByRole("button", { name: "Bỏ Wool coat" }));

    expect(within(box).getByText("Thêm sản phẩm (đã chọn 1)")).toBeInTheDocument();
    expect(within(box).queryByRole("button", { name: "Bỏ Wool coat" })).not.toBeInTheDocument();
    expect(within(box).getAllByText("Silk dress")).toHaveLength(2);
    expect(within(box).getAllByText("Wool coat")).toHaveLength(1);
    expect(within(box).getByRole("button", { name: "Bỏ Silk dress" })).toBeInTheDocument();
  });

  it("shows the id of a chosen product the list no longer has", async () => {
    await openEdit(collection({ products: [{ id: "gone-9" }] }));
    const box = editForm();

    await toProducts(box);

    expect(await within(box).findByRole("button", { name: "Bỏ gone-9" })).toBeInTheDocument();
    expect(within(box).getByText("gone-9")).toBeInTheDocument();
  });

  it("filters the list by name or slug without asking the BE again, and says so when nothing matches", async () => {
    const { calls } = await openCreate();
    const box = createForm();
    await toProducts(box);
    await within(box).findByRole("button", { name: /^Silk dress/ });
    const asks = calls.productAsks.length;

    await userEvent.type(searchBox(box), "cashmere");
    expect(within(box).getByRole("button", { name: /^Cashmere scarf/ })).toBeInTheDocument();
    expect(within(box).queryByRole("button", { name: /^Linen shirt/ })).not.toBeInTheDocument();
    await userEvent.clear(searchBox(box));
    await userEvent.type(searchBox(box), "winter");
    expect(within(box).getByRole("button", { name: /^Cashmere scarf/ })).toBeInTheDocument();
    await userEvent.clear(searchBox(box));
    await userEvent.type(searchBox(box), "LINEN");
    expect(within(box).getByRole("button", { name: /^Linen shirt/ })).toBeInTheDocument();
    expect(within(box).queryByRole("button", { name: /^Silk dress/ })).not.toBeInTheDocument();
    await userEvent.clear(searchBox(box));
    await userEvent.type(searchBox(box), "wool-coat");
    expect(within(box).getByRole("button", { name: /^Wool coat/ })).toBeInTheDocument();
    expect(within(box).queryByRole("button", { name: /^Linen shirt/ })).not.toBeInTheDocument();
    await userEvent.clear(searchBox(box));
    await userEvent.type(searchBox(box), "zzz");

    expect(within(box).getByText(L("products.empty"))).toBeInTheDocument();
    expect(calls.productAsks.length).toBe(asks);
  });

  it("shows no more than fifty products in the list", async () => {
    const many = Array.from({ length: 60 }, (_, i) => product({ id: `p-${i}`, name: `Item ${String(i).padStart(2, "0")}`, slug: `item-${i}` }));
    await openCreate({ products: many });
    const box = createForm();
    await toProducts(box);

    await within(box).findByRole("button", { name: /Item 00/ });

    expect(within(box).getAllByRole("button", { name: /^Item / })).toHaveLength(50);
  });

  it("starts the search again for the next form", async () => {
    await openCreate();
    await toProducts(createForm());
    await userEvent.type(searchBox(createForm()), "silk");
    await userEvent.click(within(createForm()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: L("form.titleCreate") })).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: new RegExp(L("page.add")) }));
    await screen.findByRole("heading", { level: 2, name: L("form.titleCreate") });
    await toProducts(createForm());

    expect(searchBox(createForm())).toHaveValue("");
  });

  it("says there are no products when the list cannot be loaded", async () => {
    await openCreate({ products: 500 });
    const box = createForm();

    await toProducts(box);

    expect(await within(box).findByText(L("products.empty"))).toBeInTheDocument();
  });

  it("keeps the chosen products and the typed text when switching between the tabs", async () => {
    await openCreate();
    const box = createForm();
    await userEvent.type(nameBox(box), "Autumn");
    await toProducts(box);
    await userEvent.click(await within(box).findByRole("button", { name: /^Silk dress/ }));

    expect(within(box).queryByPlaceholderText(L("form.placeholders.season"))).not.toBeInTheDocument();
    await toInfo(box);
    expect(nameBox(box)).toHaveValue("Autumn");
    await toProducts(box);

    expect(within(box).getByText("Thêm sản phẩm (đã chọn 1)")).toBeInTheDocument();
  });
});

describe("ACL-7 removing a collection", () => {
  const removeButton = () => screen.getByRole("button", { name: msg("admin.components.crud.delete") });

  it("asks first, naming the collection, then deletes it, tells the admin and reloads the table", async () => {
    const { calls } = await renderCollections({ pages: [{ data: [collection({ id: "col-4", name: "Spring" })], total: 1 }] });
    await screen.findByText("Spring");
    const before = calls.lists.length;

    await userEvent.click(removeButton());
    const box = await screen.findByRole("alertdialog");
    expect(within(box).getByText(L("confirmDelete.title"))).toBeInTheDocument();
    expect(within(box).getByText('Xóa "Spring"?')).toBeInTheDocument();
    expect(calls.deletes).toEqual([]);
    const confirm = within(box).getByRole("button", { name: msg("admin.components.crud.delete") });
    expect(confirm.className).toContain("bg-[var(--accent-rose)]");
    await userEvent.click(confirm);

    await waitFor(() => expect(calls.deletes).toEqual(["col-4"]));
    expect(await screen.findByText(L("toast.deleted"))).toBeInTheDocument();
    await waitFor(() => expect(calls.lists.length).toBeGreaterThan(before));
  });

  it("does nothing when the question is answered No", async () => {
    const { calls } = await renderCollections({ pages: [{ data: [collection()], total: 1 }] });
    await screen.findByText("Spring");
    const before = calls.lists.length;

    await userEvent.click(removeButton());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("common.actions.cancel") }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.deletes).toEqual([]);
    expect(calls.lists.length).toBe(before);
  });

  it("explains a refusal in the BE's words or its own, and does not reload", async () => {
    const first = await renderCollections({ pages: [{ data: [collection()], total: 1 }], refuse: { delete: { status: 409, body: { message: "In use" } } } });
    await screen.findByText("Spring");
    await userEvent.click(removeButton());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("admin.components.crud.delete") }));
    expect(await screen.findByText("In use")).toBeInTheDocument();
    first.unmount();

    await renderCollections({ pages: [{ data: [collection()], total: 1 }], refuse: { delete: { status: 500, body: {} } } });
    await screen.findByText("Spring");
    await userEvent.click(removeButton());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: msg("admin.components.crud.delete") }));
    expect(await screen.findByText(L("toast.deleteFailed"))).toBeInTheDocument();
  });
});
