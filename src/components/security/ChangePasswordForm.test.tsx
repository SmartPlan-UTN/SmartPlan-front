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

async function fillFields(user: ReturnType<typeof userEvent.setup>) {
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

  it("renders the form directly, with no toggle to open it", () => {
    renderForm();
    expect(screen.getByLabelText("Contraseña actual")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cambiar contraseña/i }),
    ).not.toBeInTheDocument();
  });

  it("shows required-field errors without calling the API", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findAllByText("Este campo es requerido")).toHaveLength(3);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
    await user.type(screen.getByLabelText("Contraseña nueva"), "a-new-password-123");
    await user.type(screen.getByLabelText("Confirmar contraseña nueva"), "another-one");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

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

    await fillFields(user);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

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

    await fillFields(user);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("La contraseña actual es incorrecta."),
    ).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the minimum-length requirement as met once it's satisfied", async () => {
    const user = userEvent.setup();
    renderForm();

    const requirementRow = screen.getByText("Mínimo 12 caracteres").closest("li");
    expect(requirementRow).not.toBeNull();

    const newPasswordInput = screen.getByLabelText("Contraseña nueva");
    await user.type(newPasswordInput, "short");
    expect(requirementRow?.querySelector("svg")).toBeFalsy();

    await user.type(newPasswordInput, "-enough-now");
    expect(requirementRow?.querySelector("svg")).toBeTruthy();
  });

  it("shows the informational uppercase/digit+symbol rows without blocking submission", async () => {
    changePassword.mockResolvedValueOnce(undefined);
    vi.mocked(logout).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderForm();

    const uppercaseRow = screen.getByText("Al menos una mayúscula").closest("li");
    const symbolRow = screen.getByText("Incluir números y símbolos").closest("li");

    // A valid password by the real rule (12+ characters) with no uppercase
    // and no digit/symbol: both informational rows stay unmet...
    await user.type(screen.getByLabelText("Contraseña nueva"), "lowercase-only-password");
    expect(uppercaseRow?.querySelector("svg")).toBeFalsy();
    expect(symbolRow?.querySelector("svg")).toBeFalsy();

    // ...but submitting still succeeds: the backend doesn't enforce them.
    await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
    await user.type(
      screen.getByLabelText("Confirmar contraseña nueva"),
      "lowercase-only-password",
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "a-current-password",
      newPassword: "lowercase-only-password",
    });
  });

  it("clears the fields when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Contraseña actual"), "something");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("");
  });
});
