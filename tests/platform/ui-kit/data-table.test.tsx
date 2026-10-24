import { createRef } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn, type DataTableFetchParams, type DataTableRef } from "@/src/app/[locale]/_components/DataTable";
import { msg, msgf } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The shared admin table in server and static mode (specs/platform/ui-kit.md, flows UI-1 to UI-4E). */

interface Row {
  id: string;
  name: string;
}

const T = (key: string, locale: "vi" | "en" = "vi") => msg(`admin.components.dataTable.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const makeRows = (count: number, from = 1): Row[] => Array.from({ length: count }, (_, i) => ({ id: `r${from + i}`, name: `Row ${from + i}` }));
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", render: (row) => row.name }];

/** A fake list API: `total` rows in all, the page asked for is cut out of them. */
function listApi(total: number) {
  const calls: DataTableFetchParams[] = [];
  const fetchData = vi.fn(async (params: DataTableFetchParams) => {
    calls.push(params);
    const start = (params.page - 1) * params.limit;
    return { data: makeRows(Math.max(0, Math.min(params.limit, total - start)), start + 1), total };
  });
  return { calls, fetchData };
}

function gate<T>() {
  let release!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (release = resolve));
  return { promise, release };
}

const lastCall = (calls: DataTableFetchParams[]) => calls[calls.length - 1];
const pageButton = (n: number) => screen.getByRole("button", { name: String(n) });

describe("UI-1 a table that asks the BE (server mode)", () => {
  it("asks for the first page with the defaults on mount, and shows the rows", async () => {
    const { calls, fetchData } = listApi(3);

    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);

    expect(await screen.findByText("Row 1")).toBeInTheDocument();
    expect(calls).toEqual([{ search: "", filters: {}, sort: "-createdAt", page: 1, limit: 25 }]);
    expect(screen.getByText("Row 3")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });

  it("covers the table with a loading note while the answer is awaited, and takes it away after", async () => {
    const pending = gate<{ data: Row[]; total: number }>();

    await renderApp(<DataTable columns={COLUMNS} fetchData={() => pending.promise} />);

    expect(screen.getByText(T("loading"))).toBeInTheDocument();
    await act(async () => pending.release({ data: makeRows(1), total: 1 }));
    expect(await screen.findByText("Row 1")).toBeInTheDocument();
    expect(screen.queryByText(T("loading"))).not.toBeInTheDocument();
  });

  it.each([
    [10, 10],
    [500, 200],
    [undefined, 25],
  ])("asks for %s rows a page when the page size is %s (never more than the BE's maximum)", async (requested, asked) => {
    const { calls, fetchData } = listApi(1);

    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} pageSize={requested} />);
    await screen.findByText("Row 1");

    expect(calls[0].limit).toBe(asked);
  });

  it("starts from the default sort and filter values it was given", async () => {
    const { calls, fetchData } = listApi(1);

    await renderApp(
      <DataTable
        columns={COLUMNS}
        fetchData={fetchData}
        defaultSort="name"
        sortOptions={[{ value: "name", label: "Name" }, { value: "-name", label: "Name desc" }]}
        filters={[{ key: "status", label: "Status", options: [{ value: "open", label: "Open" }], defaultValue: "open" }, { key: "kind", label: "Kind", options: [] }]}
      />
    );
    await screen.findByText("Row 1");

    expect(calls[0]).toMatchObject({ sort: "name", filters: { status: "open", kind: "" } });
  });

  it("tells the caller when the BE refuses, and says it could not load instead of showing old rows or 'no data'", async () => {
    const onError = vi.fn();
    const failure = new Error("boom");

    await renderApp(<DataTable columns={COLUMNS} fetchData={async () => Promise.reject(failure)} onError={onError} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(T("error.message"));
    expect(screen.queryByText(T("empty.none"))).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("does not fail when the BE refuses and nobody listens", async () => {
    await renderApp(<DataTable columns={COLUMNS} fetchData={async () => Promise.reject(new Error("boom"))} />);

    expect(await screen.findByText(T("error.message"))).toBeInTheDocument();
  });

  it("asks again with the same question on 'try again', and shows the rows when it works", async () => {
    let failing = true;
    const calls: DataTableFetchParams[] = [];
    const fetchData = async (params: DataTableFetchParams) => {
      calls.push(params);
      if (failing) throw new Error("boom");
      return { data: makeRows(2), total: 2 };
    };
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);
    await screen.findByText(T("error.message"));
    failing = false;

    await userEvent.click(screen.getByRole("button", { name: T("error.retry") }));

    expect(await screen.findByText("Row 2")).toBeInTheDocument();
    expect(screen.queryByText(T("error.message"))).not.toBeInTheDocument();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual(calls[0]);
  });

  it("goes back to 'no data' when the list is empty after a failure was put right", async () => {
    let failing = true;
    const tableRef = createRef<DataTableRef>();
    const fetchData = async () => {
      if (failing) throw new Error("boom");
      return { data: [], total: 0 };
    };
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} tableRef={tableRef} />);
    await screen.findByText(T("error.message"));
    failing = false;

    await act(async () => tableRef.current?.refresh());

    expect(await screen.findByText(T("empty.none"))).toBeInTheDocument();
    expect(screen.queryByText(T("error.message"))).not.toBeInTheDocument();
  });

  it("speaks English in English when it could not load", async () => {
    await renderApp(<DataTable columns={COLUMNS} fetchData={async () => Promise.reject(new Error("boom"))} />, { locale: "en" });

    expect(await screen.findByText(T("error.message", "en"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: T("error.retry", "en") })).toBeInTheDocument();
  });
});

describe("UI-2 searching, filtering and sorting", () => {
  it("waits for the typing to pause, asks once for what was typed and starts again from page 1", async () => {
    const { calls, fetchData } = listApi(60);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);
    await screen.findByText("Row 1");
    await userEvent.click(pageButton(2));
    await waitFor(() => expect(lastCall(calls).page).toBe(2));
    const before = calls.length;

    await userEvent.type(screen.getByPlaceholderText(T("search.placeholder")), "dress");
    expect(calls).toHaveLength(before);
    await waitFor(() => expect(lastCall(calls)).toMatchObject({ search: "dress", page: 1 }));

    expect(calls).toHaveLength(before + 1);
  });

  it("uses the caller's placeholder, and has no search box when search is switched off", async () => {
    const { fetchData } = listApi(1);
    const view = await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} searchPlaceholder="Find an order" />);

    expect(screen.getByPlaceholderText("Find an order")).toBeInTheDocument();
    view.unmount();

    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} searchable={false} />);
    expect(screen.queryByPlaceholderText(T("search.placeholder"))).not.toBeInTheDocument();
    expect(screen.queryByText(T("search.label"))).not.toBeInTheDocument();
  });

  it("clears the search with its button, which only exists while there is text", async () => {
    const { calls, fetchData } = listApi(1);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);
    await screen.findByText("Row 1");
    expect(screen.queryByTitle(T("search.clear"))).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(T("search.placeholder")), "x");
    await waitFor(() => expect(lastCall(calls).search).toBe("x"));

    await userEvent.click(screen.getByTitle(T("search.clear")));

    expect(screen.getByPlaceholderText(T("search.placeholder"))).toHaveValue("");
    await waitFor(() => expect(lastCall(calls).search).toBe(""));
    expect(screen.queryByTitle(T("search.clear"))).not.toBeInTheDocument();
  });

  const FILTERS = [{ key: "status", label: "Status", options: [{ value: "open", label: "Open" }, { value: "done", label: "Done" }], defaultValue: "open" }];

  it("asks again when a filter changes (from page 1), and can put it back with its reset button", async () => {
    const { calls, fetchData } = listApi(60);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} filters={FILTERS} />);
    await screen.findByText("Row 1");
    expect(screen.queryByTitle(T("filter.reset").replace("{filter}", "status"))).not.toBeInTheDocument();
    await userEvent.click(pageButton(2));
    await waitFor(() => expect(lastCall(calls).page).toBe(2));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "done");

    await waitFor(() => expect(lastCall(calls)).toMatchObject({ filters: { status: "done" }, page: 1 }));
    await userEvent.click(screen.getByTitle(msgf("admin.components.dataTable.filter.reset", { filter: "status" })));
    await waitFor(() => expect(lastCall(calls).filters).toEqual({ status: "open" }));
    expect(screen.queryByTitle(msgf("admin.components.dataTable.filter.reset", { filter: "status" }))).not.toBeInTheDocument();
  });

  it("offers 'all' to take a filter off completely", async () => {
    const { calls, fetchData } = listApi(1);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} filters={FILTERS} />);
    await screen.findByText("Row 1");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), T("filter.all"));

    await waitFor(() => expect(lastCall(calls).filters).toEqual({ status: "" }));
  });

  const SORTS = [{ value: "-createdAt", label: "Newest" }, { value: "name", label: "Name A–Z" }];

  it("asks again in the order chosen (from page 1) and puts the default order back with its button", async () => {
    const { calls, fetchData } = listApi(60);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} sortOptions={SORTS} />);
    await screen.findByText("Row 1");
    expect(screen.queryByTitle(T("sort.reset"))).not.toBeInTheDocument();
    await userEvent.click(pageButton(2));
    await waitFor(() => expect(lastCall(calls).page).toBe(2));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: T("sort.label") }), "name");

    await waitFor(() => expect(lastCall(calls)).toMatchObject({ sort: "name", page: 1 }));
    await userEvent.click(screen.getByTitle(T("sort.reset")));
    await waitFor(() => expect(lastCall(calls).sort).toBe("-createdAt"));
  });

  it("has no sort box without sort options", async () => {
    const { fetchData } = listApi(1);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);

    expect(screen.queryByText(T("sort.label"))).not.toBeInTheDocument();
  });

  it("has no toolbar at all when there is nothing to search, filter or sort by", async () => {
    const { fetchData } = listApi(1);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} searchable={false} />);
    await screen.findByText("Row 1");

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("UI-3 pages", () => {
  it("shows no page controls when everything fits on one page", async () => {
    const { fetchData } = listApi(25);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);
    await screen.findByText("Row 1");

    expect(screen.queryByRole("button", { name: T("pagination.next") })).not.toBeInTheDocument();
  });

  it("says which rows are shown and goes to the next and previous page", async () => {
    const { calls, fetchData } = listApi(60);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);
    await screen.findByText("Row 1");
    expect(screen.getByText((_, el) => el?.tagName === "SPAN" && el.textContent === "Hiển thị 1–25 trên 60")).toBeInTheDocument();
    const previous = screen.getByTitle(T("pagination.previous"));
    expect(previous).toBeDisabled();

    await userEvent.click(screen.getByTitle(T("pagination.next")));
    expect(await screen.findByText("Row 26")).toBeInTheDocument();
    expect(lastCall(calls).page).toBe(2);
    expect(screen.getByText((_, el) => el?.tagName === "SPAN" && el.textContent === "Hiển thị 26–50 trên 60")).toBeInTheDocument();

    await userEvent.click(pageButton(3));
    expect(await screen.findByText("Row 51")).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === "SPAN" && el.textContent === "Hiển thị 51–60 trên 60")).toBeInTheDocument();
    expect(screen.getByTitle(T("pagination.next"))).toBeDisabled();

    await userEvent.click(screen.getByTitle(T("pagination.previous")));
    expect(await screen.findByText("Row 26")).toBeInTheDocument();
  });

  it("marks the current page and folds long page lists around it", async () => {
    const { fetchData } = listApi(500);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);
    await screen.findByText("Row 1");
    const labels = () => screen.getAllByRole("button").map((b) => b.textContent).filter((text) => text && /^\d+$/.test(text));

    expect(labels()).toEqual(["1", "2", "20"]);
    expect(screen.getAllByText("…")).toHaveLength(1);

    await userEvent.click(pageButton(2));
    await screen.findByText("Row 26");
    await userEvent.click(pageButton(3));
    await screen.findByText("Row 51");
    expect(labels()).toEqual(["1", "2", "3", "4", "20"]);
    expect(pageButton(3).className).toContain("bg-[var(--accent-primary)]");
    expect(pageButton(2).className).not.toContain("bg-[var(--accent-primary)]");
  });

  it("steps back to the last page that exists when the page it was on has emptied", async () => {
    let total = 30;
    const calls: DataTableFetchParams[] = [];
    const fetchData = async (params: DataTableFetchParams) => {
      calls.push(params);
      const start = (params.page - 1) * params.limit;
      return { data: makeRows(Math.max(0, Math.min(params.limit, total - start)), start + 1), total };
    };
    const tableRef = createRef<DataTableRef>();
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} pageSize={10} tableRef={tableRef} />);
    await screen.findByText("Row 1");
    await userEvent.click(pageButton(3));
    await screen.findByText("Row 21");

    total = 20;
    await act(async () => tableRef.current?.refresh());

    await waitFor(() => expect(lastCall(calls).page).toBe(2));
    expect(await screen.findByText("Row 11")).toBeInTheDocument();
  });
});

describe("UI-3E nothing to show", () => {
  it("says there is no data, or that the filter matches nothing, as the case may be", async () => {
    const view = await renderApp(<DataTable columns={COLUMNS} fetchData={async () => ({ data: [], total: 0 })} />);
    expect(await screen.findByText(T("empty.none"))).toBeInTheDocument();
    view.unmount();

    await renderApp(
      <DataTable
        columns={COLUMNS}
        fetchData={async () => ({ data: [], total: 0 })}
        filters={[{ key: "status", label: "Status", options: [{ value: "open", label: "Open" }], defaultValue: "open" }]}
      />
    );
    expect(await screen.findByText(T("empty.filtered"))).toBeInTheDocument();
  });

  it("says so for a search too", async () => {
    await renderApp(<DataTable columns={COLUMNS} fetchData={async () => ({ data: [], total: 0 })} />);
    await screen.findByText(T("empty.none"));

    await userEvent.type(screen.getByPlaceholderText(T("search.placeholder")), "zzz");

    expect(await screen.findByText(T("empty.filtered"))).toBeInTheDocument();
  });

  it("uses the caller's own words, as text or as a function of whether anything is filtered", async () => {
    const view = await renderApp(<DataTable columns={COLUMNS} fetchData={async () => ({ data: [], total: 0 })} emptyMessage="No orders" />);
    expect(await screen.findByText("No orders")).toBeInTheDocument();
    view.unmount();

    await renderApp(
      <DataTable columns={COLUMNS} fetchData={async () => ({ data: [], total: 0 })} emptyMessage={(filtered) => (filtered ? "Nothing matches" : "Empty list")} />
    );
    expect(await screen.findByText("Empty list")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(T("search.placeholder")), "q");
    expect(await screen.findByText("Nothing matches")).toBeInTheDocument();
  });

  it("makes the message span every column", async () => {
    await renderApp(
      <DataTable
        columns={[...COLUMNS, { key: "other", header: "Other", render: () => null }]}
        fetchData={async () => ({ data: [], total: 0 })}
        selectable
      />
    );
    const cell = (await screen.findByText(T("empty.none"))).closest("td");

    expect(cell).toHaveAttribute("colspan", "3");
  });
});

describe("UI-4 requests that overlap", () => {
  it("does not ask twice for the same thing while the answer is awaited", async () => {
    const pending = gate<{ data: Row[]; total: number }>();
    const fetchData = vi.fn(() => pending.promise);
    const tableRef = createRef<DataTableRef>();
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} tableRef={tableRef} />);

    await act(async () => tableRef.current?.refresh());
    await act(async () => tableRef.current?.refresh());
    await act(async () => pending.release({ data: makeRows(1), total: 1 }));

    await screen.findByText("Row 1");
    await wait(50);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("asks again with the latest question when the question changed while an answer was awaited", async () => {
    const first = gate<{ data: Row[]; total: number }>();
    const calls: DataTableFetchParams[] = [];
    const fetchData = vi.fn((params: DataTableFetchParams) => {
      calls.push(params);
      return calls.length === 1 ? first.promise : Promise.resolve({ data: makeRows(1, 7), total: 1 });
    });
    await renderApp(
      <DataTable columns={COLUMNS} fetchData={fetchData} sortOptions={[{ value: "-createdAt", label: "Newest" }, { value: "name", label: "Name" }]} />
    );
    await userEvent.selectOptions(screen.getByRole("combobox", { name: T("sort.label") }), "name");
    expect(calls).toHaveLength(1);

    await act(async () => first.release({ data: makeRows(1), total: 1 }));

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].sort).toBe("name");
    expect(await screen.findByText("Row 7")).toBeInTheDocument();
  });
});

describe("UI-5 asking from outside (the table's ref)", () => {
  it("refresh asks the BE again with the same question", async () => {
    const { calls, fetchData } = listApi(2);
    const tableRef = createRef<DataTableRef>();
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} tableRef={tableRef} />);
    await screen.findByText("Row 1");

    await act(async () => tableRef.current?.refresh());

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toEqual(calls[0]);
  });

  it("reset puts search, filters, sort and page back as they were at the start", async () => {
    const { calls, fetchData } = listApi(60);
    const tableRef = createRef<DataTableRef>();
    await renderApp(
      <DataTable
        columns={COLUMNS}
        fetchData={fetchData}
        tableRef={tableRef}
        filters={[{ key: "status", label: "Status", options: [{ value: "open", label: "Open" }, { value: "done", label: "Done" }], defaultValue: "open" }]}
        sortOptions={[{ value: "-createdAt", label: "Newest" }, { value: "name", label: "Name" }]}
      />
    );
    await screen.findByText("Row 1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "done");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: T("sort.label") }), "name");
    await userEvent.type(screen.getByPlaceholderText(T("search.placeholder")), "ab");
    await waitFor(() => expect(lastCall(calls)).toMatchObject({ search: "ab", sort: "name", filters: { status: "done" } }));
    await userEvent.click(pageButton(2));
    await waitFor(() => expect(lastCall(calls).page).toBe(2));

    await act(async () => tableRef.current?.reset());

    await waitFor(() => expect(lastCall(calls)).toEqual({ search: "", filters: { status: "open" }, sort: "-createdAt", page: 1, limit: 25 }));
    expect(screen.getByPlaceholderText(T("search.placeholder"))).toHaveValue("");
  });

  it("works through a forwarded ref as well", async () => {
    const { calls, fetchData } = listApi(1);
    const ref = createRef<DataTableRef>();
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} ref={ref} />);
    await screen.findByText("Row 1");

    await act(async () => ref.current?.refresh());

    await waitFor(() => expect(calls).toHaveLength(2));
  });
});

describe("UI-6 ticking rows", () => {
  const tick = (n: number) => screen.getAllByRole("checkbox", { name: T("selection.selectRow") })[n - 1];
  const all = () => screen.getByRole("checkbox", { name: T("selection.selectAll") }) as HTMLInputElement;

  it("has no checkboxes unless selection is asked for", async () => {
    const { fetchData } = listApi(2);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} />);
    await screen.findByText("Row 1");

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("counts the ticked rows and hands them to the bulk actions, which can clear them", async () => {
    const { fetchData } = listApi(3);
    const seen = vi.fn();
    await renderApp(
      <DataTable
        columns={COLUMNS}
        fetchData={fetchData}
        selectable
        renderBulkActions={({ keys, rows, clear }) => {
          seen(keys, rows.map((r) => r.name));
          return <button onClick={clear}>bulk</button>;
        }}
      />
    );
    await screen.findByText("Row 1");
    expect(screen.queryByText(msgf("admin.components.dataTable.selection.count", { count: 1 }))).not.toBeInTheDocument();

    await userEvent.click(tick(1));
    await userEvent.click(tick(3));

    expect(screen.getByText(msgf("admin.components.dataTable.selection.count", { count: 2 }))).toBeInTheDocument();
    expect(seen).toHaveBeenLastCalledWith(["r1", "r3"], ["Row 1", "Row 3"]);
    await userEvent.click(screen.getByRole("button", { name: "bulk" }));
    expect(screen.queryByText(msgf("admin.components.dataTable.selection.count", { count: 2 }))).not.toBeInTheDocument();
    expect(tick(1)).not.toBeChecked();
  });

  it("ticks and unticks one row, and shows the bar even when the caller adds no actions", async () => {
    const { fetchData } = listApi(2);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} selectable />);
    await screen.findByText("Row 1");

    await userEvent.click(tick(2));
    expect(screen.getByText(msgf("admin.components.dataTable.selection.count", { count: 1 }))).toBeInTheDocument();
    await userEvent.click(tick(2));

    expect(screen.queryByText(msgf("admin.components.dataTable.selection.count", { count: 1 }))).not.toBeInTheDocument();
  });

  it("the top box ticks everything on the page, shows a dash for some, and unticks everything", async () => {
    const { fetchData } = listApi(3);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} selectable />);
    await screen.findByText("Row 1");
    expect(all()).not.toBeChecked();
    expect(all().indeterminate).toBe(false);

    await userEvent.click(tick(1));
    expect(all().indeterminate).toBe(true);
    expect(all()).not.toBeChecked();

    await userEvent.click(all());
    expect(all()).toBeChecked();
    expect(all().indeterminate).toBe(false);
    expect(screen.getByText(msgf("admin.components.dataTable.selection.count", { count: 3 }))).toBeInTheDocument();

    await userEvent.click(all());
    expect(tick(1)).not.toBeChecked();
    expect(tick(3)).not.toBeChecked();
  });

  it("the top box is off when there are no rows", async () => {
    await renderApp(<DataTable columns={COLUMNS} fetchData={async () => ({ data: [], total: 0 })} selectable />);
    await screen.findByText(T("empty.none"));

    expect(all()).toBeDisabled();
  });

  it("clears the selection with the bar's own button", async () => {
    const { fetchData } = listApi(2);
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} selectable />);
    await screen.findByText("Row 1");
    await userEvent.click(tick(1));

    await userEvent.click(screen.getByTitle(T("selection.clear")));

    expect(tick(1)).not.toBeChecked();
  });

  it("keeps only the ticked rows that are still shown after the list is asked for again, and forgets all after a failure", async () => {
    let rows = makeRows(3);
    let failing = false;
    const fetchData = async () => {
      if (failing) throw new Error("boom");
      return { data: rows, total: rows.length };
    };
    const tableRef = createRef<DataTableRef>();
    await renderApp(<DataTable columns={COLUMNS} fetchData={fetchData} selectable tableRef={tableRef} onError={() => {}} />);
    await screen.findByText("Row 1");
    await userEvent.click(tick(1));
    await userEvent.click(tick(2));

    rows = [rows[1], rows[2]];
    await act(async () => tableRef.current?.refresh());
    await waitFor(() => expect(screen.queryByText("Row 1")).not.toBeInTheDocument());
    expect(screen.getByText(msgf("admin.components.dataTable.selection.count", { count: 1 }))).toBeInTheDocument();

    failing = true;
    await act(async () => tableRef.current?.refresh());
    await screen.findByText(T("error.message"));
    expect(screen.queryByText(msgf("admin.components.dataTable.selection.count", { count: 1 }))).not.toBeInTheDocument();
  });

  it("identifies rows by the caller's key when it gives one", async () => {
    const rows = [{ id: "same", name: "A" }, { id: "same", name: "B" }];
    const keyed = rows.map((r, i) => ({ ...r, code: `c${i}` }));
    const seen = vi.fn();
    await renderApp(
      <DataTable
        columns={[{ key: "name", header: "Name", render: (row: (typeof keyed)[number]) => row.name }]}
        fetchData={async () => ({ data: keyed, total: 2 })}
        keyExtractor={(row) => row.code}
        selectable
        renderBulkActions={({ keys }) => seen(keys) ?? null}
      />
    );
    await screen.findByText("A");

    await userEvent.click(tick(2));

    expect(seen).toHaveBeenLastCalledWith(["c1"]);
  });
});

describe("UI-7 a table that is given its rows (static mode)", () => {
  it("shows the rows it is given and asks nobody", async () => {
    const onError = vi.fn();
    await renderApp(<DataTable columns={COLUMNS} rows={makeRows(2)} onError={onError} />);

    expect(screen.getByText("Row 2")).toBeInTheDocument();
    await wait(50);
    expect(onError).not.toHaveBeenCalled();
  });

  it("shows the loading note while the parent loads, and the empty message with no rows", async () => {
    const view = await renderApp(<DataTable columns={COLUMNS} rows={[]} loading />);
    expect(screen.getByText(T("loading"))).toBeInTheDocument();
    expect(screen.getByText(T("empty.none"))).toBeInTheDocument();
    view.unmount();

    await renderApp(<DataTable columns={COLUMNS} />);
    expect(screen.queryByText(T("loading"))).not.toBeInTheDocument();
    expect(screen.getByText(T("empty.none"))).toBeInTheDocument();
  });

  it("shows every row it is given on one page, even when there are more than a page's worth (see the spec, section 7)", async () => {
    await renderApp(<DataTable columns={COLUMNS} rows={makeRows(60)} />);

    expect(screen.getAllByRole("row")).toHaveLength(61);
    expect(screen.getByTitle(T("pagination.next"))).toBeInTheDocument();
  });
});

describe("UI-8 columns", () => {
  it("renders each cell with its column, aligns to the right on request and hides the column below its breakpoint", async () => {
    const columns: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", render: (row) => row.name, width: "12rem" },
      { key: "price", header: "Price", align: "right", render: () => "1.000 đ" },
      { key: "small", header: "Small", hideBelow: "sm", render: () => "s" },
      { key: "medium", header: "Medium", hideBelow: "md", render: () => "m" },
      { key: "large", header: "Large", hideBelow: "lg", render: () => "l" },
    ];
    await renderApp(<DataTable columns={columns} rows={makeRows(1)} />);

    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveStyle({ width: "12rem" });
    expect(screen.getByRole("columnheader", { name: "Price" }).className).toContain("text-right");
    expect(screen.getByRole("cell", { name: "1.000 đ" }).className).toContain("text-right");
    expect(screen.getByRole("columnheader", { name: "Name" }).className).not.toContain("text-right");
    for (const [name, cls] of [["Small", "sm:table-cell"], ["Medium", "md:table-cell"], ["Large", "lg:table-cell"]] as const) {
      expect(screen.getByRole("columnheader", { name, hidden: true }).className).toContain(`hidden ${cls}`);
    }
    expect(within(screen.getByRole("columnheader", { name: "Name" })).queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await renderApp(<DataTable columns={COLUMNS} fetchData={async () => ({ data: [], total: 0 })} />, { locale: "en" });

    expect(await screen.findByText(T("empty.none", "en"))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(T("search.placeholder", "en"))).toBeInTheDocument();
  });
});
