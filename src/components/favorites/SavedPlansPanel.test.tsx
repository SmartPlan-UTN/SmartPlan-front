import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listFavoritePlans } from "@/lib/api";

import { SavedPlansPanel } from "./SavedPlansPanel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    listFavoritePlans: vi.fn(),
  };
});

/**
 * The context mock is stateful so toggling savedPlanIds causes a re-render
 * and the panel's filter picks up the new set (CU42).
 */
let mockSavedPlanIds = new Set<number>();
const mockTogglePlan = vi.fn();
const mockSetPlanSaved = vi.fn();

vi.mock("@/context", () => ({
  useFavorites: () => ({
    get savedPlanIds() {
      return mockSavedPlanIds;
    },
    isPlanSaved: (id: number) => mockSavedPlanIds.has(id),
    setPlanSaved: mockSetPlanSaved,
    toggleSavePlan: mockTogglePlan,
    loading: false,
  }),
}));

function makeFavoritePlan(id: number) {
  return {
    id,
    idFavoriteList: 1,
    idPlan: id,
    savedAt: "2026-08-28T00:00:00.000Z",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    deletedAt: null,
    plan: {
      id,
      title: `Plan ${id}`,
      description: `Descripción del plan ${id}`,
      estimatedTotalCost: 15000,
      estimatedTotalDuration: 180,
      peopleCount: 2,
      activityCount: 2,
      status: {
        id: 1,
        key: "confirmed" as const,
        name: "Confirmada",
        description: null,
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
        deletedAt: null,
      },
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      deletedAt: null,
      idUser: 1,
      idPlanRequest: null,
      idPlanStatus: 1,
    },
  };
}

function makePage(items: ReturnType<typeof makeFavoritePlan>[]) {
  return {
    data: items,
    pagination: { page: 1, limit: 12, total: items.length, totalPages: 1 },
  };
}

describe("SavedPlansPanel (CU40 + CU42)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSavedPlanIds = new Set<number>();
    mockTogglePlan.mockResolvedValue(true);
    mockSetPlanSaved.mockResolvedValue(true);
  });

  it("shows a loading indicator while the request is in flight", () => {
    vi.mocked(listFavoritePlans).mockReturnValue(new Promise(() => {}));
    render(<SavedPlansPanel />);

    expect(
      screen.getByText("Cargando tus planes guardados..."),
    ).toBeInTheDocument();
  });

  it("renders a card for each saved plan once the request resolves (CU40)", async () => {
    mockSavedPlanIds = new Set([10, 11]);
    vi.mocked(listFavoritePlans).mockResolvedValue(
      makePage([makeFavoritePlan(10), makeFavoritePlan(11)]),
    );
    render(<SavedPlansPanel />);

    expect(await screen.findByText("Plan 10")).toBeInTheDocument();
    expect(screen.getByText("Plan 11")).toBeInTheDocument();
  });

  it("shows the empty state when there are no saved plans", async () => {
    vi.mocked(listFavoritePlans).mockResolvedValue(makePage([]));
    render(<SavedPlansPanel />);

    expect(
      await screen.findByText("Aún no guardaste ningún plan"),
    ).toBeInTheDocument();
  });

  it("shows an error state and a retry button when the request fails", async () => {
    vi.mocked(listFavoritePlans).mockRejectedValue(new Error("Network"));
    render(<SavedPlansPanel />);

    expect(
      await screen.findByText("No pudimos cargar tus planes guardados."),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "Reintentar" });

    // Retry resolves successfully.
    mockSavedPlanIds = new Set([20]);
    vi.mocked(listFavoritePlans).mockResolvedValue(
      makePage([makeFavoritePlan(20)]),
    );
    await userEvent.click(retryButton);

    await waitFor(() =>
      expect(screen.getByText("Plan 20")).toBeInTheDocument(),
    );
  });

  it("renders pagination controls when there are multiple pages", async () => {
    mockSavedPlanIds = new Set([1]);
    vi.mocked(listFavoritePlans).mockResolvedValue({
      data: [makeFavoritePlan(1)],
      pagination: { page: 1, limit: 12, total: 13, totalPages: 2 },
    });
    render(<SavedPlansPanel />);

    expect(await screen.findByText("Plan 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Página siguiente")).toBeInTheDocument();
    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
  });

  it("removes a card from the list when its plan is unsaved (CU42)", async () => {
    // Both plans start as saved.
    mockSavedPlanIds = new Set([10, 11]);
    vi.mocked(listFavoritePlans).mockResolvedValue(
      makePage([makeFavoritePlan(10), makeFavoritePlan(11)]),
    );

    render(<SavedPlansPanel />);

    expect(await screen.findByText("Plan 10")).toBeInTheDocument();
    expect(screen.getByText("Plan 11")).toBeInTheDocument();

    const [firstUnsaveButton] = screen.getAllByRole("button", {
      name: "Quitar de guardados",
    });
    expect(firstUnsaveButton).toBeDefined();
    await userEvent.click(firstUnsaveButton as HTMLButtonElement);

    expect(screen.queryByText("Plan 10")).not.toBeInTheDocument();
    expect(screen.getByText("Plan 11")).toBeInTheDocument();
    expect(mockSetPlanSaved).toHaveBeenCalledWith(10, false);
  });

  it("shows the empty state after the last plan is unsaved (CU42)", async () => {
    mockSavedPlanIds = new Set([10]);
    vi.mocked(listFavoritePlans).mockResolvedValue(
      makePage([makeFavoritePlan(10)]),
    );

    render(<SavedPlansPanel />);
    expect(await screen.findByText("Plan 10")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Quitar de guardados" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Aún no guardaste ningún plan"),
      ).toBeInTheDocument(),
    );
  });

  it("restores the card if the unsave API call fails and context rolls back (CU42)", async () => {
    let rejectRequest: ((reason?: unknown) => void) | undefined;
    mockSetPlanSaved.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
    );
    vi.mocked(listFavoritePlans).mockResolvedValue(
      makePage([makeFavoritePlan(10)]),
    );

    render(<SavedPlansPanel />);
    expect(await screen.findByText("Plan 10")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Quitar de guardados" }),
    );
    expect(screen.queryByText("Plan 10")).not.toBeInTheDocument();

    rejectRequest?.(new Error("Network"));
    expect(await screen.findByText("Plan 10")).toBeInTheDocument();
  });
});
