import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FormActions,
  FormField,
  FormSection,
  FormTabs,
  InfoHint as ReExportedInfoHint,
  inputClass,
  ModalBody,
  ModalShell,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { InfoHint } from "@/src/app/[locale]/_components/InfoHint";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The building blocks of every admin popup form and the "i" hint (specs/platform/ui-kit.md, flows UI-12 to UI-13). */

const F = (key: string, locale: "vi" | "en" = "vi") => msg(`admin.components.formKit.${key}`, locale);

describe("UI-12 the popup frame", () => {
  it("shows the title and the content, and closes with its button", async () => {
    const onClose = vi.fn();
    await renderApp(
      <ModalShell title="Edit product" onClose={onClose}>
        <p>content</p>
      </ModalShell>
    );

    expect(screen.getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: F("close") }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the dark area around it is clicked, but not when the box itself is", async () => {
    const onClose = vi.fn();
    await renderApp(
      <ModalShell title="Edit" onClose={onClose}>
        <p>content</p>
      </ModalShell>
    );

    await userEvent.click(screen.getByText("content"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("heading", { name: "Edit" }).closest(".fixed") as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is 40rem wide unless the caller wants another width", async () => {
    const view = await renderApp(
      <ModalShell title="A" onClose={() => {}}>
        x
      </ModalShell>
    );
    expect(screen.getByRole("heading", { name: "A" }).closest(".max-w-160")).not.toBeNull();
    view.unmount();

    await renderApp(
      <ModalShell title="B" onClose={() => {}} maxWidthClass="max-w-3xl">
        x
      </ModalShell>
    );
    expect(screen.getByRole("heading", { name: "B" }).closest(".max-w-3xl")).not.toBeNull();
  });

  it("the body scrolls on its own and takes extra classes", async () => {
    await renderApp(<ModalBody className="gap-9">body</ModalBody>);

    const body = screen.getByText("body");
    expect(body.className).toContain("overflow-y-auto");
    expect(body.className).toContain("gap-9");
  });
});

describe("UI-12 tabs, sections, fields and the buttons at the bottom", () => {
  it("shows the tabs, marks the open one and tells which one was picked", async () => {
    const onChange = vi.fn();
    await renderApp(
      <FormTabs
        tabs={[{ id: "a", label: "General" }, { id: "b", label: "Images" }]}
        active="a"
        onChange={onChange}
      />
    );

    expect(screen.getByRole("button", { name: "General" }).className).toContain("border-[var(--accent-primary)]");
    expect(screen.getByRole("button", { name: "Images" }).className).toContain("border-transparent");
    await userEvent.click(screen.getByRole("button", { name: "Images" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("groups fields under a legend, or without one", async () => {
    const view = await renderApp(
      <FormSection title="Price">
        <input aria-label="vnd" />
      </FormSection>
    );
    expect(screen.getByRole("group", { name: "Price" })).toBeInTheDocument();
    view.unmount();

    await renderApp(
      <FormSection>
        <input aria-label="vnd" />
      </FormSection>
    );
    expect(screen.queryByText("Price")).not.toBeInTheDocument();
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("labels a field, marks a required one with a star and explains with a hint when asked", async () => {
    const view = await renderApp(
      <FormField label="Name">
        <input />
      </FormField>
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    view.unmount();

    await renderApp(
      <FormField label="Name" required info="Shown to shoppers">
        <input />
      </FormField>
    );
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shown to shoppers" })).toBeInTheDocument();
  });

  it("cancels with its button, and submits the form it is in", async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    await renderApp(
      <form onSubmit={onSubmit}>
        <FormActions onCancel={onCancel} submitLabel="Save" />
      </form>
    );

    await userEvent.click(screen.getByRole("button", { name: F("cancel") }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("locks the submit button while saving and says so, in its own words if it has any", async () => {
    const view = await renderApp(<FormActions onCancel={() => {}} submitLabel="Save" isSaving />);
    expect(screen.getByRole("button", { name: F("saving") })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    view.unmount();

    await renderApp(<FormActions onCancel={() => {}} submitLabel="Save" isSaving savingLabel="Sending…" />);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });

  it("leaves the submit button open when not saving", async () => {
    await renderApp(<FormActions onCancel={() => {}} submitLabel="Save" />);

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("offers one input style, big enough to type on a phone", () => {
    expect(inputClass).toContain("w-full");
    expect(inputClass).toContain("pointer-coarse:text-base");
    expect(inputClass).toContain("pointer-coarse:min-h-11");
  });

  it("speaks English in English", async () => {
    await renderApp(<FormActions onCancel={() => {}} submitLabel="Save" />, { locale: "en" });

    expect(screen.getByRole("button", { name: F("cancel", "en") })).toBeInTheDocument();
  });

  it("the hint is the same component the storefront uses", () => {
    expect(ReExportedInfoHint).toBe(InfoHint);
  });
});

describe("UI-13 the 'i' hint", () => {
  const icon = () => screen.getByRole("button", { name: "Explains it" });

  it("is closed at first and names itself with its text", async () => {
    await renderApp(<InfoHint text="Explains it" />);

    expect(icon()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens under a mouse and closes when the mouse leaves", async () => {
    await renderApp(<InfoHint text="Explains it" />);

    fireEvent.pointerEnter(icon(), { pointerType: "mouse" });
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Explains it");
    expect(icon()).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerLeave(icon(), { pointerType: "mouse" });

    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("is not opened by a finger passing over it", async () => {
    await renderApp(<InfoHint text="Explains it" />);

    fireEvent.pointerEnter(icon(), { pointerType: "touch" });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens on a tap and closes on the next tap", async () => {
    await renderApp(<InfoHint text="Explains it" />);

    fireEvent.pointerDown(icon(), { pointerType: "touch" });
    fireEvent.click(icon());
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(icon(), { pointerType: "touch" });
    fireEvent.click(icon());

    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("closes when the touch lands anywhere else, but not inside itself", async () => {
    await renderApp(
      <div>
        <InfoHint text="Explains it" />
        <p>elsewhere</p>
      </div>
    );
    fireEvent.pointerDown(icon(), { pointerType: "touch" });
    fireEvent.click(icon());
    await screen.findByRole("tooltip");

    fireEvent.pointerDown(screen.getByRole("tooltip"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("elsewhere"));

    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("a mouse click does not open it by itself (hover does)", async () => {
    await renderApp(<InfoHint text="Explains it" />);

    fireEvent.pointerDown(icon(), { pointerType: "mouse" });
    fireEvent.click(icon());

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  /* jsdom does not know `:focus-visible`: the stand-in answers it and leaves every other selector to the real `matches` */
  const focusVisible = (button: HTMLElement, answer: boolean) => {
    const real = button.matches.bind(button);
    return vi.spyOn(button, "matches").mockImplementation((selector: string) => (selector === ":focus-visible" ? answer : real(selector)));
  };

  it("opens with the keyboard and closes when focus leaves", async () => {
    await renderApp(<InfoHint text="Explains it" />);
    const button = icon();
    focusVisible(button, true);

    fireEvent.focus(button);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(button);

    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("is not opened by focus that comes from a click", async () => {
    await renderApp(<InfoHint text="Explains it" />);
    const button = icon();
    focusVisible(button, false);

    fireEvent.focus(button);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("slides the bubble back inside the screen when it would stick out on the left or the right", async () => {
    const edge = (left: number, right: number) => vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ left, right, top: 0, bottom: 0, width: right - left, height: 0, x: left, y: 0, toJSON() {} }));
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 400 });
    const left = edge(-20, 100);
    await renderApp(<InfoHint text="Explains it" />);

    fireEvent.pointerEnter(icon(), { pointerType: "mouse" });
    expect((await screen.findByRole("tooltip")).style.translate).toBe("28px");
    fireEvent.pointerLeave(icon(), { pointerType: "mouse" });
    left.mockRestore();

    const right = edge(300, 450);
    fireEvent.pointerEnter(icon(), { pointerType: "mouse" });
    expect((await screen.findByRole("tooltip")).style.translate).toBe("-58px");
    fireEvent.pointerLeave(icon(), { pointerType: "mouse" });
    right.mockRestore();

    const inside = edge(100, 200);
    fireEvent.pointerEnter(icon(), { pointerType: "mouse" });
    expect((await screen.findByRole("tooltip")).style.translate).toBe("0px");
    inside.mockRestore();
  });

  it("has a bigger touch area when the icon is big (headings) than when it is small (labels)", async () => {
    const view = await renderApp(<InfoHint text="Explains it" />);
    expect(icon().className).toContain("pointer-coarse:w-6");
    view.unmount();

    await renderApp(<InfoHint text="Explains it" size={18} />);
    expect(icon().className).toContain("pointer-coarse:w-11");
  });
});
