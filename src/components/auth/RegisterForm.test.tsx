import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterForm } from "./RegisterForm";

const register = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  useSession: () => ({ register }),
}));

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

function renderForm() {
  return render(<RegisterForm />);
}

async function fillRegistration(
  user: ReturnType<typeof userEvent.setup>,
  password: string,
) {
  await user.type(screen.getByLabelText("Nombre"), "Ana");
  await user.type(screen.getByLabelText("Apellido"), "Pérez");
  await user.type(screen.getByLabelText("Email"), "ana@example.com");
  await user.type(screen.getByLabelText("Contraseña", { exact: true }), password);
  await user.type(screen.getByLabelText("Confirmar contraseña"), password);
  await user.click(screen.getByRole("checkbox"));
}

describe("RegisterForm", () => {
  beforeEach(() => {
    register.mockReset();
    replace.mockClear();
  });

  it("shows the shared requirements and rejects a password without a symbol", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(
      await screen.findByRole("list", {
        name: "Requisitos obligatorios de la contraseña",
      }),
    ).toBeInTheDocument();
    await fillRegistration(user, "Abcdefg1");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      await screen.findByText(
        "La contraseña debe incluir al menos un símbolo (!@#$%^&*)",
      ),
    ).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("registers with a password that satisfies the common policy", async () => {
    register.mockResolvedValueOnce({
      id: 1,
      name: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: { key: "user", name: "User" },
      permissions: [],
    });
    const user = userEvent.setup();
    renderForm();

    await fillRegistration(user, "Abcdef1!");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        name: "Ana",
        lastName: "Pérez",
        email: "ana@example.com",
        password: "Abcdef1!",
      });
    });
    expect(replace).toHaveBeenCalledWith("/");
  });
});
