import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AvatarCropDialog } from "./AvatarCropDialog";

describe("AvatarCropDialog", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses the latest cancel callback and ignores Escape while saving", async () => {
    const user = userEvent.setup();
    const firstCancel = vi.fn();
    const latestCancel = vi.fn();
    const props = {
      file: new File(["photo"], "avatar.png", { type: "image/png" }),
      error: null,
      onConfirm: vi.fn().mockResolvedValue(undefined),
    };
    const { rerender } = render(
      <AvatarCropDialog {...props} busy={false} onCancel={firstCancel} />,
    );
    rerender(<AvatarCropDialog {...props} busy onCancel={latestCancel} />);
    await user.keyboard("{Escape}");
    expect(firstCancel).not.toHaveBeenCalled();
    expect(latestCancel).not.toHaveBeenCalled();

    rerender(<AvatarCropDialog {...props} busy={false} onCancel={latestCancel} />);
    await user.keyboard("{Escape}");
    expect(latestCancel).toHaveBeenCalledOnce();
    expect(firstCancel).not.toHaveBeenCalled();
  });

  it("reads the local photo and exports the crop positioned with the keyboard", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["cropped"], { type: "image/png" }));
    });

    render(
      <AvatarCropDialog
        file={new File(["photo"], "avatar.png", { type: "image/png" })}
        busy={false}
        error={null}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    const preview = screen.getByRole("group", { name: /Vista previa del recorte/ });
    await waitFor(() => expect(preview.querySelector("img")).not.toBeNull());
    const image = preview.querySelector("img");
    if (!image) throw new Error("The local photo preview did not load");
    expect(image.src).toMatch(/^data:image\/png;base64,/);
    Object.defineProperties(image, {
      naturalWidth: { value: 640 },
      naturalHeight: { value: 320 },
    });
    fireEvent.load(image);
    preview.focus();
    await user.keyboard("{ArrowLeft}");
    await user.click(screen.getByRole("button", { name: "Usar esta foto" }));

    expect(drawImage).toHaveBeenCalledWith(image, 152, 0, 320, 320, 0, 0, 512, 512);
    expect(onConfirm).toHaveBeenCalledOnce();
    const croppedFile = onConfirm.mock.calls[0][0] as File;
    expect(croppedFile.name).toBe("avatar.png");
    expect(croppedFile.type).toBe("image/png");
  });
});
