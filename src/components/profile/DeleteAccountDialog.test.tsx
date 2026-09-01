import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { SessionProvider } from "@/lib/auth";
import { logout, refreshSession } from "@/lib/auth/api";

import { DeleteAccountDialog } from "./DeleteAccountDialog";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

const deleteAccount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, deleteAccount };
});

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderDialog(onCancel = vi.fn()) {
  return render(
    <SessionProvider>
      <DeleteAccountDialog onCancel={onCancel} />
    </SessionProvider>,
  );
}

describe("DeleteAccountDialog", () => {
  beforeEach(() => {
    vi.mocked(refreshSession).mockRejectedValue(new Error("no session"));
    vi.mocked(logout).mockReset();
    deleteAccount.mockReset();
    replace.mockClear();
  });

  it("shows the blurred-backdrop confirmation card, matching the logout prompt's design", () => {
    renderDialog();

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Eliminar cuenta" })).toBeInTheDocument();
    expect(
      screen.getByText(/vas a perder tus planes, favoritos y colecciones guardadas/i),
    ).toBeInTheDocument();
  });

  it("requires the current password before calling the API", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));

    expect(await screen.findByText("Ingresá tu contraseña actual.")).toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes the account, closes the session, and redirects to login", async () => {
    deleteAccount.mockResolvedValueOnce(undefined);
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));

    expect(deleteAccount).toHaveBeenCalledWith({ currentPassword: "a-current-password" });
    await vi.waitFor(() => {
      expect(logout).toHaveBeenCalledOnce();
    });
    expect(replace).toHaveBeenCalledWith("/login?accountDeleted=1");
  });

  it("shows a field error for the wrong current password, without closing the session", async () => {
    deleteAccount.mockRejectedValueOnce(
      new ApiError({
        message: "The current password is incorrect",
        type: "HTTP",
        status: 401,
        code: "INVALID_CURRENT_PASSWORD",
      }),
    );
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Contraseña actual"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));

    expect(
      await screen.findByText("La contraseña actual es incorrecta."),
    ).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a generic error for an unmapped failure", async () => {
    deleteAccount.mockRejectedValueOnce(
      new ApiError({ message: "boom", type: "UNKNOWN" }),
    );
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));

    expect(
      await screen.findByText("No pudimos eliminar tu cuenta. Intentá de nuevo."),
    ).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it("calls onCancel when Cancelar is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderDialog(onCancel);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
