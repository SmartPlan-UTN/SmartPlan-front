import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { SessionProvider } from "@/lib/auth";
import { login, refreshSession } from "@/lib/auth/api";

import { LoginForm } from "./LoginForm";

vi.mock("@/lib/auth/api", () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
}));

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

/** What `POST /sessions` returns on success, for a regular account. */
function authenticationResponse(roleKey = "user") {
  return {
    accessToken: "jwt-de-prueba",
    tokenType: "Bearer" as const,
    expiresIn: 900,
    user: {
      id: 1,
      name: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: { key: roleKey, name: roleKey },
      permissions: [],
    },
  };
}

function renderLoginForm(destination: string | null = null, passwordChanged = false) {
  return render(
    <SessionProvider>
      <LoginForm destination={destination} passwordChanged={passwordChanged} />
    </SessionProvider>,
  );
}

/** Fills both fields with values that pass client-side validation. */
async function fillValidFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ana@example.com");
  await user.type(screen.getByLabelText("Contraseña"), "a-valid-password");
}

describe("LoginForm", () => {
  beforeEach(() => {
    replace.mockClear();
    // The form only renders once startup rehydration settles; every test
    // starts from an anonymous visitor unless it says otherwise.
    vi.mocked(refreshSession).mockRejectedValue(new Error("no session"));
  });

  it("shows required-field errors without calling the API", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(
      await screen.findAllByText("Este campo es requerido"),
    ).toHaveLength(2);
    expect(login).not.toHaveBeenCalled();
  });

  it("rejects a malformed email before calling the API", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Contraseña"), "a-valid-password");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("toggles the password field between hidden and visible", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const passwordInput = screen.getByLabelText("Contraseña");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    ).toBeInTheDocument();
  });

  it("shows the password-changed notice when CU6 redirected here", () => {
    renderLoginForm(null, true);

    expect(
      screen.getByText("Tu contraseña fue actualizada. Iniciá sesión nuevamente."),
    ).toBeInTheDocument();
  });

  it("logs in and redirects Home when there is no saved destination", async () => {
    vi.mocked(login).mockResolvedValueOnce(authenticationResponse("user"));
    const user = userEvent.setup();
    renderLoginForm(null);

    await fillValidFields(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(login).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "a-valid-password",
    });
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("redirects an admin account to /admin when there is no saved destination", async () => {
    vi.mocked(login).mockResolvedValueOnce(authenticationResponse("admin"));
    const user = userEvent.setup();
    renderLoginForm(null);

    await fillValidFields(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("honors the saved destination even for an admin account", async () => {
    vi.mocked(login).mockResolvedValueOnce(authenticationResponse("admin"));
    const user = userEvent.setup();
    renderLoginForm("/favorites");

    await fillValidFields(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(replace).toHaveBeenCalledWith("/favorites");
  });

  it("shows a generic message for invalid credentials and re-enables the form", async () => {
    vi.mocked(login).mockRejectedValueOnce(
      new ApiError({
        message: "Invalid credentials",
        type: "HTTP",
        status: 401,
        code: "INVALID_CREDENTIALS",
      }),
    );
    const user = userEvent.setup();
    renderLoginForm();

    await fillValidFields(user);
    const submitButton = screen.getByRole("button", { name: "Iniciar sesión" });
    await user.click(submitButton);

    expect(
      await screen.findByText("El email o la contraseña son incorrectos."),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(submitButton).toBeEnabled();
  });

  it("shows the suspended-account message", async () => {
    vi.mocked(login).mockRejectedValueOnce(
      new ApiError({
        message: "Account suspended",
        type: "HTTP",
        status: 403,
        code: "ACCOUNT_SUSPENDED",
      }),
    );
    const user = userEvent.setup();
    renderLoginForm();

    await fillValidFields(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(
      await screen.findByText(
        "Tu cuenta está suspendida. Contactá a soporte para más información.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a rate-limit message for ATTEMPT_LIMIT_EXCEEDED", async () => {
    // The real code SmartPlan-back's login rate limiter sends — not the
    // generic TOO_MANY_REQUESTS fallback code.
    vi.mocked(login).mockRejectedValueOnce(
      new ApiError({
        message: "Too many attempts",
        type: "HTTP",
        status: 429,
        code: "ATTEMPT_LIMIT_EXCEEDED",
      }),
    );
    const user = userEvent.setup();
    renderLoginForm();

    await fillValidFields(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(
      await screen.findByText(
        "Hiciste demasiados intentos. Esperá un momento antes de volver a intentar.",
      ),
    ).toBeInTheDocument();
  });

  it("maps a field-level validation error from the backend to that field", async () => {
    vi.mocked(login).mockRejectedValueOnce(
      new ApiError({
        message: "The submitted data is invalid",
        type: "HTTP",
        status: 400,
        code: "VALIDATION_FAILED",
        data: {
          message: "The submitted data is invalid",
          errors: [
            { field: "email", messages: ["Ingresá un email institucional válido"] },
          ],
        },
      }),
    );
    const user = userEvent.setup();
    renderLoginForm();

    await fillValidFields(user);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(
      await screen.findByText("Ingresá un email institucional válido"),
    ).toBeInTheDocument();
  });
});
