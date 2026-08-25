import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addActivityToCollection,
  ApiError,
  createCollection,
  listCollections,
} from "@/lib/api";

import { AddToCollectionDialog } from "./AddToCollectionDialog";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    addActivityToCollection: vi.fn(),
    createCollection: vi.fn(),
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

function collectionPage(data = [collection()]) {
  return {
    data,
    pagination: { page: 1, limit: 100, total: data.length, totalPages: 1 },
  };
}

function createdCollection() {
  return { ...collection(), id: 9, nameCollection: "Escapadas", activityCount: 0, activities: [] };
}

function apiError(code: string, status = 409) {
  return new ApiError({ message: code, type: "HTTP", status, code });
}

describe("AddToCollectionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCollections).mockResolvedValue(collectionPage());
    vi.mocked(addActivityToCollection).mockResolvedValue({
      ...collection(),
      activities: [],
    });
  });

  it("loads collections and adds the activity to the selected destination", async () => {
    const user = userEvent.setup();
    render(
      <AddToCollectionDialog
        activityId={42}
        activityName="Degustación"
        onClose={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /Bodegas para visitar/ }));
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(addActivityToCollection).toHaveBeenCalledWith(7, 42);
    expect(
      await screen.findByText(/Guardamos la actividad en “Bodegas para visitar”/),
    ).toBeInTheDocument();
  });

  it("offers a retry when loading collections fails", async () => {
    vi.mocked(listCollections)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(collectionPage());
    const user = userEvent.setup();
    render(
      <AddToCollectionDialog activityId={42} activityName="Degustación" onClose={vi.fn()} />,
    );

    expect(await screen.findByText("No pudimos cargar tus colecciones.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Bodegas para visitar")).toBeInTheDocument();
    expect(listCollections).toHaveBeenCalledTimes(2);
  });

  it("treats an existing membership as an informative result", async () => {
    vi.mocked(addActivityToCollection).mockRejectedValueOnce(
      apiError("ACTIVITY_ALREADY_IN_COLLECTION"),
    );
    const user = userEvent.setup();
    render(
      <AddToCollectionDialog activityId={42} activityName="Degustación" onClose={vi.fn()} />,
    );

    await user.click(await screen.findByRole("button", { name: /Bodegas para visitar/ }));
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(
      await screen.findByText(/ya estaba en “Bodegas para visitar”/),
    ).toBeInTheDocument();
  });

  it("creates a collection inline and immediately adds the activity", async () => {
    vi.mocked(listCollections).mockResolvedValueOnce(collectionPage([]));
    vi.mocked(createCollection).mockResolvedValueOnce(createdCollection());
    const user = userEvent.setup();
    render(
      <AddToCollectionDialog activityId={42} activityName="Degustación" onClose={vi.fn()} />,
    );

    await user.click(await screen.findByRole("button", { name: "Crear nueva colección" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Escapadas");
    await user.type(
      screen.getByRole("textbox", { name: /Descripción/ }),
      "Para el finde",
    );
    await user.click(screen.getByRole("button", { name: "Crear y agregar" }));

    expect(createCollection).toHaveBeenCalledWith({
      nameCollection: "Escapadas",
      description: "Para el finde",
    });
    expect(addActivityToCollection).toHaveBeenCalledWith(9, 42);
    expect(await screen.findByText(/Guardamos la actividad en “Escapadas”/)).toBeInTheDocument();
  });

  it("keeps a newly created collection and retries only the failed add", async () => {
    vi.mocked(listCollections).mockResolvedValueOnce(collectionPage([]));
    vi.mocked(createCollection).mockResolvedValueOnce(createdCollection());
    vi.mocked(addActivityToCollection)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ...createdCollection(), activities: [] });
    const user = userEvent.setup();
    render(
      <AddToCollectionDialog activityId={42} activityName="Degustación" onClose={vi.fn()} />,
    );

    await user.click(await screen.findByRole("button", { name: "Crear nueva colección" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Escapadas");
    await user.click(screen.getByRole("button", { name: "Crear y agregar" }));

    expect(await screen.findByText(/Creamos “Escapadas”/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar agregado" }));

    expect(createCollection).toHaveBeenCalledTimes(1);
    expect(addActivityToCollection).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/Guardamos la actividad en “Escapadas”/)).toBeInTheDocument();
  });

  it("closes with Escape and restores focus to its trigger", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <AddToCollectionDialog activityId={42} activityName="Degustación" onClose={onClose} />,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();

    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
