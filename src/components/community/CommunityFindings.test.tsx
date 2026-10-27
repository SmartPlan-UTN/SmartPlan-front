import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommunityExperience, CommunityPlan } from "@/types";
import { CommunityFindings, communitySearchQuery } from "./CommunityFindings";

const getCommunityExperiences = vi.hoisted(() => vi.fn());
const getCommunityPlans = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getCommunityExperiences,
  getCommunityPlans,
}));

const experience: CommunityExperience = {
  id: 12,
  rating: 5,
  tags: [],
  comment: "La plaza se disfruta mejor al atardecer.",
  isOwn: false,
  completedAt: "2026-10-01T12:00:00.000Z",
  author: { alias: "Viajero/a", username: "lucia", avatarUrl: null },
  inspiredBy: { id: 43, title: "Una tarde sin apuro", creatorUsername: "viajero1" },
  photos: [],
};

const idea: CommunityPlan = {
  id: 43,
  title: "Una tarde sin apuro",
  description: "Un recorrido para inspirar una salida.",
  estimatedTotalCost: 37000,
  estimatedTotalCostMax: 37000,
  priceCompleteness: "EXACT",
  estimatedTotalDuration: 360,
  imageUrl: null,
  authorUsername: "viajero1",
};

function page<T>(data: T[]) {
  return { data, pagination: { page: 1, limit: 3, total: data.length, totalPages: 1 } };
}

describe("CommunityFindings", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows lived stories separately from ideas and marks old experience context", async () => {
    getCommunityExperiences.mockResolvedValue(page([experience]));
    getCommunityPlans.mockResolvedValue(page([idea]));

    render(
      <CommunityFindings query="Tengo ganas de salir esta noche, ¿qué hay para hacer por Mendoza?" />,
    );

    expect(await screen.findByText("La comunidad también encontró esto")).toBeInTheDocument();
    expect(getCommunityPlans).toHaveBeenCalledWith({ q: "Mendoza", limit: 3 });
    expect(screen.getByText("Las vivencias cuentan salidas pasadas. SmartPlan no toma sus precios ni horarios como vigentes; revisalos antes de ir.")).toBeInTheDocument();
    expect(screen.getByText("Vivida")).toBeInTheDocument();
    expect(screen.getByText("Idea", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inspirado en · Una tarde sin apuro" })).toHaveAttribute("href", "/plans/43");
  });

  it("does not leave stale matches visible after a new query has no results", async () => {
    getCommunityExperiences.mockResolvedValueOnce(page([experience])).mockResolvedValueOnce(page([]));
    getCommunityPlans.mockResolvedValueOnce(page([idea])).mockResolvedValueOnce(page([]));
    const { rerender } = render(<CommunityFindings query="una tarde" />);

    expect(await screen.findByText("La comunidad también encontró esto")).toBeInTheDocument();
    rerender(<CommunityFindings query="otra cosa" />);

    expect(screen.queryByText("La comunidad también encontró esto")).toBeNull();
    expect(screen.queryByText("Una tarde sin apuro")).toBeNull();
  });
});

describe("communitySearchQuery", () => {
  it.each([
    ["Una cena tranquila en Mendoza", "Mendoza"],
    ["Tengo ganas de salir esta noche, ¿qué hay para hacer por Mendoza?", "Mendoza"],
    ["Salir en pareja en Godoy Cruz", "Godoy Cruz"],
    ["Cena en Chacras con amigos", "Chacras"],
    ["Algo en Maipú para hoy", "Maipú"],
  ])("finds the destination in %j", (query, destination) => {
    expect(communitySearchQuery(query)).toBe(destination);
  });

  it("keeps the whole idea when it names no place", () => {
    expect(communitySearchQuery("Una salida en pareja")).toBe("Una salida en pareja");
    expect(communitySearchQuery("Una cita con hasta $80.000")).toBe("Una cita con hasta $80.000");
  });
});
