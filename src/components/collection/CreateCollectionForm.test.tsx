import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, createCollection } from "@/lib/api";
import { ROUTES } from "@/lib/routes";

import { CreateCollectionForm } from "./CreateCollectionForm";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, createCollection: vi.fn() };
});

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function createdCollection() {
  return {
    id: 12,
    nameCollection: "Bodegas para visitar",
    description: "Ideas para el fin de semana",
    savedAt: "2026-08-25T12:00:00.000Z",
    activityCount: 0,
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    activities: [],
  };
}

describe("CreateCollectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks the name as required without calling the API (CU32)", async () => {
    const user = userEvent.setup();
    render(<CreateCollectionForm />);

    await user.click(screen.getByRole("button", { name: "Crear colección" }));

    expect(
      screen.getByText("El nombre de la colección es obligatorio"),
    ).toBeInTheDocument();
    expect(createCollection).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nombre/)).toHaveFocus();
  });

  it("submits trimmed data and confirms the created collection (CU32)", async () => {
    vi.mocked(createCollection).mockResolvedValueOnce(createdCollection());
    const user = userEvent.setup();
    render(<CreateCollectionForm />);

    await user.type(
      screen.getByLabelText(/Nombre/),
      "  Bodegas para visitar  ",
    );
    await user.type(
      screen.getByLabelText(/Descripción/),
      "  Ideas para el fin de semana  ",
    );
    await user.click(screen.getByRole("button", { name: "Crear colección" }));

    expect(createCollection).toHaveBeenCalledWith({
      nameCollection: "Bodegas para visitar",
      description: "Ideas para el fin de semana",
    });
    expect(
      await screen.findByRole("heading", {
        name: "Colección creada correctamente",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bodegas para visitar")).toBeInTheDocument();
  });

  it("shows a duplicate-name conflict next to the name field (CU32)", async () => {
    vi.mocked(createCollection).mockRejectedValueOnce(
      new ApiError({
        message: "A collection with this name already exists",
        type: "HTTP",
        status: 409,
        code: "COLLECTION_NAME_ALREADY_EXISTS",
      }),
    );
    const user = userEvent.setup();
    render(<CreateCollectionForm />);

    await user.type(screen.getByLabelText(/Nombre/), "Repetida");
    await user.click(screen.getByRole("button", { name: "Crear colección" }));

    expect(
      await screen.findByText("Ya tenés una colección con ese nombre"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveFocus();
  });

  it("asks before discarding entered data and supports keyboard dismissal", async () => {
    const user = userEvent.setup();
    render(<CreateCollectionForm />);

    await user.type(screen.getByLabelText(/Nombre/), "Pendiente");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.getByRole("alertdialog", { name: "¿Descartar los cambios?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir editando" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves immediately when the untouched form is cancelled", async () => {
    const user = userEvent.setup();
    render(<CreateCollectionForm />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(push).toHaveBeenCalledWith(ROUTES.favorites);
  });
});
