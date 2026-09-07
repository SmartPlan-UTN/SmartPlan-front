import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  getCollection,
  removeActivityFromCollection,
} from "@/lib/api";

import { CollectionDetailView } from "./CollectionDetailView";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getCollection: vi.fn(),
    removeActivityFromCollection: vi.fn(),
  };
});

function detail(withActivities = true) {
  return {
    id: 7,
    nameCollection: "Bodegas para visitar",
    description: "Ideas para el fin de semana",
    savedAt: "2026-08-25T12:00:00.000Z",
    activityCount: withActivities ? 1 : 0,
    createdAt: "2026-08-25T12:00:00.000Z",
    updatedAt: "2026-08-25T12:00:00.000Z",
    activities: withActivities
      ? [
          {
            id: 90,
            idCollection: 7,
            idActivity: 42,
            order: null,
            activity: {
              id: 42,
              name: "Degustación de vinos",
              description: "Una experiencia guiada",
              estimatedCost: 15000,
              estimatedDuration: 120,
              type: "Gastronomía",
            },
          },
        ]
      : [],
  };
}

describe("CollectionDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCollection).mockResolvedValue(detail());
  });

  it("renders collection information and links its activity detail (CU37)", async () => {
    render(<CollectionDetailView collectionId={7} />);

    expect(await screen.findByRole("heading", { name: "Bodegas para visitar" })).toBeInTheDocument();
    expect(screen.getByText("1 actividad")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver Degustación de vinos" })).toHaveAttribute(
      "href",
      "/explore/42",
    );
    expect(screen.getByRole("link", { name: "Editar colección" })).toHaveAttribute(
      "href",
      "/collections/7/edit",
    );
  });

  it("shows the designed empty state with an explore action", async () => {
    vi.mocked(getCollection).mockResolvedValueOnce(detail(false));
    render(<CollectionDetailView collectionId={7} />);

    expect(await screen.findByText("Esta colección todavía está vacía")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar actividades" })).toHaveAttribute(
      "href",
      "/explore",
    );
  });

  it("shows a controlled not-found state", async () => {
    vi.mocked(getCollection).mockRejectedValueOnce(
      new ApiError({
        message: "missing",
        type: "HTTP",
        status: 404,
        code: "COLLECTION_NOT_FOUND",
      }),
    );
    render(<CollectionDetailView collectionId={99} />);

    expect(await screen.findByText("No encontramos esta colección")).toBeInTheDocument();
  });

  it("preserves the activity when removal is cancelled", async () => {
    const user = userEvent.setup();
    render(<CollectionDetailView collectionId={7} />);

    await user.click(
      await screen.findByRole("button", {
        name: "Quitar Degustación de vinos de la colección",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(removeActivityFromCollection).not.toHaveBeenCalled();
    expect(screen.getByText("Degustación de vinos")).toBeInTheDocument();
  });

  it("removes the membership and updates the empty state (CU36)", async () => {
    vi.mocked(removeActivityFromCollection).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<CollectionDetailView collectionId={7} />);

    await user.click(
      await screen.findByRole("button", {
        name: "Quitar Degustación de vinos de la colección",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Quitar actividad" }));

    expect(removeActivityFromCollection).toHaveBeenCalledWith(7, 42);
    expect(await screen.findByText("Actividad quitada de la colección")).toBeInTheDocument();
    expect(screen.getByText("Esta colección todavía está vacía")).toBeInTheDocument();
  });

  it("keeps the activity visible when removal fails", async () => {
    vi.mocked(removeActivityFromCollection).mockRejectedValueOnce(
      new ApiError({ message: "server", type: "HTTP", status: 500 }),
    );
    const user = userEvent.setup();
    render(<CollectionDetailView collectionId={7} />);

    await user.click(
      await screen.findByRole("button", {
        name: "Quitar Degustación de vinos de la colección",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Quitar actividad" }));

    expect(
      await screen.findByText("No pudimos quitar la actividad. Intentá nuevamente."),
    ).toBeInTheDocument();
    expect(screen.getByText("Degustación de vinos")).toBeInTheDocument();
  });
});
