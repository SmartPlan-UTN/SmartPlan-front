import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteAvatar, getProfile, uploadAvatar } from "@/lib/api";
import { UserMenu } from "@/components/layout";
import { downloadMedia } from "@/lib/api/media";
import { publishAvatarChange } from "@/lib/profile/avatarChanges";
import type { UserProfile } from "@/types";

import { ProfileForm } from "./ProfileForm";

const { session } = vi.hoisted(() => ({
  session: {
    status: "authenticated",
    user: { id: 1, name: "Ana", lastName: "Pérez", role: { key: "user" } },
    logout: vi.fn(),
  },
}));
vi.mock("@/lib/auth", () => ({ useSession: () => session }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
}));
vi.mock("@/lib/api/media", () => ({ downloadMedia: vi.fn() }));
vi.mock("./AvatarCropDialog", () => ({
  AvatarCropDialog: ({
    file,
    busy,
    onConfirm,
    error,
  }: {
    file: File;
    busy: boolean;
    onConfirm: (file: File) => Promise<void>;
    error: string | null;
  }) => (
    <div role="dialog" aria-label="Recortar foto">
      <button
        disabled={busy}
        onClick={() => {
          void onConfirm(file);
        }}
      >
        Guardar foto recortada
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  ),
}));

const profile: UserProfile = {
  id: 1,
  name: "Ana",
  lastName: "Pérez",
  email: "ana@example.com",
  role: { key: "user", name: "Usuario" },
  status: { key: "active", name: "Activo" },
  avatarUrl: "/api/media/avatar/1",
};
const oldPhoto = new Blob(["old"], { type: "image/webp" });
const newPhoto = new Blob(["new"], { type: "image/webp" });

