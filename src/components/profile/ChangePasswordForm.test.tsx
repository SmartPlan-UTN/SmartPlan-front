import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { SessionProvider } from "@/lib/auth";
import { logout, refreshSession } from "@/lib/auth/api";

import { ChangePasswordForm } from "./ChangePasswordForm";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

const changePassword = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, changePassword };
});

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderForm() {
  return render(
    <SessionProvider>
      <ChangePasswordForm />
    </SessionProvider>,
  );
}

async function expand(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));
}

async function expandAndFill(user: ReturnType<typeof userEvent.setup>) {
  await expand(user);
  await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
  await user.type(screen.getByLabelText("Contraseña nueva"), "a-new-password-123");
  await user.type(
    screen.getByLabelText("Confirmar contraseña nueva"),
    "a-new-password-123",
  );
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.mocked(refreshSession).mockRejectedValue(new Error("no session"));
    vi.mocked(logout).mockReset();
    changePassword.mockReset();
    replace.mockClear();
  });

  it("is collapsed by default", () => {
    renderForm();
    expect(screen.queryByLabelText("Contraseña actual")).not.toBeInTheDocument();
  });

  it("expands to show the form", async () => {
    const user = userEvent.setup();
    renderForm();

    await expand(user);

    expect(screen.getByLabelText("Contraseña actual")).toBeInTheDocument();
  });

  it("shows required-field errors without calling the API", async () => {
    const user = userEvent.setup();
    renderForm();

    await expand(user);
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(await screen.findAllByText("Este campo es requerido")).toHaveLength(3);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const user = userEvent.setup();
    renderForm();

    await expand(user);
    await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
    await user.type(screen.getByLabelText("Contraseña nueva"), "a-new-password-123");
    await user.type(screen.getByLabelText("Confirmar contraseña nueva"), "another-one");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(
      await screen.findByText("Las contraseñas no coinciden"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("changes the password, closes the session, and redirects to login", async () => {
    changePassword.mockResolvedValueOnce(undefined);
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderForm();

    await expandAndFill(user);
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "a-current-password",
      newPassword: "a-new-password-123",
    });
    expect(logout).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/login?passwordChanged=1");
  });

  it("shows a field error for the wrong current password, without closing the session", async () => {
    changePassword.mockRejectedValueOnce(
      new ApiError({
        message: "The current password is incorrect",
        type: "HTTP",
        status: 401,
        code: "INVALID_CURRENT_PASSWORD",
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await expandAndFill(user);
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(
      await screen.findByText("La contraseña actual es incorrecta."),
    ).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("clears the fields when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    await expand(user);
    await user.type(screen.getByLabelText("Contraseña actual"), "something");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Contraseña actual")).not.toBeInTheDocument();

    await expand(user);
    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("");
  });
});
