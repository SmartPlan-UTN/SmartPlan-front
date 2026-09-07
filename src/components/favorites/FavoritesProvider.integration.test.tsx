import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FavoritesProvider } from "@/context";
import { listFavoriteActivities, listFavoritePlans } from "@/lib/api";
import { useSession } from "@/lib/auth";

import { SavedActivitiesPanel } from "./SavedActivitiesPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/favorites",
}));

vi.mock("@/lib/auth", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    listFavoriteActivities: vi.fn(),
    listFavoritePlans: vi.fn(),
  };
});

const favoritePage = {
  data: [
    {
      id: 1,
      idActivity: 42,
      savedAt: "2026-08-28T00:00:00.000Z",
      activity: {
        id: 42,
        name: "Actividad guardada",
        description: "Descripción",
        estimatedCost: 500,
        estimatedDuration: 90,
        type: null,
      },
    },
  ],
  pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
};

describe("SavedActivitiesPanel with FavoritesProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      authenticated: true,
      status: "authenticated",
      user: {} as never,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(listFavoritePlans).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    });
  });

  it("renders the panel response when the provider request fails", async () => {
    vi.mocked(listFavoriteActivities).mockImplementation((params) =>
      params?.limit === 100
        ? Promise.reject(new Error("Provider request failed"))
        : Promise.resolve(favoritePage),
    );

    render(
      <FavoritesProvider>
        <SavedActivitiesPanel />
      </FavoritesProvider>,
    );

    expect(await screen.findByText("Actividad guardada")).toBeInTheDocument();
    expect(
      screen.queryByText("Aún no guardaste ninguna actividad"),
    ).not.toBeInTheDocument();
  });

  it("does not flash the empty state while the provider is still loading", async () => {
    vi.mocked(listFavoriteActivities).mockImplementation((params) =>
      params?.limit === 100
        ? new Promise(() => {})
        : Promise.resolve(favoritePage),
    );

    render(
      <FavoritesProvider>
        <SavedActivitiesPanel />
      </FavoritesProvider>,
    );

    expect(await screen.findByText("Actividad guardada")).toBeInTheDocument();
    expect(
      screen.queryByText("Aún no guardaste ninguna actividad"),
    ).not.toBeInTheDocument();
  });
});
