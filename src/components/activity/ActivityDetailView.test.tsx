import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActivity } from "@/lib/api";

import { ActivityDetailView } from "./ActivityDetailView";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, getActivity: vi.fn() };
});

vi.mock("@/components/collection", () => ({
  AddToCollectionDialog: ({ activityName }: { activityName: string }) => (
    <div role="dialog">Selector para {activityName}</div>
  ),
}));

vi.mock("@/components/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui")>();
  return { ...actual, FloatingBackLink: () => null };
});

describe("ActivityDetailView collection action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActivity).mockResolvedValue({
      id: 42,
      name: "Degustación de vinos",
      description: "Una experiencia guiada",
      estimatedCost: 15000,
      estimatedDuration: 120,
      type: "Gastronomía",
      averageRating: 4.5,
      ratingCount: 10,
      distanceKm: null,
      categories: [{ id: 3, name: "Gastronomía" }],
      locations: [],
    });
  });

  it("opens the CU35 collection selector from PAN 18", async () => {
    const user = userEvent.setup();
    render(<ActivityDetailView activityId={42} />);

    await user.click(await screen.findByRole("button", { name: "Colección" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Selector para Degustación de vinos",
    );
  });
});
