import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import VndInput from "@/src/app/[locale]/_components/VndInput";
import { renderApp } from "@/tests/_support/render";

/* The admin's whole-dong field (specs/platform/currency.md, flows MON-9 and MON-9E). */

function Field({ initial = "", onChange, onReject }: { initial?: string; onChange?: (v: string) => void; onReject?: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <VndInput
      aria-label="amount"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      onReject={onReject}
    />
  );
}

const box = () => screen.getByLabelText("amount") as HTMLInputElement;

describe("MON-9 typing a whole-dong amount", () => {
  it("groups the digits with dots as they are typed", async () => {
    await renderApp(<Field />);

    await userEvent.type(box(), "350000");

    expect(box()).toHaveValue("350.000");
  });

  it("reports every new value to the form", async () => {
    const onChange = vi.fn();
    await renderApp(<Field onChange={onChange} />);

    await userEvent.type(box(), "1234");

    expect(onChange.mock.calls.map(([v]) => v)).toEqual(["1", "12", "123", "1.234"]);
  });

  it("drops letters and symbols", async () => {
    await renderApp(<Field />);

    await userEvent.type(box(), "3a5-0 x");

    expect(box()).toHaveValue("350");
  });

  it("accepts a pasted grouped amount", async () => {
    await renderApp(<Field />);
    await userEvent.click(box());

    await userEvent.paste("1.234.567");

    expect(box()).toHaveValue("1.234.567");
  });

  it("shows the value it is given and is a numeric text box", async () => {
    await renderApp(<Field initial="350.000" />);

    expect(box()).toHaveValue("350.000");
    expect(box()).toHaveAttribute("type", "text");
    expect(box()).toHaveAttribute("inputmode", "numeric");
    expect(box()).toHaveAttribute("autocomplete", "off");
  });

  it("passes other attributes to the input and lets the caller replace the class", async () => {
    await renderApp(<VndInput value="" onChange={() => {}} placeholder="Giá" disabled className="mine" />);

    expect(screen.getByPlaceholderText("Giá")).toBeDisabled();
    expect(screen.getByPlaceholderText("Giá")).toHaveClass("mine");
  });
});

describe("MON-9E a decimal is refused, never read as a bigger whole number", () => {
  it("refuses a pasted decimal: keeps the old value and calls onReject", async () => {
    const onReject = vi.fn();
    const onChange = vi.fn();
    await renderApp(<Field onChange={onChange} onReject={onReject} />);
    await userEvent.click(box());

    await userEvent.paste("350000.5");

    expect(box()).toHaveValue("");
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(["350000,5", "350,", "12.34", "12.3"])("refuses the pasted text %j", async (text) => {
    const onReject = vi.fn();
    await renderApp(<Field onReject={onReject} />);
    await userEvent.click(box());

    await userEvent.paste(text);

    expect(box()).toHaveValue("");
    expect(onReject).toHaveBeenCalled();
  });

  it("refuses the decimal point when it is typed in 13.46, so the form can warn about it", async () => {
    const onReject = vi.fn();
    await renderApp(<Field onReject={onReject} />);

    await userEvent.type(box(), "13.46");

    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("refuses the decimal point itself and keeps what was typed", async () => {
    const onReject = vi.fn();
    await renderApp(<Field initial="13" onReject={onReject} />);
    await userEvent.click(box());

    await userEvent.keyboard(".");

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(box()).toHaveValue("13");
  });

  it("does not need onReject", async () => {
    await renderApp(<Field />);
    await userEvent.click(box());

    await userEvent.paste("1,5");

    expect(box()).toHaveValue("");
  });

  it("still lets the admin delete characters, even when that leaves a short last group", async () => {
    const onReject = vi.fn();
    await renderApp(<Field initial="350.000" onReject={onReject} />);

    await userEvent.type(box(), "{Backspace}");

    expect(box()).toHaveValue("35.000");
    expect(onReject).not.toHaveBeenCalled();
  });

  it("lets the admin clear the field", async () => {
    await renderApp(<Field initial="350.000" />);

    await userEvent.clear(box());

    expect(box()).toHaveValue("");
  });
});
