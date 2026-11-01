import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  assistantImprove,
  assistantSearch,
  assistantSuggest,
  getActivity,
  listCategories,
  searchActivities,
  suggestActivities,
} from "@/lib/api";
import type { ActivitySearchResult } from "@/types";

import { CreatePlanForm } from "./CreatePlanForm";
import type { DiscoveryMapProps } from "./composer/DiscoveryMap";
import { clearAssistantCache } from "./composer/useAssistant";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    searchActivities: vi.fn(),
    listCategories: vi.fn(),
    suggestActivities: vi.fn(),
    getActivity: vi.fn(),
    assistantSearch: vi.fn(),
    assistantSuggest: vi.fn(),
    assistantImprove: vi.fn(),
  };
});
// Google Maps can't run in jsdom: the map (the composer's only lazy
// component) is a stand-in that shows what the composer hands it and
// exposes the two things a person can do on it.
const StubMap = vi.hoisted(
  () =>
    function StubMap(props: DiscoveryMapProps) {
      return (
        <div
          data-testid="discovery-map"
          data-search={props.params.search ?? ""}
          data-stops={props.stops.length}
        >
          <button
            type="button"
            onClick={() =>
              props.onInspect({
                activityId: 3,
                summary: {
                  id: 3,
                  name: "Actividad 3",
                  description: "",
                  estimatedCost: 3000,
                  estimatedDuration: 30,
                  type: null,
                  averageRating: 0,
                  ratingCount: 0,
                  distanceKm: null,
                  categories: [],
                },
                name: "Actividad 3",
                categoryName: null,
                estimatedCost: 3000,
                placeName: null,
                distanceKm: null,
                reason: null,
              })
            }
          >
            Abrir Actividad 3
          </button>
          {props.inspected ? (
            <section data-testid="map-card">
              {props.renderQuickView(props.inspected)}
            </section>
          ) : null}
          <button
            type="button"
            onClick={() =>
              props.location.setArea({
                center: { latitude: -32.89, longitude: -68.84 },
                radiusKm: 2.5,
              })
            }
          >
            Buscar en esta zona
          </button>
        </div>
      );
    },
);
vi.mock("next/dynamic", () => ({ default: () => StubMap }));

function activity(id: number): ActivitySearchResult {
  return {
    id,
    name: `Actividad ${id}`,
    description: "",
    estimatedCost: id * 1000,
    estimatedDuration: id * 10,
    type: null,
    averageRating: 0,
    ratingCount: 0,
    distanceKm: null,
    categories: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAssistantCache();
  const unavailable = new ApiError({
    message: "unavailable",
    type: "HTTP",
    status: 503,
    code: "ASSISTANT_UNAVAILABLE",
  });
  vi.mocked(assistantSearch).mockRejectedValue(unavailable);
  vi.mocked(assistantSuggest).mockRejectedValue(unavailable);
  vi.mocked(assistantImprove).mockRejectedValue(unavailable);
  vi.mocked(searchActivities).mockImplementation(
    async ({ page = 1, limit = 8 }) => {
      const all = Array.from({ length: 15 }, (_, index) => activity(index + 1));
      return {
        data: all.slice((page - 1) * limit, page * limit),
        pagination: { page, limit, total: 15, totalPages: 2 },
      };
    },
  );
  vi.mocked(listCategories).mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  });
  vi.mocked(suggestActivities).mockResolvedValue({ data: [] });
  vi.mocked(getActivity).mockResolvedValue({ ...activity(3), locations: [] });
});

async function reachActivities(user: ReturnType<typeof userEvent.setup>) {
  render(<CreatePlanForm />);
  await user.type(screen.getByLabelText(/Nombre del plan/), "Sábado");
  await user.click(screen.getByRole("button", { name: /Elegir actividades/ }));
  await screen.findByText("Actividad 1");
}

describe("Discovery as a list or a map", () => {
  it("switches views without losing the list's page, and keeps the map mounted", async () => {
    const user = userEvent.setup();
    await reachActivities(user);
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Actividad 9")).toBeVisible();
    const requests = vi.mocked(searchActivities).mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Mapa" }));
    expect(screen.getByRole("button", { name: "Mapa" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await screen.findByTestId("discovery-map")).toBeVisible();
    // The list is still there (hidden), on the same page.
    expect(screen.getByText("Actividad 9")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByText("Actividad 9")).toBeVisible();
    expect(screen.getByTestId("discovery-map")).not.toBeVisible();
    // Switching views never asks the catalog again.
    expect(searchActivities).toHaveBeenCalledTimes(requests);
  });

  it("adds from the map only through its explicit action", async () => {
    const user = userEvent.setup();
    await reachActivities(user);
    await user.click(screen.getByRole("button", { name: "Mapa" }));
    const map = await screen.findByTestId("discovery-map");
    expect(map).toHaveAttribute("data-stops", "0");

    // A marker opens the same Quick View the list uses; opening adds nothing.
    await user.click(
      within(map).getByRole("button", { name: "Abrir Actividad 3" }),
    );
    const card = within(map).getByTestId("map-card");
    expect(map).toHaveAttribute("data-stops", "0");

    await user.click(
      within(card).getByRole("button", { name: "Sumar al recorrido" }),
    );
    expect(map).toHaveAttribute("data-stops", "1");
    expect(within(card).getByText("Parada 1 en tu recorrido")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Opciones de Actividad 3" }),
    ).toBeInTheDocument();
  });

  it("narrows the list to a zone chosen on the map, and lets it go", async () => {
    const user = userEvent.setup();
    await reachActivities(user);
    await user.click(screen.getByRole("button", { name: "Mapa" }));
    await user.click(
      within(await screen.findByTestId("discovery-map")).getByRole("button", {
        name: "Buscar en esta zona",
      }),
    );

    await waitFor(() =>
      expect(searchActivities).toHaveBeenLastCalledWith(
        expect.objectContaining({
          latitude: -32.89,
          longitude: -68.84,
          maxDistanceKm: 2.5,
          sortBy: "relevance",
        }),
        expect.anything(),
      ),
    );
    const zoneChip = screen.getByRole("button", { name: /En esta zona/ });
    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(
      screen.getByText("En la zona que elegiste en el mapa"),
    ).toBeInTheDocument();

    await user.click(zoneChip);
    await waitFor(() =>
      expect(searchActivities).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ latitude: expect.anything() }),
        expect.anything(),
      ),
    );
    expect(
      screen.getByRole("button", { name: /Cerca mío/ }),
    ).toBeInTheDocument();
  });
});
