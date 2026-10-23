import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CommunityExperience, CommunityExperiencesPage, CommunityPhoto } from "@/types";

import { CommunityExperiences } from "./CommunityExperiences";

const getPlanExperiences = vi.hoisted(() => vi.fn());
const reportContent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getPlanExperiences,
  reportContent,
}));

const useSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/auth")>()),
  useSession,
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/plans/7" }));

vi.mock("@/components/media", () => ({
  AuthenticatedImage: () => <span data-testid="photo" />,
  MediaLightbox: ({
    resourceName,
    images,
    index,
    renderActions,
  }: {
    resourceName: string;
    images: CommunityPhoto[];
    index: number;
    renderActions?: (image: CommunityPhoto) => React.ReactNode;
  }) => (
    <div role="dialog" aria-label={resourceName}>
      {renderActions?.(images[index])}
    </div>
  ),
}));

function photo(id: number, isOwn = false): CommunityPhoto {
  return {
    id,
    url: `/api/media/plan/${id}`,
    isPrimary: id === 1,
    displayOrder: id,
    createdAt: "2026-09-20T12:00:00.000Z",
    isOwn,
  };
}

function experience(overrides: Partial<CommunityExperience> = {}): CommunityExperience {
  return {
    id: 1,
    rating: 5,
    tags: ["would_recommend"],
    comment: "Imperdible al atardecer",
    completedAt: "2026-09-14T18:00:00.000Z",
    author: { alias: "Lucía M.", username: "lucia", avatarUrl: null },
    photos: [photo(1), photo(2)],
    isOwn: false,
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
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ status: "authenticated" });
  });

  it("draws a compound first name's initials from the last-name initial", async () => {
    getPlanExperiences.mockResolvedValue(
      page([experience({ author: { alias: "María José P.", avatarUrl: null } })]),
    );
    render(<CommunityExperiences planId={7} planTitle="Bodegas de Maipú" />);

    const card = await screen.findByRole("article", { name: "Experiencia de María José P." });
    expect(within(card).getByText("MP")).toBeInTheDocument();
  });

  it("leads with the summary and the photos, then each person's story", async () => {
    getPlanExperiences.mockResolvedValue(page([experience()]));
    render(<CommunityExperiences planId={7} planTitle="Bodegas de Maipú" />);

    expect(await screen.findByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("1 experiencia · 2 fotos")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Fotos de la comunidad en Bodegas de Maipú" }),
    ).toBeInTheDocument();

    const card = screen.getByRole("article", { name: "Experiencia de Lucía M." });
    expect(within(card).getByRole("link", { name: "@lucia" })).toBeInTheDocument();
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

  describe("reporting (#156)", () => {
    async function report(user: ReturnType<typeof userEvent.setup>, button: HTMLElement) {
      await user.click(button);
      const dialog = screen.getByRole("dialog", { name: /denunciar/i });
      await user.click(within(dialog).getByRole("radio", { name: "Contenido sexual" }));
      await user.click(within(dialog).getByRole("button", { name: "Denunciar" }));
    }

    it("hides only the reported comment, keeping the experience", async () => {
      const user = userEvent.setup();
      reportContent.mockResolvedValue(undefined);
      getPlanExperiences.mockResolvedValue(page([experience()]));
      render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

      const card = await screen.findByRole("article", { name: "Experiencia de Lucía M." });
      await report(
        user,
        within(card).getByRole("button", { name: "Denunciar comentario de Lucía M." }),
      );

      expect(reportContent).toHaveBeenCalledWith({
        contentType: "experience_comment",
        contentId: 1,
        reason: "sexual_content",
      });
      expect(await screen.findByText("Gracias, lo vamos a revisar.")).toBeInTheDocument();
      expect(within(card).queryByText("“Imperdible al atardecer”")).not.toBeInTheDocument();
      expect(within(card).getAllByTestId("photo")).toHaveLength(2);
    });

    it("hides a reported photo from the wall and the card", async () => {
      const user = userEvent.setup();
      reportContent.mockResolvedValue(undefined);
      getPlanExperiences.mockResolvedValue(page([experience()]));
      render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

      const wall = await screen.findByRole("list", { name: "Fotos de la comunidad en Bodegas" });
      await report(user, within(wall).getByRole("button", { name: "Denunciar foto 2 de la comunidad" }));

      expect(reportContent).toHaveBeenCalledWith({
        contentType: "experience_photo",
        contentId: 2,
        reason: "sexual_content",
      });
      expect(await screen.findByText("1 experiencia · 1 foto")).toBeInTheDocument();
      const card = screen.getByRole("article", { name: "Experiencia de Lucía M." });
      expect(within(card).getAllByTestId("photo")).toHaveLength(1);
    });

    it("reports a photo from the full-size view", async () => {
      const user = userEvent.setup();
      reportContent.mockResolvedValue(undefined);
      getPlanExperiences.mockResolvedValue(page([experience()]));
      render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

      const card = await screen.findByRole("article", { name: "Experiencia de Lucía M." });
      await user.click(within(card).getByRole("button", { name: "Ver foto 1 de 2" }));
      const lightbox = screen.getByRole("dialog", { name: "Fotos de Lucía M." });
      await report(user, within(lightbox).getByRole("button", { name: "Denunciar foto 1 de Lucía M." }));

      expect(reportContent).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: "experience_photo", contentId: 1 }),
      );
    });

    it("offers no report on the viewer's own experience and photos", async () => {
      getPlanExperiences.mockResolvedValue(
        page([experience({ isOwn: true })], {
          summary: {
            averageRating: 5,
            experienceCount: 1,
            photoCount: 2,
            photos: [photo(1, true), photo(2, true)],
          },
        }),
      );
      render(<CommunityExperiences planId={7} planTitle="Bodegas" />);

      await screen.findByRole("article", { name: "Experiencia de Lucía M." });
      expect(screen.queryByRole("button", { name: /denunciar/i })).not.toBeInTheDocument();
    });
  });
});
