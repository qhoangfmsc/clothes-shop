import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "@/src/app/[locale]/_components/DataTable";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* Dragging rows to put them in order (specs/platform/ui-kit.md, flow UI-9). jsdom cannot drag, so the drag library's context is a stand-in
   that keeps the `onDragEnd` the table gave it, which the tests then call the way the library would. */

const drag = vi.hoisted(() => ({ onDragEnd: null as null | ((event: { active: { id: string }; over: { id: string } | null }) => void | Promise<void>) }));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: typeof drag.onDragEnd }) => {
      drag.onDragEnd = onDragEnd;
      return <>{children}</>;
    },
  };
});

interface Row {
  id: string;
  name: string;
}

const T = (key: string) => msg(`admin.components.dataTable.${key}`);
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", render: (row) => row.name }];
const ROWS: Row[] = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }, { id: "c", name: "Gamma" }];
const names = () => screen.getAllByRole("row").slice(1).map((row) => row.textContent);
const dragEnd = (from: string, to: string | null) => act(async () => drag.onDragEnd?.({ active: { id: from }, over: to ? { id: to } : null }));

function table(props: Partial<React.ComponentProps<typeof DataTable<Row>>> & { onReorder?: (rows: Row[]) => Promise<void> | void } = {}) {
  const { onReorder = vi.fn(), ...rest } = props;
  return renderApp(
    <DataTable
      columns={COLUMNS}
      fetchData={async () => ({ data: ROWS, total: ROWS.length })}
      defaultSort="priority"
      sortOptions={[{ value: "priority", label: "Priority" }, { value: "name", label: "Name" }]}
      reorder={{ sortValue: "priority", onReorder }}
      {...rest}
    />
  );
}

beforeEach(() => {
  drag.onDragEnd = null;
});

describe("UI-9 putting rows in order by dragging", () => {
  it("gives each row a handle that works while the list is in its own order, unfiltered and on one page", async () => {
    await table();
    await screen.findByText("Alpha");

    const handles = screen.getAllByRole("button", { name: T("reorder.handle") });

    expect(handles).toHaveLength(3);
    expect(handles[0]).toBeEnabled();
  });

  it("moves the row at once and hands the whole list in the new order to the caller", async () => {
    const onReorder = vi.fn();
    await table({ onReorder });
    await screen.findByText("Alpha");

    await dragEnd("a", "c");

    expect(names()).toEqual(["Beta", "Gamma", "Alpha"]);
    expect(onReorder).toHaveBeenCalledWith([ROWS[1], ROWS[2], ROWS[0]]);
  });

  it("puts the rows back when the caller throws (the BE refused the new order)", async () => {
    const onReorder = vi.fn().mockRejectedValue(new Error("no"));
    await table({ onReorder });
    await screen.findByText("Alpha");

    await dragEnd("a", "c");

    await waitFor(() => expect(names()).toEqual(["Alpha", "Beta", "Gamma"]));
    expect(onReorder).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["dropped on itself", "b", "b"],
    ["dropped outside every row", "b", null],
    ["dropped on a row the table does not know", "b", "zzz"],
    ["a row the table does not know", "zzz", "a"],
  ])("changes nothing when a row is %s", async (_label, from, to) => {
    const onReorder = vi.fn();
    await table({ onReorder });
    await screen.findByText("Alpha");

    await dragEnd(from, to);

    expect(names()).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("locks the handles, and says why, once the list is in another order", async () => {
    await table();
    await screen.findByText("Alpha");
    const { default: userEvent } = await import("@testing-library/user-event");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: T("sort.label") }), "name");

    await waitFor(() => expect(screen.getAllByRole("button", { name: T("reorder.disabled") })[0]).toBeDisabled());
  });

  it("locks the handles while a search is active", async () => {
    await table();
    await screen.findByText("Alpha");
    const { default: userEvent } = await import("@testing-library/user-event");

    await userEvent.type(screen.getByPlaceholderText(T("search.placeholder")), "a");

    await waitFor(() => expect(screen.getAllByRole("button", { name: T("reorder.disabled") })[0]).toBeDisabled());
  });

  it("locks the handles when the list has more than one page", async () => {
    await table({ fetchData: async () => ({ data: ROWS, total: 80 }) });
    await screen.findByText("Alpha");

    expect(screen.getAllByRole("button", { name: T("reorder.disabled") })[0]).toBeDisabled();
  });

  it("locks the handles in a table that is given its rows", async () => {
    await renderApp(<DataTable columns={COLUMNS} rows={ROWS} reorder={{ sortValue: "-createdAt", onReorder: vi.fn() }} />);

    expect(screen.getAllByRole("button", { name: T("reorder.disabled") })[0]).toBeDisabled();
  });

  it("has an extra empty header cell for the handles, and the empty message spans it", async () => {
    await table({ fetchData: async () => ({ data: [], total: 0 }) });

    const cell = (await screen.findByText(T("empty.none"))).closest("td");

    expect(cell).toHaveAttribute("colspan", "2");
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });
});
