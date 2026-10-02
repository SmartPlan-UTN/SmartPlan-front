import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CommunityExperience, CommunityExperiencesPage, MediaImage } from "@/types";

import { CommunityExperiences } from "./CommunityExperiences";

const getPlanExperiences = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getPlanExperiences,
}));

vi.mock("@/components/media", () => ({
  AuthenticatedImage: () => <span data-testid="photo" />,
  MediaLightbox: ({ resourceName }: { resourceName: string }) => (
    <div role="dialog" aria-label={resourceName} />
  ),
}));

function photo(id: number): MediaImage {
  return {
    id,
    url: `/api/media/plan/${id}`,
    isPrimary: id === 1,
    displayOrder: id,
    createdAt: "2026-09-20T12:00:00.000Z",
  };
}

function experience(overrides: Partial<CommunityExperience> = {}): CommunityExperience {
  return {
    id: 1,
    rating: 5,
    tags: ["would_recommend"],
    comment: "Imperdible al atardecer",
    completedAt: "2026-09-14T18:00:00.000Z",
    author: { alias: "Lucía M.", avatarUrl: null },
    photos: [photo(1), photo(2)],
    ...overrides,
  };
}

function page(
  data: CommunityExperience[],
  overrides: Partial<CommunityExperiencesPage> = {},
): CommunityExperiencesPage {
  return {
    data,
    pagination: { page: 1, limit: 6, total: data.length, totalPages: 1 },
    summary: {
      averageRating: 4.5,
      experienceCount: data.length,
      photoCount: 2,
      photos: [photo(1), photo(2)],
    },
    ...overrides,
  };
}

describe("CommunityExperiences (#106)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("leads with the summary and the photos, then each person's story", async () => {
    getPlanExperiences.mockResolvedValue(page([experience()]));
    render(<CommunityExperiences planId={7} planTitle="Bodegas de Maipú" />);

    expect(await screen.findByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("1 experiencia · 2 fotos")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Fotos de la comunidad en Bodegas de Maipú" }),
    ).toBeInTheDocument();

    const card = screen.getByRole("article", { name: "Experiencia de Lucía M." });
    expect(within(card).getByText("Lucía M.")).toBeInTheDocument();
    expect(within(card).getByText("Lo hizo en septiembre de 2026")).toBeInTheDocument();
    expect(within(card).getByText("Lo recomendaría")).toBeInTheDocument();
    expect(within(card).getByText("“Imperdible al atardecer”")).toBeInTheDocument();
    expect(getPlanExperiences).toHaveBeenCalledWith(7, { page: 1, limit: 6 });
  });

  it("shows an experience without its comment when there is none to show", async () => {
    getPlanExperiences.mockResolvedValue(page([experience({ comment: null, photos: [] })]));
    render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

    const card = await screen.findByRole("article", { name: "Experiencia de Lucía M." });
    expect(within(card).queryByText(/“/)).not.toBeInTheDocument();
    expect(within(card).queryByRole("list")).not.toBeInTheDocument();
  });

  it("invites to be the first when nobody shared yet", async () => {
    getPlanExperiences.mockResolvedValue(
      page([], {
        summary: { averageRating: 0, experienceCount: 0, photoCount: 0, photos: [] },
      }),
    );
    render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

    expect(await screen.findByText("Todavía nadie contó cómo le fue")).toBeInTheDocument();
  });

  it("opens a photo full size", async () => {
    const user = userEvent.setup();
    getPlanExperiences.mockResolvedValue(page([experience()]));
    render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

    const card = await screen.findByRole("article", { name: "Experiencia de Lucía M." });
    await user.click(within(card).getByRole("button", { name: "Ver foto 2 de 2" }));
    expect(screen.getByRole("dialog", { name: "Fotos de Lucía M." })).toBeInTheDocument();
  });

  it("loads more experiences on demand", async () => {
    const user = userEvent.setup();
    getPlanExperiences
      .mockResolvedValueOnce(
        page([experience()], {
          pagination: { page: 1, limit: 6, total: 2, totalPages: 2 },
        }),
      )
      .mockResolvedValueOnce(
        page([experience({ id: 2, author: { alias: "Tomás R.", avatarUrl: null } })], {
          pagination: { page: 2, limit: 6, total: 2, totalPages: 2 },
        }),
      );
    render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

    await user.click(await screen.findByRole("button", { name: "Ver más experiencias" }));
    expect(await screen.findByRole("article", { name: "Experiencia de Tomás R." })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Ver más experiencias" })).not.toBeInTheDocument();
  });

  it("offers a retry when the experiences cannot load", async () => {
    const user = userEvent.setup();
    getPlanExperiences.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(page([experience()]));
    render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("article", { name: "Experiencia de Lucía M." })).toBeInTheDocument();
  });
});