function renderAccount() {
  return render(
    <>
      <UserMenu />
      <ProfileForm />
    </>,
  );
}
async function chooseAndSave(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(
    await screen.findByLabelText("Elegir foto"),
    new File(["photo"], "avatar.png", { type: "image/png" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Guardar foto recortada" }),
  );
}

describe("Profile and navbar avatar synchronization (CU5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.status = "authenticated";
    session.user = {
      id: 1,
      name: "Ana",
      lastName: "Pérez",
      role: { key: "user" },
    };
    vi.mocked(getProfile).mockReset().mockResolvedValue(profile);
    vi.mocked(uploadAvatar).mockReset().mockResolvedValue({
      id: 2,
      url: "/api/media/avatar/2",
      createdAt: "2026-10-25T12:00:00Z",
    });
    vi.mocked(deleteAvatar).mockReset().mockResolvedValue(undefined);
    vi.mocked(downloadMedia)
      .mockReset()
      .mockImplementation((url) =>
        Promise.resolve({
          blob: url.endsWith("/2") ? newPhoto : oldPhoto,
          attribution: null,
        }),
      );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((blob: Blob) =>
        blob === newPhoto ? "blob:new" : "blob:old",
      ),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("updates both images immediately after upload, without a profile refetch or navigation", async () => {
    const user = userEvent.setup();
    renderAccount();
    await waitFor(() =>
      expect(screen.getAllByAltText("Avatar de Ana")).toHaveLength(2),
    );
    await chooseAndSave(user);
    await waitFor(() => {
      const photos = screen.getAllByAltText("Avatar de Ana");
      expect(photos).toHaveLength(2);
      photos.forEach((photo) =>
        expect(photo).toHaveAttribute("src", "blob:new"),
      );
    });
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes both images and shows initials after deletion", async () => {
    const user = userEvent.setup();
    renderAccount();
    await waitFor(() =>
      expect(screen.getAllByAltText("Avatar de Ana")).toHaveLength(2),
    );
    await user.click(screen.getByRole("button", { name: "Quitar foto" }));
    await waitFor(() =>
      expect(screen.queryAllByAltText("Avatar de Ana")).toHaveLength(0),
    );
    expect(screen.getAllByText("AP")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Quitar foto" }),
    ).not.toBeInTheDocument();
    expect(getProfile).toHaveBeenCalledTimes(2);
  });

  it("shows initials in both places when there is no photo", async () => {
    vi.mocked(getProfile).mockResolvedValue({ ...profile, avatarUrl: null });
    renderAccount();
    await screen.findByText("ana@example.com");
    expect(screen.getAllByText("AP")).toHaveLength(2);
    expect(downloadMedia).not.toHaveBeenCalled();
  });

  it("keeps initials visible while downloads are pending or fail", async () => {
    const failures: Array<(error: Error) => void> = [];
    vi.mocked(downloadMedia).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          failures.push(reject);
        }),
    );
    renderAccount();
    await screen.findByText("ana@example.com");
    expect(screen.getAllByText("AP")).toHaveLength(2);
    await act(async () => {
      failures.forEach((fail) => fail(new Error("404")));
    });
    expect(screen.getAllByText("AP")).toHaveLength(2);
  });

  it("shows initials when either browser image fails to decode", async () => {
    renderAccount();
    await waitFor(() =>
      expect(screen.getAllByAltText("Avatar de Ana")).toHaveLength(2),
    );
    screen
      .getAllByAltText("Avatar de Ana")
      .forEach((photo) => fireEvent.error(photo));
    expect(screen.getAllByText("AP")).toHaveLength(2);
  });

  it("preserves both old photos when deleting fails", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteAvatar).mockRejectedValue(new Error("Unavailable"));
    renderAccount();
    await waitFor(() =>
      expect(screen.getAllByAltText("Avatar de Ana")).toHaveLength(2),
    );
    await user.click(screen.getByRole("button", { name: "Quitar foto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos quitar tu foto",
    );
    expect(screen.getAllByAltText("Avatar de Ana")).toHaveLength(2);
  });

  it("preserves both old photos when uploading fails and supports retry", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadAvatar).mockRejectedValueOnce(new Error("Unavailable"));
    renderAccount();
    await waitFor(() =>
      expect(screen.getAllByAltText("Avatar de Ana")).toHaveLength(2),
    );
    await chooseAndSave(user);
    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    expect(screen.getAllByAltText("Avatar de Ana")).toHaveLength(2);
    await user.click(
      screen.getByRole("button", { name: "Guardar foto recortada" }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole("button", { name: "Mi cuenta" })).getByAltText(
          "Avatar de Ana",
        ),
      ).toHaveAttribute("src", "blob:new"),
    );
  });

  it.each(["upload", "remove"])(
    "ignores a stale navbar GET after %s",
    async (operation) => {
      let finish!: (value: UserProfile) => void;
      vi.mocked(getProfile).mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      render(<UserMenu />);
      act(() =>
        publishAvatarChange(
          1,
          operation === "upload" ? "/api/media/avatar/2" : null,
        ),
      );
      await act(async () => {
        finish(profile);
      });
      if (operation === "upload") {
        expect(await screen.findByAltText("Avatar de Ana")).toHaveAttribute(
          "src",
          "blob:new",
        );
      } else {
        expect(screen.getByText("AP")).toBeInTheDocument();
        expect(screen.queryByAltText("Avatar de Ana")).not.toBeInTheDocument();
      }
    },
  );

  it("ignores updates for a different account and never reuses the previous user's avatar", async () => {
    const view = render(<UserMenu />);
    expect(await screen.findByAltText("Avatar de Ana")).toHaveAttribute(
      "src",
      "blob:old",
    );
    act(() => publishAvatarChange(99, "/api/media/avatar/2"));
    expect(screen.getByAltText("Avatar de Ana")).toHaveAttribute(
      "src",
      "blob:old",
    );
    session.user = { ...session.user, id: 99, name: "Luis", lastName: "Díaz" };
    vi.mocked(getProfile).mockReturnValueOnce(new Promise(() => {}));
    view.rerender(<UserMenu />);
    expect(screen.getByText("LD")).toBeInTheDocument();
    expect(screen.queryByAltText("Avatar de Ana")).not.toBeInTheDocument();
  });
});
