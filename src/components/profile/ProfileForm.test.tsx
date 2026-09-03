import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { UserProfile } from "@/types";

import { ProfileForm } from "./ProfileForm";

const getProfile = vi.hoisted(() => vi.fn());
const updateProfile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, getProfile, updateProfile };
});

const profile: UserProfile = {
  id: 1,
  name: "Ana",
  lastName: "Pérez",
  email: "ana@example.com",
  role: { key: "user", name: "Usuario" },
  status: { key: "active", name: "Activo" },
};

describe("ProfileForm", () => {
  beforeEach(() => {
    getProfile.mockReset();
    updateProfile.mockReset();
  });

  it("preloads the form with the loaded profile", async () => {
    getProfile.mockResolvedValueOnce(profile);
    render(<ProfileForm />);

    expect(await screen.findByDisplayValue("Ana")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pérez")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });

  it("shows a retry state when the profile fails to load", async () => {
    getProfile.mockRejectedValueOnce(new Error("network error"));
    const user = userEvent.setup();
    render(<ProfileForm />);

    expect(
      await screen.findByText("No pudimos cargar tu perfil. Intentá de nuevo."),
    ).toBeInTheDocument();

    getProfile.mockResolvedValueOnce(profile);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByDisplayValue("Ana")).toBeInTheDocument();
  });

  it("starts read-only, with the fields enabled only after Editar perfil", async () => {
    getProfile.mockResolvedValueOnce(profile);
    const user = userEvent.setup();
    render(<ProfileForm />);

    const nameInput = await screen.findByLabelText("Nombre");
    expect(nameInput).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Editar perfil" }));

    expect(nameInput).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeInTheDocument();
  });

  it("shows required-field errors without calling the API", async () => {
    getProfile.mockResolvedValueOnce(profile);
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Este campo es requerido")).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("saves the trimmed name and last name and shows a confirmation", async () => {
    getProfile.mockResolvedValueOnce(profile);
    updateProfile.mockResolvedValueOnce({ ...profile, name: "Ana María" });
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "  Ana María  ");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateProfile).toHaveBeenCalledWith({
      name: "Ana María",
      lastName: "Pérez",
    });
    expect(
      await screen.findByText("Cambios guardados correctamente"),
    ).toBeInTheDocument();
  });

  it("restores the loaded values when Cancelar is clicked", async () => {
    getProfile.mockResolvedValueOnce(profile);
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "Otro nombre");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(nameInput).toHaveValue("Ana");
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("shows a generic message for a forbidden save, without backend detail", async () => {
    getProfile.mockResolvedValueOnce(profile);
    updateProfile.mockRejectedValueOnce(
      new ApiError({
        message: "You do not have permission to perform this action",
        type: "HTTP",
        status: 403,
        code: "ACCESS_DENIED",
      }),
    );
    const user = userEvent.setup();
    render(<ProfileForm />);

    await screen.findByDisplayValue("Ana");
    await user.click(screen.getByRole("button", { name: "Editar perfil" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("No tenés permiso para hacer esto."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("You do not have permission to perform this action"),
    ).not.toBeInTheDocument();
  });

  it("keeps the typed values and shows a generic message on an unexpected server error", async () => {
    getProfile.mockResolvedValueOnce(profile);
    updateProfile.mockRejectedValueOnce(
      new ApiError({
        message: "An internal error occurred",
        type: "HTTP",
        status: 500,
        code: "INTERNAL_ERROR",
      }),
    );
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.click(await screen.findByRole("button", { name: "Editar perfil" }));

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "Otro nombre");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("No pudimos guardar los cambios. Intentá de nuevo."),
    ).toBeInTheDocument();
    expect(screen.queryByText("An internal error occurred")).not.toBeInTheDocument();
    expect(nameInput).toHaveValue("Otro nombre");
  });
});
