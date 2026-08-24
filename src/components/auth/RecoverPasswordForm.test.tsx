import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { requestPasswordRecovery } from "@/lib/auth/api";

import { RecoverPasswordForm } from "./RecoverPasswordForm";

vi.mock("@/lib/auth/api", () => ({
  requestPasswordRecovery: vi.fn(),
}));

describe("RecoverPasswordForm", () => {
  beforeEach(() => {
    vi.mocked(requestPasswordRecovery).mockReset();
  });

  it("shows a required-field error without calling the API", async () => {
    const user = userEvent.setup();
    render(<RecoverPasswordForm />);

    await user.click(
      screen.getByRole("button", { name: "Enviar enlace de recuperación" }),
    );

    expect(await screen.findByText("Este campo es requerido")).toBeInTheDocument();
    expect(requestPasswordRecovery).not.toHaveBeenCalled();
  });

  it("rejects a malformed email before calling the API", async () => {
    const user = userEvent.setup();
    render(<RecoverPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(
      screen.getByRole("button", { name: "Enviar enlace de recuperación" }),
    );

    expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument();
    expect(requestPasswordRecovery).not.toHaveBeenCalled();
  });

  it("shows the success view after the email is sent", async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<RecoverPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(
      screen.getByRole("button", { name: "Enviar enlace de recuperación" }),
    );

    expect(await screen.findByText("¡Correo enviado!")).toBeInTheDocument();
    expect(requestPasswordRecovery).toHaveBeenCalledWith({
      email: "ana@example.com",
    });
  });

  it("shows an unregistered-email message on the field, not as a form banner", async () => {
    vi.mocked(requestPasswordRecovery).mockRejectedValueOnce(
      new ApiError({
        message: "No account is registered with that email address",
        type: "HTTP",
        status: 404,
        code: "EMAIL_NOT_REGISTERED",
      }),
    );
    const user = userEvent.setup();
    render(<RecoverPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(
      screen.getByRole("button", { name: "Enviar enlace de recuperación" }),
    );

    expect(
      await screen.findByText("No existe ninguna cuenta con este email."),
    ).toBeInTheDocument();
    expect(screen.queryByText("¡Correo enviado!")).not.toBeInTheDocument();
  });

  it("shows a rate-limit message for ATTEMPT_LIMIT_EXCEEDED", async () => {
    vi.mocked(requestPasswordRecovery).mockRejectedValueOnce(
      new ApiError({
        message: "Too many attempts",
        type: "HTTP",
        status: 429,
        code: "ATTEMPT_LIMIT_EXCEEDED",
      }),
    );
    const user = userEvent.setup();
    render(<RecoverPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(
      screen.getByRole("button", { name: "Enviar enlace de recuperación" }),
    );

    expect(
      await screen.findByText(
        "Hiciste demasiados intentos. Esperá un momento antes de volver a intentar.",
      ),
    ).toBeInTheDocument();
  });

  it("returns to the form when Reenviar is clicked from the success view", async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<RecoverPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(
      screen.getByRole("button", { name: "Enviar enlace de recuperación" }),
    );
    await screen.findByText("¡Correo enviado!");

    await user.click(screen.getByRole("button", { name: "Reenviar" }));

    expect(
      screen.getByRole("button", { name: "Enviar enlace de recuperación" }),
    ).toBeInTheDocument();
  });
});
