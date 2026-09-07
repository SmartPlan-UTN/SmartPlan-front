import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PlanFeedback } from "@/types";

import { ExperienceSummary } from "./ExperienceSummary";

const FEEDBACK: PlanFeedback = {
  rating: 4,
  tags: [],
  comment: null,
  actualCost: null,
  actualDuration: null,
  createdAt: "2026-08-20T00:00:00.000Z",
};

describe("ExperienceSummary (CU23, PAN 17)", () => {
  it("shows the known estimate without inventing optional feedback fields", () => {
    render(
      <ExperienceSummary feedback={FEEDBACK} estimatedTotalCost={25000} />
    );

    expect(screen.getByText(/estimado por smartplan/i)).toBeInTheDocument();
    expect(screen.getByText("$ 25.000")).toBeInTheDocument();
    expect(screen.queryByText(/lo que gastaste/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/[“”]/)).not.toBeInTheDocument();
  });
});
