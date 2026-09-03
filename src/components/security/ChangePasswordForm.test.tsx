import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { SessionProvider } from "@/lib/auth";
import { refreshSession } from "@/lib/auth/api";

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

/** Satisfies all three requirements (8+ chars, uppercase, digit + symbol) so
 * a success path doesn't accidentally get blocked by the same validation
 * the failure-path tests exercise on purpose. */
const VALID_NEW_PASSWORD = "Passw0rd!123";

function reissuedAuthentication() {
  return {
    accessToken: "new-access-token",
    tokenType: "Bearer" as const,
    expiresIn: 900,
    user: {
      id: 1,
      name: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: { key: "user", name: "User" },
      permissions: [],
    },
  };
}

function renderForm() {
  return render(
    <SessionProvider>
      <ChangePasswordForm />
    </SessionProvider>,
  );
}

/** Opens the collapsed form via "Cambiar contraseña" — every test that
 * interacts with the fields needs this first now that the form starts
 * collapsed (see the "starts collapsed" test below). */
async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

async function fillFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
  await user.type(screen.getByLabelText("Contraseña nueva"), VALID_NEW_PASSWORD);
  await user.type(
    screen.getByLabelText("Confirmar contraseña nueva"),
    VALID_NEW_PASSWORD,
  );
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.mocked(refreshSession).mockRejectedValue(new Error("no session"));
    changePassword.mockReset();
  });

  it("starts collapsed, with a Cambiar contraseña button to open it", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(
      screen.queryByLabelText("Contraseña actual"),
    ).not.toBeInTheDocument();

    await openForm(user);

    expect(screen.getByLabelText("Contraseña actual")).toBeInTheDocument();
  });

  it("shows required-field errors without calling the API", async () => {
    const user = userEvent.setup();
    renderForm();

    await openForm(user);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findAllByText("Este campo es requerido")).toHaveLength(3);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const user = userEvent.setup();
    renderForm();

    await openForm(user);
    await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
    await user.type(screen.getByLabelText("Contraseña nueva"), VALID_NEW_PASSWORD);
    await user.type(screen.getByLabelText("Confirmar contraseña nueva"), "another-one");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Las contraseñas no coinciden"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("rejects a new password missing an uppercase letter before calling the API", async () => {
    const user = userEvent.setup();
    renderForm();

    await openForm(user);
    await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
    await user.type(screen.getByLabelText("Contraseña nueva"), "no-uppercase-1!");
    await user.type(
      screen.getByLabelText("Confirmar contraseña nueva"),
      "no-uppercase-1!",
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("La contraseña debe incluir al menos una mayúscula"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("rejects a new password missing a digit or symbol before calling the API", async () => {
    const user = userEvent.setup();
    renderForm();

    await openForm(user);
    await user.type(screen.getByLabelText("Contraseña actual"), "a-current-password");
    await user.type(screen.getByLabelText("Contraseña nueva"), "OnlyLetters");
    await user.type(screen.getByLabelText("Confirmar contraseña nueva"), "OnlyLetters");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("La contraseña debe incluir números y símbolos"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("changes the password and stays signed in instead of logging out", async () => {
    changePassword.mockResolvedValueOnce(reissuedAuthentication());
    const user = userEvent.setup();
    renderForm();

    await openForm(user);
    await fillFields(user);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "a-current-password",
      newPassword: VALID_NEW_PASSWORD,
    });

    // Collapses back and confirms success inline — no navigation, no
    // logged-out state, since the account is still signed in on this device.
    expect(
      await screen.findByText("Contraseña actualizada correctamente"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Contraseña actual")).not.toBeInTheDocument();
  });

  it("shows a field error for the wrong current password, without applying any session change", async () => {
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

    await openForm(user);
    await fillFields(user);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("La contraseña actual es incorrecta."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Contraseña actualizada correctamente"),
    ).not.toBeInTheDocument();
  });

  it("shows the minimum-length requirement as met once it's satisfied", async () => {
    const user = userEvent.setup();
    renderForm();

    await openForm(user);
    const requirementRow = screen.getByText("Mínimo 8 caracteres").closest("li");
    expect(requirementRow).not.toBeNull();

    const newPasswordInput = screen.getByLabelText("Contraseña nueva");
    await user.type(newPasswordInput, "short");
    expect(requirementRow?.querySelector("svg")).toBeFalsy();

    await user.type(newPasswordInput, "-enough-now");
    expect(requirementRow?.querySelector("svg")).toBeTruthy();
  });

  it("shows the uppercase/digit+symbol rows as met once satisfied", async () => {
    const user = userEvent.setup();
    renderForm();

    await openForm(user);
    const uppercaseRow = screen.getByText("Al menos una mayúscula").closest("li");
    const symbolRow = screen.getByText("Incluir números y símbolos").closest("li");

    await user.type(screen.getByLabelText("Contraseña nueva"), "lowercase-only-password");
    expect(uppercaseRow?.querySelector("svg")).toBeFalsy();
    expect(symbolRow?.querySelector("svg")).toBeFalsy();

    await user.type(screen.getByLabelText("Contraseña nueva"), VALID_NEW_PASSWORD);
    expect(uppercaseRow?.querySelector("svg")).toBeTruthy();
    expect(symbolRow?.querySelector("svg")).toBeTruthy();
  });

  it("collapses and clears the fields when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    await openForm(user);
    await user.type(screen.getByLabelText("Contraseña actual"), "something");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Contraseña actual")).not.toBeInTheDocument();

    await openForm(user);
    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("");
  });
});
