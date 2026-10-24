import { useState } from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ImageListField } from "@/src/app/[locale]/_components/ImageListField";
import { ImagePreviewLightbox } from "@/src/app/[locale]/_components/ImagePreviewLightbox";
import { ImageUrlField } from "@/src/app/[locale]/_components/ImageUrlField";
import { API } from "@/tests/_support/api";
import { msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* The image inputs of admin forms and their preview (specs/platform/ui-kit.md, flows UI-14 to UI-16E). */

const I = (key: string, locale: "vi" | "en" = "vi") => msg(`admin.components.imageFields.${key}`, locale);
const STORAGE = "https://abc.supabase.co/storage/v1/object/public/media/shirts/a.jpg";

interface Upload {
  count: number;
}

/** The BE's media endpoint: answers each uploaded file with a new URL (`https://cdn.test/u<n>.png`), or refuses. */
function mediaApi(options: { fail?: { status: number; body: Record<string, unknown> } } = {}) {
  const uploads: Upload = { count: 0 };
  server.use(
    http.post(`${API}/api/admin/media`, async ({ request }) => {
      if (options.fail) return HttpResponse.json(options.fail.body, { status: options.fail.status });
      const body = await request.formData();
      expect(body.get("file")).toMatchObject({ type: "image/png", size: 1 });
      uploads.count += 1;
      return HttpResponse.json({ data: { id: "m1", name: "x", mimeType: "image/png", sizeOriginal: 1, url: `https://cdn.test/u${uploads.count}.png` } });
    })
  );
  return uploads;
}

const file = (name: string) => new File(["x"], name, { type: "image/png" });
const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement;

function UrlHarness({ initial = "", onValue }: { initial?: string; onValue?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <ImageUrlField
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

function ListHarness({ initial = [], onValue }: { initial?: string[]; onValue?: (value: string[]) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <ImageListField
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

describe("UI-14 one image address (ImageUrlField)", () => {
  it("shows the address, its default hint, or the caller's own, and passes typing on", async () => {
    const seen = vi.fn();
    const view = await renderApp(<UrlHarness onValue={seen} />);
    expect(screen.getByPlaceholderText(I("url.placeholder"))).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(I("url.placeholder")), "ab");

    expect(seen).toHaveBeenLastCalledWith("ab");
    view.unmount();
    await renderApp(<ImageUrlField value="" onChange={() => {}} placeholder="Banner URL" />);
    expect(screen.getByPlaceholderText("Banner URL")).toBeInTheDocument();
  });

  it("shows no preview without an address, and a preview through the media path when there is one", async () => {
    const view = await renderApp(<UrlHarness />);
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
    view.unmount();

    const { container } = await renderApp(<UrlHarness initial={STORAGE} />);

    expect(container.querySelector("img")).toHaveAttribute("src", "/media/shirts/a.jpg");
  });

  it("uploads the chosen file, fills the field with the URL the BE gave and says so", async () => {
    const uploads = mediaApi();
    const seen = vi.fn();
    const { container } = await renderApp(<UrlHarness onValue={seen} />);

    await userEvent.upload(fileInput(container), file("hero.png"));

    await waitFor(() => expect(seen).toHaveBeenLastCalledWith("https://cdn.test/u1.png"));
    expect(uploads.count).toBe(1);
    expect(await screen.findByText(I("toast.imageUploaded"))).toBeInTheDocument();
  });

  it("opens the file chooser from its button, and only one file kind, images", async () => {
    const { container } = await renderApp(<UrlHarness />);
    const click = vi.spyOn(fileInput(container), "click");

    await userEvent.click(screen.getByRole("button", { name: I("url.upload") }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(fileInput(container)).toHaveAttribute("accept", "image/*");
  });

  it("locks the upload button while a file is on its way", async () => {
    let release!: () => void;
    server.use(
      http.post(`${API}/api/admin/media`, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json({ data: { id: "m", name: "a", mimeType: "image/png", sizeOriginal: 1, url: "https://cdn.test/a.png" } });
      })
    );
    const { container } = await renderApp(<UrlHarness />);

    await userEvent.upload(fileInput(container), file("a.png"));

    await waitFor(() => expect(screen.getByRole("button", { name: I("url.upload") })).toBeDisabled());
    release();
    await waitFor(() => expect(screen.getByRole("button", { name: I("url.upload") })).toBeEnabled());
  });

  it("tells the admin when the BE refuses the file, and leaves the field as it was", async () => {
    mediaApi({ fail: { status: 413, body: { message: "File too large" } } });
    const seen = vi.fn();
    const { container } = await renderApp(<UrlHarness initial="https://old.test/x.png" onValue={seen} />);

    await userEvent.upload(fileInput(container), file("big.png"));

    expect(await screen.findByText("File too large")).toBeInTheDocument();
    expect(seen).not.toHaveBeenCalled();
  });

  it("uses its own words when the BE says nothing", async () => {
    mediaApi({ fail: { status: 500, body: {} } });
    const { container } = await renderApp(<UrlHarness />);

    await userEvent.upload(fileInput(container), file("a.png"));

    expect(await screen.findByText(I("toast.uploadFailed"))).toBeInTheDocument();
  });

  it("does nothing when the chooser is closed without a file", async () => {
    const seen = vi.fn();
    const { container } = await renderApp(<UrlHarness onValue={seen} />);

    fireEvent.change(fileInput(container), { target: { files: [] } });

    expect(seen).not.toHaveBeenCalled();
  });
});

describe("UI-15 looking at the image (preview)", () => {
  it("opens a larger view when the thumbnail is clicked, and closes it", async () => {
    const { container } = await renderApp(<UrlHarness initial={STORAGE} />);

    await userEvent.click(container.querySelector("img")!);

    expect(document.body.querySelectorAll("img")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.close") }));
    await waitFor(() => expect(document.body.querySelectorAll("img")).toHaveLength(1));
  });

  it("shows a broken-image mark instead of a thumbnail that fails to load, and does not open a view on it", async () => {
    const { container } = await renderApp(<UrlHarness initial="https://broken.test/x.png" />);

    fireEvent.error(container.querySelector("img")!);

    expect(container.querySelector("img")).toBeNull();
    const box = container.querySelector(".w-20")!;
    expect(box.className).not.toContain("cursor-pointer");
    await userEvent.click(box);
    expect(screen.queryByRole("button", { name: msg("common.actions.close") })).not.toBeInTheDocument();
  });

  it("tries the thumbnail again after the address is edited", async () => {
    const { container } = await renderApp(<UrlHarness initial="https://broken.test/x.png" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();

    await userEvent.type(screen.getByPlaceholderText(I("url.placeholder")), "1");

    expect(container.querySelector("img")).not.toBeNull();
  });

  it("tries the thumbnail again after a new file is uploaded", async () => {
    mediaApi();
    const { container } = await renderApp(<UrlHarness initial="https://broken.test/x.png" />);
    fireEvent.error(container.querySelector("img")!);

    await userEvent.upload(fileInput(container), file("new.png"));

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
  });
});

describe("UI-16 a list of images (ImageListField)", () => {
  const A = "https://cdn.test/a.png";
  const B = "https://cdn.test/b.png";

  it("shows each image through the media path, and marks the first as the main one", async () => {
    const { container } = await renderApp(<ListHarness initial={[STORAGE, B]} />);

    const images = Array.from(container.querySelectorAll("img"));

    expect(images.map((img) => img.getAttribute("src"))).toEqual(["/media/shirts/a.jpg", B]);
    expect(screen.getAllByText(I("list.main"))).toHaveLength(1);
    expect(within(images[0].parentElement!).getByText(I("list.main"))).toBeInTheDocument();
    expect(within(images[1].parentElement!).queryByText(I("list.main"))).not.toBeInTheDocument();
  });

  it("removes the image that was asked to go, and the others stay in order", async () => {
    const seen = vi.fn();
    await renderApp(<ListHarness initial={[A, B, "https://cdn.test/c.png"]} onValue={seen} />);

    await userEvent.click(screen.getAllByTitle(I("list.remove"))[1]);

    expect(seen).toHaveBeenLastCalledWith([A, "https://cdn.test/c.png"]);
  });

  it("shows the remove button without hovering on a touch screen and when it has keyboard focus", async () => {
    await renderApp(<ListHarness initial={[A]} />);

    const className = screen.getByTitle(I("list.remove")).className;

    expect(className).toContain("pointer-coarse:opacity-100");
    expect(className).toContain("focus-visible:opacity-100");
  });

  it("adds a pasted address with its button or with Enter, trimmed, and empties the box", async () => {
    const seen = vi.fn();
    await renderApp(<ListHarness initial={[A]} onValue={seen} />);
    const box = screen.getByPlaceholderText(I("list.urlPlaceholder"));

    await userEvent.type(box, "  https://cdn.test/new.png  ");
    await userEvent.click(screen.getByRole("button", { name: I("list.addUrl") }));
    expect(seen).toHaveBeenLastCalledWith([A, "https://cdn.test/new.png"]);
    expect(box).toHaveValue("");

    await userEvent.type(box, "https://cdn.test/enter.png{Enter}");
    expect(seen).toHaveBeenLastCalledWith([A, "https://cdn.test/new.png", "https://cdn.test/enter.png"]);
  });

  it("ignores an empty or blank address", async () => {
    const seen = vi.fn();
    await renderApp(<ListHarness onValue={seen} />);

    await userEvent.click(screen.getByRole("button", { name: I("list.addUrl") }));
    await userEvent.type(screen.getByPlaceholderText(I("list.urlPlaceholder")), "   {Enter}");

    expect(seen).not.toHaveBeenCalled();
  });

  it("does not submit the form around it when Enter adds an address", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    await renderApp(
      <form onSubmit={onSubmit}>
        <ListHarness />
        <button type="submit">go</button>
      </form>
    );

    await userEvent.type(screen.getByPlaceholderText(I("list.urlPlaceholder")), "https://x.test/a.png{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("uploads several files at once, adds them after the existing ones and says how many", async () => {
    const uploads = mediaApi();
    const seen = vi.fn();
    const { container } = await renderApp(<ListHarness initial={[A]} onValue={seen} />);

    await userEvent.upload(fileInput(container), [file("one.png"), file("two.png")]);

    await waitFor(() => expect(seen).toHaveBeenCalledTimes(1));
    expect(seen.mock.calls[0][0]).toHaveLength(3);
    expect(seen.mock.calls[0][0][0]).toBe(A);
    expect(new Set(seen.mock.calls[0][0].slice(1))).toEqual(new Set(["https://cdn.test/u1.png", "https://cdn.test/u2.png"]));
    expect(uploads.count).toBe(2);
    expect(await screen.findByText(msgf("admin.components.imageFields.toast.imagesUploaded", { count: 2 }))).toBeInTheDocument();
  });

  it("adds nothing and says so when one of the files is refused", async () => {
    mediaApi({ fail: { status: 415, body: { message: "Not an image" } } });
    const seen = vi.fn();
    const { container } = await renderApp(<ListHarness initial={[A]} onValue={seen} />);

    await userEvent.upload(fileInput(container), [file("one.png")]);

    expect(await screen.findByText("Not an image")).toBeInTheDocument();
    expect(seen).not.toHaveBeenCalled();
  });

  it("opens the file chooser from the plus tile, which accepts several images and locks while uploading", async () => {
    let release!: () => void;
    server.use(
      http.post(`${API}/api/admin/media`, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json({ data: { id: "m", name: "a", mimeType: "image/png", sizeOriginal: 1, url: "https://cdn.test/a.png" } });
      })
    );
    const { container } = await renderApp(<ListHarness />);
    const click = vi.spyOn(fileInput(container), "click");
    expect(fileInput(container)).toHaveAttribute("multiple");
    expect(fileInput(container)).toHaveAttribute("accept", "image/*");

    await userEvent.click(screen.getByTitle(I("list.uploadImage")));
    expect(click).toHaveBeenCalledTimes(1);
    await userEvent.upload(fileInput(container), file("a.png"));

    await waitFor(() => expect(screen.getByTitle(I("list.uploadImage"))).toBeDisabled());
    release();
    await waitFor(() => expect(screen.getByTitle(I("list.uploadImage"))).toBeEnabled());
  });

  it("does nothing when the chooser is closed without files", async () => {
    const seen = vi.fn();
    const { container } = await renderApp(<ListHarness onValue={seen} />);

    fireEvent.change(fileInput(container), { target: { files: [] } });

    expect(seen).not.toHaveBeenCalled();
  });

  it("opens a larger view of an image when it is clicked", async () => {
    const { container } = await renderApp(<ListHarness initial={[A]} />);

    await userEvent.click(container.querySelector("img")!);

    expect(document.body.querySelectorAll("img")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.close") }));
    await waitFor(() => expect(document.body.querySelectorAll("img")).toHaveLength(1));
  });
});

describe("UI-17 the larger view (ImagePreviewLightbox)", () => {
  it("shows nothing while closed", async () => {
    await renderApp(
      <ImagePreviewLightbox open={false} onClose={() => {}}>
        <p>picture</p>
      </ImagePreviewLightbox>
    );

    expect(screen.queryByText("picture")).not.toBeInTheDocument();
  });

  it("shows its content and caption in front of the page, and closes with the button or a click on the dark area", async () => {
    const onClose = vi.fn();
    await renderApp(
      <ImagePreviewLightbox open onClose={onClose} caption={<span>caption text</span>}>
        <p>picture</p>
      </ImagePreviewLightbox>
    );

    expect(await screen.findByText("picture")).toBeInTheDocument();
    expect(screen.getByText("caption text")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.close") }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("picture").parentElement!.parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("stays open when the picture itself is clicked, and has no caption row without a caption", async () => {
    const onClose = vi.fn();
    await renderApp(
      <ImagePreviewLightbox open onClose={onClose}>
        <p>picture</p>
      </ImagePreviewLightbox>
    );

    await userEvent.click(await screen.findByText("picture"));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("picture").parentElement!.children).toHaveLength(1);
  });

  it("is attached to the page's body, outside the form it is opened from", async () => {
    await renderApp(
      <form data-testid="form">
        <ImagePreviewLightbox open onClose={() => {}}>
          <p>picture</p>
        </ImagePreviewLightbox>
      </form>
    );

    expect(screen.getByTestId("form")).not.toContainElement(await screen.findByText("picture"));
  });
});
