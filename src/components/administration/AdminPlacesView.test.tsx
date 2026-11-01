import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listAdminPlaces } from "@/lib/api";
import type { PlaceOption } from "@/types";

import { AdminPlacesView } from "./AdminPlacesView";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  listAdminPlaces: vi.fn(),
}));

vi.mock("@/components/media", () => ({
  MediaGalleryManager: ({ resourceName }: { resourceName: string }) => (
    <div>Galería de {resourceName}</div>
  ),
}));

const places: PlaceOption[] = [
  {
    id: 3,
    name: "Mercado Norte",
    description: "Mercado tradicional con puestos de comida.",
    address: "Rivadavia y Yrigoyen, Córdoba",
    department: { id: 1, name: "Capital", city: { id: 1, name: "Córdoba", country: { id: 1, name: "Argentina" } } },
  },
];

describe("AdminPlacesView", () => {
  beforeEach(() => {
    vi.mocked(listAdminPlaces).mockResolvedValue({
      data: places,
      pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
    });
  });

  it("renders places in the shared admin table with a Maps link and pagination", async () => {
    render(<AdminPlacesView />);

    expect(await screen.findByText("Mercado Norte")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Administración de Lugares" })).toBeInTheDocument();
    expect(screen.getByText("Capital")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rivadavia y Yrigoyen/ })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
    expect(screen.getByText("Mostrando 1–1 de 21 lugares")).toBeInTheDocument();
    expect(listAdminPlaces).toHaveBeenCalledWith({ search: undefined, page: 1, limit: 20 });
  });

  it("opens a read-only view from the place row and manages images from it", async () => {
    const user = userEvent.setup();
    render(<AdminPlacesView />);
    await user.click(await screen.findByText("Mercado Norte"));

    const dialog = screen.getByRole("dialog", { name: "Mercado Norte" });
    expect(within(dialog).getByText("Argentina")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Gestionar imágenes" }));
    expect(screen.getByRole("dialog", { name: "Imágenes del lugar" })).toBeInTheDocument();
  });

  it("searches with a debounce and resets to the first page", async () => {
    const user = userEvent.setup();
    render(<AdminPlacesView />);
    await screen.findByText("Mercado Norte");

    await user.type(screen.getByRole("textbox", { name: "Buscar lugares" }), "mercado");

    await waitFor(() =>
      expect(listAdminPlaces).toHaveBeenLastCalledWith({ search: "mercado", page: 1, limit: 20 }),
    );
  });

  it("opens and closes the image gallery of a place", async () => {
    const user = userEvent.setup();
    render(<AdminPlacesView />);

    await user.click(await screen.findByRole("button", { name: "Gestionar imágenes de Mercado Norte" }));

    expect(screen.getByRole("dialog", { name: "Imágenes del lugar" })).toBeInTheDocument();
    expect(screen.getByText("Galería de Mercado Norte")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar imágenes" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a retryable error when the first load fails", async () => {
    vi.mocked(listAdminPlaces).mockRejectedValueOnce(new Error("offline"));
    render(<AdminPlacesView />);

    expect(await screen.findByText("No pudimos cargar los lugares")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Mercado Norte")).toBeInTheDocument();
  });
});
