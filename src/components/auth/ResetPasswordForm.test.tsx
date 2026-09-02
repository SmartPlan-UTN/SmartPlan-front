import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/auth/api";

import { ResetPasswordForm } from "./ResetPasswordForm";

vi.mock("@/lib/auth/api", () => ({
  resetPassword: vi.fn(),
}));

async function fillMatchingPasswords(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Contraseña nueva"), "a-valid-password");
  await user.type(screen.getByLabelText("Confirmar contraseña"), "a-valid-password");
}

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.mocked(resetPassword).mockReset();
  });

  it("shows the broken-link state without a form when there is no token", () => {
    render(<ResetPasswordForm token={null} />);

    expect(
      screen.getByText("Este enlace de recuperación no es válido."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actualizar contraseña" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pedir un enlace nuevo" }),
    ).toHaveAttribute("href", "/recover-password");
  });

  it("shows required-field errors without calling the API", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="a-recovery-token" />);

    await user.click(
      screen.getByRole("button", { name: "Actualizar contraseña" }),
    );

    expect(
      await screen.findAllByText("Este campo es requerido"),
    ).toHaveLength(2);
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="a-recovery-token" />);

    await user.type(screen.getByLabelText("Contraseña nueva"), "a-valid-password");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "another-password");
    await user.click(
      screen.getByRole("button", { name: "Actualizar contraseña" }),
    );

    expect(
      await screen.findByText("Las contraseñas no coinciden"),
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("updates the password and shows the success view", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordForm token="a-recovery-token" />);

    await fillMatchingPasswords(user);
    await user.click(
      screen.getByRole("button", { name: "Actualizar contraseña" }),
    );

    expect(
      await screen.findByText("¡Contraseña actualizada!"),
    ).toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith({
      token: "a-recovery-token",
      newPassword: "a-valid-password",
    });
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("accepts the backend minimum password length", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordForm token="a-recovery-token" />);

    await user.type(screen.getByLabelText("Contraseña nueva"), "12345678");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "12345678");
    await user.click(
      screen.getByRole("button", { name: "Actualizar contraseña" }),
    );

    expect(await screen.findByText("¡Contraseña actualizada!")).toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith({
      token: "a-recovery-token",
      newPassword: "12345678",
    });
  });

  it.each([
    ["INVALID_RECOVERY_TOKEN", "Este enlace de recuperación no es válido."],
    ["EXPIRED_RECOVERY_TOKEN", "Este enlace de recuperación venció."],
    ["RECOVERY_TOKEN_ALREADY_USED", "Este enlace de recuperación ya fue usado."],
  ])("replaces the form with the broken-link view for %s", async (code, message) => {
    vi.mocked(resetPassword).mockRejectedValueOnce(
      new ApiError({ message: "Token error", type: "HTTP", status: 400, code }),
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm token="a-recovery-token" />);

    await fillMatchingPasswords(user);
    await user.click(
      screen.getByRole("button", { name: "Actualizar contraseña" }),
    );

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actualizar contraseña" }),
    ).not.toBeInTheDocument();
  });

  it("shows a rate-limit message and keeps the form for ATTEMPT_LIMIT_EXCEEDED", async () => {
    vi.mocked(resetPassword).mockRejectedValueOnce(
      new ApiError({
        message: "Too many attempts",
        type: "HTTP",
        status: 429,
        code: "ATTEMPT_LIMIT_EXCEEDED",
      }),
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm token="a-recovery-token" />);

    await fillMatchingPasswords(user);
    const submitButton = screen.getByRole("button", {
      name: "Actualizar contraseña",
    });
    await user.click(submitButton);

    expect(
      await screen.findByText(
        "Hiciste demasiados intentos. Esperá un momento antes de volver a intentar.",
      ),
    ).toBeInTheDocument();
    expect(submitButton).toBeEnabled();
  });
});
