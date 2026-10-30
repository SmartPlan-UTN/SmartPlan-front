import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CommunityFeedItem,
  CommunityPlan,
  PaginatedResult,
} from "@/types";
import { CommunityScreen } from "./CommunityScreen";

const getCommunityFeed = vi.hoisted(() => vi.fn());
const getCommunityCreators = vi.hoisted(() => vi.fn());
const getCommunityPlans = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getCommunityFeed,
  getCommunityCreators,
  getCommunityPlans,
}));
vi.mock("@/context", () => ({
  useFavorites: () => ({ isPlanSaved: () => false, toggleSavePlan: vi.fn() }),
}));
vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession: () => ({ status: "anonymous", user: null }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const plan: CommunityPlan = {
  id: 8,
  title: "Una tarde en Mendoza",
  description: "Un museo y un café.",
  estimatedTotalCost: null,
  estimatedTotalCostMax: null,
  priceCompleteness: "NONE",
  estimatedTotalDuration: 120,
  imageUrl: null,
  authorUsername: "lucia",
  stops: ["Museo", "Café"],
};
const planItem: CommunityFeedItem = { kind: "plan", plan };
const story: CommunityFeedItem = {
  kind: "experience",
  experience: {
    id: 3,
    rating: 5,
    tags: [],
    comment: "El atardecer estuvo buenísimo.",
    isOwn: false,
    completedAt: "2026-10-01T12:00:00.000Z",
    author: { alias: "Viajero/a", username: "lucia", avatarUrl: null },
    photos: [],
  },
};
function page(
  data: CommunityFeedItem[],
  current = 1,
  totalPages = 1,
): PaginatedResult<CommunityFeedItem> {
  return {
    data,
    pagination: {
      page: current,
      limit: 12,
      total: 12 * totalPages,
      totalPages,
    },
  };
}

describe("CommunityScreen", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/community");
    getCommunityCreators.mockResolvedValue([]);
    getCommunityFeed.mockResolvedValue(page([planItem, story]));
    getCommunityPlans.mockResolvedValue({
      data: [plan],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });
  });
  afterEach(() => vi.clearAllMocks());

  it("shows people, plans and experiences in one feed, including a real route without photos", async () => {
    render(<CommunityScreen />);
    expect(
      await screen.findByRole("heading", { name: plan.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Recorrido" })).toHaveTextContent(
      "Museo",
    );
    expect(screen.getByRole("list", { name: "Recorrido" })).toHaveTextContent(
      "Café",
    );
    expect(
      screen.getByText("El atardecer estuvo buenísimo."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /@lucia/ })).toHaveLength(2);
  });

  it("filters the whole feed and keeps its query in the shareable URL", async () => {
    const user = userEvent.setup();
    render(<CommunityScreen />);
    await screen.findByRole("heading", { name: plan.title });
    await user.type(
      screen.getByRole("textbox", { name: "Buscar experiencias o planes" }),
      "Potrerillos",
    );
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.click(screen.getByRole("button", { name: "Planes" }));
    await waitFor(() =>
      expect(getCommunityPlans).toHaveBeenLastCalledWith({
        q: "Potrerillos",
        page: 1,
        limit: 12,
        sort: "popular",
      }),
    );
    expect(window.location.search).toBe(
      "?q=Potrerillos&type=plans&sort=popular",
    );
  });

  it("does not let an older request replace a newer search", async () => {
    let resolveOlder!: (result: PaginatedResult<CommunityFeedItem>) => void;
    getCommunityFeed.mockImplementation(({ q }: { q?: string }) =>
      q === "Mendoza"
        ? new Promise((resolve) => {
            resolveOlder = resolve;
          })
        : Promise.resolve(
            page(
              q === "Potrerillos"
                ? [
                    {
                      kind: "plan",
                      plan: {
                        ...plan,
                        id: 9,
                        title: "Una tarde en Potrerillos",
                      },
                    },
                  ]
                : [],
            ),
          ),
    );
    const user = userEvent.setup();
    render(<CommunityScreen />);
    const input = screen.getByRole("textbox", {
      name: "Buscar experiencias o planes",
    });
    await user.type(input, "Mendoza");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.clear(input);
    await user.type(input, "Potrerillos");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(
      await screen.findByRole("heading", { name: "Una tarde en Potrerillos" }),
    ).toBeInTheDocument();
    await act(async () => {
      resolveOlder(page([planItem]));
    });
    expect(screen.queryByRole("heading", { name: plan.title })).toBeNull();
  });

  it("retries a failed feed while the discovery sidebar remains usable", async () => {
    getCommunityFeed.mockRejectedValueOnce(new Error("offline"));
    getCommunityCreators.mockResolvedValue([
      {
        username: "ana",
        avatarUrl: null,
        bio: "Siempre al aire libre",
        planCount: 2,
        experienceCount: 1,
      },
    ]);
    const user = userEvent.setup();
    render(<CommunityScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar",
    );
    expect(screen.getByRole("link", { name: /@ana/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("heading", { name: plan.title }),
    ).toBeInTheDocument();
  });

  it("loads the next page without duplicating publications already seen", async () => {
    getCommunityFeed
      .mockResolvedValueOnce(page([planItem], 1, 2))
      .mockResolvedValueOnce(page([planItem, story], 2, 2));
    const user = userEvent.setup();
    render(<CommunityScreen />);
    await user.click(
      await screen.findByRole("button", { name: "Ver más publicaciones" }),
    );
    expect(
      await screen.findByText("El atardecer estuvo buenísimo."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: plan.title })).toHaveLength(
      1,
    );
  });

  it("offers a useful first contribution without inventing public activity", async () => {
    getCommunityFeed.mockResolvedValue(page([]));
    render(<CommunityScreen />);
    expect(
      await screen.findByRole("heading", {
        name: "El próximo buen plan puede ser tuyo",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear un plan" })).toHaveAttribute(
      "href",
      "/plans/create",
    );
    expect(
      screen.getByRole("link", { name: /Compartir una experiencia/ }),
    ).toHaveAttribute("href", "/outings");
  });

  it("does not show an empty ranking while the people request is still pending", async () => {
    let resolvePeople!: (people: []) => void;
    getCommunityCreators.mockReturnValue(
      new Promise((resolve) => {
        resolvePeople = resolve;
      }),
    );
    render(<CommunityScreen />);

    expect(screen.getByRole("status", { name: "Cargando personas" })).toBeInTheDocument();
    expect(
      screen.queryByText(/me gusta en experiencias/),
    ).toBeNull();

    resolvePeople([]);
    expect(
      await screen.findByText(/me gusta en experiencias/),
    ).toBeInTheDocument();
  });
});
