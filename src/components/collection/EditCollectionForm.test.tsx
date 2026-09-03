import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getCollection, updateCollection } from "@/lib/api";

import { EditCollectionForm } from "./EditCollectionForm";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getCollection: vi.fn(),
    updateCollection: vi.fn(),
  };
});

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function collection() {
  return {
    id: 7,
    nameCollection: "Bodegas para visitar",
    description: "Ideas para el fin de semana",
    savedAt: "2026-08-25T12:00:00.000Z",
    activityCount: 0,
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    activities: [],
  };
}

describe("EditCollectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCollection).mockResolvedValue(collection());
  });

  it("loads current values and saves name and description changes (CU33)", async () => {
    vi.mocked(updateCollection).mockResolvedValueOnce({
      ...collection(),
      nameCollection: "Escapadas de otoño",
      description: "Planes tranquilos",
    });
    const user = userEvent.setup();
    render(<EditCollectionForm collectionId={7} />);

    const name = await screen.findByLabelText(/Nombre/);
    const description = screen.getByLabelText(/Descripción/);
    expect(name).toHaveValue("Bodegas para visitar");
    expect(description).toHaveValue("Ideas para el fin de semana");

    await user.clear(name);
    await user.type(name, "Escapadas de otoño");
    await user.clear(description);
    await user.type(description, "Planes tranquilos");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateCollection).toHaveBeenCalledWith(7, {
      nameCollection: "Escapadas de otoño",
      description: "Planes tranquilos",
    });
    expect(
      await screen.findByText("Colección actualizada correctamente"),
    ).toBeInTheDocument();
  });

  it("shows a duplicate name next to the field", async () => {
    vi.mocked(updateCollection).mockRejectedValueOnce(
      new ApiError({
        message: "Duplicate",
        type: "HTTP",
        status: 409,
        code: "COLLECTION_NAME_ALREADY_EXISTS",
      }),
    );
    const user = userEvent.setup();
    render(<EditCollectionForm collectionId={7} />);

    const name = await screen.findByLabelText(/Nombre/);
    await user.clear(name);
    await user.type(name, "Repetida");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Ya tenés una colección con ese nombre"),
    ).toBeInTheDocument();
    expect(name).toHaveFocus();
  });

  it("warns before leaving with unsaved changes", async () => {
    const user = userEvent.setup();
    render(<EditCollectionForm collectionId={7} />);

    const description = await screen.findByLabelText(/Descripción/);
    await user.type(description, " modificada");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.getByRole("alertdialog", { name: "¿Descartar los cambios?" }),
    ).toBeInTheDocument();
    expect(updateCollection).not.toHaveBeenCalled();
  });

  it("shows a controlled unavailable state for a missing collection", async () => {
    vi.mocked(getCollection).mockRejectedValueOnce(
      new ApiError({
        message: "Not found",
        type: "HTTP",
        status: 404,
        code: "COLLECTION_NOT_FOUND",
      }),
    );

    render(<EditCollectionForm collectionId={99} />);

    expect(
      await screen.findByRole("heading", {
        name: "La colección no se encuentra disponible",
      }),
    ).toBeInTheDocument();
  });
});
