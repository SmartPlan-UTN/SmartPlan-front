import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, deleteCollection, listCollections } from "@/lib/api";

import { CollectionsPanel } from "./CollectionsPanel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    deleteCollection: vi.fn(),
    listCollections: vi.fn(),
  };
});

function collection() {
  return {
    id: 7,
    nameCollection: "Bodegas para visitar",
    description: "Ideas para el fin de semana",
    savedAt: "2026-08-25T12:00:00.000Z",
    activityCount: 3,
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
  };
}

function collectionPage() {
  return {
    data: [collection()],
    pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
  };
}

describe("CollectionsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCollections).mockResolvedValue(collectionPage());
  });

  it("renders only real collections with edit and delete actions", async () => {
    render(<CollectionsPanel />);

    expect(await screen.findByText("Bodegas para visitar")).toBeInTheDocument();
    expect(screen.getByText("3 actividades")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Editar Bodegas para visitar" }),
    ).toHaveAttribute("href", "/collections/7/edit");
    expect(
      screen.getByRole("button", { name: "Eliminar Bodegas para visitar" }),
    ).toBeInTheDocument();
  });

  it("explains the impact and preserves the collection when deletion is cancelled", async () => {
    const user = userEvent.setup();
    render(<CollectionsPanel />);

    await user.click(
      await screen.findByRole("button", {
        name: "Eliminar Bodegas para visitar",
      }),
    );

    expect(
      screen.getByRole("alertdialog", {
        name: "¿Eliminar “Bodegas para visitar”?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Las actividades no se borrarán del catálogo/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(deleteCollection).not.toHaveBeenCalled();
    expect(screen.getByText("Bodegas para visitar")).toBeInTheDocument();
  });

  it("removes the card and confirms a successful deletion (CU34)", async () => {
    vi.mocked(deleteCollection).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<CollectionsPanel />);

    await user.click(
      await screen.findByRole("button", {
        name: "Eliminar Bodegas para visitar",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Eliminar colección" }),
    );

    expect(deleteCollection).toHaveBeenCalledWith(7);
    expect(
      await screen.findByText("Colección eliminada correctamente"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Bodegas para visitar")).not.toBeInTheDocument();
  });

  it("keeps the collection visible when deletion fails", async () => {
    vi.mocked(deleteCollection).mockRejectedValueOnce(
      new ApiError({
        message: "Server error",
        type: "HTTP",
        status: 500,
      }),
    );
    const user = userEvent.setup();
    render(<CollectionsPanel />);

    await user.click(
      await screen.findByRole("button", {
        name: "Eliminar Bodegas para visitar",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Eliminar colección" }),
    );

    expect(
      await screen.findByText(
        "No pudimos eliminar la colección. Intentá nuevamente",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Bodegas para visitar")).toBeInTheDocument();
  });
});
