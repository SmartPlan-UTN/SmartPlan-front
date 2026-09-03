import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listFavoriteActivities } from "@/lib/api";

import { SavedActivitiesPanel } from "./SavedActivitiesPanel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    listFavoriteActivities: vi.fn(),
  };
});

let mockSavedIds = new Set<number>();
const mockToggle = vi.fn();
const mockSetActivitySaved = vi.fn();

vi.mock("@/context", () => ({
  useFavorites: () => ({
    get savedActivityIds() {
      return mockSavedIds;
    },
    isActivitySaved: (id: number) => mockSavedIds.has(id),
    setActivitySaved: mockSetActivitySaved,
    toggleSaveActivity: mockToggle,
    loading: false,
  }),
}));

function makeFavorite(id: number) {
  return {
    id,
    idFavoriteList: 1,
    idActivity: id,
    savedAt: "2026-08-28T00:00:00.000Z",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    deletedAt: null,
    activity: {
      id,
      name: `Actividad ${id}`,
      description: `Descripción de la actividad ${id}`,
      estimatedCost: 500,
      estimatedDuration: 90,
      type: "cultural",
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      deletedAt: null,
    },
  };
}

function makePage(items: ReturnType<typeof makeFavorite>[]) {
  return {
    data: items,
    pagination: { page: 1, limit: 12, total: items.length, totalPages: 1 },
  };
}

describe("SavedActivitiesPanel (CU39 + CU41)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSavedIds = new Set<number>();
    mockToggle.mockResolvedValue(true);
    mockSetActivitySaved.mockResolvedValue(true);
  });

  it("shows a loading indicator while the request is in flight", () => {
    vi.mocked(listFavoriteActivities).mockReturnValue(new Promise(() => {}));
    render(<SavedActivitiesPanel />);

    expect(
      screen.getByText("Cargando tus actividades guardadas..."),
    ).toBeInTheDocument();
  });

  it("renders a card for each saved activity once the request resolves (CU39)", async () => {
    mockSavedIds = new Set([10, 11]);
    vi.mocked(listFavoriteActivities).mockResolvedValue(
      makePage([makeFavorite(10), makeFavorite(11)]),
    );
    render(<SavedActivitiesPanel />);

    expect(await screen.findByText("Actividad 10")).toBeInTheDocument();
    expect(screen.getByText("Actividad 11")).toBeInTheDocument();
  });

  it("shows the empty state when there are no saved activities", async () => {
    vi.mocked(listFavoriteActivities).mockResolvedValue(makePage([]));
    render(<SavedActivitiesPanel />);

    expect(
      await screen.findByText("Aún no guardaste ninguna actividad"),
    ).toBeInTheDocument();
  });

  it("shows an error state and a retry button when the request fails", async () => {
    vi.mocked(listFavoriteActivities).mockRejectedValue(new Error("Network"));
    render(<SavedActivitiesPanel />);

    expect(
      await screen.findByText("No pudimos cargar tus actividades guardadas."),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "Reintentar" });

    // Retry resolves successfully.
    mockSavedIds = new Set([20]);
    vi.mocked(listFavoriteActivities).mockResolvedValue(
      makePage([makeFavorite(20)]),
    );
    await userEvent.click(retryButton);

    await waitFor(() =>
      expect(screen.getByText("Actividad 20")).toBeInTheDocument(),
    );
  });

  it("renders pagination controls when there are multiple pages", async () => {
    mockSavedIds = new Set([1]);
    vi.mocked(listFavoriteActivities).mockResolvedValue({
      data: [makeFavorite(1)],
      pagination: { page: 1, limit: 12, total: 13, totalPages: 2 },
    });
    render(<SavedActivitiesPanel />);

    expect(await screen.findByText("Actividad 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Página siguiente")).toBeInTheDocument();
    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
  });

  it("removes a card from the list when its activity is unsaved (CU41)", async () => {
    // Both activities start as saved.
    mockSavedIds = new Set([10, 11]);
    vi.mocked(listFavoriteActivities).mockResolvedValue(
      makePage([makeFavorite(10), makeFavorite(11)]),
    );

    render(<SavedActivitiesPanel />);

    expect(await screen.findByText("Actividad 10")).toBeInTheDocument();
    expect(screen.getByText("Actividad 11")).toBeInTheDocument();

    const [firstUnsaveButton] = screen.getAllByRole("button", {
      name: "Quitar de guardados",
    });
    expect(firstUnsaveButton).toBeDefined();
    await userEvent.click(firstUnsaveButton as HTMLButtonElement);

    expect(screen.queryByText("Actividad 10")).not.toBeInTheDocument();
    expect(screen.getByText("Actividad 11")).toBeInTheDocument();
    expect(mockSetActivitySaved).toHaveBeenCalledWith(10, false);
  });

  it("shows the empty state after the last activity is unsaved (CU41)", async () => {
    mockSavedIds = new Set([10]);
    vi.mocked(listFavoriteActivities).mockResolvedValue(
      makePage([makeFavorite(10)]),
    );

    render(<SavedActivitiesPanel />);
    expect(await screen.findByText("Actividad 10")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Quitar de guardados" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Aún no guardaste ninguna actividad"),
      ).toBeInTheDocument(),
    );
  });

  it("restores the card if the unsave API call fails and the context rolls back (CU41)", async () => {
    let rejectRequest: ((reason?: unknown) => void) | undefined;
    mockSetActivitySaved.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
    );
    vi.mocked(listFavoriteActivities).mockResolvedValue(
      makePage([makeFavorite(10)]),
    );

    render(<SavedActivitiesPanel />);
    expect(await screen.findByText("Actividad 10")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Quitar de guardados" }),
    );
    expect(screen.queryByText("Actividad 10")).not.toBeInTheDocument();

    rejectRequest?.(new Error("Network"));
    expect(await screen.findByText("Actividad 10")).toBeInTheDocument();
  });
});
