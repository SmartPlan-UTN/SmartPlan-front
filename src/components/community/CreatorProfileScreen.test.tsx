import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CommunityCreator, PaginatedResult } from "@/types";
import { CreatorProfileScreen } from "./CreatorProfileScreen";

const getCommunityCreator = vi.hoisted(() => vi.fn());
const getCreatorExperiences = vi.hoisted(() => vi.fn());
const getCreatorPlans = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getCommunityCreator,
  getCreatorExperiences,
  getCreatorPlans,
}));

const creator: CommunityCreator = {
  username: "lucia",
  bio: "Salgo a conocer lugares nuevos.",
  avatarUrl: null,
  planCount: 0,
  experienceCount: 0,
};

const emptyPage: PaginatedResult<never> = {
  data: [],
  pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
};

describe("CreatorProfileScreen", () => {
  afterEach(() => vi.clearAllMocks());

  it("supports arrow and Home/End keyboard navigation between profile tabs", async () => {
    getCommunityCreator.mockResolvedValue(creator);
    getCreatorExperiences.mockResolvedValue(emptyPage);
    getCreatorPlans.mockResolvedValue(emptyPage);

    const user = userEvent.setup();
    render(<CreatorProfileScreen username="lucia" />);

    const experiencesTab = await screen.findByRole("tab", { name: "Vivencias" });
    const plansTab = screen.getByRole("tab", { name: "Planes para hacer" });
    experiencesTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(plansTab).toHaveAttribute("aria-selected", "true");
    expect(plansTab).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", plansTab.id);

    await user.keyboard("{Home}");
    expect(experiencesTab).toHaveAttribute("aria-selected", "true");
    expect(experiencesTab).toHaveFocus();

    await user.keyboard("{End}");
    expect(plansTab).toHaveAttribute("aria-selected", "true");
    expect(plansTab).toHaveFocus();
  });
});
